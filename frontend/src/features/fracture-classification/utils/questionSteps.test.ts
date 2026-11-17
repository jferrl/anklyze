import { describe, it, expect } from 'vitest';
import { getLocalFormOptions } from '@/utils/formOptions';
import type { FractureInput } from '@/types';
import { getQuestionSteps } from './questionSteps';

const ids = (formData: Partial<FractureInput>, hasTACImages?: boolean) =>
  getQuestionSteps(formData, getLocalFormOptions(), hasTACImages).map((s) => s.id);

describe('getQuestionSteps', () => {
  it('starts with only the malleoli question', () => {
    expect(ids({})).toEqual(['involved_malleoli']);
  });

  it('walks a trimalleolar transindesmal path in tree order', () => {
    const formData: Partial<FractureInput> = {
      involved_malleoli: 'trimaleolar',
      fibular_level: 'transindesmal',
      fibula_trace_count: 'single',
      lateral_morphology: 'simple',
      medial_subtype: 'transverse',
      has_ct_scan: true,
    } as Partial<FractureInput>;
    expect(ids(formData)).toEqual([
      'involved_malleoli',
      'fibular_level',
      'fibula_trace_count',
      'lateral_morphology',
      'medial_subtype',
      'has_ct_scan',
      'posterior_fracture_type',
    ]);
    // Case images answer the CT question, so it is not asked.
    expect(ids(formData, true)).not.toContain('has_ct_scan');
    expect(ids({ ...formData, has_ct_scan: false }, false)).not.toContain('posterior_fracture_type');
  });

  it('maps yes/no answers back to form values', () => {
    const [, articular] = getQuestionSteps({ involved_malleoli: 'medial_only' }, getLocalFormOptions());
    expect(articular.toPatch('true')).toEqual({ articular_involvement: 'large_with_extension' });
    expect(articular.toPatch('false')).toEqual({ articular_involvement: 'small_without_extension' });
  });
});
