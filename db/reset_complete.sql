-- ==========================================
-- COMPLETE DATABASE RESET
-- Run this entire script in Supabase SQL Editor
-- This will drop and recreate everything from scratch
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------
-- 1. Drop triggers
-- ------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at_attendance ON public.attendance;
DROP TRIGGER IF EXISTS set_updated_at_worklogs ON public.worklogs;
DROP TRIGGER IF EXISTS set_updated_at_holidays ON public.holidays;
DROP TRIGGER IF EXISTS set_updated_at_events ON public.events;

-- ------------------------------------------
-- 2. Drop functions (CASCADE will drop dependent policies)
-- ------------------------------------------
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

-- ------------------------------------------
-- 3. Drop remaining RLS policies
-- ------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('departments', 'profiles', 'attendance', 'worklogs', 'holidays', 'events')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;',
                   pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ------------------------------------------
-- 4. Drop tables
-- ------------------------------------------
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.worklogs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.holidays CASCADE;

-- ==========================================
-- 5. CREATE TABLES (Schema matches src/types/database.ts)
-- ==========================================

-- Departments
CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,                           -- references auth.users.id
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'employee',        -- 'admin' | 'employee'
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  phone text,                                    -- nullable
  join_date date NOT NULL DEFAULT CURRENT_DATE,  -- employment start date
  is_active boolean NOT NULL DEFAULT true,       -- soft-delete flag
  weekly_wfh_limit integer,                      -- allowed WFH days per week (nullable = unlimited)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Enforce allowed roles
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'employee'));

-- Enforce 10-digit phone numbers (if provided)
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_10digits
  CHECK (phone IS NULL OR phone ~ '^[0-9]{10}$');

-- Attendance
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL,
  work_mode text DEFAULT 'physical',
  reason text,
  check_in_time timestamptz,
  check_out_time timestamptz,
  is_approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  CONSTRAINT attendance_employee_date_unique UNIQUE (employee_id, date)
);

-- Enforce allowed attendance statuses
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_status_check
  CHECK (status IN ('present', 'half_day', 'on_leave', 'absent'));

-- Enforce allowed work modes
ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_work_mode_check
  CHECK (work_mode IN ('wfh', 'physical') OR work_mode IS NULL);

-- Indexes
CREATE INDEX idx_attendance_employee ON public.attendance (employee_id);
CREATE INDEX idx_attendance_date ON public.attendance (date);
CREATE INDEX idx_attendance_status ON public.attendance (status);

-- Worklogs
CREATE TABLE public.worklogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  tasks_completed text NOT NULL,
  hours_spent numeric(4,2) NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

-- Enforce hours_spent bounds
ALTER TABLE public.worklogs
  ADD CONSTRAINT worklogs_hours_check
  CHECK (hours_spent >= 0 AND hours_spent <= 24);

-- Indexes
CREATE INDEX idx_worklogs_employee ON public.worklogs (employee_id);
CREATE INDEX idx_worklogs_date ON public.worklogs (date);

-- Holidays
CREATE TABLE public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  is_holiday boolean NOT NULL DEFAULT true,
  name text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX idx_holidays_date ON public.holidays (date);

-- Events table (separate from holidays - multiple events per date)
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE INDEX idx_events_date ON public.events (date);

-- ==========================================
-- 6. ENABLE RLS
-- ==========================================
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worklogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 7. CREATE HELPER FUNCTIONS
-- ==========================================

-- is_admin(uid) - Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  r text;
BEGIN
  SELECT role INTO r FROM public.profiles WHERE id = uid;
  RETURN r = 'admin';
END;
$$;

-- handle_new_user() - Auto-create profile when auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.email, 'employee')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- set_updated_at() - Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ==========================================
-- 8. CREATE TRIGGERS
-- ==========================================

-- Trigger: Auto-create profile on auth user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers: Auto-update updated_at
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_attendance
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_worklogs
  BEFORE UPDATE ON public.worklogs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_holidays
  BEFORE UPDATE ON public.holidays
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_events
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==========================================
-- 9. CREATE RLS POLICIES
-- ==========================================

-- Profiles policies
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_admin_full
  ON public.profiles
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- Attendance policies
CREATE POLICY attendance_insert_own
  ON public.attendance
  FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY attendance_select_own
  ON public.attendance
  FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY attendance_admin_full
  ON public.attendance
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- Worklogs policies
CREATE POLICY worklogs_insert_own
  ON public.worklogs
  FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY worklogs_select_own
  ON public.worklogs
  FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY worklogs_admin_full
  ON public.worklogs
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- Departments policies
CREATE POLICY departments_select_auth
  ON public.departments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY departments_admin_full
  ON public.departments
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- Holidays policies
CREATE POLICY holidays_select_auth
  ON public.holidays
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY holidays_admin_full
  ON public.holidays
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- Events policies
CREATE POLICY events_select_auth
  ON public.events
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY events_admin_full
  ON public.events
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- ==========================================
-- RESET COMPLETE!
-- ==========================================
-- Next steps:
-- 1. Create auth users (see db/RESET_AND_SEED.md)
-- 2. Run db/seed_demo_users.sql to create profiles

