-- ====================================================================
-- SMRITI / MIRI AI MEMORY CARE PRODUCTION DATABASE SCHEMA
-- Migration: 20260923000001_initial_schema.sql
-- Database: PostgreSQL / Supabase
-- Target: HIPAA / DPDP Act Compliant Normalized Healthcare Architecture
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Define Custom Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('PATIENT', 'CAREGIVER', 'HEALTHCARE_WORKER', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE relationship_status AS ENUM ('PENDING', 'AUTHORIZED', 'REVOKED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE relationship_role AS ENUM ('CAREGIVER', 'HEALTHCARE_WORKER', 'FAMILY_MEMBER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE memory_status AS ENUM ('pending', 'confirmed', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE entity_type AS ENUM ('Person', 'Place', 'Event');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE reminder_type AS ENUM ('medication', 'routine', 'social', 'medical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE reminder_status AS ENUM ('pending', 'completed', 'snoozed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE difficulty_level AS ENUM ('EASY', 'MEDIUM', 'HARD');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE language_code AS ENUM ('en', 'as', 'bn', 'mni', 'lus', 'kha');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Core Tables

-- 3.1 User Profiles (extends Supabase auth.users or operates standalone)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  role user_role NOT NULL,
  preferred_language language_code DEFAULT 'en',
  is_verified BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for phone lookups and role queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- 3.2 Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  dob DATE,
  gender VARCHAR(20),
  location VARCHAR(100),
  emergency_contact VARCHAR(20),
  comfort_mode BOOLEAN DEFAULT FALSE,
  large_text BOOLEAN DEFAULT TRUE,
  high_contrast BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 Caregivers Table
CREATE TABLE IF NOT EXISTS caregivers (
  id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50),
  contact_phone VARCHAR(20),
  organization VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.4 Healthcare Workers Table
CREATE TABLE IF NOT EXISTS healthcare_workers (
  id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  organization VARCHAR(150),
  specialization VARCHAR(100),
  license_number VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.5 Patient-Caregiver Authorization Junction
CREATE TABLE IF NOT EXISTS patient_caregivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
  status relationship_status DEFAULT 'AUTHORIZED',
  permissions JSONB DEFAULT '{"can_add_reminders": true, "can_upload_memories": true, "can_view_metrics": true}'::jsonb,
  granted_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_patient_caregiver UNIQUE (patient_id, caregiver_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_caregivers_lookup ON patient_caregivers(caregiver_id, patient_id, status);

-- 3.6 Patient-Healthcare Worker Assignment Junction
CREATE TABLE IF NOT EXISTS patient_healthcare_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  healthcare_worker_id UUID NOT NULL REFERENCES healthcare_workers(id) ON DELETE CASCADE,
  status relationship_status DEFAULT 'AUTHORIZED',
  permissions JSONB DEFAULT '{"can_view_reports": true, "can_generate_observations": true}'::jsonb,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_patient_hw UNIQUE (patient_id, healthcare_worker_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_hw_lookup ON patient_healthcare_workers(healthcare_worker_id, patient_id, status);

-- 3.7 Memories Table
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  caregiver_id UUID REFERENCES caregivers(id) ON DELETE SET NULL,
  media_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  ai_suggestions JSONB DEFAULT '{}'::jsonb,
  status memory_status DEFAULT 'pending',
  uploaded_by VARCHAR(50) DEFAULT 'caregiver',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_patient_status ON memories(patient_id, status);

-- 3.8 Memory Constellation Graph Entities (People, Places, Events)
CREATE TABLE IF NOT EXISTS memory_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  name VARCHAR(100) NOT NULL,
  recognition_strength INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_patient_entity UNIQUE (patient_id, entity_type, name)
);

CREATE INDEX IF NOT EXISTS idx_memory_entities_patient ON memory_entities(patient_id, entity_type);

-- 3.9 Memory - Entity Link Junction (Graph Edges)
CREATE TABLE IF NOT EXISTS memory_entity_links (
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES memory_entities(id) ON DELETE CASCADE,
  PRIMARY KEY (memory_id, entity_id)
);

-- 3.10 Cognitive Difficulty Profile
CREATE TABLE IF NOT EXISTS difficulty_profiles (
  patient_id UUID PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  current_difficulty difficulty_level DEFAULT 'MEDIUM',
  rolling_accuracy INTEGER DEFAULT 50,
  avg_response_time_ms INTEGER DEFAULT 4500,
  last_adjusted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.11 Cognitive Game Results (Sessions & Answers)
CREATE TABLE IF NOT EXISTS game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  game_name VARCHAR(100) NOT NULL,
  score INTEGER DEFAULT 0,
  accuracy INTEGER NOT NULL,
  response_time_ms INTEGER DEFAULT 5000,
  difficulty_level difficulty_level DEFAULT 'MEDIUM',
  client_uuid UUID UNIQUE, -- Deduplication key for offline sync
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_results_patient_time ON game_results(patient_id, completed_at DESC);

-- 3.12 Reminders
CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  time TIMESTAMPTZ NOT NULL,
  type reminder_type NOT NULL DEFAULT 'routine',
  status reminder_status NOT NULL DEFAULT 'pending',
  frequency VARCHAR(50) DEFAULT 'once',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_patient_time ON reminders(patient_id, time, status);

-- 3.13 Medications
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  caregiver_id UUID REFERENCES caregivers(id) ON DELETE SET NULL,
  medication_name VARCHAR(150) NOT NULL,
  time_of_day VARCHAR(50) NOT NULL, -- e.g., 'Morning', 'Afternoon', 'Night'
  instructions TEXT DEFAULT '',
  is_taken BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id, is_taken);

-- 3.14 Family Messages
CREATE TABLE IF NOT EXISTS family_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  sender_name VARCHAR(100) NOT NULL,
  sender_role VARCHAR(50) DEFAULT 'Family Member',
  message TEXT NOT NULL,
  audio_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_messages_patient ON family_messages(patient_id, created_at DESC);

-- 3.15 Caregiver Clinical Notes
CREATE TABLE IF NOT EXISTS caregiver_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  caregiver_id UUID REFERENCES caregivers(id) ON DELETE SET NULL,
  note_text TEXT NOT NULL,
  created_by_name VARCHAR(100) DEFAULT 'Caregiver',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.16 Daily Interactive Reels
CREATE TABLE IF NOT EXISTS reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'memory_photo', 'voice_note', 'game_quiz'
  media_url TEXT,
  caption TEXT,
  options JSONB DEFAULT '[]'::jsonb,
  correct_answer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.17 Offline Sync Queue & Idempotency Log
CREATE TABLE IF NOT EXISTS sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_uuid UUID UNIQUE NOT NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  action_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- 3.18 Activity Stream
CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.19 Compliance Audit Logs (Append-Only)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);

-- ====================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- 4.1 Helper Authorization Functions
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_user_role(target_user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM user_profiles WHERE id = target_user_id;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_patient_caregiver(p_patient_id UUID, p_caregiver_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM patient_caregivers 
    WHERE patient_id = p_patient_id 
      AND caregiver_id = p_caregiver_id 
      AND status = 'AUTHORIZED'
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_patient_healthcare_worker(p_patient_id UUID, p_hw_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM patient_healthcare_workers 
    WHERE patient_id = p_patient_id 
      AND healthcare_worker_id = p_hw_id 
      AND status = 'AUTHORIZED'
  );
$$ LANGUAGE sql STABLE;

-- 4.2 Enable RLS on All Tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE healthcare_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_healthcare_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_entity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE difficulty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 4.3 Policies for user_profiles
CREATE POLICY user_profiles_read_own_or_authorized ON user_profiles
  FOR SELECT USING (
    id = current_user_id() OR
    EXISTS (SELECT 1 FROM patient_caregivers pc WHERE (pc.patient_id = user_profiles.id AND pc.caregiver_id = current_user_id()) OR (pc.caregiver_id = user_profiles.id AND pc.patient_id = current_user_id())) OR
    EXISTS (SELECT 1 FROM patient_healthcare_workers ph WHERE ph.patient_id = user_profiles.id AND ph.healthcare_worker_id = current_user_id())
  );

CREATE POLICY user_profiles_update_own ON user_profiles
  FOR UPDATE USING (id = current_user_id());

-- 4.4 Policies for patients
CREATE POLICY patients_read_policy ON patients
  FOR SELECT USING (
    id = current_user_id() OR
    is_patient_caregiver(id, current_user_id()) OR
    is_patient_healthcare_worker(id, current_user_id())
  );

CREATE POLICY patients_update_policy ON patients
  FOR UPDATE USING (
    id = current_user_id() OR
    is_patient_caregiver(id, current_user_id())
  );

-- 4.5 Policies for memories
CREATE POLICY memories_patient_caregiver_select ON memories
  FOR SELECT USING (
    patient_id = current_user_id() OR
    is_patient_caregiver(patient_id, current_user_id()) OR
    is_patient_healthcare_worker(patient_id, current_user_id())
  );

CREATE POLICY memories_patient_caregiver_insert ON memories
  FOR INSERT WITH CHECK (
    patient_id = current_user_id() OR
    is_patient_caregiver(patient_id, current_user_id())
  );

CREATE POLICY memories_patient_caregiver_update ON memories
  FOR UPDATE USING (
    patient_id = current_user_id() OR
    is_patient_caregiver(patient_id, current_user_id())
  );

CREATE POLICY memories_patient_caregiver_delete ON memories
  FOR DELETE USING (
    patient_id = current_user_id() OR
    is_patient_caregiver(patient_id, current_user_id())
  );

-- 4.6 Policies for reminders
CREATE POLICY reminders_select ON reminders
  FOR SELECT USING (
    patient_id = current_user_id() OR
    is_patient_caregiver(patient_id, current_user_id())
  );

CREATE POLICY reminders_modify ON reminders
  FOR ALL USING (
    patient_id = current_user_id() OR
    is_patient_caregiver(patient_id, current_user_id())
  );

-- 4.7 Policies for game_results
CREATE POLICY game_results_select ON game_results
  FOR SELECT USING (
    patient_id = current_user_id() OR
    is_patient_caregiver(patient_id, current_user_id()) OR
    is_patient_healthcare_worker(patient_id, current_user_id())
  );

CREATE POLICY game_results_insert ON game_results
  FOR INSERT WITH CHECK (
    patient_id = current_user_id()
  );

-- 4.8 Audit Logs: Append-only
CREATE POLICY audit_logs_insert_only ON audit_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY audit_logs_admin_read ON audit_logs
  FOR SELECT USING (get_user_role(current_user_id()) = 'ADMIN');
