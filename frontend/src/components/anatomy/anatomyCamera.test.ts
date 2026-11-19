import { describe, expect, it } from 'vitest';
import type { FractureInput } from '@/types';
import { presetFor, type Focus } from './anatomyCamera';
import { getAnatomyState } from './anatomyState';

const at = (form: Partial<FractureInput>, posteriorAsked = false): Focus => ({ state: getAnatomyState(form), posteriorAsked });
const none = at({});
const tri = { involved_malleoli: 'trimaleolar' } as const;

describe('presetFor', () => {
  it('turns to the one malleolus a first answer involves', () => {
    expect(presetFor(none, at({ involved_malleoli: 'lateral_only' }))).toBe('anterolateral');
    expect(presetFor(none, at({ involved_malleoli: 'medial_only' }))).toBe('medial');
    expect(presetFor(none, at({ involved_malleoli: 'posterior_only' }))).toBe('posterior');
  });

  it('turns to AP when one answer involves several malleoli', () => {
    expect(presetFor(none, at(tri))).toBe('ap');
    expect(presetFor(none, at({ involved_malleoli: 'lateral_medial' }))).toBe('ap');
    expect(presetFor(none, at({ involved_malleoli: 'lateral_posterior' }))).toBe('ap');
  });

  it('follows a trimalleolar answer once per step: AP, the fibula, then the posterior malleolus', () => {
    const level = at({ ...tri, fibular_level: 'suprasindesmal' });
    const asked = at({ ...tri, fibular_level: 'suprasindesmal' }, true);
    const typed = at({ ...tri, fibular_level: 'suprasindesmal', posterior_fracture_type: 'extraincisural' });
    expect(presetFor(at(tri), level)).toBe('anterolateral');
    expect(presetFor(level, asked)).toBe('posterior');
    expect(presetFor(asked, typed)).toBe('posterior');
    expect(presetFor(typed, typed)).toBeUndefined();
    expect(presetFor(level, none)).toBeUndefined();
  });
});
