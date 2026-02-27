-- 000001_initial_schema.down.sql
-- Drop tables in reverse dependency order (children before parents).

DROP TABLE IF EXISTS study_raters;
DROP TABLE IF EXISTS case_users;
DROP TABLE IF EXISTS case_responses;
DROP TABLE IF EXISTS case_images;
DROP TABLE IF EXISTS cases;
DROP TABLE IF EXISTS studies;
DROP TABLE IF EXISTS chat_feedback;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS audit_entries;
