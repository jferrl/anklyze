-- =============================================================================
-- Cleanup Study Test Fixtures
-- =============================================================================
-- Run this to remove all test data created by the study fixtures.
-- This will NOT delete your actual admin user or non-test data.
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Starting cleanup of test fixtures...';

    -- Delete responses from test users (by email pattern)
    DELETE FROM case_responses
    WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@hospital.test');
    RAISE NOTICE 'Deleted test case responses';

    -- Delete study rater assignments for test users
    DELETE FROM study_raters
    WHERE user_email LIKE '%@hospital.test';
    RAISE NOTICE 'Deleted test study rater assignments';

    -- Delete cases that belong to test studies
    DELETE FROM cases
    WHERE study_id IN (
        SELECT id FROM studies
        WHERE title IN (
            'Ankle Fracture Classification Training Set',
            'Multi-Rater Reliability Study 2024',
            'Lauge-Hansen Classification Validation'
        )
    );
    RAISE NOTICE 'Deleted test cases';

    -- Delete test studies by title
    DELETE FROM studies
    WHERE title IN (
        'Ankle Fracture Classification Training Set',
        'Multi-Rater Reliability Study 2024',
        'Lauge-Hansen Classification Validation'
    );
    RAISE NOTICE 'Deleted test studies';

    -- Delete test users
    DELETE FROM users
    WHERE email LIKE '%@hospital.test';
    RAISE NOTICE 'Deleted test users';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Cleanup complete!';
    RAISE NOTICE '========================================';

END $$;
