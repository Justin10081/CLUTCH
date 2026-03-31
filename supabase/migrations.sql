-- CLUTCH — Migration: Add columns needed for full Supabase sync
-- Run this in your Supabase SQL Editor

-- Add syllabus_data JSONB to courses (stores AI-parsed syllabus structure)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS syllabus_data JSONB;

-- Add gpa_data JSONB to profiles (stores GPA Simulator state per user)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gpa_data JSONB DEFAULT '{}'::jsonb;

-- Done! These are the only schema changes needed.
-- All other tables (deadlines, study_sessions, course_materials) already have the right columns.
