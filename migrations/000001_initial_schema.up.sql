-- 000001_initial_schema.up.sql
-- Anklyze database schema.
--
-- Improvements over the original:
--   - Foreign keys on all relationships (referential integrity + query planner hints)
--   - NOT NULL DEFAULT NOW() on all created_at/updated_at columns
--   - INTEGER for Go `int` fields, BIGINT only for Go `int64` fields
--   - Composite indexes matching actual repository query patterns
--   - Removed low-cardinality single-column indexes (boolean, status, language, rating)
--   - Tables ordered by dependency (parents before children)

-- ============================================================================
-- INDEPENDENT TABLES (no foreign key dependencies)
-- ============================================================================

-- audit_entries: classification audit log (domain.AuditEntry)
CREATE TABLE IF NOT EXISTS audit_entries (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    client_ip         VARCHAR(45),
    user_agent        TEXT,
    language          VARCHAR(10) NOT NULL,
    input             JSONB       NOT NULL,
    result            JSONB       NOT NULL,
    is_impossible     BOOLEAN     NOT NULL DEFAULT FALSE,
    danis_weber_type  VARCHAR(10),
    lauge_hansen_type VARCHAR(5),
    ao_ota_code       VARCHAR(10),
    duration_ms       BIGINT
);

-- Primary filter for all analytics time-range queries
CREATE INDEX IF NOT EXISTS idx_audit_entries_created_at ON audit_entries (created_at);

-- users: application users mirroring Supabase auth (domain.User)
CREATE TABLE IF NOT EXISTS users (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email            VARCHAR(255) NOT NULL,
    role             VARCHAR(20)  NOT NULL DEFAULT 'user',
    display_name     VARCHAR(255),
    avatar_url       VARCHAR(500),
    provider         VARCHAR(50),
    last_login_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    years_experience INTEGER,
    specialty        VARCHAR(50),
    training_level   VARCHAR(50),
    institution      VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- chat_sessions: chat conversation audit tracking (domain.ChatSession)
CREATE TABLE IF NOT EXISTS chat_sessions (
    id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    client_ip           VARCHAR(45),
    user_agent          TEXT,
    language            VARCHAR(10)      NOT NULL,
    status              VARCHAR(20)      NOT NULL,
    total_messages      INTEGER          NOT NULL DEFAULT 0,
    clarification_count INTEGER          NOT NULL DEFAULT 0,
    final_confidence    DOUBLE PRECISION,
    danis_weber_type    VARCHAR(10),
    lauge_hansen_type   VARCHAR(5),
    ao_ota_code         VARCHAR(10),
    duration_ms         BIGINT
);

-- Primary filter for all analytics time-range queries
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions (created_at);

-- ============================================================================
-- TABLES WITH FOREIGN KEYS
-- ============================================================================

-- chat_messages: individual chat messages (domain.ChatMessage)
CREATE TABLE IF NOT EXISTS chat_messages (
    id              UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID             NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    role            VARCHAR(10)      NOT NULL,
    content         TEXT             NOT NULL,
    message_type    VARCHAR(25)      NOT NULL,
    extracted_input JSONB,
    confidence      DOUBLE PRECISION,
    processing_ms   BIGINT
);

-- Queries always filter by session, often ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages (session_id, created_at);

-- chat_feedback: user feedback on chat classifications (domain.ChatFeedback)
CREATE TABLE IF NOT EXISTS chat_feedback (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID        NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rating     VARCHAR(10) NOT NULL,
    comment    TEXT,
    client_ip  VARCHAR(45)
);

-- One feedback per session; UNIQUE also serves as the FK index
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_feedback_session_id ON chat_feedback (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_created_at ON chat_feedback (created_at);

-- studies: groups of cases for reliability analysis (domain.Study)
CREATE TABLE IF NOT EXISTS studies (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by      UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(20)  NOT NULL DEFAULT 'draft',
    case_count      INTEGER      NOT NULL DEFAULT 0,
    total_responses INTEGER      NOT NULL DEFAULT 0,
    unique_raters   INTEGER      NOT NULL DEFAULT 0,
    complete_raters INTEGER      NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_studies_created_at ON studies (created_at);
CREATE INDEX IF NOT EXISTS idx_studies_created_by ON studies (created_by);

-- cases: patient cases for classification (domain.Case)
CREATE TABLE IF NOT EXISTS cases (
    id                          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    published_at                TIMESTAMPTZ,
    closed_at                   TIMESTAMPTZ,
    created_by                  UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title                       VARCHAR(255) NOT NULL,
    description                 TEXT,
    status                      VARCHAR(20)  NOT NULL DEFAULT 'draft',
    deadline                    TIMESTAMPTZ,
    has_tac_images              BOOLEAN      NOT NULL DEFAULT FALSE,
    response_count              INTEGER      NOT NULL DEFAULT 0,
    unique_users                INTEGER      NOT NULL DEFAULT 0,
    reference_classification    JSONB,
    show_reference_after_submit BOOLEAN      NOT NULL DEFAULT FALSE,
    reference_input             JSONB,
    allow_multiple_responses    BOOLEAN      NOT NULL DEFAULT FALSE,
    study_id                    UUID         REFERENCES studies(id) ON DELETE SET NULL,
    case_order                  INTEGER      NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cases_created_at   ON cases (created_at);
CREATE INDEX IF NOT EXISTS idx_cases_published_at ON cases (published_at);
CREATE INDEX IF NOT EXISTS idx_cases_created_by   ON cases (created_by);
-- WHERE study_id = ? ORDER BY case_order
CREATE INDEX IF NOT EXISTS idx_cases_study_order  ON cases (study_id, case_order);

-- case_images: images attached to cases (domain.CaseImage)
CREATE TABLE IF NOT EXISTS case_images (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id       UUID         NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    category      VARCHAR(10)  NOT NULL,
    display_order INTEGER      NOT NULL DEFAULT 0,
    filename      VARCHAR(255) NOT NULL,
    content_type  VARCHAR(50)  NOT NULL,
    size_bytes    BIGINT,
    storage_path  VARCHAR(500) NOT NULL
);

-- WHERE case_id = ? ORDER BY category, display_order
CREATE INDEX IF NOT EXISTS idx_case_images_case_order ON case_images (case_id, category, display_order);

-- case_responses: user classification responses (domain.CaseResponse)
CREATE TABLE IF NOT EXISTS case_responses (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id           UUID        NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    classification    JSONB       NOT NULL,
    time_taken_ms     BIGINT,
    danis_weber_type  VARCHAR(10),
    lauge_hansen_type VARCHAR(5),
    ao_ota_code       VARCHAR(10),
    bartonicek_type   VARCHAR(15),
    answer_path       JSONB,
    decision_path     VARCHAR(500),
    time_per_question JSONB,
    back_clicks       INTEGER     NOT NULL DEFAULT 0
);

-- WHERE case_id = ? ORDER BY created_at (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_case_responses_case_created ON case_responses (case_id, created_at);
-- WHERE user_id = ? AND case_id = ? (HasUserResponded, GetByUserAndCase)
CREATE INDEX IF NOT EXISTS idx_case_responses_user_case ON case_responses (user_id, case_id);

-- case_users: case access control (domain.CaseUser)
CREATE TABLE IF NOT EXISTS case_users (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id    UUID        NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_user ON case_users (case_id, user_id);

-- study_raters: user participation in studies (domain.StudyRater)
CREATE TABLE IF NOT EXISTS study_raters (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id         UUID        NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
    user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_email       VARCHAR(255),
    cases_completed  INTEGER     NOT NULL DEFAULT 0,
    last_response_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_study_rater ON study_raters (study_id, user_id);
