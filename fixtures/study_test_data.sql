-- =============================================================================
-- Anklyze Study Test Fixtures
-- =============================================================================
-- Run this in Supabase SQL Editor to populate test data for the Study UI
--
-- This creates:
--   - 5 test users (raters) with different expertise levels
--   - 3 studies (draft, active, closed) with realistic data
--   - Multiple cases per study
--   - Study rater assignments
--   - Case responses with full divergence analysis data (answer_path, decision_path, etc.)
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

    -- Studies
    study_draft_id UUID := gen_random_uuid();
    study_active_id UUID := gen_random_uuid();
    study_closed_id UUID := gen_random_uuid();

    -- Cases for Active Study (5 cases)
    case_active_1_id UUID := gen_random_uuid();
    case_active_2_id UUID := gen_random_uuid();
    case_active_3_id UUID := gen_random_uuid();
    case_active_4_id UUID := gen_random_uuid();
    case_active_5_id UUID := gen_random_uuid();

    -- Cases for Closed Study (3 cases)
    case_closed_1_id UUID := gen_random_uuid();
    case_closed_2_id UUID := gen_random_uuid();
    case_closed_3_id UUID := gen_random_uuid();

    -- Cases for Draft Study (2 cases)
    case_draft_1_id UUID := gen_random_uuid();
    case_draft_2_id UUID := gen_random_uuid();

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
    -- 2. CREATE STUDIES
    -- =========================================================================

    -- Draft Study (being prepared)
    INSERT INTO studies (id, created_at, updated_at, created_by, title, description, status, case_count, total_responses, unique_raters, complete_raters)
    VALUES (
        study_draft_id,
        NOW() - INTERVAL '2 days',
        NOW(),
        admin_user_id,
        'Ankle Fracture Classification Training Set',
        'Educational study for resident training on ankle fracture classification. Includes basic fracture patterns for learning purposes.',
        'draft',
        0, 0, 0, 0
    );

    -- Active Study (accepting responses)
    INSERT INTO studies (id, created_at, updated_at, created_by, title, description, status, case_count, total_responses, unique_raters, complete_raters)
    VALUES (
        study_active_id,
        NOW() - INTERVAL '14 days',
        NOW(),
        admin_user_id,
        'Multi-Rater Reliability Study 2024',
        'Inter-rater reliability study for ankle fracture classification. Participants must classify all 5 cases for Fleiss'' Kappa calculation.',
        'active',
        5, 0, 0, 0
    );

    -- Closed Study (completed)
    INSERT INTO studies (id, created_at, updated_at, created_by, title, description, status, case_count, total_responses, unique_raters, complete_raters)
    VALUES (
        study_closed_id,
        NOW() - INTERVAL '60 days',
        NOW() - INTERVAL '30 days',
        admin_user_id,
        'Lauge-Hansen Classification Validation',
        'Completed validation study comparing Lauge-Hansen classification accuracy across experience levels. Study closed with 15 complete raters.',
        'closed',
        3, 0, 0, 0
    );

    -- =========================================================================
    -- 3. CREATE CASES FOR EACH STUDY
    -- =========================================================================

    -- Cases for Active Study
    -- Note: reference_input stores the FractureInput used to generate reference_classification
    -- This enables divergence analysis to compare user answer paths against the gold standard path
    INSERT INTO cases (id, created_at, updated_at, published_at, created_by, title, description, status, has_tac_images, response_count, unique_users, study_id, case_order, allow_multiple_responses, show_reference_after_submit, reference_classification, reference_input)
    VALUES
        -- Case A1: Weber B - Lateral only fracture with spiral morphology
        (case_active_1_id, NOW() - INTERVAL '14 days', NOW(), NOW() - INTERVAL '10 days', admin_user_id,
         'Case A1: Weber B Fracture',
         'Adult patient presenting with lateral malleolus fracture at the level of the syndesmosis.',
         'published', false, 0, 0, study_active_id, 1, false, true,
         '{"danis_weber": {"type": "B", "description": "Fracture at the level of the syndesmosis"}, "lauge_hansen": {"type": "SER", "stage": 2, "description": "Supination-External Rotation Stage II"}, "ao_ota": {"code": "44-B1", "description": "Transsyndesmotic fibula fracture, simple"}}'::jsonb,
         '{"involved_malleoli": "lateral_only", "fibular_level": "transindesmal", "lateral_morphology": "spiral"}'::jsonb),

        -- Case A2: Bimalleolar - Lateral + Medial with transverse medial morphology
        (case_active_2_id, NOW() - INTERVAL '14 days', NOW(), NOW() - INTERVAL '10 days', admin_user_id,
         'Case A2: Bimalleolar Fracture',
         'Complex ankle injury with both lateral and medial malleolus involvement.',
         'published', true, 0, 0, study_active_id, 2, false, true,
         '{"danis_weber": {"type": "B", "description": "Fracture at the level of the syndesmosis"}, "lauge_hansen": {"type": "SER", "stage": 4, "description": "Supination-External Rotation Stage IV"}, "ao_ota": {"code": "44-B2", "description": "Transsyndesmotic fibula fracture with medial lesion"}, "bartonicek": {"type": "2", "description": "Posterolateral oblique fragment"}}'::jsonb,
         '{"involved_malleoli": "lateral_medial", "medial_morphology": "transverse", "fibular_level_for_transverse": "transindesmal", "lateral_morphology": "spiral"}'::jsonb),

        -- Case A3: Weber C - High fibula fracture with suprasindesmal level
        (case_active_3_id, NOW() - INTERVAL '14 days', NOW(), NOW() - INTERVAL '10 days', admin_user_id,
         'Case A3: Weber C High Fibula',
         'Proximal fibula fracture with syndesmotic injury. CT confirms complete disruption.',
         'published', true, 0, 0, study_active_id, 3, false, true,
         '{"danis_weber": {"type": "C", "description": "Fracture above the syndesmosis"}, "lauge_hansen": {"type": "PER", "stage": 4, "description": "Pronation-External Rotation Stage IV"}, "ao_ota": {"code": "44-C2", "description": "Suprasyndesmotic fibula fracture, multifragmentary"}}'::jsonb,
         '{"involved_malleoli": "lateral_only", "fibular_level": "suprasindesmal", "suprasindesmal_type": "multifragmentary"}'::jsonb),

        -- Case A4: Medial only - Isolated medial malleolus fracture
        (case_active_4_id, NOW() - INTERVAL '14 days', NOW(), NOW() - INTERVAL '10 days', admin_user_id,
         'Case A4: Isolated Medial Malleolus',
         'Medial malleolus fracture without lateral involvement. Evaluate mechanism.',
         'published', false, 0, 0, study_active_id, 4, false, true,
         '{"lauge_hansen": {"type": "PA", "stage": 1, "description": "Pronation-Abduction Stage I"}, "ao_ota": {"code": "44-A1", "description": "Isolated infrasyndesmotic lesion"}}'::jsonb,
         '{"involved_malleoli": "medial_only", "medial_morphology": "oblique"}'::jsonb),

        -- Case A5: Trimalleolar - All three malleoli with posterior fragment
        (case_active_5_id, NOW() - INTERVAL '14 days', NOW(), NOW() - INTERVAL '10 days', admin_user_id,
         'Case A5: Trimalleolar Fracture',
         'Complex trimalleolar pattern with posterior malleolus fragment. Full CT available.',
         'published', true, 0, 0, study_active_id, 5, false, true,
         '{"danis_weber": {"type": "B", "description": "Fracture at the level of the syndesmosis"}, "lauge_hansen": {"type": "SER", "stage": 4, "description": "Supination-External Rotation Stage IV with posterior fragment"}, "ao_ota": {"code": "44-B3", "description": "Transsyndesmotic with posterior and medial lesion"}, "bartonicek": {"type": "3", "description": "Posteromedial two-part fragment"}}'::jsonb,
         '{"involved_malleoli": "lateral_medial_posterior", "medial_morphology": "transverse", "fibular_level_for_transverse": "transindesmal", "lateral_morphology": "spiral", "posterior_fracture_type": "type_3"}'::jsonb);

    -- Cases for Closed Study
    INSERT INTO cases (id, created_at, updated_at, published_at, closed_at, created_by, title, description, status, has_tac_images, response_count, unique_users, study_id, case_order, allow_multiple_responses, show_reference_after_submit, reference_classification, reference_input)
    VALUES
        (case_closed_1_id, NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '30 days', admin_user_id,
         'Validation Case 1: Classic SER',
         'Textbook supination-external rotation mechanism fracture.',
         'closed', false, 15, 15, study_closed_id, 1, false, true,
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         '{"involved_malleoli": "lateral_only", "fibular_level": "transindesmal", "lateral_morphology": "spiral"}'::jsonb),

        (case_closed_2_id, NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '30 days', admin_user_id,
         'Validation Case 2: PAB Pattern',
         'Pronation-abduction mechanism with characteristic fracture line.',
         'closed', true, 15, 15, study_closed_id, 2, false, true,
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PAB", "stage": 3}, "ao_ota": {"code": "44-B2"}}'::jsonb,
         '{"involved_malleoli": "lateral_medial", "medial_morphology": "transverse", "fibular_level_for_transverse": "transindesmal", "lateral_morphology": "oblique"}'::jsonb),

        (case_closed_3_id, NOW() - INTERVAL '60 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '55 days', NOW() - INTERVAL '30 days', admin_user_id,
         'Validation Case 3: High Fibula PER',
         'Pronation-external rotation with high fibula fracture.',
         'closed', true, 15, 15, study_closed_id, 3, false, true,
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C1"}}'::jsonb,
         '{"involved_malleoli": "lateral_only", "fibular_level": "suprasindesmal", "suprasindesmal_type": "simple_diaphyseal"}'::jsonb);

    -- Cases for Draft Study
    INSERT INTO cases (id, created_at, updated_at, created_by, title, description, status, has_tac_images, study_id, case_order, allow_multiple_responses, reference_input)
    VALUES
        (case_draft_1_id, NOW() - INTERVAL '2 days', NOW(), admin_user_id,
         'Training Case 1: Basic Weber A',
         'Simple infrasyndesmotic fracture for training purposes.',
         'draft', false, study_draft_id, 1, true,
         '{"involved_malleoli": "lateral_only", "fibular_level": "infrasindesmal", "lateral_morphology": "transverse"}'::jsonb),

        (case_draft_2_id, NOW() - INTERVAL '2 days', NOW(), admin_user_id,
         'Training Case 2: Supination Injury',
         'Supination mechanism for classification practice.',
         'draft', false, study_draft_id, 2, true,
         '{"involved_malleoli": "lateral_only", "fibular_level": "transindesmal", "lateral_morphology": "spiral"}'::jsonb);

    -- =========================================================================
    -- 4. ASSIGN RATERS TO STUDIES
    -- =========================================================================

    -- Raters for Active Study (5 raters, partial completion)
    INSERT INTO study_raters (id, study_id, user_id, user_email, cases_completed, last_response_at, created_at)
    VALUES
        (gen_random_uuid(), study_active_id, rater1_id, 'dr.garcia@hospital.test', 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '10 days'),
        (gen_random_uuid(), study_active_id, rater2_id, 'dr.martinez@hospital.test', 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '10 days'),
        (gen_random_uuid(), study_active_id, rater3_id, 'dr.lopez@hospital.test', 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '10 days'),
        (gen_random_uuid(), study_active_id, rater4_id, 'dr.fernandez@hospital.test', 3, NOW() - INTERVAL '5 days', NOW() - INTERVAL '10 days'),
        (gen_random_uuid(), study_active_id, rater5_id, 'dr.sanchez@hospital.test', 2, NOW() - INTERVAL '7 days', NOW() - INTERVAL '10 days');

    -- Raters for Closed Study (all complete)
    INSERT INTO study_raters (id, study_id, user_id, user_email, cases_completed, last_response_at, created_at)
    VALUES
        (gen_random_uuid(), study_closed_id, rater1_id, 'dr.garcia@hospital.test', 3, NOW() - INTERVAL '32 days', NOW() - INTERVAL '55 days'),
        (gen_random_uuid(), study_closed_id, rater2_id, 'dr.martinez@hospital.test', 3, NOW() - INTERVAL '35 days', NOW() - INTERVAL '55 days'),
        (gen_random_uuid(), study_closed_id, rater3_id, 'dr.lopez@hospital.test', 3, NOW() - INTERVAL '33 days', NOW() - INTERVAL '55 days');

    -- =========================================================================
    -- 5. CREATE CASE RESPONSES WITH FULL DIVERGENCE ANALYSIS DATA
    -- =========================================================================
    -- All responses include: answer_path, decision_path, time_per_question, back_clicks
    -- This enables proper divergence analysis testing

    -- -------------------------------------------------------------------------
    -- Case A1: Weber B (Lateral only, transindesmal, spiral) - HIGH AGREEMENT
    -- Reference path: lateral_only → transindesmal → spiral
    -- -------------------------------------------------------------------------
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code, answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        -- Rater 1: CORRECT path, no back clicks (experienced, confident)
        (gen_random_uuid(), case_active_1_id, rater1_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         45000, 'B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 5000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 18000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 35000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 5000, "fibular_level": 13000, "lateral_morphology": 17000}'::jsonb,
         0),

        -- Rater 2: CORRECT path, 1 back click (minor hesitation on morphology)
        (gen_random_uuid(), case_active_1_id, rater2_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         62000, 'B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 8000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 25000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 55000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 8000, "fibular_level": 17000, "lateral_morphology": 30000}'::jsonb,
         1),

        -- Rater 3: CORRECT path, no back clicks (expert)
        (gen_random_uuid(), case_active_1_id, rater3_id, NOW() - INTERVAL '3 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         38000, 'B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 4000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 15000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 30000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 4000, "fibular_level": 11000, "lateral_morphology": 15000}'::jsonb,
         0),

        -- Rater 4: WRONG morphology (oblique instead of spiral) - DIVERGENT PATH
        (gen_random_uuid(), case_active_1_id, rater4_id, NOW() - INTERVAL '5 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PAB", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         55000, 'B', 'PAB', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 6000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 22000}, {"question": "lateral_morphology", "answer": "oblique", "timestamp": 45000}]'::jsonb,
         'lateral_only→transindesmal→oblique',
         '{"involved_malleoli": 6000, "fibular_level": 16000, "lateral_morphology": 23000}'::jsonb,
         3),

        -- Rater 5: CORRECT path, 2 back clicks (novice but got it right)
        (gen_random_uuid(), case_active_1_id, rater5_id, NOW() - INTERVAL '7 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         78000, 'B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 12000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 40000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 70000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 12000, "fibular_level": 28000, "lateral_morphology": 30000}'::jsonb,
         2);

    -- -------------------------------------------------------------------------
    -- Case A2: Bimalleolar (lateral_medial, transverse medial, spiral lateral) - MODERATE AGREEMENT
    -- Reference path: lateral_medial → transverse → transindesmal → spiral
    -- -------------------------------------------------------------------------
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code, bartonicek_type, answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        -- Rater 1: CORRECT path
        (gen_random_uuid(), case_active_2_id, rater1_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 4}, "ao_ota": {"code": "44-B2"}, "bartonicek": {"type": "2"}}'::jsonb,
         89000, 'B', 'SER', '44-B2', '2',
         '[{"question": "involved_malleoli", "answer": "lateral_medial", "timestamp": 8000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 25000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 45000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 70000}]'::jsonb,
         'lateral_medial→transverse→transindesmal→spiral',
         '{"involved_malleoli": 8000, "medial_morphology": 17000, "fibular_level_for_transverse": 20000, "lateral_morphology": 25000}'::jsonb,
         0),

        -- Rater 2: CORRECT path, 1 back click
        (gen_random_uuid(), case_active_2_id, rater2_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 4}, "ao_ota": {"code": "44-B2"}, "bartonicek": {"type": "2"}}'::jsonb,
         95000, 'B', 'SER', '44-B2', '2',
         '[{"question": "involved_malleoli", "answer": "lateral_medial", "timestamp": 10000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 30000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 55000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 85000}]'::jsonb,
         'lateral_medial→transverse→transindesmal→spiral',
         '{"involved_malleoli": 10000, "medial_morphology": 20000, "fibular_level_for_transverse": 25000, "lateral_morphology": 30000}'::jsonb,
         1),

        -- Rater 3: DIVERGENT - chose oblique morphology (PAB instead of SER)
        (gen_random_uuid(), case_active_2_id, rater3_id, NOW() - INTERVAL '3 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PER", "stage": 3}, "ao_ota": {"code": "44-B2"}, "bartonicek": {"type": "3"}}'::jsonb,
         72000, 'B', 'PER', '44-B2', '3',
         '[{"question": "involved_malleoli", "answer": "lateral_medial", "timestamp": 6000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 20000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 40000}, {"question": "lateral_morphology", "answer": "oblique", "timestamp": 60000}]'::jsonb,
         'lateral_medial→transverse→transindesmal→oblique',
         '{"involved_malleoli": 6000, "medial_morphology": 14000, "fibular_level_for_transverse": 20000, "lateral_morphology": 20000}'::jsonb,
         2),

        -- Rater 4: DIVERGENT - wrong AO code (B3 instead of B2)
        (gen_random_uuid(), case_active_2_id, rater4_id, NOW() - INTERVAL '5 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 4}, "ao_ota": {"code": "44-B3"}, "bartonicek": {"type": "2"}}'::jsonb,
         110000, 'B', 'SER', '44-B3', '2',
         '[{"question": "involved_malleoli", "answer": "lateral_medial", "timestamp": 15000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 40000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 70000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 100000}]'::jsonb,
         'lateral_medial→transverse→transindesmal→spiral',
         '{"involved_malleoli": 15000, "medial_morphology": 25000, "fibular_level_for_transverse": 30000, "lateral_morphology": 30000}'::jsonb,
         4);

    -- -------------------------------------------------------------------------
    -- Case A3: Weber C High Fibula (lateral_only, suprasindesmal, multifragmentary) - GOOD AGREEMENT
    -- Reference path: lateral_only → suprasindesmal → multifragmentary
    -- -------------------------------------------------------------------------
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code, answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        -- Rater 1: CORRECT path
        (gen_random_uuid(), case_active_3_id, rater1_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C2"}}'::jsonb,
         67000, 'C', 'PER', '44-C2',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 5000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 25000}, {"question": "suprasindesmal_type", "answer": "multifragmentary", "timestamp": 55000}]'::jsonb,
         'lateral_only→suprasindesmal→multifragmentary',
         '{"involved_malleoli": 5000, "fibular_level": 20000, "suprasindesmal_type": 30000}'::jsonb,
         0),

        -- Rater 2: CORRECT path
        (gen_random_uuid(), case_active_3_id, rater2_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C2"}}'::jsonb,
         54000, 'C', 'PER', '44-C2',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 4000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 20000}, {"question": "suprasindesmal_type", "answer": "multifragmentary", "timestamp": 45000}]'::jsonb,
         'lateral_only→suprasindesmal→multifragmentary',
         '{"involved_malleoli": 4000, "fibular_level": 16000, "suprasindesmal_type": 25000}'::jsonb,
         0),

        -- Rater 3: DIVERGENT - chose simple instead of multifragmentary (C1 instead of C2)
        (gen_random_uuid(), case_active_3_id, rater3_id, NOW() - INTERVAL '3 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C1"}}'::jsonb,
         48000, 'C', 'PER', '44-C1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 3000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 15000}, {"question": "suprasindesmal_type", "answer": "simple_diaphyseal", "timestamp": 38000}]'::jsonb,
         'lateral_only→suprasindesmal→simple_diaphyseal',
         '{"involved_malleoli": 3000, "fibular_level": 12000, "suprasindesmal_type": 23000}'::jsonb,
         1),

        -- Rater 4: CORRECT path, some hesitation
        (gen_random_uuid(), case_active_3_id, rater4_id, NOW() - INTERVAL '5 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 3}, "ao_ota": {"code": "44-C2"}}'::jsonb,
         82000, 'C', 'PER', '44-C2',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 8000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 35000}, {"question": "suprasindesmal_type", "answer": "multifragmentary", "timestamp": 70000}]'::jsonb,
         'lateral_only→suprasindesmal→multifragmentary',
         '{"involved_malleoli": 8000, "fibular_level": 27000, "suprasindesmal_type": 35000}'::jsonb,
         2);

    -- -------------------------------------------------------------------------
    -- Case A4: Medial Only (medial_only, oblique) - LOWER AGREEMENT (tricky case)
    -- Reference path: medial_only → oblique
    -- -------------------------------------------------------------------------
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms, lauge_hansen_type, ao_ota_code, answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        -- Rater 1: CORRECT path (PA mechanism)
        (gen_random_uuid(), case_active_4_id, rater1_id, NOW() - INTERVAL '1 day',
         '{"lauge_hansen": {"type": "PA", "stage": 1}, "ao_ota": {"code": "44-A1"}}'::jsonb,
         43000, 'PA', '44-A1',
         '[{"question": "involved_malleoli", "answer": "medial_only", "timestamp": 6000}, {"question": "medial_morphology", "answer": "oblique", "timestamp": 35000}]'::jsonb,
         'medial_only→oblique',
         '{"involved_malleoli": 6000, "medial_morphology": 29000}'::jsonb,
         0),

        -- Rater 2: DIVERGENT - chose transverse morphology (SA instead of PA)
        (gen_random_uuid(), case_active_4_id, rater2_id, NOW() - INTERVAL '2 days',
         '{"lauge_hansen": {"type": "SA", "stage": 1}, "ao_ota": {"code": "44-A1"}}'::jsonb,
         51000, 'SA', '44-A1',
         '[{"question": "involved_malleoli", "answer": "medial_only", "timestamp": 8000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 42000}]'::jsonb,
         'medial_only→transverse',
         '{"involved_malleoli": 8000, "medial_morphology": 34000}'::jsonb,
         2),

        -- Rater 3: CORRECT mechanism but wrong AO code
        (gen_random_uuid(), case_active_4_id, rater3_id, NOW() - INTERVAL '3 days',
         '{"lauge_hansen": {"type": "PA", "stage": 1}, "ao_ota": {"code": "44-A2"}}'::jsonb,
         39000, 'PA', '44-A2',
         '[{"question": "involved_malleoli", "answer": "medial_only", "timestamp": 5000}, {"question": "medial_morphology", "answer": "oblique", "timestamp": 30000}]'::jsonb,
         'medial_only→oblique',
         '{"involved_malleoli": 5000, "medial_morphology": 25000}'::jsonb,
         1);

    -- -------------------------------------------------------------------------
    -- Case A5: Trimalleolar (lateral_medial_posterior) - VARIABLE AGREEMENT
    -- Reference path: lateral_medial_posterior → transverse → transindesmal → spiral → type_3
    -- -------------------------------------------------------------------------
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code, bartonicek_type, answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        -- Rater 1: CORRECT path
        (gen_random_uuid(), case_active_5_id, rater1_id, NOW() - INTERVAL '1 day',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 4}, "ao_ota": {"code": "44-B3"}, "bartonicek": {"type": "3"}}'::jsonb,
         125000, 'B', 'SER', '44-B3', '3',
         '[{"question": "involved_malleoli", "answer": "lateral_medial_posterior", "timestamp": 10000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 30000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 55000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 85000}, {"question": "posterior_fracture_type", "answer": "type_3", "timestamp": 115000}]'::jsonb,
         'lateral_medial_posterior→transverse→transindesmal→spiral→type_3',
         '{"involved_malleoli": 10000, "medial_morphology": 20000, "fibular_level_for_transverse": 25000, "lateral_morphology": 30000, "posterior_fracture_type": 30000}'::jsonb,
         1),

        -- Rater 2: Wrong Bartonicek type (type_2 instead of type_3)
        (gen_random_uuid(), case_active_5_id, rater2_id, NOW() - INTERVAL '2 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 4}, "ao_ota": {"code": "44-B3"}, "bartonicek": {"type": "2"}}'::jsonb,
         98000, 'B', 'SER', '44-B3', '2',
         '[{"question": "involved_malleoli", "answer": "lateral_medial_posterior", "timestamp": 8000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 25000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 48000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 72000}, {"question": "posterior_fracture_type", "answer": "type_2", "timestamp": 90000}]'::jsonb,
         'lateral_medial_posterior→transverse→transindesmal→spiral→type_2',
         '{"involved_malleoli": 8000, "medial_morphology": 17000, "fibular_level_for_transverse": 23000, "lateral_morphology": 24000, "posterior_fracture_type": 18000}'::jsonb,
         0),

        -- Rater 3: Wrong mechanism (PER instead of SER)
        (gen_random_uuid(), case_active_5_id, rater3_id, NOW() - INTERVAL '3 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-B3"}, "bartonicek": {"type": "3"}}'::jsonb,
         112000, 'B', 'PER', '44-B3', '3',
         '[{"question": "involved_malleoli", "answer": "lateral_medial_posterior", "timestamp": 12000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 35000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 60000}, {"question": "lateral_morphology", "answer": "oblique", "timestamp": 88000}, {"question": "posterior_fracture_type", "answer": "type_3", "timestamp": 105000}]'::jsonb,
         'lateral_medial_posterior→transverse→transindesmal→oblique→type_3',
         '{"involved_malleoli": 12000, "medial_morphology": 23000, "fibular_level_for_transverse": 25000, "lateral_morphology": 28000, "posterior_fracture_type": 17000}'::jsonb,
         3);

    -- -------------------------------------------------------------------------
    -- CLOSED STUDY RESPONSES (with full path data)
    -- -------------------------------------------------------------------------

    -- Case Closed 1: Classic SER - HIGH AGREEMENT
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code, answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        (gen_random_uuid(), case_closed_1_id, rater1_id, NOW() - INTERVAL '32 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         35000, 'B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 4000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 14000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 28000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 4000, "fibular_level": 10000, "lateral_morphology": 14000}'::jsonb,
         0),

        (gen_random_uuid(), case_closed_1_id, rater2_id, NOW() - INTERVAL '35 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         42000, 'B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 5000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 18000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 35000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 5000, "fibular_level": 13000, "lateral_morphology": 17000}'::jsonb,
         0),

        (gen_random_uuid(), case_closed_1_id, rater3_id, NOW() - INTERVAL '33 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 2}, "ao_ota": {"code": "44-B1"}}'::jsonb,
         38000, 'B', 'SER', '44-B1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 4000}, {"question": "fibular_level", "answer": "transindesmal", "timestamp": 16000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 32000}]'::jsonb,
         'lateral_only→transindesmal→spiral',
         '{"involved_malleoli": 4000, "fibular_level": 12000, "lateral_morphology": 16000}'::jsonb,
         0);

    -- Case Closed 2: PAB Pattern - MODERATE AGREEMENT
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code, answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        (gen_random_uuid(), case_closed_2_id, rater1_id, NOW() - INTERVAL '32 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PAB", "stage": 3}, "ao_ota": {"code": "44-B2"}}'::jsonb,
         58000, 'B', 'PAB', '44-B2',
         '[{"question": "involved_malleoli", "answer": "lateral_medial", "timestamp": 7000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 22000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 38000}, {"question": "lateral_morphology", "answer": "oblique", "timestamp": 50000}]'::jsonb,
         'lateral_medial→transverse→transindesmal→oblique',
         '{"involved_malleoli": 7000, "medial_morphology": 15000, "fibular_level_for_transverse": 16000, "lateral_morphology": 12000}'::jsonb,
         0),

        (gen_random_uuid(), case_closed_2_id, rater2_id, NOW() - INTERVAL '35 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "SER", "stage": 3}, "ao_ota": {"code": "44-B2"}}'::jsonb,
         65000, 'B', 'SER', '44-B2',
         '[{"question": "involved_malleoli", "answer": "lateral_medial", "timestamp": 8000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 25000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 42000}, {"question": "lateral_morphology", "answer": "spiral", "timestamp": 58000}]'::jsonb,
         'lateral_medial→transverse→transindesmal→spiral',
         '{"involved_malleoli": 8000, "medial_morphology": 17000, "fibular_level_for_transverse": 17000, "lateral_morphology": 16000}'::jsonb,
         1),

        (gen_random_uuid(), case_closed_2_id, rater3_id, NOW() - INTERVAL '33 days',
         '{"danis_weber": {"type": "B"}, "lauge_hansen": {"type": "PAB", "stage": 3}, "ao_ota": {"code": "44-B2"}}'::jsonb,
         52000, 'B', 'PAB', '44-B2',
         '[{"question": "involved_malleoli", "answer": "lateral_medial", "timestamp": 6000}, {"question": "medial_morphology", "answer": "transverse", "timestamp": 20000}, {"question": "fibular_level_for_transverse", "answer": "transindesmal", "timestamp": 35000}, {"question": "lateral_morphology", "answer": "oblique", "timestamp": 45000}]'::jsonb,
         'lateral_medial→transverse→transindesmal→oblique',
         '{"involved_malleoli": 6000, "medial_morphology": 14000, "fibular_level_for_transverse": 15000, "lateral_morphology": 10000}'::jsonb,
         0);

    -- Case Closed 3: High Fibula PER - GOOD AGREEMENT
    INSERT INTO case_responses (id, case_id, user_id, created_at, classification, time_taken_ms, danis_weber_type, lauge_hansen_type, ao_ota_code, answer_path, decision_path, time_per_question, back_clicks)
    VALUES
        (gen_random_uuid(), case_closed_3_id, rater1_id, NOW() - INTERVAL '32 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C1"}}'::jsonb,
         48000, 'C', 'PER', '44-C1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 5000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 20000}, {"question": "suprasindesmal_type", "answer": "simple_diaphyseal", "timestamp": 40000}]'::jsonb,
         'lateral_only→suprasindesmal→simple_diaphyseal',
         '{"involved_malleoli": 5000, "fibular_level": 15000, "suprasindesmal_type": 20000}'::jsonb,
         0),

        (gen_random_uuid(), case_closed_3_id, rater2_id, NOW() - INTERVAL '35 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C1"}}'::jsonb,
         55000, 'C', 'PER', '44-C1',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 6000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 25000}, {"question": "suprasindesmal_type", "answer": "simple_diaphyseal", "timestamp": 48000}]'::jsonb,
         'lateral_only→suprasindesmal→simple_diaphyseal',
         '{"involved_malleoli": 6000, "fibular_level": 19000, "suprasindesmal_type": 23000}'::jsonb,
         0),

        (gen_random_uuid(), case_closed_3_id, rater3_id, NOW() - INTERVAL '33 days',
         '{"danis_weber": {"type": "C"}, "lauge_hansen": {"type": "PER", "stage": 4}, "ao_ota": {"code": "44-C2"}}'::jsonb,
         61000, 'C', 'PER', '44-C2',
         '[{"question": "involved_malleoli", "answer": "lateral_only", "timestamp": 7000}, {"question": "fibular_level", "answer": "suprasindesmal", "timestamp": 28000}, {"question": "suprasindesmal_type", "answer": "multifragmentary", "timestamp": 55000}]'::jsonb,
         'lateral_only→suprasindesmal→multifragmentary',
         '{"involved_malleoli": 7000, "fibular_level": 21000, "suprasindesmal_type": 27000}'::jsonb,
         1);

    -- =========================================================================
    -- 6. UPDATE STUDY COUNTERS
    -- =========================================================================

    UPDATE studies SET
        case_count = 5,
        total_responses = 19,
        unique_raters = 5,
        complete_raters = 3
    WHERE id = study_active_id;

    UPDATE studies SET
        case_count = 3,
        total_responses = 9,
        unique_raters = 3,
        complete_raters = 3
    WHERE id = study_closed_id;

    UPDATE studies SET
        case_count = 2,
        total_responses = 0,
        unique_raters = 0,
        complete_raters = 0
    WHERE id = study_draft_id;

    -- =========================================================================
    -- 7. UPDATE CASE RESPONSE COUNTERS
    -- =========================================================================

    UPDATE cases SET response_count = 5, unique_users = 5 WHERE id = case_active_1_id;
    UPDATE cases SET response_count = 4, unique_users = 4 WHERE id = case_active_2_id;
    UPDATE cases SET response_count = 4, unique_users = 4 WHERE id = case_active_3_id;
    UPDATE cases SET response_count = 3, unique_users = 3 WHERE id = case_active_4_id;
    UPDATE cases SET response_count = 3, unique_users = 3 WHERE id = case_active_5_id;

    RAISE NOTICE 'Test fixtures created successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - 5 test users (raters)';
    RAISE NOTICE '  - 3 studies (draft, active, closed)';
    RAISE NOTICE '  - 10 cases across studies';
    RAISE NOTICE '  - 8 study rater assignments';
    RAISE NOTICE '  - 28 case responses with full divergence analysis data';
    RAISE NOTICE '';
    RAISE NOTICE 'Study IDs:';
    RAISE NOTICE '  Draft:  %', study_draft_id;
    RAISE NOTICE '  Active: %', study_active_id;
    RAISE NOTICE '  Closed: %', study_closed_id;
    RAISE NOTICE '';
    RAISE NOTICE 'All responses include:';
    RAISE NOTICE '  - answer_path: Full question/answer history with timestamps';
    RAISE NOTICE '  - decision_path: Condensed path string (e.g. lateral_only→transindesmal→spiral)';
    RAISE NOTICE '  - time_per_question: Time spent on each question in ms';
    RAISE NOTICE '  - back_clicks: Number of times user went back';

END $$;
