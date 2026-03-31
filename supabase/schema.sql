-- CLUTCH App — Supabase Schema
-- Run this in your Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── PROFILES ──────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  university TEXT,
  major TEXT,
  graduation_year INTEGER,
  streak_days INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── COURSES ───────────────────────────────────────────────
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  professor TEXT,
  credits INTEGER DEFAULT 3,
  color TEXT DEFAULT '#3b82f6',
  semester TEXT,
  target_grade TEXT DEFAULT 'B+',
  syllabus TEXT,
  syllabus_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── COURSE MATERIALS ──────────────────────────────────────
CREATE TABLE course_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  content TEXT,
  file_type TEXT DEFAULT 'text',
  file_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── DEADLINES ─────────────────────────────────────────────
CREATE TABLE deadlines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  course_name TEXT,
  course_color TEXT DEFAULT '#3b82f6',
  title TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  type TEXT DEFAULT 'assignment' CHECK (type IN ('exam','assignment','project','quiz','essay','other')),
  weight INTEGER DEFAULT 5,
  difficulty INTEGER DEFAULT 5,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── STUDY SESSIONS (Clutch Mode history) ──────────────────
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  course_name TEXT,
  topic TEXT,
  files_used TEXT[] DEFAULT '{}',
  result JSONB,
  quiz_score INTEGER,
  quiz_total INTEGER,
  duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── GPA ENTRIES ───────────────────────────────────────────
CREATE TABLE gpa_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_name TEXT NOT NULL,
  course_code TEXT,
  credits NUMERIC DEFAULT 3,
  target_grade TEXT,
  actual_grade TEXT,
  semester TEXT,
  academic_year TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── POMODORO SESSIONS ─────────────────────────────────────
CREATE TABLE pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  sessions_completed INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpa_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pomodoro_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "courses_own" ON courses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "materials_own" ON course_materials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "deadlines_own" ON deadlines FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "sessions_own" ON study_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "gpa_own" ON gpa_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "pomodoro_own" ON pomodoro_sessions FOR ALL USING (auth.uid() = user_id);

-- ── AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── AUTO-UPDATE TIMESTAMPS ────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
