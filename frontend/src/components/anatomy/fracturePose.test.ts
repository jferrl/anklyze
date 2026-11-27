import { describe, expect, it } from 'vitest';
import { getLocalFormOptions } from '@/utils/formOptions';
import type { FractureInput } from '@/types';
import { getQuestionSteps } from '@/features/fracture-classification/utils/questionSteps';
import { isFormComplete } from '@/features/fracture-classification/utils/formValidation';
import { getAnatomyState } from './anatomyState';
import { cutShown, drawnPosteriorType, fracturePose, fragmentOf } from './fracturePose';
import { fractureParams, type PieceId } from './fractureParams';

// Mirrors ClassificationFormQuestions: case images answer the CT question on every update.
function completeForms(hasTAC: boolean): Partial<FractureInput>[] {
  const out: Partial<FractureInput>[] = [];
  const visit = (form: Partial<FractureInput>) => {
    const step = getQuestionSteps(form, getLocalFormOptions(), hasTAC).find((s) => s.value === undefined);
    if (!step) {
      if (isFormComplete(form)) out.push(form);
      return;
    }
    for (const o of step.options) visit({ ...form, ...step.toPatch(o.value), has_ct_scan: hasTAC });
  };
  visit({});
  return out;
}

const forms = [...completeForms(true), ...completeForms(false)];
const boneOf = (id: PieceId) => fractureParams.pieces.find((p) => p.id === id)!.bone;
const pose = (form: Partial<FractureInput>) => fracturePose(getAnatomyState(form));

describe('fracturePose', () => {
  it('covers every reachable answer', () => {
    expect(forms.length).toBeGreaterThan(100);
    for (const form of forms) {
      const state = getAnatomyState(form);
      const { pieces } = fracturePose(state);
      expect(new Set(pieces).size).toBe(pieces.length);
      const fibulaInvolved = !!state.fibula;
      for (const id of pieces) {
        if (boneOf(id) === 'fibula') expect(fibulaInvolved, `${id} in ${JSON.stringify(form)}`).toBe(true);
        else if (id.startsWith('med_')) expect(state.medial, `${id} in ${JSON.stringify(form)}`).toBe(true);
        else if (id.startsWith('post_')) expect(state.posterior, `${id} in ${JSON.stringify(form)}`).toBe(true);
        else expect(state.medial || state.posterior, `${id} in ${JSON.stringify(form)}`).toBe(true);
      }
      const hasFibulaPiece = pieces.some((id) => boneOf(id) === 'fibula');
      expect(hasFibulaPiece, JSON.stringify(form)).toBe(fibulaInvolved && state.fibula !== 'proximal');
      if (state.medial && state.medialSubtype !== 'open_mortise') {
        expect(pieces.some((id) => id.startsWith('med_')), JSON.stringify(form)).toBe(true);
      }
      if (state.posterior) expect(pieces.some((id) => id.startsWith('post_')), JSON.stringify(form)).toBe(true);
    }
  });

  it('keeps the fibula at its level', () => {
    const allowed: Record<string, RegExp> = {
      infra: /^fib_(tip_avulsion|infra)$/,
      trans: /^fib_trans_/,
      supra: /^fib_supra(_wedge)?$/,
      supra_far: /^fib_supra_far$/,
    };
    for (const form of forms) {
      const state = getAnatomyState(form);
      if (!state.fibula || state.fibula === 'proximal') continue;
      for (const id of fracturePose(state).pieces.filter((p) => p.startsWith('fib_'))) {
        expect(id, JSON.stringify(form)).toMatch(allowed[state.fibula]);
      }
    }
  });

  it('moves nothing until complete', () => {
    const form: Partial<FractureInput> = {
      involved_malleoli: 'trimaleolar',
      fibular_level: 'transindesmal',
      fibula_trace_count: 'single',
      lateral_morphology: 'spiral',
      medial_subtype: 'malleolus_fracture',
      has_ct_scan: true,
    };
    expect(pose(form).moves).toEqual({});
    expect(pose(form).pieces.length).toBeGreaterThan(0);
    const done = pose({ ...form, posterior_fracture_type: 'posterolateral' });
    expect(Object.keys(done.moves)).toEqual(expect.arrayContaining(['fib_trans_spiral', 'med_transverse', 'post_b2', 'talus']));
  });

  it('draws only what is answered', () => {
    expect(pose({ involved_malleoli: 'trimaleolar' }).pieces).toEqual([]);
    const pieces = pose({ involved_malleoli: 'trimaleolar', fibular_level: 'transindesmal' }).pieces;
    expect(pieces.length).toBeGreaterThan(0);
    for (const id of pieces) expect(id).toMatch(/^fib_/);
  });

  it('keeps a stable lateral Weber B in place', () => {
    const { pieces, moves } = pose({
      involved_malleoli: 'lateral_only',
      fibular_level: 'transindesmal',
      fibula_trace_count: 'single',
      lateral_morphology: 'spiral',
      lateral_subtype: 'simple',
    });
    expect(pieces).toEqual(['fib_trans_spiral']);
    expect(moves.fib_trans_spiral).toBeDefined();
    expect(moves.talus).toBeUndefined();
    expect(moves.fibula).toBeUndefined();
  });

  it('moves the whole fibula only for a syndesmotic injury', () => {
    const base = { involved_malleoli: 'lateral_only', fibular_level: 'transindesmal', fibula_trace_count: 'single', lateral_morphology: 'spiral' } as const;
    expect(pose({ ...base, lateral_subtype: 'syndesmosis_rupture' }).moves).toMatchObject({ talus: expect.anything(), fibula: expect.anything() });
    const bimalleolar = pose({ ...base, involved_malleoli: 'lateral_medial', medial_morphology: 'transverse_oblique', medial_subtype: 'malleolus_fracture' });
    expect(bimalleolar.moves.talus).toBeDefined();
    expect(bimalleolar.moves.fibula).toBeUndefined();
  });

  it('keeps the talus in place for a vertical medial shear', () => {
    const { pieces, moves } = pose({ involved_malleoli: 'lateral_medial', medial_morphology: 'vertical', fibula_infrasindesmal_transverse: true });
    expect(pieces).toEqual(['fib_infra', 'med_vertical']);
    expect(moves.med_vertical).toBeDefined();
    expect(moves.talus).toBeUndefined();
  });

  it('opens the mortise without a medial cut', () => {
    const { pieces, moves } = pose({
      involved_malleoli: 'lateral_medial',
      medial_morphology: 'transverse_oblique',
      fibular_level: 'transindesmal',
      fibula_trace_count: 'single',
      lateral_morphology: 'oblique',
      medial_subtype: 'open_mortise',
    });
    expect(pieces).toEqual(['fib_trans_coronal']);
    expect(moves.talus).toBeDefined();
  });

  it.each<[string, Partial<FractureInput>, PieceId[]]>([
    ['tip avulsion', { involved_malleoli: 'lateral_only', fibular_level: 'infrasindesmal', infrasindesmal_morphology: 'avulsion' }, ['fib_tip_avulsion']],
    ['infra malleolus', { involved_malleoli: 'lateral_only', fibular_level: 'infrasindesmal', infrasindesmal_morphology: 'malleolus_fracture' }, ['fib_infra']],
    ['bimalleolar infra yes', { involved_malleoli: 'lateral_medial', medial_morphology: 'vertical', fibula_infrasindesmal_transverse: true }, ['fib_infra', 'med_vertical']],
    ['trans transverse', { involved_malleoli: 'trimaleolar', fibular_level: 'transindesmal', lateral_morphology: 'transverse' }, ['fib_trans_short']],
    ['trans comminuted', { involved_malleoli: 'lateral_only', fibular_level: 'transindesmal', lateral_morphology: 'conminuta' }, ['fib_trans_spiral', 'fib_trans_comm_a', 'fib_trans_comm_b']],
    ['trans multiple', { involved_malleoli: 'lateral_only', fibular_level: 'transindesmal', fibula_trace_count: 'multiple', lateral_morphology: 'spiral' }, ['fib_trans_spiral', 'fib_trans_wedge']],
    ['trans butterfly', { involved_malleoli: 'lateral_only', fibular_level: 'transindesmal', lateral_subtype: 'butterfly' }, ['fib_trans_spiral', 'fib_trans_wedge']],
    ['supra type unanswered', { involved_malleoli: 'lateral_only', fibular_level: 'suprasindesmal' }, []],
    ['supra simple', { involved_malleoli: 'lateral_only', fibular_level: 'suprasindesmal', suprasindesmal_type: 'simple_diaphyseal' }, ['fib_supra']],
    ['supra multifragmentary', { involved_malleoli: 'lateral_only', fibular_level: 'suprasindesmal', suprasindesmal_type: 'multifragmentary', fibula_trace_pattern: 'parasindesmotic_long' }, ['fib_supra', 'fib_supra_wedge']],
    ['supra far multifragmentary', { involved_malleoli: 'lateral_only', fibular_level: 'suprasindesmal', suprasindesmal_type: 'multifragmentary', fibula_trace_pattern: 'suprasindesmotic_far' }, ['fib_supra_far']],
    ['proximal', { involved_malleoli: 'lateral_only', fibular_level: 'suprasindesmal', suprasindesmal_type: 'proximal' }, []],
    ['medial only large', { involved_malleoli: 'medial_only', articular_involvement: 'large_with_extension', has_articular_depression: true }, ['art_depression', 'med_vertical']],
    ['medial only small', { involved_malleoli: 'medial_only', articular_involvement: 'small_without_extension' }, ['med_transverse']],
    ['medial only small vertical', { involved_malleoli: 'medial_only', articular_involvement: 'small_without_extension', medial_morphology: 'vertical' }, ['med_vertical']],
    ['medial unanswered', { involved_malleoli: 'medial_posterior' }, []],
    ['posterior only large', { involved_malleoli: 'posterior_only', articular_involvement: 'large_with_extension' }, ['post_b4']],
    ['posterior only small', { involved_malleoli: 'posterior_only', articular_involvement: 'small_without_extension' }, ['post_b1']],
    ['posterior only small typed', { involved_malleoli: 'posterior_only', articular_involvement: 'small_without_extension', posterior_fracture_type: 'posterolateral' }, ['post_b2']],
    ['bartonicek 3', { involved_malleoli: 'medial_posterior', posterior_fracture_type: 'posteromedial_posterolateral' }, ['post_b2', 'post_b3_pm']],
    ['bartonicek 4', { involved_malleoli: 'medial_posterior', posterior_fracture_type: 'large_posterolateral' }, ['post_b4']],
    ['extraincisural posteromedial', { involved_malleoli: 'medial_posterior', posterior_fracture_type: 'extraincisural_posteromedial' }, ['post_pm_extraincisural']],
    ['posteromedial flag', { involved_malleoli: 'lateral_posterior', is_posterior_posteromedial: true }, ['post_pm_extraincisural']],
  ])('maps %s', (_, form, expected) => {
    expect(pose(form).pieces).toEqual(expected);
  });

  it.each<[string, Partial<FractureInput>, keyof FractureInput, PieceId[]]>([
    ['medial_posterior without CT', { involved_malleoli: 'medial_posterior', has_ct_scan: false }, 'has_ct_scan', ['med_transverse', 'post_b2']],
    ['medial_posterior with CT', { involved_malleoli: 'medial_posterior', has_ct_scan: true, posterior_fracture_type: 'extraincisural' }, 'posterior_fracture_type', ['med_transverse', 'post_b1']],
    ['lateral_posterior without CT', { involved_malleoli: 'lateral_posterior', fibular_level: 'transindesmal', lateral_morphology: 'spiral', has_ct_scan: false }, 'has_ct_scan', ['fib_trans_spiral', 'post_b2']],
  ])('draws the generic piece for a type never asked: %s', (_, form, last, expected) => {
    expect(pose(form).pieces).toEqual(expected);
    const short = pose({ ...form, [last]: undefined }).pieces;
    expect(short).not.toContain('med_transverse');
    expect(short).not.toContain('post_b2');
  });

  it('returns to the same pose', () => {
    const tri: Partial<FractureInput> = {
      involved_malleoli: 'trimaleolar',
      fibular_level: 'suprasindesmal',
      suprasindesmal_type: 'simple_diaphyseal',
      fibula_trace_pattern: 'parasindesmotic_short',
      has_ct_scan: true,
      posterior_fracture_type: 'extraincisural',
    };
    const first = pose(tri);
    pose({ ...tri, involved_malleoli: 'lateral_only' });
    expect(pose(tri)).toEqual(first);
  });
});

describe('cutShown', () => {
  it('hides faces inside one fragment', () => {
    expect(fragmentOf(0b11, [0, 1])).toBe(0);
    expect(fragmentOf(0b10, [0])).toBe(-1);
    expect(cutShown(0b11, 0b01, [0, 1])).toBe(false);
    expect(cutShown(0b01, 0b00, [0, 1])).toBe(true);
    expect(cutShown(0b10, 0b00, [0])).toBe(false);
  });
});

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
