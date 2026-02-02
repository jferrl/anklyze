-- =============================================================================
-- Anklyze Study Test Fixtures (Auto-detect Admin)
-- =============================================================================
-- This version automatically finds an admin user in the database.
-- Run this in Supabase SQL Editor to populate test data for the Study UI.
--
-- All responses include full divergence analysis data:
--   - answer_path: Full question/answer history with timestamps
--   - decision_path: Condensed path string (e.g. lateral_only→transindesmal→spiral)
--   - time_per_question: Time spent on each question in ms
--   - back_clicks: Number of times user went back
-- =============================================================================

DO $$
DECLARE
    admin_user_id UUID;

    -- Test users (raters)
    rater1_id UUID := gen_random_uuid();
    rater2_id UUID := gen_random_uuid();
    rater3_id UUID := gen_random_uuid();
    rater4_id UUID := gen_random_uuid();
    rater5_id UUID := gen_random_uuid();

    -- Studies
    study_draft_id UUID := gen_random_uuid();
    study_active_id UUID := gen_random_uuid();
    study_closed_id UUID := gen_random_uuid();

    -- Cases for Active Study
    case_active_1_id UUID := gen_random_uuid();
    case_active_2_id UUID := gen_random_uuid();
    case_active_3_id UUID := gen_random_uuid();
    case_active_4_id UUID := gen_random_uuid();
    case_active_5_id UUID := gen_random_uuid();

    -- Cases for Closed Study
    case_closed_1_id UUID := gen_random_uuid();
    case_closed_2_id UUID := gen_random_uuid();
    case_closed_3_id UUID := gen_random_uuid();

    -- Cases for Draft Study
    case_draft_1_id UUID := gen_random_uuid();
    case_draft_2_id UUID := gen_random_uuid();

BEGIN
    -- Find an admin user (or use the first user if no admin exists)
    SELECT id INTO admin_user_id FROM users WHERE role = 'admin' LIMIT 1;

    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM users LIMIT 1;
    END IF;

    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found in database. Please login first to create your user record.';
    END IF;

    RAISE NOTICE 'Using admin user: %', admin_user_id;

    -- =========================================================================
    -- 1. CREATE TEST USERS (RATERS)
    -- =========================================================================
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
    -- 2. CREATE STUDIES
    -- =========================================================================

    INSERT INTO studies (id, created_at, updated_at, created_by, title, description, status, case_count, total_responses, unique_raters, complete_raters)
    VALUES
        (study_draft_id, NOW() - INTERVAL '2 days', NOW(), admin_user_id,
         'Ankle Fracture Classification Training Set',
         'Educational study for resident training. Includes basic fracture patterns.',
         'draft', 2, 0, 0, 0),

        (study_active_id, NOW() - INTERVAL '14 days', NOW(), admin_user_id,
         'Multi-Rater Reliability Study 2024',
         'Inter-rater reliability study for ankle fracture classification. 5 cases, Fleiss'' Kappa calculation enabled.',
         'active', 5, 19, 5, 3),

        (study_closed_id, NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', admin_user_id,
         'Lauge-Hansen Classification Validation',
         'Completed validation study. Closed with 3 complete raters.',
         'closed', 3, 9, 3, 3);

    -- =========================================================================
    -- 3. CREATE CASES WITH REFERENCE INPUT FOR DIVERGENCE ANALYSIS
    -- =========================================================================

    -- Active Study Cases
    INSERT INTO cases (id, created_at, updated_at, published_at, created_by, title, description, status, has_tac_images, response_count, unique_users, study_id, case_order, allow_multiple_responses, show_reference_after_submit, reference_classification, reference_input)
    VALUES
        (case_active_1_id, NOW() - INTERVAL '14 days', NOW(), NOW() - INTERVAL '10 days', admin_user_id,
         'Case A1: Weber B Fracture', 'Lateral malleolus fracture at syndesmosis level.',
         'published', false, 5, 5, study_active_id, 1, false, true,
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         '{"involved_malleoli": "lateral_only", "fibular_level": "transindesmal", "lateral_morphology": "spiral"}'::jsonb),

        (case_active_2_id, NOW() - INTERVAL '14 days', NOW(), NOW() - INTERVAL '10 days', admin_user_id,
         'Case A2: Bimalleolar Fracture', 'Both lateral and medial malleolus involvement.',
         'published', true, 4, 4, study_active_id, 2, false, true,
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 4}, "ao_ota": {"code": "44-B2"}, "bartonicek": {"type": "2"}}'::jsonb,
         '{"involved_malleoli": "lateral_medial", "medial_morphology": "transverse", "fibular_level_for_transverse": "transindesmal", "lateral_morphology": "spiral"}'::jsonb),

        (case_active_3_id, NOW() - INTERVAL '14 days', NOW(), NOW() - INTERVAL '10 days', admin_user_id,
         'Case A3: Weber C High Fibula', 'Proximal fibula fracture with syndesmotic injury.',
         'published', true, 4, 4, study_active_id, 3, false, true,
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C2"}}'::jsonb,
         '{"involved_malleoli": "lateral_only", "fibular_level": "suprasindesmal", "suprasindesmal_type": "multifragmentary"}'::jsonb),

        (case_active_4_id, NOW() - INTERVAL '14 days', NOW(), NOW() - INTERVAL '10 days', admin_user_id,
         'Case A4: Isolated Medial Malleolus', 'Medial malleolus fracture only.',
         'published', false, 3, 3, study_active_id, 4, false, true,
         '{"lauge_hansen": {"type": "PA", "stage": 1}, "ao_ota": {"code": "44-A1"}}'::jsonb,
         '{"involved_malleoli": "medial_only", "medial_morphology": "oblique"}'::jsonb),

        (case_active_5_id, NOW() - INTERVAL '14 days', NOW(), NOW() - INTERVAL '10 days', admin_user_id,
         'Case A5: Trimalleolar Fracture', 'Complex trimalleolar pattern with posterior fragment.',
         'published', true, 3, 3, study_active_id, 5, false, true,
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 4}, "ao_ota": {"code": "44-B3"}, "bartonicek": {"type": "3"}}'::jsonb,
         '{"involved_malleoli": "lateral_medial_posterior", "medial_morphology": "transverse", "fibular_level_for_transverse": "transindesmal", "lateral_morphology": "spiral", "posterior_fracture_type": "type_3"}'::jsonb);

    -- Closed Study Cases
    INSERT INTO cases (id, created_at, updated_at, published_at, closed_at, created_by, title, description, status, has_tac_images, response_count, unique_users, study_id, case_order, allow_multiple_responses, show_reference_after_submit, reference_classification, reference_input)
    VALUES
        (case_closed_1_id, NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '30 days', admin_user_id,
         'Validation Case 1: Classic SER', 'Textbook SER mechanism.',
         'closed', false, 3, 3, study_closed_id, 1, false, true,
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         '{"involved_malleoli": "lateral_only", "fibular_level": "transindesmal", "lateral_morphology": "spiral"}'::jsonb),

        (case_closed_2_id, NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '30 days', admin_user_id,
         'Validation Case 2: PAB Pattern', 'Pronation-abduction mechanism.',
         'closed', true, 3, 3, study_closed_id, 2, false, true,
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PAB", "stage": 3}, "ao_ota": {"code": "44-B2"}}'::jsonb,
         '{"involved_malleoli": "lateral_medial", "medial_morphology": "transverse", "fibular_level_for_transverse": "transindesmal", "lateral_morphology": "oblique"}'::jsonb),

        (case_closed_3_id, NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '30 days', admin_user_id,
         'Validation Case 3: High Fibula PER', 'PER with high fibula fracture.',
         'closed', true, 3, 3, study_closed_id, 3, false, true,
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C1"}}'::jsonb,
         '{"involved_malleoli": "lateral_only", "fibular_level": "suprasindesmal", "suprasindesmal_type": "simple_diaphyseal"}'::jsonb);

    -- Draft Study Cases
    INSERT INTO cases (id, created_at, updated_at, created_by, title, description, status, has_tac_images, study_id, case_order, allow_multiple_responses, reference_input)
    VALUES
        (case_draft_1_id, NOW() - INTERVAL '2 days', NOW(), admin_user_id,
         'Training Case 1: Basic Weber A', 'Simple infrasyndesmotic fracture.',
         'draft', false, study_draft_id, 1, true,
         '{"involved_malleoli": "lateral_only", "fibular_level": "infrasindesmal", "lateral_morphology": "transverse"}'::jsonb),

        (case_draft_2_id, NOW() - INTERVAL '2 days', NOW(), admin_user_id,
         'Training Case 2: Supination Injury', 'Supination mechanism practice.',
         'draft', false, study_draft_id, 2, true,
         '{"involved_malleoli": "lateral_only", "fibular_level": "transindesmal", "lateral_morphology": "spiral"}'::jsonb);

    -- =========================================================================
    -- 4. ASSIGN RATERS TO STUDIES
    -- =========================================================================

    INSERT INTO study_raters (id, study_id, user_id, user_email, cases_completed, last_response_at, created_at)
    VALUES
        -- Active study raters
        (gen_random_uuid(), study_active_id, rater1_id, 'dr.garcia@hospital.test', 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '10 days'),
        (gen_random_uuid(), study_active_id, rater2_id, 'dr.martinez@hospital.test', 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '10 days'),
        (gen_random_uuid(), study_active_id, rater3_id, 'dr.lopez@hospital.test', 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '10 days'),
        (gen_random_uuid(), study_active_id, rater4_id, 'dr.fernandez@hospital.test', 3, NOW() - INTERVAL '5 days', NOW() - INTERVAL '10 days'),
        (gen_random_uuid(), study_active_id, rater5_id, 'dr.sanchez@hospital.test', 2, NOW() - INTERVAL '7 days', NOW() - INTERVAL '10 days'),
        -- Closed study raters
        (gen_random_uuid(), study_closed_id, rater1_id, 'dr.garcia@hospital.test', 3, NOW() - INTERVAL '32 days', NOW() - INTERVAL '55 days'),
        (gen_random_uuid(), study_closed_id, rater2_id, 'dr.martinez@hospital.test', 3, NOW() - INTERVAL '35 days', NOW() - INTERVAL '55 days'),
        (gen_random_uuid(), study_closed_id, rater3_id, 'dr.lopez@hospital.test', 3, NOW() - INTERVAL '33 days', NOW() - INTERVAL '55 days');

    -- =========================================================================
    -- 5. CREATE CASE RESPONSES WITH FULL DIVERGENCE ANALYSIS DATA
    -- =========================================================================

    -- Case A1: Weber B (Lateral only) - HIGH AGREEMENT
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code, answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        (gen_random_uuid(), case_active_1_id, rater1_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         45000, 'B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 5000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 18000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 35000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 5000, "fibular_level": 13000, "lateral_morphology": 17000}'::jsonb, 0),

        (gen_random_uuid(), case_active_1_id, rater2_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         62000, 'B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 8000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 25000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 55000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 8000, "fibular_level": 17000, "lateral_morphology": 30000}'::jsonb, 1),

        (gen_random_uuid(), case_active_1_id, rater3_id, NOW() - INTERVAL '3 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         38000, 'B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 4000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 15000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 30000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 4000, "fibular_level": 11000, "lateral_morphology": 15000}'::jsonb, 0),

        (gen_random_uuid(), case_active_1_id, rater4_id, NOW() - INTERVAL '5 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PAB", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         55000, 'B', 'PAB', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 6000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 22000}, {"question": "lateral_morphology", "answer": "oblique", "timestamp": 45000}]'::jsonb,
         'lateral_only→transindesmal→oblique',
         '{"involved_malleoli": 6000, "fibular_level": 16000, "lateral_morphology": 23000}'::jsonb, 3),

        (gen_random_uuid(), case_active_1_id, rater5_id, NOW() - INTERVAL '7 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         78000, 'B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 12000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 40000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 70000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 12000, "fibular_level": 28000, "lateral_morphology": 30000}'::jsonb, 2);

    -- Case A2: Bimalleolar - MODERATE AGREEMENT
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code, bartonicek_type, answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        (gen_random_uuid(), case_active_2_id, rater1_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 4}, "ao_ota": {"code": "44-B2"}, "bartonicek": {"type": "2"}}'::jsonb,
         89000, 'B', 'SER', '44-B2', '2',
         '[{"question": "involved_malleoli", "answer": "lateral_medial", "timestamp": 8000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 25000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 45000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 70000}]'::jsonb,
         'lateral_medial→transverse→transindesmal→spiral',
         '{"involved_malleoli": 8000, "medial_morphology": 17000, "fibular_level_for_transverse": 20000, "lateral_morphology": 25000}'::jsonb, 0),

        (gen_random_uuid(), case_active_2_id, rater2_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 4}, "ao_ota": {"code": "44-B2"}, "bartonicek": {"type": "2"}}'::jsonb,
         95000, 'B', 'SER', '44-B2', '2',
         '[{"question": "involved_malleoli", "answer": "lateral_medial", "timestamp": 10000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 30000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 55000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 85000}]'::jsonb,
         'lateral_medial→transverse→transindesmal→spiral',
         '{"involved_malleoli": 10000, "medial_morphology": 20000, "fibular_level_for_transverse": 25000, "lateral_morphology": 30000}'::jsonb, 1),

        (gen_random_uuid(), case_active_2_id, rater3_id, NOW() - INTERVAL '3 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PER", "stage": 3}, "ao_ota": {"code": "44-B2"}, "bartonicek": {"type": "3"}}'::jsonb,
         72000, 'B', 'PER', '44-B2', '3',
         '[{"question": "involved_malleoli", "answer": "lateral_medial", "timestamp": 6000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 20000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 40000}, {"question": "lateral_morphology", "answer": "oblique", "timestamp": 60000}]'::jsonb,
         'lateral_medial→transverse→transindesmal→oblique',
         '{"involved_malleoli": 6000, "medial_morphology": 14000, "fibular_level_for_transverse": 20000, "lateral_morphology": 20000}'::jsonb, 2),

        (gen_random_uuid(), case_active_2_id, rater4_id, NOW() - INTERVAL '5 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 4}, "ao_ota": {"code": "44-B3"}, "bartonicek": {"type": "2"}}'::jsonb,
         110000, 'B', 'SER', '44-B3', '2',
         '[{"question": "involved_malleoli", "answer": "lateral_medial", "timestamp": 15000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 40000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 70000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 100000}]'::jsonb,
         'lateral_medial→transverse→transindesmal→spiral',
         '{"involved_malleoli": 15000, "medial_morphology": 25000, "fibular_level_for_transverse": 30000, "lateral_morphology": 30000}'::jsonb, 4);

    -- Case A3: Weber C High Fibula - GOOD AGREEMENT
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code, answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        (gen_random_uuid(), case_active_3_id, rater1_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C2"}}'::jsonb,
         67000, 'C', 'PER', '44-C2',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 5000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 25000}, {"question": "suprasindesmal_type", "answer": "multifragmentary", "timestamp": 55000}]'::jsonb,
         'lateral_only→suprasindesmal→multifragmentary',
         '{"involved_malleoli": 5000, "fibular_level": 20000, "suprasindesmal_type": 30000}'::jsonb, 0),

        (gen_random_uuid(), case_active_3_id, rater2_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C2"}}'::jsonb,
         54000, 'C', 'PER', '44-C2',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 4000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 20000}, {"question": "suprasindesmal_type", "answer": "multifragmentary", "timestamp": 45000}]'::jsonb,
         'lateral_only→suprasindesmal→multifragmentary',
         '{"involved_malleoli": 4000, "fibular_level": 16000, "suprasindesmal_type": 25000}'::jsonb, 0),

        (gen_random_uuid(), case_active_3_id, rater3_id, NOW() - INTERVAL '3 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C1"}}'::jsonb,
         48000, 'C', 'PER', '44-C1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 3000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 15000}, {"question": "suprasindesmal_type", "answer": "simple_diaphyseal", "timestamp": 38000}]'::jsonb,
         'lateral_only→suprasindesmal→simple_diaphyseal',
         '{"involved_malleoli": 3000, "fibular_level": 12000, "suprasindesmal_type": 23000}'::jsonb, 1),

        (gen_random_uuid(), case_active_3_id, rater4_id, NOW() - INTERVAL '5 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 3}, "ao_ota": {"code": "44-C2"}}'::jsonb,
         82000, 'C', 'PER', '44-C2',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 8000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 35000}, {"question": "suprasindesmal_type", "answer": "multifragmentary", "timestamp": 70000}]'::jsonb,
         'lateral_only→suprasindesmal→multifragmentary',
         '{"involved_malleoli": 8000, "fibular_level": 27000, "suprasindesmal_type": 35000}'::jsonb, 2);

    -- Case A4: Medial Only - LOWER AGREEMENT
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms, lauge_hansen_type, ao_ota_code, answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        (gen_random_uuid(), case_active_4_id, rater1_id, NOW() - INTERVAL '1 day',
         '{"lauge_hansen": {"type": "PA", "stage": 1}, "ao_ota": {"code": "44-A1"}}'::jsonb,
         43000, 'PA', '44-A1',
         '[{"question": "involved_malleoli", "answer": "medial_only", "timestamp": 6000}, {"question": "medial_morphology", "answer": "oblique", "timestamp": 35000}]'::jsonb,
         'medial_only→oblique',
         '{"involved_malleoli": 6000, "medial_morphology": 29000}'::jsonb, 0),

        (gen_random_uuid(), case_active_4_id, rater2_id, NOW() - INTERVAL '2 days',
         '{"lauge_hansen": {"type": "SA", "stage": 1}, "ao_ota": {"code": "44-A1"}}'::jsonb,
         51000, 'SA', '44-A1',
         '[{"question": "involved_malleoli", "answer": "medial_only", "timestamp": 8000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 42000}]'::jsonb,
         'medial_only→transverse',
         '{"involved_malleoli": 8000, "medial_morphology": 34000}'::jsonb, 2),

        (gen_random_uuid(), case_active_4_id, rater3_id, NOW() - INTERVAL '3 days',
         '{"lauge_hansen": {"type": "PA", "stage": 1}, "ao_ota": {"code": "44-A2"}}'::jsonb,
         39000, 'PA', '44-A2',
         '[{"question": "involved_malleoli", "answer": "medial_only", "timestamp": 5000}, {"question": "medial_morphology", "answer": "oblique", "timestamp": 30000}]'::jsonb,
         'medial_only→oblique',
         '{"involved_malleoli": 5000, "medial_morphology": 25000}'::jsonb, 1);

    -- Case A5: Trimalleolar - VARIABLE AGREEMENT
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code, bartonicek_type, answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        (gen_random_uuid(), case_active_5_id, rater1_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 4}, "ao_ota": {"code": "44-B3"}, "bartonicek": {"type": "3"}}'::jsonb,
         125000, 'B', 'SER', '44-B3', '3',
         '[{"question": "involved_malleoli", "answer": "lateral_medial_posterior", "timestamp": 10000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 30000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 55000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 85000}, {"question": "posterior_fracture_type", "answer": "type_3", "timestamp": 115000}]'::jsonb,
         'lateral_medial_posterior→transverse→transindesmal→spiral→type_3',
         '{"involved_malleoli": 10000, "medial_morphology": 20000, "fibular_level_for_transverse": 25000, "lateral_morphology": 30000, "posterior_fracture_type": 30000}'::jsonb, 1),

        (gen_random_uuid(), case_active_5_id, rater2_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 4}, "ao_ota": {"code": "44-B3"}, "bartonicek": {"type": "2"}}'::jsonb,
         98000, 'B', 'SER', '44-B3', '2',
         '[{"question": "involved_malleoli", "answer": "lateral_medial_posterior", "timestamp": 8000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 25000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 48000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 72000}, {"question": "posterior_fracture_type", "answer": "type_2", "timestamp": 90000}]'::jsonb,
         'lateral_medial_posterior→transverse→transindesmal→spiral→type_2',
         '{"involved_malleoli": 8000, "medial_morphology": 17000, "fibular_level_for_transverse": 23000, "lateral_morphology": 24000, "posterior_fracture_type": 18000}'::jsonb, 0),

        (gen_random_uuid(), case_active_5_id, rater3_id, NOW() - INTERVAL '3 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-B3"}, "bartonicek": {"type": "3"}}'::jsonb,
         112000, 'B', 'PER', '44-B3', '3',
         '[{"question": "involved_malleoli", "answer": "lateral_medial_posterior", "timestamp": 12000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 35000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 60000}, {"question": "lateral_morphology", "answer": "oblique", "timestamp": 88000}, {"question": "posterior_fracture_type", "answer": "type_3", "timestamp": 105000}]'::jsonb,
         'lateral_medial_posterior→transverse→transindesmal→oblique→type_3',
         '{"involved_malleoli": 12000, "medial_morphology": 23000, "fibular_level_for_transverse": 25000, "lateral_morphology": 28000, "posterior_fracture_type": 17000}'::jsonb, 3);

    -- Closed Study Responses
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code, answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        -- Case 1: High agreement
        (gen_random_uuid(), case_closed_1_id, rater1_id, NOW() - INTERVAL '32 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         35000, 'B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 4000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 14000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 28000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 4000, "fibular_level": 10000, "lateral_morphology": 14000}'::jsonb, 0),

        (gen_random_uuid(), case_closed_1_id, rater2_id, NOW() - INTERVAL '35 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         42000, 'B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 5000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 18000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 35000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 5000, "fibular_level": 13000, "lateral_morphology": 17000}'::jsonb, 0),

        (gen_random_uuid(), case_closed_1_id, rater3_id, NOW() - INTERVAL '33 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         38000, 'B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 4000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 16000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 32000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 4000, "fibular_level": 12000, "lateral_morphology": 16000}'::jsonb, 0),

        -- Case 2: Moderate agreement
        (gen_random_uuid(), case_closed_2_id, rater1_id, NOW() - INTERVAL '32 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PAB", "stage": 3}, "ao_ota": {"code": "44-B2"}}'::jsonb,
         58000, 'B', 'PAB', '44-B2',
         '[{"question": "involved_malleoli", "answer": "lateral_medial", "timestamp": 7000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 22000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 38000}, {"question": "lateral_morphology", "answer": "oblique", "timestamp": 50000}]'::jsonb,
         'lateral_medial→transverse→transindesmal→oblique',
         '{"involved_malleoli": 7000, "medial_morphology": 15000, "fibular_level_for_transverse": 16000, "lateral_morphology": 12000}'::jsonb, 0),

        (gen_random_uuid(), case_closed_2_id, rater2_id, NOW() - INTERVAL '35 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 3}, "ao_ota": {"code": "44-B2"}}'::jsonb,
         65000, 'B', 'SER', '44-B2',
         '[{"question": "involved_malleoli", "answer": "lateral_medial", "timestamp": 8000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 25000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 42000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 58000}]'::jsonb,
         'lateral_medial→transverse→transindesmal→spiral',
         '{"involved_malleoli": 8000, "medial_morphology": 17000, "fibular_level_for_transverse": 17000, "lateral_morphology": 16000}'::jsonb, 1),

        (gen_random_uuid(), case_closed_2_id, rater3_id, NOW() - INTERVAL '33 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PAB", "stage": 3}, "ao_ota": {"code": "44-B2"}}'::jsonb,
         52000, 'B', 'PAB', '44-B2',
         '[{"question": "involved_malleoli", "answer": "lateral_medial", "timestamp": 6000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 20000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 35000}, {"question": "lateral_morphology", "answer": "oblique", "timestamp": 45000}]'::jsonb,
         'lateral_medial→transverse→transindesmal→oblique',
         '{"involved_malleoli": 6000, "medial_morphology": 14000, "fibular_level_for_transverse": 15000, "lateral_morphology": 10000}'::jsonb, 0),

        -- Case 3: Good agreement
        (gen_random_uuid(), case_closed_3_id, rater1_id, NOW() - INTERVAL '32 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C1"}}'::jsonb,
         48000, 'C', 'PER', '44-C1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 5000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 20000}, {"question": "suprasindesmal_type", "answer": "simple_diaphyseal", "timestamp": 40000}]'::jsonb,
         'lateral_only→suprasindesmal→simple_diaphyseal',
         '{"involved_malleoli": 5000, "fibular_level": 15000, "suprasindesmal_type": 20000}'::jsonb, 0),

        (gen_random_uuid(), case_closed_3_id, rater2_id, NOW() - INTERVAL '35 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C1"}}'::jsonb,
         55000, 'C', 'PER', '44-C1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 6000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 25000}, {"question": "suprasindesmal_type", "answer": "simple_diaphyseal", "timestamp": 48000}]'::jsonb,
         'lateral_only→suprasindesmal→simple_diaphyseal',
         '{"involved_malleoli": 6000, "fibular_level": 19000, "suprasindesmal_type": 23000}'::jsonb, 0),

        (gen_random_uuid(), case_closed_3_id, rater3_id, NOW() - INTERVAL '33 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C2"}}'::jsonb,
         61000, 'C', 'PER', '44-C2',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 7000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 28000}, {"question": "suprasindesmal_type", "answer": "multifragmentary", "timestamp": 55000}]'::jsonb,
         'lateral_only→suprasindesmal→multifragmentary',
         '{"involved_malleoli": 7000, "fibular_level": 21000, "suprasindesmal_type": 27000}'::jsonb, 1);

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Test fixtures created successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  • 5 test users (raters)';
    RAISE NOTICE '  • 3 studies:';
    RAISE NOTICE '    - Draft: %', study_draft_id;
    RAISE NOTICE '    - Active: %', study_active_id;
    RAISE NOTICE '    - Closed: %', study_closed_id;
    RAISE NOTICE '  • 10 cases with reference_input for divergence analysis';
    RAISE NOTICE '  • 8 rater assignments';
    RAISE NOTICE '  • 28 case responses with full divergence data';
    RAISE NOTICE '';
    RAISE NOTICE 'All responses include:';
    RAISE NOTICE '  - answer_path: Full question/answer history with timestamps';
    RAISE NOTICE '  - decision_path: Condensed path (e.g. lateral_only→transindesmal→spiral)';
    RAISE NOTICE '  - time_per_question: Time spent on each question in ms';
    RAISE NOTICE '  - back_clicks: Back button usage count';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now test:';
    RAISE NOTICE '  1. /admin/studies - List all studies';
    RAISE NOTICE '  2. /admin/studies/<active-id> - View active study';
    RAISE NOTICE '  3. /admin/studies/<active-id>/reliability - Fleiss Kappa metrics';
    RAISE NOTICE '  4. /admin/cases/<case-id>/divergence - Divergence analysis';

END $$;
