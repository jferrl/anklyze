import { describe, expect, it } from 'vitest';
import { getAnatomyState } from './anatomyState';
import { drawnPosteriorType } from './drawnPosterior';

describe('drawnPosteriorType', () => {
  it('names the fragment drawn on a posterior-only path that never asks the type', () => {
    const state = getAnatomyState({ involved_malleoli: 'posterior_only', articular_involvement: 'large_with_extension', has_articular_depression: true });
    expect(drawnPosteriorType(state)).toBe('large_posterolateral');
  });

  it('agrees with the answered type, and names the two-part fragment', () => {
    for (const type of ['extraincisural', 'posterolateral', 'posteromedial_posterolateral', 'large_posterolateral'] as const) {
      const state = getAnatomyState({ involved_malleoli: 'trimaleolar', posterior_fracture_type: type });
      expect(drawnPosteriorType(state)).toBe(type);
    }
  });
});
