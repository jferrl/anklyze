-- =============================================================================
-- Cleanup Gold Standard Test Fixtures
-- =============================================================================
-- Removes all data created by gold_standard_test_data.sql.
-- Does NOT remove base study fixture data or your admin user.
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Cleaning up gold standard test fixtures...';

    -- Delete responses from gold standard test users
    DELETE FROM case_responses
    WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'gs.%@hospital.test');
    RAISE NOTICE 'Deleted gold standard test responses';

    -- Delete study rater assignments
    DELETE FROM study_raters
    WHERE user_email LIKE 'gs.%@hospital.test';
    RAISE NOTICE 'Deleted gold standard study rater assignments';

    -- Delete gold standard study cases
    DELETE FROM cases
    WHERE study_id IN (
        SELECT id FROM studies WHERE title = 'Gold Standard Accuracy Validation'
    );
    RAISE NOTICE 'Deleted gold standard study cases';

    -- Delete gold standard study
    DELETE FROM studies WHERE title = 'Gold Standard Accuracy Validation';
    RAISE NOTICE 'Deleted gold standard study';

    -- Delete gold standard test users
    DELETE FROM users WHERE email LIKE 'gs.%@hospital.test';
    RAISE NOTICE 'Deleted gold standard test users';

    -- Clear gold_standard from existing study cases
    UPDATE cases SET gold_standard = NULL
    WHERE gold_standard IS NOT NULL;
    RAISE NOTICE 'Cleared gold_standard from existing cases';

    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Gold standard cleanup complete!';
    RAISE NOTICE '========================================';

END $$;
