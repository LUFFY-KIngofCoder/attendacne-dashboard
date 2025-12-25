-- Combined DB setup: extension, RLS policies, secure functions, and triggers
-- Run this in Supabase SQL editor to recreate/verify schema + policies

-- 1) Ensure UUID generator extension exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) (Optional) You can re-run table creation if needed; recommended to keep init.sql as source
-- The tables are defined in db/init.sql. This file focuses on RLS, policies and secure functions.

-- 3) Enable RLS on public tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worklogs ENABLE ROW LEVEL SECURITY;

-- Helper: is_admin(uid) to check admin role without causing RLS recursion
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

-- 4) Profiles policies (owner + admin short-list)
-- Owner can select/update their own profile
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  USING ( auth.uid() = id );

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  USING ( auth.uid() = id )
  WITH CHECK ( auth.uid() = id );

-- Admin policies (replace UUIDs with real admin ids if needed)
DROP POLICY IF EXISTS profiles_admin_full ON public.profiles;
CREATE POLICY profiles_admin_full
  ON public.profiles
  FOR ALL
  USING ( public.is_admin(auth.uid()) );

-- 5) Attendance policies (owner + admin)
DROP POLICY IF EXISTS attendance_insert_own ON public.attendance;
CREATE POLICY attendance_insert_own ON public.attendance
  FOR INSERT WITH CHECK ( auth.uid() = employee_id );

DROP POLICY IF EXISTS attendance_select_own ON public.attendance;
CREATE POLICY attendance_select_own ON public.attendance
  FOR SELECT USING ( auth.uid() = employee_id );

DROP POLICY IF EXISTS attendance_admin_full ON public.attendance;
CREATE POLICY attendance_admin_full ON public.attendance
  FOR ALL USING ( public.is_admin(auth.uid()) );

-- 6) Worklogs policies (owner + admin)
DROP POLICY IF EXISTS worklogs_insert_own ON public.worklogs;
CREATE POLICY worklogs_insert_own ON public.worklogs
  FOR INSERT WITH CHECK ( auth.uid() = employee_id );

DROP POLICY IF EXISTS worklogs_select_own ON public.worklogs;
CREATE POLICY worklogs_select_own ON public.worklogs
  FOR SELECT USING ( auth.uid() = employee_id );

DROP POLICY IF EXISTS worklogs_admin_full ON public.worklogs;
CREATE POLICY worklogs_admin_full ON public.worklogs
  FOR ALL USING ( public.is_admin(auth.uid()) );

-- 7) Departments policies (allow authenticated users to read, admins full access)
DROP POLICY IF EXISTS departments_select_auth ON public.departments;
CREATE POLICY departments_select_auth
  ON public.departments
  FOR SELECT
  USING ( auth.uid() IS NOT NULL );

DROP POLICY IF EXISTS departments_admin_full ON public.departments;
CREATE POLICY departments_admin_full
  ON public.departments
  FOR ALL USING ( public.is_admin(auth.uid()) );

-- 8) Secure functions: handle_new_user (auto-create profile) with fixed search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, created_at)
    VALUES (NEW.id, NEW.email, NEW.email, 'employee', now())
    ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9) Secure function: set_updated_at with fixed search_path
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

DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_attendance ON public.attendance;
CREATE TRIGGER set_updated_at_attendance
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_worklogs ON public.worklogs;
CREATE TRIGGER set_updated_at_worklogs
  BEFORE UPDATE ON public.worklogs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- End of setup
