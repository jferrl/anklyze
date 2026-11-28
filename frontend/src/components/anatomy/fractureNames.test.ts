import { describe, expect, it } from 'vitest';
import en from '@/i18n/en.json';
import es from '@/i18n/es.json';
import { fractureParams } from './fractureParams';
import { fragmentName } from './fractureNames';

describe('fragmentName', () => {
  it('names every piece and bone, with a string in both languages', () => {
    for (const id of [...fractureParams.pieces.map((p) => p.id), 'tibia', 'fibula', 'talus']) {
      const name = fragmentName(id);
      expect(en.anatomy.fragments[name], id).toBeTruthy();
      expect(es.anatomy.fragments[name], id).toBeTruthy();
    }
  });

  it('tells the posteromedial and butterfly pieces apart from their neighbours', () => {
    expect(fragmentName('post_b2')).toBe('posterior');
    expect(fragmentName('post_b3_pm')).toBe('posteromedial');
    expect(fragmentName('fib_supra_wedge')).toBe('butterfly');
    expect(fragmentName('fib_supra')).toBe('distalFibula');
    expect(fragmentName('med_vertical')).toBe('medial');
  });
});
