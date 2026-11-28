import type { PieceId } from './fractureParams';

/** FractureCell is one chunk of a bone sharing a piece mask: its mesh, with a per-triangle neighbour mask for cut faces. */
export interface FractureCell {
  bone: 'tibia' | 'fibula';
  /** Bit k is set when the cell lies inside the k-th piece of its own bone, in params order. */
  mask: number;
  positions: Float32Array;
  index: Uint16Array;
  /** Per triangle: the neighbouring cell's mask across a cut, or 0xFFFF on the bone surface. */
  face: Uint16Array;
  /** Baked ambient occlusion per vertex, 0 open to 255 enclosed. */
  occlusion: Uint8Array;
  /** 255 on vertices at the edge of a cut face, else 0. */
  rim: Uint8Array;
}

/** FractureModel is the decoded fractures.bin. */
export interface FractureModel {
  pieces: PieceId[];
  cells: FractureCell[];
}

interface Manifest {
  quant: { min: [number, number, number]; step: number };
  pieces: PieceId[];
  cells: { bone: FractureCell['bone']; mask: number; vertices: number; triangles: number; position: number; index: number; face: number; occlusion: number; rim: number }[];
}

/** parseFractureModel decodes fractures.bin: a JSON manifest, then quantised positions, indices, faces, occlusion and rim per cell. */
export function parseFractureModel(buffer: ArrayBuffer): FractureModel {
  const jsonLength = new DataView(buffer).getUint32(0, true);
  const manifest = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, jsonLength))) as Manifest;
  const base = 4 + jsonLength;
  const { min, step } = manifest.quant;

  return {
    pieces: manifest.pieces,
    cells: manifest.cells.map((c) => {
      const q = new Uint16Array(buffer, base + c.position, c.vertices * 3);
      const positions = new Float32Array(q.length);
      for (let i = 0; i < q.length; i++) positions[i] = min[i % 3] + q[i] * step;
      return {
        bone: c.bone,
        mask: c.mask,
        positions,
        index: new Uint16Array(buffer, base + c.index, c.triangles * 3),
        face: new Uint16Array(buffer, base + c.face, c.triangles),
        occlusion: new Uint8Array(buffer, base + c.occlusion, c.vertices),
        rim: new Uint8Array(buffer, base + c.rim, c.vertices),
      };
    }),
  };
}
