import { describe, expect, it } from 'vitest';
import { getAnatomyState } from './anatomyState';

describe('getAnatomyState', () => {
  it('shows nothing before the first answer', () => {
    expect(getAnatomyState({})).toEqual({ lateral: false, medial: false, posterior: false, fibula: undefined, posteriorType: undefined, complete: false });
  });

  it.each([
    ['lateral_only', true, false, false],
    ['medial_only', false, true, false],
    ['posterior_only', false, false, true],
    ['lateral_medial', true, true, false],
    ['lateral_posterior', true, false, true],
    ['medial_posterior', false, true, true],
    ['trimaleolar', true, true, true],
  ] as const)('%s highlights lateral=%s medial=%s posterior=%s', (m, lateral, medial, posterior) => {
    expect(getAnatomyState({ involved_malleoli: m })).toMatchObject({ lateral, medial, posterior });
  });

  it('marks the fibular level once it is answered', () => {
    expect(getAnatomyState({ involved_malleoli: 'lateral_only' }).fibula).toBeUndefined();
    expect(getAnatomyState({ involved_malleoli: 'lateral_only', fibular_level: 'infrasindesmal' }).fibula).toBe('infra');
    expect(getAnatomyState({ involved_malleoli: 'trimaleolar', fibular_level: 'transindesmal' }).fibula).toBe('trans');
    expect(getAnatomyState({ involved_malleoli: 'lateral_medial', fibular_level: 'suprasindesmal' }).fibula).toBe('supra');
  });

  it('places suprasyndesmotic fractures by type and trace pattern', () => {
    const supra = { involved_malleoli: 'trimaleolar', fibular_level: 'suprasindesmal' } as const;
    expect(getAnatomyState({ ...supra, suprasindesmal_type: 'simple_diaphyseal', fibula_trace_pattern: 'parasindesmotic_long' }).fibula).toBe('supra');
    expect(getAnatomyState({ ...supra, suprasindesmal_type: 'multifragmentary', fibula_trace_pattern: 'suprasindesmotic_far' }).fibula).toBe('supra_far');
    expect(getAnatomyState({ ...supra, suprasindesmal_type: 'proximal' })).toMatchObject({ fibula: 'proximal', lateral: false });
  });

  it('reads an infrasyndesmotic fibula from the bimalleolar vertical-medial question', () => {
    const base = { involved_malleoli: 'lateral_medial', medial_morphology: 'vertical' } as const;
    expect(getAnatomyState({ ...base, fibula_infrasindesmal_transverse: true }).fibula).toBe('infra');
    expect(getAnatomyState({ ...base, fibula_infrasindesmal_transverse: false }).fibula).toBeUndefined();
  });

  it('never marks the fibula without a lateral fracture', () => {
    expect(getAnatomyState({ involved_malleoli: 'medial_only', fibular_level: 'transindesmal' }).fibula).toBeUndefined();
  });

  it('carries the posterior fragment type as text only', () => {
    expect(getAnatomyState({ involved_malleoli: 'posterior_only', posterior_fracture_type: 'posterolateral' }).posteriorType).toBe('posterolateral');
  });
});
