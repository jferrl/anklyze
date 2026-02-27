-- Seed admin user so the fixture SQL has a valid created_by reference.
-- This is NOT a login account. To get admin access locally:
--   1. Log in via Supabase with your real email
--   2. Run: make db-make-admin EMAIL=you@example.com
INSERT INTO users (id, email, role, display_name, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'seed-admin@local.test',
    'admin',
    'Seed Admin',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;
