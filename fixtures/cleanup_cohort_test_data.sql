-- =============================================================================
-- Cleanup Cohort Test Fixtures
-- =============================================================================
-- Run this to remove all test data created by the cohort fixtures.
-- This will NOT delete your actual admin user or non-test data.
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Starting cleanup of test fixtures...';

    -- Delete responses from test users (by email pattern)
    DELETE FROM study_responses
    WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@hospital.test');
    RAISE NOTICE 'Deleted test study responses';

    -- Delete cohort user assignments for test users
    DELETE FROM cohort_users
    WHERE user_email LIKE '%@hospital.test';
    RAISE NOTICE 'Deleted test cohort user assignments';

    -- Delete studies that belong to test cohorts
    DELETE FROM studies
    WHERE cohort_id IN (
        SELECT id FROM study_cohorts
        WHERE title IN (
            'Ankle Fracture Classification Training Set',
            'Multi-Rater Reliability Study 2024',
            'Lauge-Hansen Classification Validation'
        )
    );
    RAISE NOTICE 'Deleted test studies';

    -- Delete test cohorts by title
    DELETE FROM study_cohorts
    WHERE title IN (
        'Ankle Fracture Classification Training Set',
        'Multi-Rater Reliability Study 2024',
        'Lauge-Hansen Classification Validation'
    );
    RAISE NOTICE 'Deleted test cohorts';

    -- Delete test users
    DELETE FROM users
    WHERE email LIKE '%@hospital.test';
    RAISE NOTICE 'Deleted test users';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Cleanup complete!';
    RAISE NOTICE '========================================';

END $$;
