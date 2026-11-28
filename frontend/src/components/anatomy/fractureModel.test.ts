/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fractureParams, pieceIndex } from './fractureParams';
import { parseFractureModel } from './fractureModel';

// Vitest runs from frontend/.
const file = readFileSync('public/models/ankle/fractures.bin');
const model = parseFractureModel(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
const PERIOSTEAL = 0xffff;

describe('parseFractureModel', () => {
  it('decodes cells with in-range indices', () => {
    expect(model.cells.length).toBeGreaterThan(19);
    for (const c of model.cells) {
      const vertices = c.positions.length / 3;
      expect(Math.max(...c.index)).toBeLessThan(vertices);
      expect(c.face.length * 3).toBe(c.index.length);
      expect(c.occlusion.length).toBe(vertices);
      expect(c.rim.length).toBe(vertices);
    }
  });

  it('lists the pieces in params order', () => {
    expect(model.pieces).toEqual(fractureParams.pieces.map((p) => p.id));
  });

  it('pairs every cut face with a real neighbour', () => {
    for (const c of model.cells) {
      const masks = new Set(model.cells.filter((o) => o.bone === c.bone && o !== c).map((o) => o.mask));
      for (const f of c.face) if (f !== PERIOSTEAL) expect(masks.has(f)).toBe(true);
    }
  });

  it("places each piece's cut faces on its planes", () => {
    let checked = 0;
    for (const c of model.cells) {
      c.face.forEach((f, t) => {
        const diff = f ^ c.mask;
        if (f === PERIOSTEAL || (diff & (diff - 1)) !== 0) return;
        // Bit k of this bone's mask, not a flat index into the pieces.
        const piece = fractureParams.pieces.find((p) => p.bone === c.bone && 1 << pieceIndex(p.id) === diff)!;
        const tol = 1.5 + piece.noise;
        for (let i = 0; i < 3; i++) {
          const v = c.index[t * 3 + i] * 3;
          const d = piece.planes.map(({ point, normal }) =>
            normal[0] * (c.positions[v] - point[0]) + normal[1] * (c.positions[v + 1] - point[1]) + normal[2] * (c.positions[v + 2] - point[2]));
          expect(Math.min(...d.map(Math.abs))).toBeLessThanOrEqual(tol);
          expect(Math.min(...d)).toBeGreaterThanOrEqual(-tol);
        }
        checked++;
      });
    }
    expect(checked).toBeGreaterThan(100);
  });
});
