import { describe, expect, it } from 'vitest';
import type { StudyGoldStandardResponse, StudyReliabilityResponse } from '@/types';
import { buildReliabilityFiguresCsv, csvField, fileSlug } from './reliabilityCsv';

const reliability: StudyReliabilityResponse = {
  calculated_at: '2026-01-01T00:00:00Z',
  study_id: 's1',
  study_title: 'Study',
  total_cases: 3,
  total_responses: 9,
  unique_raters: 3,
  complete_raters: 3,
  lauge_hansen_fleiss: {
    kappa: 0.123456789,
    interpretation: 'slight',
    num_subjects: 3,
    num_raters: 3,
    num_categories: 4,
    num_cases_excluded: 1,
    confidence_interval: { lower: -0.0512345, upper: 0.4, level: 0.95 },
  },
  per_case_metrics: [
    { case_order: 1, case_id: 'a', case_title: 'A', response_count: 3, lauge_hansen_agreement: 100, danis_weber_agreement: 50, ao_ota_agreement: 0, is_low_agreement: false },
    { case_order: 2, case_id: 'b', case_title: 'B', response_count: 3, lauge_hansen_agreement: 33.333333, danis_weber_agreement: 50, ao_ota_agreement: 0, is_low_agreement: true },
    // Unanswered: the backend's 100% must not pull the mean up.
    { case_order: 3, case_id: 'c', case_title: 'C', response_count: 0, lauge_hansen_agreement: 100, danis_weber_agreement: 100, ao_ota_agreement: 100, is_low_agreement: false },
  ],
};

const gold = {
  lauge_hansen_accuracy: { system: 'lauge_hansen', mean_accuracy: 66.6666667, cases_evaluated: 2, consensus_correct: 1, consensus_total: 2, consensus_rate: 50 },
} as unknown as StudyGoldStandardResponse;

describe('buildReliabilityFiguresCsv', () => {
  it('writes one CRLF row per system at full precision, blank where absent', () => {
    const lines = buildReliabilityFiguresCsv(reliability, gold).split('\r\n');

    expect(lines[0]).toBe(
      'system,kappa,ci_lower,ci_upper,ci_level,raters,cases,cases_excluded,mean_agreement_pct,gold_standard_accuracy_pct'
    );
    expect(lines[1]).toBe('Lauge-Hansen,0.123456789,-0.0512345,0.4,0.95,3,3,1,66.6666665,66.6666667');
    expect(lines[2]).toBe('Danis-Weber,,,,,,,,50,');
    expect(lines[4]).toBe('Bartonicek,,,,,,,,,');
    expect(lines).toHaveLength(6);
    expect(lines[5]).toBe('');
  });

  it('leaves the accuracy column blank without gold standard metrics', () => {
    const row = buildReliabilityFiguresCsv(reliability).split('\r\n')[1];
    expect(row.endsWith(',66.6666665,')).toBe(true);
  });
});

describe('csvField', () => {
  it('quotes commas, quotes and line breaks per RFC 4180', () => {
    expect(csvField('plain')).toBe('plain');
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('a\nb')).toBe('"a\nb"');
    expect(csvField(null)).toBe('');
    expect(csvField(0)).toBe('0');
  });
});

describe('fileSlug', () => {
  it('strips accents and punctuation', () => {
    expect(fileSlug('Estudio piloto: tobillo — 2026 ')).toBe('estudio-piloto-tobillo-2026');
    expect(fileSlug('***')).toBe('study');
  });
});
