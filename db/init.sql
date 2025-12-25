-- Database initialization SQL for Attendance & Worklog app
-- Creates departments, profiles, attendance, worklogs tables
-- Run in Supabase SQL editor or via psql

-- Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles (linked to Supabase auth.users)
-- NOTE: This table definition is aligned with src/types/database.ts and DATABASE_SCHEMA.md
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,                          -- references auth.users.id
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'employee',        -- 'admin' | 'employee'
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  phone text,                                   -- nullable contact number
  join_date date NOT NULL DEFAULT CURRENT_DATE, -- employment start date
  is_active boolean NOT NULL DEFAULT true,      -- soft-delete / active flag
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'employee'))
);

-- Attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON public.attendance (employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance (date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance (status);

-- Worklogs
CREATE TABLE IF NOT EXISTS public.worklogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  tasks_completed text NOT NULL,
  hours_spent numeric(4,2) NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_worklogs_employee ON public.worklogs (employee_id);
CREATE INDEX IF NOT EXISTS idx_worklogs_date ON public.worklogs (date);

-- Note: Supabase authentication users are stored in the `auth` schema. Create
-- authentication users via Supabase Dashboard, the Admin API, or the
-- `supabase` CLI. After creating auth users, insert corresponding rows into
-- `public.profiles` with the user's `id` returned from the Auth creation.
