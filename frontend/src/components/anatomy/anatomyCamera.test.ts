import { describe, expect, it } from 'vitest';
import type { FractureInput } from '@/types';
import { presetFor } from './anatomyCamera';
import { getAnatomyState } from './anatomyState';

const state = (form: Partial<FractureInput>) => getAnatomyState(form);
const none = state({});

describe('presetFor', () => {
  it('turns to the region a first answer involves', () => {
    expect(presetFor(none, state({ involved_malleoli: 'lateral_only' }))).toBe('anterolateral');
    expect(presetFor(none, state({ involved_malleoli: 'medial_only' }))).toBe('medial');
    expect(presetFor(none, state({ involved_malleoli: 'posterior_only' }))).toBe('posterior');
  });

  it('gives several malleoli one view: posterior first, then AP for both sides', () => {
    expect(presetFor(none, state({ involved_malleoli: 'trimaleolar' }))).toBe('posterior');
    expect(presetFor(none, state({ involved_malleoli: 'lateral_posterior' }))).toBe('posterior');
    expect(presetFor(none, state({ involved_malleoli: 'lateral_medial' }))).toBe('ap');
  });

  it('turns to the fibula when its level is answered, and stays put otherwise', () => {
    const lateral = state({ involved_malleoli: 'trimaleolar' });
    const level = state({ involved_malleoli: 'trimaleolar', fibular_level: 'suprasindesmal' });
    expect(presetFor(lateral, level)).toBe('anterolateral');
    expect(presetFor(level, state({ involved_malleoli: 'trimaleolar', fibular_level: 'suprasindesmal', posterior_fracture_type: 'extraincisural' }))).toBeUndefined();
    expect(presetFor(level, none)).toBeUndefined();
  });
});
