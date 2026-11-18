-- 000011_unique_case_response_per_user.up.sql
-- One response per rater per case. The service pre-check races under concurrent
-- submissions; this index is the real guarantee. Not CONCURRENTLY: golang-migrate
-- runs the file in a single multi-statement exec.
-- Existing idx_case_responses_user_case and idx_case_responses_case_created stay:
-- they lead with user_id / sort by created_at, which this index cannot serve.

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_responses_case_user_unique
    ON case_responses (case_id, user_id);
