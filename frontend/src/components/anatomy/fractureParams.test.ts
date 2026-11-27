import { describe, expect, it } from 'vitest';
import { fractureParams, pieceIndex, type PieceId, type Vec3 } from './fractureParams';

const { pieces, unstable } = fractureParams;
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
