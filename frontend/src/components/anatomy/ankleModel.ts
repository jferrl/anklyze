import type { FibulaMark } from './anatomyState';

/** Region is the structure a vertex belongs to, as tagged by scripts/build-ankle-model.mjs. */
export const Region = { none: 0, lateral: 1, medial: 2, posterior: 3 } as const;

interface Band {
  /** Millimetres above the plafond. */
  y: [number, number];
  /** x and z of the fibula's centre at this level. */
  center: [number, number];
  radius: number;
}

/** AnkleModel is the decoded ankle.bin: bones in millimetres, origin at the plafond, +y up, +z anterior, +x medial. */
export interface AnkleModel {
  syndesmosis: number;
  /** The malleolus regions as half-spaces, in mm: each lies below its top; medial is medial of medialX, posterior behind posteriorZ and lateral of medialX. */
  regions: { lateralTop: number; medialTop: number; medialX: number; posteriorTop: number; posteriorZ: number };
  bands: Record<Exclude<FibulaMark, 'proximal'>, Band>;
  proximal: { x: number; z: number; y: [number, number] };
  /** occlusion is baked ambient occlusion per vertex, 0 open to 255 enclosed. */
  parts: { name: string; positions: Float32Array; index: Uint16Array; region: Uint8Array; occlusion: Uint8Array }[];
}

interface Manifest extends Omit<AnkleModel, 'parts'> {
  quant: { min: [number, number, number]; step: number };
  parts: { name: string; vertices: number; triangles: number; position: number; index: number; region: number; occlusion: number }[];
}

/** parseAnkleModel decodes ankle.bin: a JSON manifest, then quantised positions, indices, regions and occlusion per bone. */
export function parseAnkleModel(buffer: ArrayBuffer): AnkleModel {
  const jsonLength = new DataView(buffer).getUint32(0, true);
  const manifest = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, jsonLength))) as Manifest;
  const base = 4 + jsonLength;
  const { min, step } = manifest.quant;

  return {
    syndesmosis: manifest.syndesmosis,
    regions: manifest.regions,
    bands: manifest.bands,
    proximal: manifest.proximal,
    parts: manifest.parts.map((p) => {
      const q = new Uint16Array(buffer, base + p.position, p.vertices * 3);
      const positions = new Float32Array(q.length);
      for (let i = 0; i < q.length; i++) positions[i] = min[i % 3] + q[i] * step;
      return {
        name: p.name,
        positions,
        index: new Uint16Array(buffer, base + p.index, p.triangles * 3),
        region: new Uint8Array(buffer, base + p.region, p.vertices),
        occlusion: new Uint8Array(buffer, base + p.occlusion, p.vertices),
      };
    }),
  };
}
