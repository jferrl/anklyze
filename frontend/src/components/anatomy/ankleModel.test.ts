/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseAnkleModel, Region } from './ankleModel';

// Vitest runs from frontend/.
const file = readFileSync('public/models/ankle/ankle.bin');
const model = parseAnkleModel(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength));
const part = (name: string) => model.parts.find((p) => p.name === name)!;
const ys = (name: string, region: number) => {
  const p = part(name);
  return Array.from(p.region.keys()).filter((i) => p.region[i] === region).map((i) => p.positions[i * 3 + 1]);
};

describe('parseAnkleModel', () => {
  it('decodes the four bones with in-range indices', () => {
    expect(model.parts.map((p) => p.name)).toEqual(['tibia', 'fibula', 'talus', 'calcaneus']);
    for (const p of model.parts) {
      expect(Math.max(...p.index)).toBeLessThan(p.positions.length / 3);
    }
  });

  it('tags each malleolus at the joint, not up the shaft', () => {
    for (const [name, region] of [['fibula', Region.lateral], ['tibia', Region.medial], ['tibia', Region.posterior]] as const) {
      const y = ys(name, region);
      expect(y.length).toBeGreaterThan(20);
      expect(Math.max(...y)).toBeLessThan(13);
    }
  });

  it('puts the medial malleolus medial to the fibula, as on a right ankle', () => {
    const x = (name: string, region: number) => {
      const p = part(name);
      const xs = Array.from(p.region.keys()).filter((i) => p.region[i] === region).map((i) => p.positions[i * 3]);
      return xs.reduce((a, b) => a + b, 0) / xs.length;
    };
    expect(x('tibia', Region.medial)).toBeGreaterThan(x('fibula', Region.lateral));
  });

  it('stacks the fibular level bands from the joint upwards', () => {
    const { infra, trans, supra, supra_far } = model.bands;
    expect(infra.y[1]).toBeLessThanOrEqual(0);
    expect(trans.y[0]).toBeGreaterThanOrEqual(0);
    expect(trans.y[1]).toBeLessThan(supra.y[0]);
    expect(supra.y[1]).toBeLessThan(60);
    expect(supra_far.y[0]).toBeGreaterThan(60);
  });
});
