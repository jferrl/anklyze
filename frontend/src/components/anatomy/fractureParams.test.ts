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

// Expected [x, y, z] extents (mm, rounded outward) of the bone vertices each piece captures. A flipped or
// misplaced plane moves a side of this box by far more than the tolerance.
type Box = [[number, number], [number, number], [number, number]];
const BOXES: Record<PieceId, Box> = {
  fib_tip_avulsion: [[-36, -16], [-29, -9], [-23, 4]],
  fib_infra: [[-36, -16], [-29, -1], [-23, 4]],
  fib_trans_spiral: [[-36, -16], [-29, 18], [-23, 4]],
  fib_trans_short: [[-36, -16], [-29, 14], [-23, 4]],
  fib_trans_coronal: [[-36, -16], [-29, 15], [-23, 4]],
  fib_trans_wedge: [[-34, -24], [-2, 16], [-17, 1]],
  fib_trans_comm_a: [[-34, -18], [1, 18], [-11, 0]],
  fib_trans_comm_b: [[-34, -17], [1, 19], [-22, -11]],
  fib_supra: [[-36, -16], [-29, 45], [-23, 4]],
  fib_supra_wedge: [[-34, -26], [32, 48], [-20, -4]],
  fib_supra_far: [[-36, -16], [-29, 77], [-23, 4]],
  art_depression: [[-9, -2], [0, 2], [-10, -2]],
  med_transverse: [[14, 28], [-10, 6], [-16, 14]],
  med_vertical: [[11, 28], [-10, 29], [-17, 17]],
  post_b1: [[-15, -2], [-3, 8], [-24, -14]],
  post_b2: [[-18, 5], [-3, 15], [-24, -9]],
  post_b3_pm: [[5, 27], [-5, 18], [-21, -6]],
  post_b4: [[-18, 10], [-3, 32], [-24, -2]],
  post_pm_extraincisural: [[4, 16], [-2, 8], [-21, -14]],
};

/** Vertices of the piece's bone inside every one of its planes. */
const captured = (id: PieceId): Vec3[] => {
  const piece = pieces.find((p) => p.id === id)!;
  const { positions } = model.parts.find((p) => p.name === piece.bone)!;
  const out: Vec3[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const v: Vec3 = [positions[i], positions[i + 1], positions[i + 2]];
    const inside = piece.planes.every((pl) => pl.normal.reduce((s, n, k) => s + n * (v[k] - pl.point[k]), 0) >= 0);
    if (inside) out.push(v);
  }
  return out;
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
        expect(maxY, id).toBeLessThanOrEqual(23);
        expect(maxY, id).toBeGreaterThanOrEqual(0);
        if (/wedge|comm/.test(id)) expect(minY, id).toBeGreaterThan(-2);
      } else if (id === 'fib_supra_far') {
        expect(maxY, id).toBeGreaterThan(60);
        expect(maxY, id).toBeLessThanOrEqual(80);
      }
      else if (id.startsWith('fib_supra')) {
        expect(maxY, id).toBeGreaterThan(23);
        expect(maxY, id).toBeLessThanOrEqual(60);
        if (id === 'fib_supra_wedge') expect(minY, id).toBeGreaterThan(22);
      } else if (id.startsWith('med_')) expect(minX(vs), id).toBeGreaterThan(10);
      else if (id.startsWith('post_')) expect(mean(2), id).toBeLessThan(-5);
      else expect(Math.abs(mean(1)), id).toBeLessThan(4);
    }
  });

  it('captures the expected extent of bone for every piece', () => {
    for (const { id } of pieces) {
      const vs = captured(id);
      for (let k = 0; k < 3; k++) {
        const lo = Math.min(...vs.map((v) => v[k]));
        const hi = Math.max(...vs.map((v) => v[k]));
        expect(Math.abs(lo - BOXES[id][k][0]), `${id} min ${'xyz'[k]}`).toBeLessThanOrEqual(3);
        expect(Math.abs(hi - BOXES[id][k][1]), `${id} max ${'xyz'[k]}`).toBeLessThanOrEqual(3);
      }
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
