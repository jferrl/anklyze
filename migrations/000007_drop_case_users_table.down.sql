-- 000007_drop_case_users_table.down.sql
-- Recreate access control tables.

CREATE TABLE IF NOT EXISTS case_users (
    id UUID PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id),
    user_id UUID NOT NULL,
    user_email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT idx_case_user UNIQUE (case_id, user_id)
);

CREATE TABLE IF NOT EXISTS study_raters (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id         UUID        NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    user_id          UUID        NOT NULL,
    user_email       VARCHAR(255),
    cases_completed  INTEGER     NOT NULL DEFAULT 0,
    last_response_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_study_rater ON study_raters (study_id, user_id);
