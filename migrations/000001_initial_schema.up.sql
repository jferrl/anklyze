-- 000001_initial_schema.up.sql
-- Initial schema for Anklyze: creates all 11 domain model tables.
-- Equivalent to what GORM AutoMigrate would create from the domain structs.

-- audit_entries: stores classification audit log entries (domain.AuditEntry)
CREATE TABLE IF NOT EXISTS audit_entries (
    id              UUID        PRIMARY KEY,
    created_at      TIMESTAMPTZ,
    client_ip       VARCHAR(45),
    user_agent      TEXT,
    language        VARCHAR(10) NOT NULL,
    input           JSONB       NOT NULL,
    result          JSONB       NOT NULL,
    is_impossible   BOOLEAN     NOT NULL DEFAULT FALSE,
    danis_weber_type VARCHAR(10),
    lauge_hansen_type VARCHAR(5),
    ao_ota_code     VARCHAR(10),
    duration_ms     BIGINT
);

CREATE INDEX IF NOT EXISTS idx_audit_entries_created_at      ON audit_entries (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entries_language        ON audit_entries (language);
CREATE INDEX IF NOT EXISTS idx_audit_entries_is_impossible   ON audit_entries (is_impossible);
CREATE INDEX IF NOT EXISTS idx_audit_entries_danis_weber_type ON audit_entries (danis_weber_type);
CREATE INDEX IF NOT EXISTS idx_audit_entries_lauge_hansen_type ON audit_entries (lauge_hansen_type);
CREATE INDEX IF NOT EXISTS idx_audit_entries_ao_ota_code     ON audit_entries (ao_ota_code);

-- chat_sessions: stores chat audit sessions (domain.ChatSession)
CREATE TABLE IF NOT EXISTS chat_sessions (
    id                  UUID        PRIMARY KEY,
    created_at          TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ,
    client_ip           VARCHAR(45),
    user_agent          TEXT,
    language            VARCHAR(10) NOT NULL,
    status              VARCHAR(20) NOT NULL,
    total_messages      BIGINT      NOT NULL DEFAULT 0,
    clarification_count BIGINT      NOT NULL DEFAULT 0,
    final_confidence    DOUBLE PRECISION,
    danis_weber_type    VARCHAR(10),
    lauge_hansen_type   VARCHAR(5),
    ao_ota_code         VARCHAR(10),
    duration_ms         BIGINT
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at        ON chat_sessions (created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_language          ON chat_sessions (language);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status            ON chat_sessions (status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_danis_weber_type  ON chat_sessions (danis_weber_type);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_lauge_hansen_type ON chat_sessions (lauge_hansen_type);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_ao_ota_code       ON chat_sessions (ao_ota_code);

-- chat_messages: stores individual chat messages (domain.ChatMessage)
CREATE TABLE IF NOT EXISTS chat_messages (
    id              UUID        PRIMARY KEY,
    session_id      UUID        NOT NULL,
    created_at      TIMESTAMPTZ,
    role            VARCHAR(10) NOT NULL,
    content         TEXT        NOT NULL,
    message_type    VARCHAR(25) NOT NULL,
    extracted_input JSONB,
    confidence      DOUBLE PRECISION,
    processing_ms   BIGINT
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id   ON chat_messages (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at   ON chat_messages (created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_message_type ON chat_messages (message_type);

-- chat_feedback: stores user feedback on chat classifications (domain.ChatFeedback)
CREATE TABLE IF NOT EXISTS chat_feedback (
    id          UUID        PRIMARY KEY,
    session_id  UUID        NOT NULL,
    created_at  TIMESTAMPTZ,
    rating      VARCHAR(10) NOT NULL,
    comment     TEXT,
    client_ip   VARCHAR(45)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_feedback_session_id ON chat_feedback (session_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_created_at        ON chat_feedback (created_at);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_rating            ON chat_feedback (rating);

-- users: stores application users mirroring Supabase auth (domain.User)
CREATE TABLE IF NOT EXISTS users (
    id               UUID         PRIMARY KEY,
    email            VARCHAR(255) NOT NULL,
    role             VARCHAR(20)  DEFAULT 'user',
    display_name     VARCHAR(255),
    avatar_url       VARCHAR(500),
    provider         VARCHAR(50),
    last_login_at    TIMESTAMPTZ,
    created_at       TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ,
    years_experience BIGINT,
    specialty        VARCHAR(50),
    training_level   VARCHAR(50),
    institution      VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- cases: stores patient cases for classification (domain.Case)
CREATE TABLE IF NOT EXISTS cases (
    id                         UUID         PRIMARY KEY,
    created_at                 TIMESTAMPTZ,
    updated_at                 TIMESTAMPTZ,
    published_at               TIMESTAMPTZ,
    closed_at                  TIMESTAMPTZ,
    created_by                 UUID         NOT NULL,
    title                      VARCHAR(255) NOT NULL,
    description                TEXT,
    status                     VARCHAR(20)  NOT NULL DEFAULT 'draft',
    deadline                   TIMESTAMPTZ,
    has_tac_images             BOOLEAN      NOT NULL DEFAULT FALSE,
    response_count             BIGINT       NOT NULL DEFAULT 0,
    unique_users               BIGINT       NOT NULL DEFAULT 0,
    reference_classification   JSONB,
    show_reference_after_submit BOOLEAN     NOT NULL DEFAULT FALSE,
    reference_input            JSONB,
    allow_multiple_responses   BOOLEAN      NOT NULL DEFAULT FALSE,
    study_id                   UUID,
    case_order                 BIGINT       NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cases_created_at   ON cases (created_at);
CREATE INDEX IF NOT EXISTS idx_cases_published_at ON cases (published_at);
CREATE INDEX IF NOT EXISTS idx_cases_created_by   ON cases (created_by);
CREATE INDEX IF NOT EXISTS idx_cases_status       ON cases (status);
CREATE INDEX IF NOT EXISTS idx_cases_deadline     ON cases (deadline);
CREATE INDEX IF NOT EXISTS idx_cases_study_id     ON cases (study_id);

-- case_images: stores images attached to cases (domain.CaseImage)
CREATE TABLE IF NOT EXISTS case_images (
    id            UUID         PRIMARY KEY,
    case_id       UUID         NOT NULL,
    created_at    TIMESTAMPTZ,
    category      VARCHAR(10)  NOT NULL,
    display_order BIGINT       NOT NULL DEFAULT 0,
    filename      VARCHAR(255) NOT NULL,
    content_type  VARCHAR(50)  NOT NULL,
    size_bytes    BIGINT,
    storage_path  VARCHAR(500) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_case_images_case_id  ON case_images (case_id);
CREATE INDEX IF NOT EXISTS idx_case_images_category ON case_images (category);

-- case_responses: stores user classification responses (domain.CaseResponse)
CREATE TABLE IF NOT EXISTS case_responses (
    id                UUID         PRIMARY KEY,
    case_id           UUID         NOT NULL,
    user_id           UUID         NOT NULL,
    created_at        TIMESTAMPTZ,
    classification    JSONB        NOT NULL,
    time_taken_ms     BIGINT,
    danis_weber_type  VARCHAR(10),
    lauge_hansen_type VARCHAR(5),
    ao_ota_code       VARCHAR(10),
    bartonicek_type   VARCHAR(15),
    answer_path       JSONB,
    decision_path     VARCHAR(500),
    time_per_question JSONB,
    back_clicks       BIGINT       NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_case_responses_case_id           ON case_responses (case_id);
CREATE INDEX IF NOT EXISTS idx_case_responses_user_id           ON case_responses (user_id);
CREATE INDEX IF NOT EXISTS idx_case_responses_created_at        ON case_responses (created_at);
CREATE INDEX IF NOT EXISTS idx_case_responses_danis_weber_type  ON case_responses (danis_weber_type);
CREATE INDEX IF NOT EXISTS idx_case_responses_lauge_hansen_type ON case_responses (lauge_hansen_type);
CREATE INDEX IF NOT EXISTS idx_case_responses_ao_ota_code       ON case_responses (ao_ota_code);
CREATE INDEX IF NOT EXISTS idx_case_responses_bartonicek_type   ON case_responses (bartonicek_type);
CREATE INDEX IF NOT EXISTS idx_case_responses_decision_path     ON case_responses (decision_path);

-- case_users: many-to-many between cases and users (domain.CaseUser)
CREATE TABLE IF NOT EXISTS case_users (
    id         UUID         PRIMARY KEY,
    case_id    UUID         NOT NULL,
    user_id    UUID         NOT NULL,
    user_email VARCHAR(255),
    created_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_case_user ON case_users (case_id, user_id);

-- studies: groups of cases for multi-case reliability analysis (domain.Study)
CREATE TABLE IF NOT EXISTS studies (
    id              UUID         PRIMARY KEY,
    created_at      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ,
    created_by      UUID         NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    status          VARCHAR(20)  NOT NULL DEFAULT 'draft',
    case_count      BIGINT       NOT NULL DEFAULT 0,
    total_responses BIGINT       NOT NULL DEFAULT 0,
    unique_raters   BIGINT       NOT NULL DEFAULT 0,
    complete_raters BIGINT       NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_studies_created_at ON studies (created_at);
CREATE INDEX IF NOT EXISTS idx_studies_created_by ON studies (created_by);
CREATE INDEX IF NOT EXISTS idx_studies_status     ON studies (status);

-- study_raters: tracks user participation in a study (domain.StudyRater)
CREATE TABLE IF NOT EXISTS study_raters (
    id               UUID         PRIMARY KEY,
    study_id         UUID         NOT NULL,
    user_id          UUID         NOT NULL,
    user_email       VARCHAR(255),
    cases_completed  BIGINT       NOT NULL DEFAULT 0,
    last_response_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_study_rater ON study_raters (study_id, user_id);
