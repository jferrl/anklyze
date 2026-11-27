/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { BufferAttribute, BufferGeometry, Matrix4, Mesh, MeshBasicMaterial, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { getAnatomyState } from './anatomyState';
import { parseAnkleModel } from './ankleModel';
import { parseFractureModel } from './fractureModel';
import { fracturePose } from './fracturePose';
import { buildFractures } from './fractureScene';

// Vitest runs from frontend/.
const read = (name: string) => {
  const f = readFileSync(`public/models/ankle/${name}`);
  return f.buffer.slice(f.byteOffset, f.byteOffset + f.byteLength);
};
const ankle = parseAnkleModel(read('ankle.bin'));
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
const material = new MeshBasicMaterial();
const talus = new Object3D();
const fractures = buildFractures(parseFractureModel(read('fractures.bin')), uncut, { fill: material, ghost: material }, material, [talus], () => {}, (t) => Math.min(t, 1));
const meshes = () => {
  const out: Mesh[] = [];
  fractures.root.traverse((o) => o instanceof Mesh && o.material instanceof Array && out.push(o));
  return out;
};
const shownCuts = () => meshes().reduce((n, m) => n + m.geometry.groups.filter((g, i) => i > 0 && g.materialIndex === 0).length, 0);

describe('buildFractures', () => {
  it('gives cut faces their own vertices and periosteal ones the uncut normals', () => {
    for (const m of meshes()) {
      const cut = m.geometry.attributes.cut.array;
      const index = m.geometry.index!.array;
      m.geometry.groups.forEach((g, i) => {
        for (let k = g.start; k < g.start + g.count; k++) expect(cut[index[k]]).toBe(i > 0 ? 1 : 0);
      });
      const n = m.geometry.attributes.normal.array;
      for (let v = 0; v < n.length; v += 3) expect(Math.hypot(n[v], n[v + 1], n[v + 2])).toBeCloseTo(1, 3);
    }
  });

  it('shows no cut while the bones are whole', () => {
    fractures.setPose({ pieces: [], moves: {} });
    expect(shownCuts()).toBe(0);
  });

  it('shows the cuts of a trimalleolar fracture and moves the talus at its end pose', () => {
    const state = getAnatomyState({
      involved_malleoli: 'trimaleolar',
      fibular_level: 'transindesmal',
      fibula_trace_count: 'single',
      lateral_morphology: 'spiral',
      medial_subtype: 'malleolus_fracture',
      has_ct_scan: true,
      posterior_fracture_type: 'posterolateral',
    });
    fractures.setPose(fracturePose(state));
    expect(shownCuts()).toBeGreaterThan(0);
    const restore = fractures.atTarget();
    expect(talus.matrix.equals(new Matrix4())).toBe(false);
    restore();
    expect(talus.matrix.equals(new Matrix4())).toBe(true);
  });
});
