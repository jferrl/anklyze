-- 000007_drop_case_users_table.up.sql
-- Remove per-case and per-study user access control.
-- All authenticated users can now access any published case and participate in any study.

DROP TABLE IF EXISTS case_users;
DROP TABLE IF EXISTS study_raters;
