import type {
  ClassificationResult,
  FractureInput,
  QuestionAnswer,
  SubmitResponseRequest,
} from '@/types';

interface ResponseTracking {
  answerPath: QuestionAnswer[];
  decisionPath: string;
  timePerQuestion: Record<string, number>;
  backClicks: number;
}

/**
 * Builds the response submission payload. `input` must be the exact form state
 * that produced `classification` (including has_ct_scan): the server classifies
 * it again and rejects a result that differs.
 */
export function buildSubmitResponseRequest(
  input: FractureInput,
  classification: ClassificationResult,
  timeTakenMs: number,
  tracking: ResponseTracking | null,
): SubmitResponseRequest {
  return {
    input,
    classification,
    time_taken_ms: timeTakenMs,
    ...(tracking && {
      answer_path: tracking.answerPath,
      decision_path: tracking.decisionPath,
      time_per_question: tracking.timePerQuestion,
      back_clicks: tracking.backClicks,
    }),
  };
}
