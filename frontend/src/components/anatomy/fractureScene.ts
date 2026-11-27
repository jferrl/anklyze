import { Box3, BufferAttribute, BufferGeometry, Group, Matrix4, Mesh, MeshBasicMaterial, Quaternion, Triangle, Vector3, type Material, type Object3D } from 'three';
import type { FractureModel } from './fractureModel';
import { fractureParams, pieceIndex, type Move, type PieceId } from './fractureParams';
import { fragmentOf, cutShown, type FracturePose } from './fracturePose';

const PERIOSTEAL = 0xffff;
const MOVE_MS = 600;
const BONE = { tibia: 1, fibula: 2 } as const;
type Bone = keyof typeof BONE;
type Mover = PieceId | 'talus' | 'fibula';

const key = (p: ArrayLike<number>, i: number) => `${p[i * 3]},${p[i * 3 + 1]},${p[i * 3 + 2]}`;

/** FractureMaterials are what a cell draws with: the bone and its see-through variant. */
export interface FractureMaterials {
  fill: Material;
  ghost: Material;
}

interface Cell {
  bone: Bone;
  mask: number;
  mesh: Mesh;
  hull: Mesh;
  /** Neighbour mask per geometry group; undefined for the periosteal group. */
  neighbors: (number | undefined)[];
}

/**
 * buildFractures makes one mesh per fracture cell, with periosteal normals taken from the uncut bones
 * so seams between cells of one fragment do not shade, and regroups cells into fragments per pose.
 */
export function buildFractures(
  model: FractureModel,
  uncut: Record<Bone, BufferGeometry>,
  materials: FractureMaterials,
  outline: Material,
  talus: Object3D[],
  render: () => void,
  ease: (t: number) => number,
) {
  const hidden = new MeshBasicMaterial({ visible: false });
  const root = new Group();
  // Periosteal normals come from the uncut bone: its own where it has the vertex, else interpolated
  // across the uncut triangle the new vertex lies on, so a seam inside a fragment does not shade.
  const normals = new Map<string, Vector3>();
  const [a, b, c, ab, ac] = [new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3()];
  const faceNormal = (p: ArrayLike<number>, i: number, j: number, k: number) => {
    a.fromArray(p, i * 3);
    b.fromArray(p, j * 3);
    c.fromArray(p, k * 3);
    return ab.subVectors(b, a).cross(ac.subVectors(c, a));
  };
  const lookups = {} as Record<Bone, (p: Vector3) => Vector3>;
  for (const bone of ['tibia', 'fibula'] as Bone[]) {
    const g = uncut[bone];
    const pos = g.attributes.position.array;
    const nrm = g.attributes.normal.array;
    const idx = g.index!.array;
    for (let i = 0; i < pos.length / 3; i++) normals.set(key(pos, i), new Vector3().fromArray(nrm, i * 3));
    // Triangles by 2 mm grid cell of their bounds.
    const cellOf = (x: number, y: number, z: number) => `${Math.floor(x / 2)},${Math.floor(y / 2)},${Math.floor(z / 2)}`;
    const grid = new Map<string, number[]>();
    const box = new Box3();
    for (let t = 0; t < idx.length / 3; t++) {
      box.setFromPoints([0, 1, 2].map((e) => new Vector3().fromArray(pos, idx[t * 3 + e] * 3)));
      for (let x = Math.floor(box.min.x / 2); x <= Math.floor(box.max.x / 2); x++)
        for (let y = Math.floor(box.min.y / 2); y <= Math.floor(box.max.y / 2); y++)
          for (let z = Math.floor(box.min.z / 2); z <= Math.floor(box.max.z / 2); z++) {
            const k = `${x},${y},${z}`;
            (grid.get(k) ?? grid.set(k, []).get(k)!).push(t);
          }
    }
    const [tri, near, n0, n1, n2] = [new Triangle(), new Vector3(), new Vector3(), new Vector3(), new Vector3()];
    lookups[bone] = (p) => {
      let best = Infinity;
      const out = new Vector3();
      for (const t of grid.get(cellOf(p.x, p.y, p.z)) ?? []) {
        const [i, j, k] = [idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]];
        tri.setFromAttributeAndIndices(g.attributes.position as BufferAttribute, i, j, k);
        const d = tri.closestPointToPoint(p, near).distanceToSquared(p);
        if (d >= best) continue;
        best = d;
        Triangle.getInterpolation(near, tri.a, tri.b, tri.c, n0.fromArray(nrm, i * 3), n1.fromArray(nrm, j * 3), n2.fromArray(nrm, k * 3), out);
      }
      return out.normalize();
    };
  }
  for (const cell of model.cells) {
    for (let t = 0; t < cell.face.length; t++) {
      if (cell.face[t] !== PERIOSTEAL) continue;
      for (let e = 0; e < 3; e++) {
        const v = cell.index[t * 3 + e];
        const id = key(cell.positions, v);
        if (!normals.has(id)) normals.set(id, lookups[cell.bone](new Vector3().fromArray(cell.positions, v * 3)));
      }
    }
  }

  // Fragment groups: each bone's main body, one per piece; fibula pieces ride on the whole fibula.
  const movers = new Map<Mover, { objects: Object3D[]; move: Move; at: number; from: number; to: number }>();
  const main: Record<Bone, Group> = { tibia: new Group(), fibula: new Group() };
  root.add(main.tibia, main.fibula);
  const pieceGroups = new Map<string, Group>();
  for (const p of fractureParams.pieces) {
    const g = new Group();
    main[p.bone].add(g);
    pieceGroups.set(`${p.bone}:${pieceIndex(p.id)}`, g);
    movers.set(p.id, { objects: [g], move: p.move, at: 0, from: 0, to: 0 });
  }
  movers.set('fibula', { objects: [main.fibula], move: fractureParams.unstable.fibula, at: 0, from: 0, to: 0 });
  movers.set('talus', { objects: talus, move: fractureParams.unstable.talus, at: 0, from: 0, to: 0 });
  for (const { objects } of movers.values()) for (const o of objects) o.matrixAutoUpdate = false;

  const cells: Cell[] = model.cells.map((cell) => {
    const peri: number[] = [];
    const cuts = new Map<number, number[]>();
    for (let t = 0; t < cell.face.length; t++) {
      const [i, j, k] = [cell.index[t * 3], cell.index[t * 3 + 1], cell.index[t * 3 + 2]];
      if (faceNormal(cell.positions, i, j, k).lengthSq() < 1e-12) continue;
      const f = cell.face[t];
      if (f === PERIOSTEAL) peri.push(i, j, k);
      else (cuts.get(f) ?? cuts.set(f, []).get(f)!).push(i, j, k);
    }
    // Every cut face gets its own vertices, so `cut` is a clean per-face flag and its normals come from the face alone.
    const pos: number[] = [];
    const nrm: number[] = [];
    const occ: number[] = [];
    const rim: number[] = [];
    const cut: number[] = [];
    const index: number[] = [];
    const add = (tris: number[], isCut: boolean) => {
      const remap = new Map<number, number>();
      for (const v of tris) {
        let to = remap.get(v);
        if (to === undefined) {
          to = pos.length / 3;
          remap.set(v, to);
          pos.push(cell.positions[v * 3], cell.positions[v * 3 + 1], cell.positions[v * 3 + 2]);
          const n = isCut ? undefined : normals.get(key(cell.positions, v));
          nrm.push(n?.x ?? 0, n?.y ?? 0, n?.z ?? 0);
          occ.push(cell.occlusion[v]);
          rim.push(isCut ? cell.rim[v] / 255 : 1);
          cut.push(+isCut);
        }
        index.push(to);
      }
    };
    const g = new BufferGeometry();
    const neighbors: (number | undefined)[] = [undefined];
    add(peri, false);
    g.addGroup(0, peri.length, 0);
    for (const [f, tris] of cuts) {
      g.addGroup(index.length, tris.length, 1);
      add(tris, true);
      neighbors.push(f);
    }
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute('normal', new BufferAttribute(new Float32Array(nrm), 3));
    g.setIndex(pos.length / 3 > 0xffff ? index : new BufferAttribute(new Uint16Array(index), 1));
    // Cut normals from the face geometry only; periosteal ones stay as set.
    const cutNormals = g.clone();
    cutNormals.computeVertexNormals();
    const [n, cn] = [g.attributes.normal.array, cutNormals.attributes.normal.array];
    for (let i = 0; i < n.length; i++) if (cut[Math.floor(i / 3)]) n[i] = cn[i];
    cutNormals.dispose();
    g.setAttribute('bone', new BufferAttribute(new Float32Array(pos.length / 3).fill(BONE[cell.bone]), 1));
    g.setAttribute('occlusion', new BufferAttribute(new Uint8Array(occ), 1, true));
    g.setAttribute('rim', new BufferAttribute(new Float32Array(rim), 1));
    g.setAttribute('cut', new BufferAttribute(new Float32Array(cut), 1));
    const mesh = new Mesh(g, [materials.fill, hidden]);
    mesh.castShadow = mesh.receiveShadow = true;
    const hull = new Mesh(g, outline);
    main[cell.bone].add(mesh, hull);
    return { bone: cell.bone, mask: cell.mask, mesh, hull, neighbors };
  });

  const [t, q, m] = [new Vector3(), new Quaternion(), new Matrix4()];
  // A move at amount k: translate by k, then turn k of its degrees about the axis through its origin.
  function place(o: Object3D, move: Move, k: number) {
    o.matrix.makeTranslation(t.fromArray(move.translate).multiplyScalar(k));
    const r = move.rotate;
    if (r) {
      const [ox, oy, oz] = r.origin;
      q.setFromAxisAngle(t.fromArray(r.axis).normalize(), (r.deg * k * Math.PI) / 180);
      m.makeTranslation(ox, oy, oz).multiply(new Matrix4().makeRotationFromQuaternion(q)).multiply(new Matrix4().makeTranslation(-ox, -oy, -oz));
      o.matrix.premultiply(m);
    }
    o.matrixWorldNeedsUpdate = true;
  }
  const apply = (amount: (v: { at: number; to: number }) => number) => {
    for (const v of movers.values()) for (const o of v.objects) place(o, v.move, amount(v));
  };

  let frame = 0;
  return {
    root,
    /** setPose regroups cells into the pose's fragments, shows only the cuts between fragments, and eases each move in. */
    setPose(pose: FracturePose) {
      const active: Record<Bone, number[]> = { tibia: [], fibula: [] };
      for (const id of pose.pieces) active[fractureParams.pieces.find((p) => p.id === id)!.bone].push(pieceIndex(id));
      for (const cell of cells) {
        const on = active[cell.bone];
        const f = fragmentOf(cell.mask, on);
        const parent = f < 0 ? main[cell.bone] : pieceGroups.get(`${cell.bone}:${f}`)!;
        if (cell.mesh.parent !== parent) parent.add(cell.mesh, cell.hull);
        cell.mesh.geometry.groups.forEach((g, i) => {
          const nb = cell.neighbors[i];
          g.materialIndex = nb === undefined || cutShown(cell.mask, nb, on) ? 0 : 1;
        });
      }
      for (const [id, v] of movers) {
        v.to = pose.moves[id] ? 1 : 0;
        v.from = v.at;
      }
      cancelAnimationFrame(frame);
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        for (const v of movers.values()) v.at = v.to;
        apply((v) => v.at);
        return;
      }
      const start = performance.now();
      const step = (now: number) => {
        const k = ease((now - start) / MOVE_MS);
        for (const v of movers.values()) v.at = v.from + (v.to - v.from) * k;
        apply((v) => v.at);
        render();
        if (k < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    },
    /** atTarget draws with every move at its end, for the snapshots; the returned function puts the eased pose back. */
    atTarget() {
      apply((v) => v.to);
      return () => apply((v) => v.at);
    },
    /** setGhost switches every fibula cell to the see-through material, as placeFibula does for the uncut fibula. */
    setGhost(clear: boolean) {
      for (const cell of cells) {
        if (cell.bone !== 'fibula') continue;
        (cell.mesh.material as Material[])[0] = clear ? materials.ghost : materials.fill;
        cell.mesh.castShadow = !clear;
        cell.hull.visible = !clear;
      }
    },
    dispose() {
      cancelAnimationFrame(frame);
      for (const cell of cells) cell.mesh.geometry.dispose();
      hidden.dispose();
    },
  };
}

/** Fractures is the drawn fracture model of a scene. */
export type Fractures = ReturnType<typeof buildFractures>;
