-- =============================================================================
-- Anklyze Cohort Test Fixtures
-- =============================================================================
-- Run this in Supabase SQL Editor to populate test data for the Cohort UI
--
-- This creates:
--   - 5 test users (raters) with different expertise levels
--   - 3 cohorts (draft, active, closed) with realistic data
--   - Multiple studies (cases) per cohort
--   - Cohort user assignments
--   - Study responses for Fleiss' Kappa calculation
-- =============================================================================

-- IMPORTANT: Replace this UUID with your actual admin user ID from Supabase Auth
-- You can find it in Supabase Dashboard > Authentication > Users
DO $$
DECLARE
    admin_user_id UUID := 'REPLACE_WITH_YOUR_ADMIN_USER_ID';

    -- Test users (raters)
    rater1_id UUID := gen_random_uuid();
    rater2_id UUID := gen_random_uuid();
    rater3_id UUID := gen_random_uuid();
    rater4_id UUID := gen_random_uuid();
    rater5_id UUID := gen_random_uuid();

    -- Cohorts
    cohort_draft_id UUID := gen_random_uuid();
    cohort_active_id UUID := gen_random_uuid();
    cohort_closed_id UUID := gen_random_uuid();

    -- Studies for Active Cohort (5 cases)
    study_active_1_id UUID := gen_random_uuid();
    study_active_2_id UUID := gen_random_uuid();
    study_active_3_id UUID := gen_random_uuid();
    study_active_4_id UUID := gen_random_uuid();
    study_active_5_id UUID := gen_random_uuid();

    -- Studies for Closed Cohort (3 cases)
    study_closed_1_id UUID := gen_random_uuid();
    study_closed_2_id UUID := gen_random_uuid();
    study_closed_3_id UUID := gen_random_uuid();

    -- Studies for Draft Cohort (2 cases)
    study_draft_1_id UUID := gen_random_uuid();
    study_draft_2_id UUID := gen_random_uuid();

BEGIN
    -- =========================================================================
    -- 1. CREATE TEST USERS (RATERS)
    -- =========================================================================
    -- Note: In production, users come from Supabase Auth. For testing, we insert
    -- directly into the users table.

    INSERT INTO users (id, email, role, display_name, years_experience, specialty, training_level, institution, created_at, updated_at)
    VALUES
        (rater1_id, 'dr.garcia@hospital.test', 'user', 'Dr. María García', 8, 'traumatology', 'attending', 'Hospital Universitario La Paz', NOW(), NOW()),
        (rater2_id, 'dr.martinez@hospital.test', 'user', 'Dr. Carlos Martínez', 3, 'orthopedics', 'resident', 'Hospital Clínic Barcelona', NOW(), NOW()),
        (rater3_id, 'dr.lopez@hospital.test', 'user', 'Dr. Ana López', 12, 'traumatology', 'attending', 'Hospital Gregorio Marañón', NOW(), NOW()),
        (rater4_id, 'dr.fernandez@hospital.test', 'user', 'Dr. Pablo Fernández', 5, 'emergency', 'fellow', 'Hospital 12 de Octubre', NOW(), NOW()),
        (rater5_id, 'dr.sanchez@hospital.test', 'user', 'Dr. Laura Sánchez', 2, 'radiology', 'resident', 'Hospital Vall d''Hebron', NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        updated_at = NOW();

    -- =========================================================================
    -- 2. CREATE STUDY COHORTS
    -- =========================================================================

    -- Draft Cohort (being prepared)
    INSERT INTO study_cohorts (id, created_at, updated_at, created_by, title, description, status, case_count, total_responses, unique_raters, complete_raters)
    VALUES (
        cohort_draft_id,
        NOW() - INTERVAL '2 days',
        NOW(),
        admin_user_id,
        'Ankle Fracture Classification Training Set',
        'Educational cohort for resident training on ankle fracture classification. Includes basic fracture patterns for learning purposes.',
        'draft',
        0, 0, 0, 0
    );

    -- Active Cohort (accepting responses)
    INSERT INTO study_cohorts (id, created_at, updated_at, created_by, title, description, status, case_count, total_responses, unique_raters, complete_raters)
    VALUES (
        cohort_active_id,
        NOW() - INTERVAL '14 days',
        NOW(),
        admin_user_id,
        'Multi-Rater Reliability Study 2024',
        'Inter-rater reliability study for ankle fracture classification. Participants must classify all 5 cases for Fleiss'' Kappa calculation.',
        'active',
        5, 0, 0, 0
    );

    -- Closed Cohort (completed)
    INSERT INTO study_cohorts (id, created_at, updated_at, created_by, title, description, status, case_count, total_responses, unique_raters, complete_raters)
    VALUES (
        cohort_closed_id,
        NOW() - INTERVAL '60 days',
        NOW() - INTERVAL '30 days',
        admin_user_id,
        'Lauge-Hansen Classification Validation',
        'Completed validation study comparing Lauge-Hansen classification accuracy across experience levels. Study closed with 15 complete raters.',
        'closed',
        3, 0, 0, 0
    );

    -- =========================================================================
    -- 3. CREATE STUDIES (CASES) FOR EACH COHORT
    -- =========================================================================

    -- Studies for Active Cohort
    INSERT INTO studies (id, created_at, updated_at, published_at, created_by, title, description, status, has_tac_images, response_count, unique_users, cohort_id, case_order, allow_multiple_responses, show_reference_after_submit, reference_classification)
    VALUES
        (study_active_1_id, NOW() - INTERVAL '14 days', NOW(), NOW() - INTERVAL '10 days', admin_user_id,
         'Case A1: Weber B Fracture',
         'Adult patient presenting with lateral malleolus fracture at the level of the syndesmosis.',
         'published', false, 0, 0, cohort_active_id, 1, false, true,
         '{"danis_weber": {"type": "B", "description": "Fracture at the level of the syndesmosis"}, "lauge_hansen": {"type": "SER", "stage": 2, "description": "Supination-External Rotation Stage II"}, "ao_ota": {"code": "44-B1", "description": "Transsyndesmotic fibula fracture, simple"}}'::jsonb),

        (study_active_2_id, NOW() - INTERVAL '14 days', NOW(), NOW() - INTERVAL '10 days', admin_user_id,
         'Case A2: Bimalleolar Fracture',
         'Complex ankle injury with both lateral and medial malleolus involvement.',
         'published', true, 0, 0, cohort_active_id, 2, false, true,
         '{"danis_weber": {"type": "B", "description": "Fracture at the level of the syndesmosis"}, "lauge_hansen": {"type": "SER", "stage": 4, "description": "Supination-External Rotation Stage IV"}, "ao_ota": {"code": "44-B2", "description": "Transsyndesmotic fibula fracture with medial lesion"}, "bartonicek": {"type": "2", "description": "Posterolateral oblique fragment"}}'::jsonb),

        (study_active_3_id, NOW() - INTERVAL '14 days', NOW(), NOW() - INTERVAL '10 days', admin_user_id,
         'Case A3: Weber C High Fibula',
         'Proximal fibula fracture with syndesmotic injury. CT confirms complete disruption.',
         'published', true, 0, 0, cohort_active_id, 3, false, true,
         '{"danis_weber": {"type": "C", "description": "Fracture above the syndesmosis"}, "lauge_hansen": {"type": "PER", "stage": 4, "description": "Pronation-External Rotation Stage IV"}, "ao_ota": {"code": "44-C2", "description": "Suprasyndesmotic fibula fracture, multifragmentary"}}'::jsonb),

        (study_active_4_id, NOW() - INTERVAL '14 days', NOW(), NOW() - INTERVAL '10 days', admin_user_id,
         'Case A4: Isolated Medial Malleolus',
         'Medial malleolus fracture without lateral involvement. Evaluate mechanism.',
         'published', false, 0, 0, cohort_active_id, 4, false, true,
         '{"lauge_hansen": {"type": "PA", "stage": 1, "description": "Pronation-Abduction Stage I"}, "ao_ota": {"code": "44-A1", "description": "Isolated infrasyndesmotic lesion"}}'::jsonb),

        (study_active_5_id, NOW() - INTERVAL '14 days', NOW(), NOW() - INTERVAL '10 days', admin_user_id,
         'Case A5: Trimalleolar Fracture',
         'Complex trimalleolar pattern with posterior malleolus fragment. Full CT available.',
         'published', true, 0, 0, cohort_active_id, 5, false, true,
         '{"danis_weber": {"type": "B", "description": "Fracture at the level of the syndesmosis"}, "lauge_hansen": {"type": "SER", "stage": 4, "description": "Supination-External Rotation Stage IV with posterior fragment"}, "ao_ota": {"code": "44-B3", "description": "Transsyndesmotic with posterior and medial lesion"}, "bartonicek": {"type": "3", "description": "Posteromedial two-part fragment"}}'::jsonb);

    -- Studies for Closed Cohort
    INSERT INTO studies (id, created_at, updated_at, published_at, closed_at, created_by, title, description, status, has_tac_images, response_count, unique_users, cohort_id, case_order, allow_multiple_responses, show_reference_after_submit, reference_classification)
    VALUES
        (study_closed_1_id, NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '30 days', admin_user_id,
         'Validation Case 1: Classic SER',
         'Textbook supination-external rotation mechanism fracture.',
         'closed', false, 15, 15, cohort_closed_id, 1, false, true,
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb),

        (study_closed_2_id, NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '30 days', admin_user_id,
         'Validation Case 2: PAB Pattern',
         'Pronation-abduction mechanism with characteristic fracture line.',
         'closed', true, 15, 15, cohort_closed_id, 2, false, true,
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PAB", "stage": 3}, "ao_ota": {"code": "44-B2"}}'::jsonb),

        (study_closed_3_id, NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '30 days', admin_user_id,
         'Validation Case 3: High Fibula PER',
         'Pronation-external rotation with high fibula fracture.',
         'closed', true, 15, 15, cohort_closed_id, 3, false, true,
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C1"}}'::jsonb);

    -- Studies for Draft Cohort
    INSERT INTO studies (id, created_at, updated_at, created_by, title, description, status, has_tac_images, cohort_id, case_order, allow_multiple_responses)
    VALUES
        (study_draft_1_id, NOW() - INTERVAL '2 days', NOW(), admin_user_id,
         'Training Case 1: Basic Weber A',
         'Simple infrasyndesmotic fracture for training purposes.',
         'draft', false, cohort_draft_id, 1, true),

        (study_draft_2_id, NOW() - INTERVAL '2 days', NOW(), admin_user_id,
         'Training Case 2: Supination Injury',
         'Supination mechanism for classification practice.',
         'draft', false, cohort_draft_id, 2, true);

    -- =========================================================================
    -- 4. ASSIGN RATERS TO COHORTS
    -- =========================================================================

    -- Raters for Active Cohort (5 raters, partial completion)
    INSERT INTO cohort_users (id, cohort_id, user_id, user_email, cases_completed, last_response_at, created_at)
    VALUES
        (gen_random_uuid(), cohort_active_id, rater1_id, 'dr.garcia@hospital.test', 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '10 days'),
        (gen_random_uuid(), cohort_active_id, rater2_id, 'dr.martinez@hospital.test', 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '10 days'),
        (gen_random_uuid(), cohort_active_id, rater3_id, 'dr.lopez@hospital.test', 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '10 days'),
        (gen_random_uuid(), cohort_active_id, rater4_id, 'dr.fernandez@hospital.test', 3, NOW() - INTERVAL '5 days', NOW() - INTERVAL '10 days'),
        (gen_random_uuid(), cohort_active_id, rater5_id, 'dr.sanchez@hospital.test', 2, NOW() - INTERVAL '7 days', NOW() - INTERVAL '10 days');

    -- Raters for Closed Cohort (all complete)
    INSERT INTO cohort_users (id, cohort_id, user_id, user_email, cases_completed, last_response_at, created_at)
    VALUES
        (gen_random_uuid(), cohort_closed_id, rater1_id, 'dr.garcia@hospital.test', 3, NOW() - INTERVAL '32 days', NOW() - INTERVAL '55 days'),
        (gen_random_uuid(), cohort_closed_id, rater2_id, 'dr.martinez@hospital.test', 3, NOW() - INTERVAL '35 days', NOW() - INTERVAL '55 days'),
        (gen_random_uuid(), cohort_closed_id, rater3_id, 'dr.lopez@hospital.test', 3, NOW() - INTERVAL '33 days', NOW() - INTERVAL '55 days');

    -- =========================================================================
    -- 5. CREATE STUDY RESPONSES FOR FLEISS' KAPPA CALCULATION
    -- =========================================================================
    -- For Fleiss' Kappa to work, we need multiple raters classifying the same cases.
    -- We'll create realistic responses with some agreement and some disagreement.

    -- Responses for Active Cohort - Case A1 (Weber B, SER) - High agreement
    INSERT INTO study_responses (id, study_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code)
    VALUES
        (gen_random_uuid(), study_active_1_id, rater1_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         45000, 'B', 'SER', '44-B1'),
        (gen_random_uuid(), study_active_1_id, rater2_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         62000, 'B', 'SER', '44-B1'),
        (gen_random_uuid(), study_active_1_id, rater3_id, NOW() - INTERVAL '3 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         38000, 'B', 'SER', '44-B1'),
        (gen_random_uuid(), study_active_1_id, rater4_id, NOW() - INTERVAL '5 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PAB", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         55000, 'B', 'PAB', '44-B1'),
        (gen_random_uuid(), study_active_1_id, rater5_id, NOW() - INTERVAL '7 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         78000, 'B', 'SER', '44-B1');

    -- Responses for Active Cohort - Case A2 (Bimalleolar) - Moderate agreement
    INSERT INTO study_responses (id, study_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code, bartonicek_type)
    VALUES
        (gen_random_uuid(), study_active_2_id, rater1_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 4}, "ao_ota": {"code": "44-B2"}, "bartonicek": {"type": "2"}}'::jsonb,
         89000, 'B', 'SER', '44-B2', '2'),
        (gen_random_uuid(), study_active_2_id, rater2_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 4}, "ao_ota": {"code": "44-B2"}, "bartonicek": {"type": "2"}}'::jsonb,
         95000, 'B', 'SER', '44-B2', '2'),
        (gen_random_uuid(), study_active_2_id, rater3_id, NOW() - INTERVAL '3 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PER", "stage": 3}, "ao_ota": {"code": "44-B2"}, "bartonicek": {"type": "3"}}'::jsonb,
         72000, 'B', 'PER', '44-B2', '3'),
        (gen_random_uuid(), study_active_2_id, rater4_id, NOW() - INTERVAL '5 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 4}, "ao_ota": {"code": "44-B3"}, "bartonicek": {"type": "2"}}'::jsonb,
         110000, 'B', 'SER', '44-B3', '2');

    -- Responses for Active Cohort - Case A3 (Weber C) - Good agreement
    INSERT INTO study_responses (id, study_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code)
    VALUES
        (gen_random_uuid(), study_active_3_id, rater1_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C2"}}'::jsonb,
         67000, 'C', 'PER', '44-C2'),
        (gen_random_uuid(), study_active_3_id, rater2_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C2"}}'::jsonb,
         54000, 'C', 'PER', '44-C2'),
        (gen_random_uuid(), study_active_3_id, rater3_id, NOW() - INTERVAL '3 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C1"}}'::jsonb,
         48000, 'C', 'PER', '44-C1'),
        (gen_random_uuid(), study_active_3_id, rater4_id, NOW() - INTERVAL '5 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 3}, "ao_ota": {"code": "44-C2"}}'::jsonb,
         82000, 'C', 'PER', '44-C2');

    -- Responses for Active Cohort - Case A4 (Medial only) - Lower agreement (tricky case)
    INSERT INTO study_responses (id, study_id, user_id, created_at, classification, time_taken_ms, lauge_hansen_type, ao_ota_code)
    VALUES
        (gen_random_uuid(), study_active_4_id, rater1_id, NOW() - INTERVAL '1 day',
         '{"lauge_hansen": {"type": "PA", "stage": 1}, "ao_ota": {"code": "44-A1"}}'::jsonb,
         43000, 'PA', '44-A1'),
        (gen_random_uuid(), study_active_4_id, rater2_id, NOW() - INTERVAL '2 days',
         '{"lauge_hansen": {"type": "SA", "stage": 1}, "ao_ota": {"code": "44-A1"}}'::jsonb,
         51000, 'SA', '44-A1'),
        (gen_random_uuid(), study_active_4_id, rater3_id, NOW() - INTERVAL '3 days',
         '{"lauge_hansen": {"type": "PA", "stage": 1}, "ao_ota": {"code": "44-A2"}}'::jsonb,
         39000, 'PA', '44-A2');

    -- Responses for Active Cohort - Case A5 (Trimalleolar) - Variable agreement
    INSERT INTO study_responses (id, study_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code, bartonicek_type)
    VALUES
        (gen_random_uuid(), study_active_5_id, rater1_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 4}, "ao_ota": {"code": "44-B3"}, "bartonicek": {"type": "3"}}'::jsonb,
         125000, 'B', 'SER', '44-B3', '3'),
        (gen_random_uuid(), study_active_5_id, rater2_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 4}, "ao_ota": {"code": "44-B3"}, "bartonicek": {"type": "2"}}'::jsonb,
         98000, 'B', 'SER', '44-B3', '2'),
        (gen_random_uuid(), study_active_5_id, rater3_id, NOW() - INTERVAL '3 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-B3"}, "bartonicek": {"type": "3"}}'::jsonb,
         112000, 'B', 'PER', '44-B3', '3');

    -- Responses for Closed Cohort (simulated complete data)
    -- Case 1 - High agreement
    INSERT INTO study_responses (id, study_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code)
    VALUES
        (gen_random_uuid(), study_closed_1_id, rater1_id, NOW() - INTERVAL '32 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         35000, 'B', 'SER', '44-B1'),
        (gen_random_uuid(), study_closed_1_id, rater2_id, NOW() - INTERVAL '35 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         42000, 'B', 'SER', '44-B1'),
        (gen_random_uuid(), study_closed_1_id, rater3_id, NOW() - INTERVAL '33 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         38000, 'B', 'SER', '44-B1');

    -- Case 2 - Moderate agreement
    INSERT INTO study_responses (id, study_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code)
    VALUES
        (gen_random_uuid(), study_closed_2_id, rater1_id, NOW() - INTERVAL '32 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PAB", "stage": 3}, "ao_ota": {"code": "44-B2"}}'::jsonb,
         58000, 'B', 'PAB', '44-B2'),
        (gen_random_uuid(), study_closed_2_id, rater2_id, NOW() - INTERVAL '35 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 3}, "ao_ota": {"code": "44-B2"}}'::jsonb,
         65000, 'B', 'SER', '44-B2'),
        (gen_random_uuid(), study_closed_2_id, rater3_id, NOW() - INTERVAL '33 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PAB", "stage": 3}, "ao_ota": {"code": "44-B2"}}'::jsonb,
         52000, 'B', 'PAB', '44-B2');

    -- Case 3 - Good agreement
    INSERT INTO study_responses (id, study_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code)
    VALUES
        (gen_random_uuid(), study_closed_3_id, rater1_id, NOW() - INTERVAL '32 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C1"}}'::jsonb,
         48000, 'C', 'PER', '44-C1'),
        (gen_random_uuid(), study_closed_3_id, rater2_id, NOW() - INTERVAL '35 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C1"}}'::jsonb,
         55000, 'C', 'PER', '44-C1'),
        (gen_random_uuid(), study_closed_3_id, rater3_id, NOW() - INTERVAL '33 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C2"}}'::jsonb,
         61000, 'C', 'PER', '44-C2');

    -- =========================================================================
    -- 6. UPDATE COHORT COUNTERS
    -- =========================================================================

    UPDATE study_cohorts SET
        case_count = 5,
        total_responses = 20,
        unique_raters = 5,
        complete_raters = 3
    WHERE id = cohort_active_id;

    UPDATE study_cohorts SET
        case_count = 3,
        total_responses = 9,
        unique_raters = 3,
        complete_raters = 3
    WHERE id = cohort_closed_id;

    UPDATE study_cohorts SET
        case_count = 2,
        total_responses = 0,
        unique_raters = 0,
        complete_raters = 0
    WHERE id = cohort_draft_id;

    -- =========================================================================
    -- 7. UPDATE STUDY RESPONSE COUNTERS
    -- =========================================================================

    UPDATE studies SET response_count = 5, unique_users = 5 WHERE id = study_active_1_id;
    UPDATE studies SET response_count = 4, unique_users = 4 WHERE id = study_active_2_id;
    UPDATE studies SET response_count = 4, unique_users = 4 WHERE id = study_active_3_id;
    UPDATE studies SET response_count = 3, unique_users = 3 WHERE id = study_active_4_id;
    UPDATE studies SET response_count = 3, unique_users = 3 WHERE id = study_active_5_id;

    RAISE NOTICE 'Test fixtures created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - 5 test users (raters)';
    RAISE NOTICE '  - 3 cohorts (draft, active, closed)';
    RAISE NOTICE '  - 10 studies (cases) across cohorts';
    RAISE NOTICE '  - 8 cohort user assignments';
    RAISE NOTICE '  - 29 study responses for Fleiss Kappa calculation';
    RAISE NOTICE '';
    RAISE NOTICE 'Cohort IDs:';
    RAISE NOTICE '  Draft:  %', cohort_draft_id;
    RAISE NOTICE '  Active: %', cohort_active_id;
    RAISE NOTICE '  Closed: %', cohort_closed_id;

END $$;
