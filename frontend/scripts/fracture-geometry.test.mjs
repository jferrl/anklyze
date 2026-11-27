import { describe, expect, it } from 'vitest';
import { cap, cutBone, noisyPlane, split } from './fracture-geometry.mjs';

// Icosphere of radius 10, wound counter-clockwise from outside.
function icosphere(levels = 3) {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
  let faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  for (let l = 0; l < levels; l++) {
    const mid = new Map();
    const m = (a, b) => {
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (!mid.has(key)) mid.set(key, verts.push(verts[a].map((x, k) => (x + verts[b][k]) / 2)) - 1);
      return mid.get(key);
    };
    faces = faces.flatMap(([a, b, c]) => {
      const [ab, bc, ca] = [m(a, b), m(b, c), m(c, a)];
      return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]];
    });
  }
  verts = verts.map((v) => v.map((x) => (x * 10) / Math.hypot(...v)));
  return { pos: verts.flat(), index: faces.flat() };
}

const v3 = (pos, i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
const volume = (pos, index) => {
  let s = 0;
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => v3(pos, index[t + k]));
    s += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
  }
  return s / 6;
};
/** Directed edges a:b with no b:a partner. */
const openEdges = (index) => {
  const edges = new Set();
  for (let t = 0; t < index.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const [a, b] = [index[t + k], index[t + ((k + 1) % 3)]];
      if (edges.has(`${b}:${a}`)) edges.delete(`${b}:${a}`);
      else edges.add(`${a}:${b}`);
    }
  }
  return edges;
};
const plane = (point, normal) => ({ point, normal });
const halfSpace = (id, point, normal) => ({ id, bone: 'fibula', planes: [plane(point, normal)], noise: 0.5 });

describe('fracture geometry', () => {
  const sphere = icosphere();
  const flat = noisyPlane(plane([0, 1, 0], [0, 1, 0]), 0, 1);

  it('split by a flat plane gives two closed halves', () => {
    const { inside, outside, rim } = split(sphere, flat);
    const pos = inside.pos;
    const capIn = rim.flatMap((loop) => cap(pos, loop, flat, [0, 1, 0]));
    const capOut = [];
    for (let t = 0; t < capIn.length; t += 3) capOut.push(capIn[t], capIn[t + 2], capIn[t + 1]);
    const a = [...inside.index, ...capIn];
    const b = [...outside.index, ...capOut];
    expect(openEdges(a).size).toBe(0);
    expect(openEdges(b).size).toBe(0);
    const whole = volume(sphere.pos, sphere.index);
    expect(Math.abs(volume(pos, a) + volume(pos, b) - whole) / whole).toBeLessThan(0.01);
    expect(volume(pos, a)).toBeGreaterThan(0);
    expect(volume(pos, b)).toBeGreaterThan(volume(pos, a));
  });

  it('split shares the seam', () => {
    const { inside, outside, rim } = split(sphere, flat);
    expect(inside.pos).toBe(outside.pos);
    const inSet = new Set(inside.index);
    const outSet = new Set(outside.index);
    expect(rim.length).toBe(1);
    for (const v of rim.flat()) {
      expect(inSet.has(v)).toBe(true);
      expect(outSet.has(v)).toBe(true);
    }
  });

  it('cap lies on the noisy surface', () => {
    const sdf = noisyPlane(plane([0, 2, 0], [0, 0.8, 0.6]), 0.8, 42);
    const { inside, rim } = split(sphere, sdf);
    const tris = rim.flatMap((loop) => cap(inside.pos, loop, sdf, [0, 0.8, 0.6]));
    expect(tris.length).toBeGreaterThan(0);
    for (const v of new Set(tris)) expect(Math.abs(sdf(v3(inside.pos, v)))).toBeLessThan(0.02);
  });

  it('cap leaves the rim whole', () => {
    const sdf = noisyPlane(plane([0, 2, 0], [0, 0.8, 0.6]), 0.8, 42);
    const { inside, rim } = split(sphere, sdf);
    const tris = rim.flatMap((loop) => cap(inside.pos, loop, sdf, [0, 0.8, 0.6]));
    const reversed = [...openEdges(tris)].map((e) => e.split(':').reverse().join(':'));
    expect(new Set(reversed)).toEqual(openEdges(inside.index));
  });

  it('noisyPlane is deterministic and bounded by the noise', () => {
    const a = noisyPlane(plane([0, 0, 0], [0, 1, 0]), 0.5, 7);
    const b = noisyPlane(plane([0, 0, 0], [0, 1, 0]), 0.5, 7);
    const c = noisyPlane(plane([0, 0, 0], [0, 1, 0]), 0.5, 8);
    const p = [1.3, 0, -2.7];
    expect(a(p)).toBe(b(p));
    expect(a(p)).not.toBe(c(p));
    for (let x = -20; x < 20; x += 0.7) expect(Math.abs(a([x, 0, x / 3]))).toBeLessThanOrEqual(0.5);
  });

  const checkCells = (cells) => {
    const masks = cells.map((c) => c.mask);
    for (const c of cells) {
      expect(openEdges(c.mesh.index).size).toBe(0);
      expect(volume(c.mesh.pos, c.mesh.index)).toBeGreaterThan(0);
      expect(c.face.length).toBe(c.mesh.index.length / 3);
      expect(c.rim.length).toBe(c.mesh.pos.length / 3);
      expect(c.rim.every((r) => r >= 0 && r <= 1)).toBe(true);
      expect(c.rim).toContain(0);
      for (const f of c.face) {
        if (f === 0xffff) continue;
        expect(f).not.toBe(c.mask);
        expect(masks).toContain(f);
      }
    }
    const total = cells.reduce((s, c) => s + volume(c.mesh.pos, c.mesh.index), 0);
    const whole = volume(sphere.pos, sphere.index);
    expect(Math.abs(total - whole) / whole).toBeLessThan(0.01);
  };

  it('cutBone masks cells by piece', () => {
    const cells = cutBone(sphere, [halfSpace('a', [-2, 0, 0], [1, 0, 0]), halfSpace('b', [0, -2, 0], [0, 1, 0])]);
    expect(cells.map((c) => c.mask).sort()).toEqual([0, 1, 2, 3]);
    checkCells(cells);
    for (const c of cells) expect(c.face.some((f) => f !== 0xffff)).toBe(true);
  });

  it('cutBone drops faces inside a piece', () => {
    const wedge = { id: 'w', bone: 'fibula', planes: [plane([0, 0, 0], [1, 0, 0]), plane([0, 0, 0], [0, 1, 0])], noise: 0.6 };
    const cells = cutBone(sphere, [wedge]);
    expect(cells.map((c) => c.mask).sort()).toEqual([0, 1]);
    checkCells(cells);
    expect(cells.find((c) => c.mask === 0).face).not.toContain(0);
  });

  it('cutBone closes cells where three planes of a piece meet', () => {
    const corner = {
      id: 'c', bone: 'fibula', noise: 0.6,
      planes: [plane([1, 0, 0], [0.8, 0.6, 0]), plane([0, 2, 0], [0, -0.6, 0.8]), plane([0, 0, -1], [-0.6, 0, -0.8])],
    };
    const cells = cutBone(icosphere(4), [corner, halfSpace('h', [0, 1, 0], [0, 0.6, 0.8])]);
    for (const c of cells) expect(openEdges(c.mesh.index).size).toBe(0);
  });

  it('cutBone is reproducible', () => {
    const pieces = [halfSpace('a', [-2, 0, 0], [1, 0, 0])];
    expect(cutBone(sphere, pieces)).toEqual(cutBone(sphere, pieces));
  });
});
