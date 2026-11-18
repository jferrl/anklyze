/// <reference types="@testing-library/jest-dom" />
import { beforeAll, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import i18n from '@/i18n/config';
import type { CohensKappaResult, FleissKappaResult, StudyReliabilityResponse } from '@/types';
import { StudyKappaAnalysis } from './StudyKappaAnalysis';

const fleiss: FleissKappaResult = {
  kappa: 0.55,
  interpretation: 'moderate',
  num_subjects: 8,
  num_raters: 2,
  num_categories: 3,
  num_cases_excluded: 2,
  confidence_interval: { lower: 0.2, upper: 0.8, level: 0.95 },
};

const cohen: CohensKappaResult = {
  kappa: 0.4,
  interpretation: 'fair',
  num_subjects: 8,
  num_cases_excluded: 2,
  confidence_interval: { lower: -0.17, upper: 0.97, level: 0.95 },
  weighted_kappa: { kappa: 0.47, type: 'linear', num_pairs: 4, num_pairs_excluded: 2 },
};

const base: StudyReliabilityResponse = {
  calculated_at: '2026-01-01T00:00:00Z',
  study_id: 's1',
  study_title: 'Study',
  total_cases: 10,
  total_responses: 20,
  unique_raters: 2,
  complete_raters: 2,
  per_case_metrics: [],
  lauge_hansen_fleiss: fleiss,
  ao_ota_fleiss: fleiss,
};

describe('StudyKappaAnalysis', () => {
  beforeAll(() => i18n.changeLanguage('en'));

  it('shows Cohen, weighted kappa and the excluded counts for two raters', () => {
    render(
      <StudyKappaAnalysis
        reliability={{ ...base, lauge_hansen_cohen: cohen, ao_ota_cohen: cohen }}
      />
    );

    expect(screen.getByRole('heading', { name: /Cohen's kappa/ })).toBeInTheDocument();
    expect(screen.getByText('AO/OTA weighted kappa (linear)')).toBeInTheDocument();
    expect(screen.getByText(/4 pairs of ratings; 2 excluded/)).toBeInTheDocument();
    expect(screen.getAllByText(/2 cases excluded/).length).toBeGreaterThan(0);
  });

  it('shows no Cohen section without two raters', () => {
    render(<StudyKappaAnalysis reliability={base} />);

    expect(screen.queryByRole('heading', { name: /Cohen's kappa/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/weighted kappa/)).not.toBeInTheDocument();
  });

  it('says why a kappa is undefined, and keeps "Not enough data" for a missing result', () => {
    const undefinedKappa: FleissKappaResult = {
      ...fleiss,
      kappa: null,
      interpretation: undefined,
      kappa_unavailable_reason: 'no_variation',
      num_categories: 1,
      confidence_interval: undefined,
    };
    render(<StudyKappaAnalysis reliability={{ ...base, lauge_hansen_fleiss: undefinedKappa }} />);

    expect(screen.getByText('Undefined: every rater gave the same answer on every case')).toBeInTheDocument();
    expect(screen.getAllByText('Not enough data')).toHaveLength(2);
    expect(screen.getAllByText('0.55')).toHaveLength(1);
  });

  it('cautions under a kappa from fewer than ten cases, with two decimals', () => {
    render(<StudyKappaAnalysis reliability={base} />);

    expect(screen.getAllByText('Based on 8 cases; interpret with caution')).toHaveLength(2);
    expect(screen.getAllByText('0.55')).toHaveLength(2);
  });
});
