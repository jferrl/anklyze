/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseAnkleModel } from './ankleModel';
import { fractureParams, pieceIndex, type PieceId, type Vec3 } from './fractureParams';

const { pieces, unstable } = fractureParams;

const file = readFileSync(resolve(import.meta.dirname, '../../../public/models/ankle/ankle.bin'));
const model = parseAnkleModel(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
const ALL_IDS: PieceId[] = [
  'fib_tip_avulsion', 'fib_infra', 'fib_trans_spiral', 'fib_trans_short', 'fib_trans_coronal', 'fib_trans_wedge',
  'fib_trans_comm_a', 'fib_trans_comm_b', 'fib_supra', 'fib_supra_wedge', 'fib_supra_far', 'med_transverse',
  'med_vertical', 'post_b1', 'post_b2', 'post_b3_pm', 'post_b4', 'post_pm_extraincisural', 'art_depression',
];

// Regression snapshot, reviewed against the anatomy: [x, y, z] extents (mm, rounded outward) of the bone
// vertices each piece captures. Regenerate after editing fractureParams.json with
// `PRINT_BOXES=1 npx vitest run src/components/anatomy/fractureParams.test.ts --reporter=verbose` and review the printed table.
type Box = [[number, number], [number, number], [number, number]];
const BOXES: Record<PieceId, Box> = {
  fib_tip_avulsion: [[-36, -22], [-29, -20], [-22, -1]],
  fib_infra: [[-36, -16], [-29, -8], [-23, 4]],
  fib_trans_spiral: [[-36, -16], [-29, 23], [-23, 4]],
  fib_trans_short: [[-36, -16], [-29, 14], [-23, 4]],
  fib_trans_coronal: [[-36, -16], [-29, 22], [-23, 4]],
  fib_trans_wedge: [[-33, -24], [0, 21], [-15, 1]],
  fib_trans_comm_a: [[-34, -18], [1, 18], [-11, 0]],
  fib_trans_comm_b: [[-34, -17], [1, 19], [-22, -11]],
  fib_supra: [[-36, -16], [-29, 53], [-23, 4]],
  fib_supra_wedge: [[-34, -27], [40, 56], [-20, -5]],
  fib_supra_far: [[-36, -16], [-29, 69], [-23, 4]],
  art_depression: [[-9, -2], [0, 2], [-10, -2]],
  med_transverse: [[14, 28], [-10, 5], [-15, 13]],
  med_vertical: [[14, 28], [-10, 21], [-16, 15]],
  post_b1: [[-14, -3], [-3, 6], [-24, -18]],
  post_b2: [[-18, 6], [-3, 16], [-24, -9]],
  post_b3_pm: [[5, 28], [-5, 23], [-21, -4]],
  post_b4: [[-18, 14], [-3, 32], [-24, -7]],
  post_pm_extraincisural: [[4, 16], [-3, 10], [-22, -13]],
};

/** Vertices of the piece's bone inside every one of its planes. */
const captured = (id: PieceId, planes = pieces.find((p) => p.id === id)!.planes): Vec3[] => {
  const piece = pieces.find((p) => p.id === id)!;
  const { positions } = model.parts.find((p) => p.name === piece.bone)!;
  const out: Vec3[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const v: Vec3 = [positions[i], positions[i + 1], positions[i + 2]];
    const inside = planes.every((pl) => pl.normal.reduce((s, n, k) => s + n * (v[k] - pl.point[k]), 0) >= 0);
    if (inside) out.push(v);
  }
  return out;
};
/** Largest distance, mm, between the captured extents and the id's BOXES entry; Infinity when too few vertices. */
const boxError = (id: PieceId, vs: Vec3[]): number => {
  if (vs.length < 5) return Infinity;
  let worst = 0;
  for (let k = 0; k < 3; k++) {
    worst = Math.max(
      worst,
      Math.abs(Math.min(...vs.map((v) => v[k])) - BOXES[id][k][0]),
      Math.abs(Math.max(...vs.map((v) => v[k])) - BOXES[id][k][1]),
    );
  }
  return worst;
};
const minX = (vs: Vec3[]) => Math.min(...vs.map((v) => v[0]));
const norm = (v: Vec3) => Math.hypot(...v);
const centroid = (id: PieceId): Vec3 => {
  const planes = pieces.find((p) => p.id === id)!.planes;
  return [0, 1, 2].map((k) => planes.reduce((s, pl) => s + pl.point[k], 0) / planes.length) as Vec3;
};

describe('fractureParams', () => {
  it('has at most 16 pieces per bone', () => {
    for (const bone of ['tibia', 'fibula'] as const) {
      const ofBone = pieces.filter((p) => p.bone === bone);
      expect(ofBone.length).toBeLessThanOrEqual(16);
      expect(pieceIndex(ofBone[0].id)).toBe(0);
    }
  });

  it('numbers pieces within their own bone', () => {
    for (const bone of ['tibia', 'fibula'] as const) {
      const idx = pieces.filter((p) => p.bone === bone).map((p) => pieceIndex(p.id));
      expect(idx).toEqual(idx.map((_, i) => i));
    }
  });

  it('every normal is unit length', () => {
    for (const p of pieces) {
      for (const pl of p.planes) {
        expect(norm(pl.normal)).toBeGreaterThanOrEqual(0.999);
        expect(norm(pl.normal)).toBeLessThanOrEqual(1.001);
      }
    }
  });

  it('keeps every piece at its level', () => {
    for (const { id } of pieces) {
      const [x, y, z] = centroid(id);
      if (id === 'fib_tip_avulsion' || id === 'fib_infra') expect(y).toBeLessThan(0);
      else if (id.startsWith('fib_trans_')) {
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(23);
      } else if (id === 'fib_supra_far') expect(y).toBeGreaterThan(60);
      else if (id.startsWith('fib_supra')) {
        expect(y).toBeGreaterThan(23);
        expect(y).toBeLessThanOrEqual(60);
      } else if (id.startsWith('med_')) expect(x).toBeGreaterThan(10);
      else if (id.startsWith('post_')) expect(z).toBeLessThan(-5);
      else if (id === 'art_depression') expect(Math.abs(y)).toBeLessThan(4);
      else throw new Error(`unclassified piece ${id}`);
    }
  });

  it('lists every piece once', () => {
    const ids = pieces.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...ALL_IDS].sort());
  });

  it('puts art_depression first among the tibia pieces so a larger fragment cannot swallow it', () => {
    expect(pieces.find((p) => p.bone === 'tibia')!.id).toBe('art_depression');
  });

  // Single-plane fibula pieces are "everything distal of the plane", so their level is their top (max y);
  // wedges also get a floor. Posterior pieces use the vertex centroid since post_b4 reaches z -3 at the plafond.
  it('captures real bone vertices at its level', () => {
    for (const { id } of pieces) {
      const vs = captured(id);
      expect(vs.length, id).toBeGreaterThanOrEqual(5);
      const ys = vs.map((v) => v[1]);
      const maxY = Math.max(...ys);
      const minY = Math.min(...ys);
      const mean = (k: number) => vs.reduce((s, v) => s + v[k], 0) / vs.length;
      if (id === 'fib_tip_avulsion' || id === 'fib_infra') expect(maxY, id).toBeLessThan(0);
      else if (id.startsWith('fib_trans_')) {
        // Transsyndesmotic means within the syndesmosis: no Weber B piece reaches above its top (23 mm).
        expect(maxY, id).toBeLessThanOrEqual(23);
        expect(maxY, id).toBeGreaterThanOrEqual(0);
        if (/wedge|comm/.test(id)) expect(minY, id).toBeGreaterThan(-2);
      } else if (id === 'fib_supra_far') {
        expect(maxY, id).toBeGreaterThan(60);
        expect(maxY, id).toBeLessThanOrEqual(80);
      } else if (id.startsWith('fib_supra')) {
        expect(maxY, id).toBeGreaterThan(23);
        expect(maxY, id).toBeLessThanOrEqual(60);
        if (id === 'fib_supra_wedge') expect(minY, id).toBeGreaterThan(22);
      } else if (id.startsWith('med_')) expect(minX(vs), id).toBeGreaterThan(10);
      else if (id.startsWith('post_')) expect(mean(2), id).toBeLessThan(-5);
      else expect(Math.abs(mean(1)), id).toBeLessThan(4);
    }
  });

  it('captures the expected extent of bone for every piece', () => {
    for (const { id } of pieces) expect(boxError(id, captured(id)), id).toBeLessThanOrEqual(3);
  });

  it('notices a flip of any single plane', () => {
    for (const { id, planes } of pieces) {
      planes.forEach((pl, i) => {
        const flipped = planes.map((q, j) => (j === i ? { ...q, normal: q.normal.map((n) => -n) as Vec3 } : q));
        expect(boxError(id, captured(id, flipped)), `${id} plane ${i}`).toBeGreaterThan(3);
      });
    }
  });

  it.runIf(process.env.PRINT_BOXES)('prints the BOXES table', () => {
    const r = (f: (...n: number[]) => number, vs: Vec3[], k: number) => f(...vs.map((v) => v[k]));
    for (const { id } of pieces) {
      const vs = captured(id);
      const box = [0, 1, 2].map((k) => `[${Math.floor(r(Math.min, vs, k))}, ${Math.ceil(r(Math.max, vs, k))}]`);
      console.log(`  ${id}: [${box.join(', ')}],`);
    }
  });

  it('keeps moves conservative', () => {
    for (const p of pieces) {
      expect(norm(p.move.translate)).toBeLessThanOrEqual(3);
      expect(Math.abs(p.move.rotate?.deg ?? 0)).toBeLessThanOrEqual(5);
    }
    expect(norm(unstable.talus.translate)).toBeLessThanOrEqual(3);
    expect(norm(unstable.fibula.translate)).toBeLessThanOrEqual(3);
  });

  it('cites a source for every piece', () => {
    for (const p of pieces) expect(p.source.length).toBeGreaterThan(0);
  });
});
