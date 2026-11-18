import { describe, it, expect } from 'vitest';
import { buildSubmitResponseRequest } from './responsePayload';
import { mockFractureInput, mockClassificationResult } from '@/test/mocks/mockData';
import type { FractureInput } from '@/types';

describe('buildSubmitResponseRequest', () => {
  it('sends the classified input, including has_ct_scan', () => {
    const input: FractureInput = { ...mockFractureInput, has_ct_scan: false };

    const body = buildSubmitResponseRequest(input, mockClassificationResult, 1200, null);

    expect(body.input).toEqual(input);
    expect(body.input.has_ct_scan).toBe(false);
    expect(body.classification).toBe(mockClassificationResult);
    expect(body.time_taken_ms).toBe(1200);
    expect(body).not.toHaveProperty('answer_path');
  });

  it('adds tracking as analytics fields', () => {
    const tracking = {
      answerPath: [{ question: 'involved_malleoli', answer: 'lateral_only', timestamp: 5 }],
      decisionPath: 'lateral_only',
      timePerQuestion: { involved_malleoli: 5 },
      backClicks: 1,
    };

    const body = buildSubmitResponseRequest(mockFractureInput, mockClassificationResult, 10, tracking);

    expect(body.answer_path).toEqual(tracking.answerPath);
    expect(body.decision_path).toBe('lateral_only');
    expect(body.time_per_question).toEqual({ involved_malleoli: 5 });
    expect(body.back_clicks).toBe(1);
  });
});
