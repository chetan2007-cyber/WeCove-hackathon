-- ====================================================================
-- SMRITI / MIRI AI MEMORY CARE SEED DATA
-- Purpose: Realistic test fixtures for Patient, Caregiver, Clinician,
--          Authorized relationships, Cognitive sessions, Memories, and Reminders.
-- ====================================================================

-- Fixed deterministic UUIDs for testing and development
DO $$
DECLARE
  v_patient_id UUID := '11111111-1111-1111-1111-111111111111';
  v_caregiver_id UUID := '22222222-2222-2222-2222-222222222222';
  v_clinician_id UUID := '33333333-3333-3333-3333-333333333333';
  v_admin_id UUID := '44444444-4444-4444-4444-444444444444';

  v_mem1_id UUID := 'aaaaaaaa-1111-1111-1111-111111111111';
  v_mem2_id UUID := 'aaaaaaaa-2222-2222-2222-222222222222';
  v_mem3_id UUID := 'aaaaaaaa-3333-3333-3333-333333333333';

  v_ent_person UUID := 'bbbbbbbb-1111-1111-1111-111111111111';
  v_ent_place UUID := 'bbbbbbbb-2222-2222-2222-222222222222';
  v_ent_event UUID := 'bbbbbbbb-3333-3333-3333-333333333333';
BEGIN
  -- 1. Insert User Profiles
  INSERT INTO user_profiles (id, phone, name, role, preferred_language, is_verified)
  VALUES 
    (v_patient_id, '+919876543210', 'Chetan Sharma', 'PATIENT', 'en', true),
    (v_caregiver_id, '+919876543211', 'Ananya Sharma', 'CAREGIVER', 'en', true),
    (v_clinician_id, '+919876543212', 'Dr. Barua (Lead Clinician)', 'HEALTHCARE_WORKER', 'as', true),
    (v_admin_id, '+919876543213', 'System Administrator', 'ADMIN', 'en', true)
  ON CONFLICT (id) DO NOTHING;

  -- 2. Role-specific Sub-profiles
  INSERT INTO patients (id, dob, gender, location, emergency_contact, comfort_mode, large_text)
  VALUES (v_patient_id, '1952-08-15', 'Male', 'Guwahati, Assam', '+919876543211', false, true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO caregivers (id, relationship_type, contact_phone, organization)
  VALUES (v_caregiver_id, 'Daughter', '+919876543211', 'Family Caregiver')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO healthcare_workers (id, organization, specialization, license_number)
  VALUES (v_clinician_id, 'Assam Medical Institute', 'Geriatric & Cognitive Care', 'NMC-AS-2024-8841')
  ON CONFLICT (id) DO NOTHING;

  -- 3. Explicit Authorized Relationships
  INSERT INTO patient_caregivers (patient_id, caregiver_id, status)
  VALUES (v_patient_id, v_caregiver_id, 'AUTHORIZED')
  ON CONFLICT (patient_id, caregiver_id) DO NOTHING;

  INSERT INTO patient_healthcare_workers (patient_id, healthcare_worker_id, status)
  VALUES (v_patient_id, v_clinician_id, 'AUTHORIZED')
  ON CONFLICT (patient_id, healthcare_worker_id) DO NOTHING;

  -- 4. Difficulty Profile
  INSERT INTO difficulty_profiles (patient_id, current_difficulty, rolling_accuracy, avg_response_time_ms)
  VALUES (v_patient_id, 'MEDIUM', 78, 3800)
  ON CONFLICT (patient_id) DO NOTHING;

  -- 5. Memories
  INSERT INTO memories (id, patient_id, caregiver_id, media_url, caption, status, ai_suggestions, uploaded_by)
  VALUES
    (v_mem1_id, v_patient_id, v_caregiver_id, '/manus-storage/shillong_cd371abe.jpg', 'Trip to Umiam Lake, Shillong', 'confirmed', 
     '{"people": ["Ananya", "Chirag"], "place": "Umiam Lake, Shillong", "event": "Family Holiday", "mood": "Serene", "dateCues": "Spring afternoon"}'::jsonb, 'caregiver'),
    (v_mem2_id, v_patient_id, v_caregiver_id, '/manus-storage/family_6e10bf6e.jpg', 'Diwali Gathering with Grandchildren', 'confirmed',
     '{"people": ["Family", "Grandchildren"], "place": "Living Room", "event": "Festival of Lights", "mood": "Joyful", "dateCues": "Evening"}'::jsonb, 'caregiver'),
    (v_mem3_id, v_patient_id, v_caregiver_id, '/manus-storage/ananya_8d4ced56.jpg', 'Morning Tea in the Garden', 'confirmed',
     '{"people": ["Ananya"], "place": "Home Veranda", "event": "Tea Time", "mood": "Peaceful", "dateCues": "Morning sunlight"}'::jsonb, 'patient')
  ON CONFLICT (id) DO NOTHING;

  -- 6. Constellation Graph Entities
  INSERT INTO memory_entities (id, patient_id, entity_type, name, recognition_strength)
  VALUES
    (v_ent_person, v_patient_id, 'Person', 'Ananya', 9),
    (v_ent_place, v_patient_id, 'Place', 'Shillong', 8),
    (v_ent_event, v_patient_id, 'Event', 'Family Holiday', 7)
  ON CONFLICT (patient_id, entity_type, name) DO NOTHING;

  INSERT INTO memory_entity_links (memory_id, entity_id)
  VALUES
    (v_mem1_id, v_ent_person),
    (v_mem1_id, v_ent_place),
    (v_mem1_id, v_ent_event)
  ON CONFLICT DO NOTHING;

  -- 7. Reminders & Medications
  INSERT INTO reminders (patient_id, title, time, type, status)
  VALUES
    (v_patient_id, 'Morning Blood Pressure Medicine', NOW() + INTERVAL '30 minutes', 'medication', 'pending'),
    (v_patient_id, 'Hydration Check - Drink warm water', NOW() + INTERVAL '2 hours', 'routine', 'pending'),
    (v_patient_id, 'Evening Walk in Garden with Ananya', NOW() + INTERVAL '5 hours', 'routine', 'pending'),
    (v_patient_id, 'Video call with MF (Grandson)', NOW() + INTERVAL '7 hours', 'social', 'pending')
  ON CONFLICT DO NOTHING;

  INSERT INTO medications (patient_id, caregiver_id, medication_name, time_of_day, instructions, is_taken)
  VALUES
    (v_patient_id, v_caregiver_id, 'Amlodipine 5mg', 'Morning', 'Take after light breakfast with half glass of water', false),
    (v_patient_id, v_caregiver_id, 'Donepezil 5mg', 'Night', 'Take before sleeping', false)
  ON CONFLICT DO NOTHING;

  -- 8. Family Messages
  INSERT INTO family_messages (patient_id, sender_name, sender_role, message)
  VALUES
    (v_patient_id, 'Ananya', 'Daughter', 'Good morning Baba! Chirag and I will call you after tea today. Remember to drink water!'),
    (v_patient_id, 'Chirag', 'Son', 'Thinking of you Baba. Loved seeing your score on the memory game!')
  ON CONFLICT DO NOTHING;

  -- 9. Caregiver Clinical Notes
  INSERT INTO caregiver_notes (patient_id, caregiver_id, note_text, created_by_name)
  VALUES
    (v_patient_id, v_caregiver_id, 'Patient was very cheerful today. Recognized Umiam Lake photo immediately during the Memory Journey. Slept well.', 'Ananya (Daughter)')
  ON CONFLICT DO NOTHING;

  -- 10. Historical Game Results (for charts & adaptive engine)
  FOR i IN 1..10 LOOP
    INSERT INTO game_results (patient_id, game_name, score, accuracy, response_time_ms, difficulty_level, completed_at)
    VALUES (
      v_patient_id, 
      'Memory Journey', 
      70 + (i * 2), 
      70 + (i * 2), 
      4500 - (i * 100), 
      'MEDIUM', 
      NOW() - ((11 - i) || ' days')::INTERVAL
    );
  END LOOP;

END $$;
