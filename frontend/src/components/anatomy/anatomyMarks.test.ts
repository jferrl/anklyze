import { describe, expect, it } from 'vitest';
import type { FractureInput } from '@/types';
import { marksFor } from './anatomyMarks';
import { getAnatomyState } from './anatomyState';

const marks = (form: Partial<FractureInput>) => marksFor(getAnatomyState({ involved_malleoli: 'lateral_only', ...form }));

describe('marksFor', () => {
  it('marks the malleolus while the level is unanswered', () => {
    expect(marks({})).toMatchObject({ lateral: true, lateralTop: undefined, band: undefined, syndesmosis: true });
  });

  it('draws a fracture at the malleolus as one region topped by the level', () => {
    expect(marks({ fibular_level: 'infrasindesmal' })).toMatchObject({ lateral: true, lateralTop: 'infra', band: undefined });
    expect(marks({ fibular_level: 'transindesmal' })).toMatchObject({ lateral: true, lateralTop: 'trans', band: undefined });
  });

  it('draws a fracture above the malleolus as the level alone, never two lesions', () => {
    expect(marks({ fibular_level: 'suprasindesmal' })).toMatchObject({ lateral: false, band: 'supra' });
    expect(marks({ fibular_level: 'suprasindesmal', fibula_trace_pattern: 'suprasindesmotic_far' })).toMatchObject({ lateral: false, band: 'supra_far' });
    expect(marks({ fibular_level: 'suprasindesmal', suprasindesmal_type: 'proximal' })).toMatchObject({ lateral: false, band: undefined, proximal: true });
  });

  it('leaves the fibula unmarked when it is not involved', () => {
    expect(marksFor(getAnatomyState({ involved_malleoli: 'medial_only' }))).toMatchObject({ lateral: false, medial: true, syndesmosis: false });
  });
});
