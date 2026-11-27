import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  ShaderMaterial,
  Triangle,
  Vector3,
  type Material,
  type Object3D,
} from 'three';
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
  /** The crack edges on the bone surface, one geometry group per cut. */
  crack: LineSegments;
  /** The crack's mouth, from each crack edge where it was to where its fragment moved: dark, behind any bone. */
  skirt: Mesh;
  /** Neighbour mask per cut group, in group order after the periosteal one. */
  neighbors: number[];
}

// Group material slots: periosteal, a cut shown between fragments, a closed cut.
const [SKIN, OPEN, CLOSED] = [0, 1, 2];

/**
 * buildFractures makes one mesh per fracture cell, with periosteal normals taken from the uncut bones
 * so seams between cells of one fragment do not shade, and regroups cells into fragments per pose.
 */
export function buildFractures(
  model: FractureModel,
  uncut: Record<Bone, BufferGeometry>,
  materials: FractureMaterials,
  /** Clip-space depth of 1 mm, to lift the crack lines off the bone and push the crack mouth behind it. */
  mm: number,
  talus: Object3D[],
  render: () => void,
  ease: (t: number) => number,
) {
  const hidden = new MeshBasicMaterial({ visible: false });
  // An open crack seen straight through would show the page behind; its mouth is drawn dark instead,
  // pushed 40 mm back so every bone surface in the gap still draws over it.
  const mouth = new ShaderMaterial({
    uniforms: { uMove: { value: new Matrix4() }, uBias: { value: 40 * mm } },
    vertexShader: /* glsl */ `
      attribute float side;
      uniform mat4 uMove;
      uniform float uBias;
      void main() {
        vec4 p = side > 0.5 ? uMove * vec4(position, 1.0) : vec4(position, 1.0);
        vec4 clip = projectionMatrix * modelViewMatrix * p;
        clip.z = min(clip.z + uBias * clip.w, clip.w);
        gl_Position = clip;
      }
    `,
    fragmentShader: /* glsl */ `
      void main() { gl_FragColor = vec4(0.2, 0.15, 0.11, 1.0); }
    `,
    side: DoubleSide,
  });
  // A closed crack reads as a thin dark line on the bone, lifted a little so it never sinks into it.
  const line = new ShaderMaterial({
    uniforms: { uBias: { value: -0.3 * mm } },
    vertexShader: /* glsl */ `
      uniform float uBias;
      void main() {
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        clip.z += uBias * clip.w;
        gl_Position = clip;
      }
    `,
    fragmentShader: /* glsl */ `
      void main() { gl_FragColor = vec4(0.22, 0.16, 0.12, 0.85); }
    `,
    transparent: true,
  });
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
        // A zero-area triangle has no interpolation and would leave a zero normal.
        if (tri.getArea() < 1e-6) continue;
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
  const pieceGroups = new Map<string, { id: PieceId; group: Group }>();
  for (const p of fractureParams.pieces) {
    const group = new Group();
    main[p.bone].add(group);
    pieceGroups.set(`${p.bone}:${pieceIndex(p.id)}`, { id: p.id, group });
    movers.set(p.id, { objects: [group], move: p.move, at: 0, from: 0, to: 0 });
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
    const neighbors: number[] = [];
    add(peri, false);
    g.addGroup(0, peri.length, SKIN);
    for (const [f, tris] of cuts) {
      g.addGroup(index.length, tris.length, CLOSED);
      add(tris, true);
      neighbors.push(f);
    }
    // Crack edges: edges a cut face shares with the bone surface, one group per cut.
    const skin = new Set<number>();
    const edge = (i: number, j: number) => Math.min(i, j) * 0x10000 + Math.max(i, j);
    for (let t = 0; t < peri.length; t += 3) for (let e = 0; e < 3; e++) skin.add(edge(peri[t + e], peri[t + (e + 1) % 3]));
    const lines = new BufferGeometry();
    const linePos: number[] = [];
    for (const tris of cuts.values()) {
      const start = linePos.length / 3;
      for (let t = 0; t < tris.length; t += 3)
        for (let e = 0; e < 3; e++) {
          const [i, j] = [tris[t + e], tris[t + (e + 1) % 3]];
          if (skin.has(edge(i, j))) for (const v of [i, j]) linePos.push(cell.positions[v * 3], cell.positions[v * 3 + 1], cell.positions[v * 3 + 2]);
        }
      lines.addGroup(start, linePos.length / 3 - start, 0);
    }
    lines.setAttribute('position', new BufferAttribute(new Float32Array(linePos), 3));
    // The mouth: a quad per crack edge, its far side carried by the fragment's move in the shader.
    const mouthPos: number[] = [];
    const side: number[] = [];
    const mouthGeometry = new BufferGeometry();
    for (const g of lines.groups) {
      for (let v = g.start; v < g.start + g.count; v += 2) {
        for (const [k, s1] of [[v, 0], [v + 1, 0], [v + 1, 1], [v, 0], [v + 1, 1], [v, 1]]) {
          mouthPos.push(linePos[k * 3], linePos[k * 3 + 1], linePos[k * 3 + 2]);
          side.push(s1);
        }
      }
      mouthGeometry.addGroup(g.start * 3, g.count * 3, 0);
    }
    mouthGeometry.setAttribute('position', new BufferAttribute(new Float32Array(mouthPos), 3));
    mouthGeometry.setAttribute('side', new BufferAttribute(new Float32Array(side), 1));
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
    const mesh = new Mesh(g, [materials.fill, materials.fill, hidden]);
    mesh.castShadow = mesh.receiveShadow = true;
    const crack = new LineSegments(lines, [hidden, line]);
    mesh.add(crack);
    const skirt = new Mesh(mouthGeometry, [hidden, mouth]);
    skirt.frustumCulled = false;
    main[cell.bone].add(mesh, skirt);
    return { bone: cell.bone, mask: cell.mask, mesh, crack, skirt, neighbors };
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

  // Shows only the cuts between fragments, each with its crack line, and puts each cell in its fragment.
  let active: Record<Bone, number[]> = { tibia: [], fibula: [] };
  let ghosted = false;
  // The grouping setPose is heading to; active lags it while a fragment eases home.
  let goal = active;
  function regroup(on: Record<Bone, number[]>) {
    active = on;
    for (const cell of cells) {
      const f = fragmentOf(cell.mask, on[cell.bone]);
      const piece = f < 0 ? undefined : pieceGroups.get(`${cell.bone}:${f}`)!;
      const parent = piece?.group ?? main[cell.bone];
      if (cell.mesh.parent !== parent) parent.add(cell.mesh);
      // A main-body cell does not move, so its side of a crack needs no mouth.
      cell.skirt.visible = !!piece && !(cell.bone === 'fibula' && ghosted);
      cell.skirt.onBeforeRender = () => {
        mouth.uniforms.uMove.value.copy(parent.matrix);
        mouth.uniformsNeedUpdate = true;
      };
      const shown = cell.neighbors.map((nb) => cutShown(cell.mask, nb, on[cell.bone]));
      cell.mesh.geometry.groups.forEach((g, i) => i > 0 && (g.materialIndex = shown[i - 1] ? OPEN : CLOSED));
      cell.crack.geometry.groups.forEach((g, i) => (g.materialIndex = shown[i] ? 1 : 0));
      cell.skirt.geometry.groups.forEach((g, i) => (g.materialIndex = shown[i] ? 1 : 0));
    }
  }

  let frame = 0;
  return {
    root,
    /** setPose regroups cells into the pose's fragments, shows only the cuts between fragments, and eases each move in. */
    setPose(pose: FracturePose) {
      const next: Record<Bone, number[]> = { tibia: [], fibula: [] };
      for (const id of pose.pieces) next[fractureParams.pieces.find((p) => p.id === id)!.bone].push(pieceIndex(id));
      for (const [id, v] of movers) {
        v.to = pose.moves[id] ? 1 : 0;
        v.from = v.at;
      }
      cancelAnimationFrame(frame);
      goal = next;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        regroup(next);
        for (const v of movers.values()) v.at = v.to;
        apply((v) => v.at);
        return;
      }
      // A fragment leaving the pose eases home before its cells rejoin the main body.
      const leaving = (['tibia', 'fibula'] as Bone[]).some((b) =>
        active[b].some((i) => !next[b].includes(i) && movers.get(pieceGroups.get(`${b}:${i}`)!.id)!.at > 0),
      );
      const union = (b: Bone) => [...new Set([...active[b], ...next[b]])].sort((x, y) => x - y);
      regroup(leaving ? { tibia: union('tibia'), fibula: union('fibula') } : next);
      const start = performance.now();
      const step = (now: number) => {
        const k = ease((now - start) / MOVE_MS);
        for (const v of movers.values()) v.at = v.from + (v.to - v.from) * k;
        if (k >= 1 && leaving) regroup(next);
        apply((v) => v.at);
        render();
        if (k < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    },
    /** atTarget draws with every move at its end, for the snapshots; the returned function puts the eased pose back. */
    atTarget() {
      const now = active;
      regroup(goal);
      apply((v) => v.to);
      return () => {
        regroup(now);
        apply((v) => v.at);
      };
    },
    /** setGhost switches every fibula cell to the see-through material, as placeFibula does for the uncut fibula. */
    setGhost(clear: boolean) {
      ghosted = clear;
      for (const cell of cells) {
        if (cell.bone !== 'fibula') continue;
        const m = cell.mesh.material as Material[];
        m[SKIN] = m[OPEN] = clear ? materials.ghost : materials.fill;
        cell.mesh.castShadow = !clear;
        // Seen through the bone, a dark crack mouth would read as a band, not a line.
        cell.skirt.visible = !clear && cell.mesh.parent !== main.fibula;
      }
    },
    dispose() {
      cancelAnimationFrame(frame);
      for (const cell of cells) {
        cell.mesh.geometry.dispose();
        cell.crack.geometry.dispose();
        cell.skirt.geometry.dispose();
      }
      for (const m of [hidden, mouth, line]) m.dispose();
    },
  };
}

/** Fractures is the drawn fracture model of a scene. */
export type Fractures = ReturnType<typeof buildFractures>;
