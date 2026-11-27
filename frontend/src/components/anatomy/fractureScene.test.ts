/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { BufferAttribute, BufferGeometry, Group, LineSegments, Matrix4, Mesh, MeshBasicMaterial, Object3D, type Material } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FractureInput } from '@/types';
import { getAnatomyState } from './anatomyState';
import { parseAnkleModel } from './ankleModel';
import { createAnkleScene } from './ankleScene';
import { fractureParams } from './fractureParams';
import { parseFractureModel } from './fractureModel';
import { fracturePose } from './fracturePose';
import { buildFractures } from './fractureScene';

// happy-dom has no WebGL: the scene test swaps in a renderer that records what it is asked to compile.
const compiled = vi.hoisted(() => ({ target: undefined as unknown }));
vi.mock('three', async (original) => {
  const three = await original<typeof import('three')>();
  class WebGLRenderer {
    shadowMap = { enabled: false, type: 0 };
    toneMapping = 0;
    toneMappingExposure = 1;
    setPixelRatio() {}
    getPixelRatio() {
      return 1;
    }
    setSize() {}
    getSize(v: InstanceType<typeof three.Vector2>) {
      return v.set(400, 400);
    }
    render() {}
    async compileAsync(_object: unknown, _camera: unknown, target: unknown) {
      compiled.target = target;
    }
    dispose() {}
    forceContextLoss() {}
  }
  class PMREMGenerator {
    fromScene() {
      return { texture: new three.Texture() };
    }
    dispose() {}
  }
  return { ...three, WebGLRenderer, PMREMGenerator };
});

// Vitest runs from frontend/.
const read = (name: string) => {
  const f = readFileSync(`public/models/ankle/${name}`);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const ankle = parseAnkleModel(read('ankle.bin'));
const fractureModel = parseFractureModel(read('fractures.bin'));
const uncut = Object.fromEntries(
  ['tibia', 'fibula'].map((name) => {
    const part = ankle.parts.find((p) => p.name === name)!;
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(part.positions, 3));
    g.setIndex(new BufferAttribute(part.index, 1));
    g.computeVertexNormals();
    return [name, g];
  }),
) as Record<'tibia' | 'fibula', BufferGeometry>;
const fill = new MeshBasicMaterial();
const ghost = new MeshBasicMaterial();
const talus = new Object3D();
const fractures = buildFractures(fractureModel, uncut, { fill, ghost }, 1e-4, [talus], () => {}, (t) => Math.min(t, 1));
const [mainTibia, mainFibula] = fractures.root.children as Group[];

const isCell = (o: Object3D): o is Mesh => o instanceof Mesh && !!o.geometry.attributes.cut;
const cellsOf = (root: Object3D) => {
  const out: Mesh[] = [];
  root.traverse((o) => isCell(o) && out.push(o));
  return out;
};
const boneOf = (m: Mesh) => (m.geometry.attributes.bone.array[0] === 1 ? 'tibia' : 'fibula');
const shownCuts = (cells: Mesh[]) => cells.reduce((n, m) => n + m.geometry.groups.filter((g, i) => i > 0 && g.materialIndex === 1).length, 0);
const crackLines = (root: Object3D) => {
  let n = 0;
  root.traverse((o) => o instanceof LineSegments && (n += o.geometry.groups.filter((g) => g.materialIndex === 1).length));
  return n;
};
// Piece groups are made in params order, before any cell joins its bone's main group.
const pieceGroups = () =>
  (['tibia', 'fibula'] as const).flatMap((bone) => {
    const groups = (bone === 'tibia' ? mainTibia : mainFibula).children.filter((o) => o instanceof Group);
    return fractureParams.pieces.filter((p) => p.bone === bone).map((p, i) => ({ id: p.id, group: groups[i] }));
  });
const identity = new Matrix4();

const TRI: Partial<FractureInput> = {
  involved_malleoli: 'trimaleolar',
  fibular_level: 'transindesmal',
  fibula_trace_count: 'single',
  lateral_morphology: 'spiral',
  medial_subtype: 'malleolus_fracture',
  has_ct_scan: true,
  posterior_fracture_type: 'posterolateral',
};
const LATERAL: Partial<FractureInput> = {
  involved_malleoli: 'lateral_only',
  fibular_level: 'transindesmal',
  fibula_trace_count: 'single',
  lateral_morphology: 'spiral',
  lateral_subtype: 'simple',
};
const tri = fracturePose(getAnatomyState(TRI));
const lateral = fracturePose(getAnatomyState(LATERAL));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
});
afterEach(() => {
  vi.useRealTimers();
});
const settle = () => vi.advanceTimersByTime(1000);

describe('buildFractures', () => {
  it('gives cut faces their own vertices and periosteal ones the uncut normals', () => {
    for (const m of cellsOf(fractures.root)) {
      const cut = m.geometry.attributes.cut.array;
      const index = m.geometry.index!.array;
      m.geometry.groups.forEach((g, i) => {
        for (let k = g.start; k < g.start + g.count; k++) expect(cut[index[k]]).toBe(i > 0 ? 1 : 0);
      });
      const n = m.geometry.attributes.normal.array;
      for (let v = 0; v < n.length; v += 3) expect(Math.hypot(n[v], n[v + 1], n[v + 2])).toBeCloseTo(1, 3);
    }
  });

  it('shades the shaft rim as shaft, not as the cap that closes it', () => {
    // ankle.bin closes each shaft 100 mm up with a flat cap that repeats the rim's positions.
    let checked = 0;
    for (const m of cellsOf(fractures.root)) {
      const [p, n, index] = [m.geometry.attributes.position.array, m.geometry.attributes.normal.array, m.geometry.index!.array];
      const skin = m.geometry.groups[0];
      for (let k = skin.start; k < skin.start + skin.count; k += 3) {
        const v = [0, 1, 2].map((e) => index[k + e]);
        const ys = v.map((i) => p[i * 3 + 1]);
        // Shaft triangles that touch the rim; the flat cap is skipped.
        if (Math.max(...ys) < 99.9 || Math.max(...ys) - Math.min(...ys) < 0.5) continue;
        for (const i of v) expect(Math.abs(n[i * 3 + 1]), `normal at y=${p[i * 3 + 1]}`).toBeLessThan(0.9);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('shows no cut while the bones are whole', () => {
    fractures.setPose({ pieces: [], moves: {} });
    settle();
    expect(shownCuts(cellsOf(fractures.root))).toBe(0);
    expect(crackLines(fractures.root)).toBe(0);
  });

  it('shows the cuts of a trimalleolar fracture and moves the talus at its end pose', () => {
    fractures.setPose(tri);
    expect(shownCuts(cellsOf(fractures.root))).toBeGreaterThan(0);
    expect(crackLines(fractures.root)).toBe(shownCuts(cellsOf(fractures.root)));
    const restore = fractures.atTarget();
    expect(talus.matrix.equals(identity)).toBe(false);
    restore();
    expect(talus.matrix.equals(identity)).toBe(true);
  });

  it('eases a trimalleolar fracture back to lateral only, and returns to the same cuts', () => {
    fractures.setPose({ pieces: [], moves: {} });
    settle();
    fractures.setPose(tri);
    settle();
    const fresh = { cuts: shownCuts(cellsOf(fractures.root)), lines: crackLines(fractures.root) };
    expect(fresh.cuts).toBeGreaterThan(0);

    fractures.setPose(lateral);
    settle();
    const cells = cellsOf(fractures.root);
    expect(shownCuts(cells.filter((m) => boneOf(m) === 'tibia')), 'posterior or medial cut').toBe(0);
    expect(shownCuts(cells)).toBeGreaterThan(0);
    expect(talus.matrix.equals(identity)).toBe(true);
    expect(mainFibula.matrix.equals(identity)).toBe(true);
    for (const { id, group } of pieceGroups()) {
      if (!lateral.pieces.includes(id)) expect(group.matrix.equals(identity), id).toBe(true);
    }

    fractures.setPose(tri);
    settle();
    expect({ cuts: shownCuts(cellsOf(fractures.root)), lines: crackLines(fractures.root) }).toEqual(fresh);
  });

  it('ghosts the fibula cells and hides their crack mouths', () => {
    fractures.setPose(tri);
    settle();
    const skirts = () => mainFibula.children.filter((o): o is Mesh => o instanceof Mesh && !!o.geometry.attributes.side);
    expect(skirts().some((s) => s.visible)).toBe(true);
    fractures.setGhost(true);
    for (const m of cellsOf(fractures.root)) {
      const want = boneOf(m) === 'fibula' ? ghost : fill;
      expect((m.material as Material[]).slice(0, 2)).toEqual([want, want]);
    }
    expect(skirts().every((s) => !s.visible)).toBe(true);
    fractures.setGhost(false);
    expect(skirts().some((s) => s.visible)).toBe(true);
  });
});

describe('createAnkleScene', () => {
  it('poses fractures that arrive after the answers', async () => {
    const scene = createAnkleScene(document.createElement('canvas'), ankle, () => {});
    scene.setState(getAnatomyState(TRI));
    await scene.setFractures(fractureModel);
    settle();
    const cells = cellsOf(compiled.target as Object3D);
    expect(cells.length).toBeGreaterThan(0);
    fractures.setPose(tri);
    settle();
    expect(shownCuts(cells)).toBe(shownCuts(cellsOf(fractures.root)));
    expect(shownCuts(cells)).toBeGreaterThan(0);
    scene.dispose();
  });
});
