-- ==========================================
-- SEED DEMO USERS: Admin + Employee Profiles
-- ==========================================
-- 
-- PREREQUISITE: You must first create auth users via one of these methods:
-- 
--   Option A: Use Supabase Dashboard
--     1. Go to Authentication > Users > Add User
--     2. Create: admin@company.com / admin123 (email confirmed: YES)
--     3. Create: employee@company.com / employee123 (email confirmed: YES)
-- 
--   Option B: Use the seed script (requires SERVICE_ROLE_KEY)
--     node scripts/seed_supabase.js
-- 
--   Option C: Use Supabase Admin API directly (curl/Postman)
--     POST /auth/v1/admin/users
--     Body: { "email": "admin@company.com", "password": "admin123", "email_confirm": true }
-- 
-- ==========================================
-- STEP 1: Check if auth users exist and get their IDs
-- ==========================================
-- Run this query first to see if users exist and get their UUIDs:

SELECT 
  id,
  email,
  created_at
FROM auth.users
WHERE email IN ('admin@company.com', 'employee@company.com')
ORDER BY email;

-- ==========================================
-- STEP 2: Insert/Update profiles for demo users
-- ==========================================
-- Replace <ADMIN_UUID> and <EMPLOYEE_UUID> with the actual IDs from Step 1,
-- then run this INSERT block:

-- Example (replace with actual UUIDs):
-- INSERT INTO public.profiles (id, email, full_name, role, is_active)
-- VALUES
--   ('123e4567-e89b-12d3-a456-426614174000', 'admin@company.com', 'Admin User', 'admin', true),
--   ('123e4567-e89b-12d3-a456-426614174001', 'employee@company.com', 'Demo Employee', 'employee', true)
-- ON CONFLICT (id) DO UPDATE
-- SET email = EXCLUDED.email,
--     full_name = EXCLUDED.full_name,
--     role = EXCLUDED.role,
--     is_active = EXCLUDED.is_active;

-- ==========================================
-- STEP 2.5: Create Departments First
-- ==========================================
-- Insert sample departments (will skip if already exist)
INSERT INTO public.departments (name)
VALUES
  ('Engineering'),
  ('Human Resources'),
  ('Sales'),
  ('Marketing'),
  ('Finance'),
  ('Operations')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- STEP 3: Automated version (if auth users already exist)
-- ==========================================
-- This will automatically find auth users by email and create/update profiles:

DO $$
DECLARE
  admin_id uuid;
  employee_id uuid;
  engineering_dept_id uuid;
BEGIN
  -- Get Engineering department ID
  SELECT id INTO engineering_dept_id
  FROM public.departments
  WHERE name = 'Engineering'
  LIMIT 1;

  -- Get admin user ID
  SELECT id INTO admin_id
  FROM auth.users
  WHERE email = 'admin@company.com'
  LIMIT 1;

  -- Get employee user ID
  SELECT id INTO employee_id
  FROM auth.users
  WHERE email = 'employee@company.com'
  LIMIT 1;

  -- Insert/Update admin profile
  IF admin_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, is_active)
    VALUES (admin_id, 'admin@company.com', 'Admin User', 'admin', true)
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active;
    
    RAISE NOTICE 'Admin profile created/updated for user: %', admin_id;
  ELSE
    RAISE WARNING 'Admin user (admin@company.com) not found in auth.users. Please create it first.';
  END IF;

  -- Insert/Update employee profile (with department assignment)
  IF employee_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, department_id, is_active)
    VALUES (employee_id, 'employee@company.com', 'Demo Employee', 'employee', engineering_dept_id, true)
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        department_id = EXCLUDED.department_id,
        is_active = EXCLUDED.is_active;
    
    RAISE NOTICE 'Employee profile created/updated for user: %', employee_id;
  ELSE
    RAISE WARNING 'Employee user (employee@company.com) not found in auth.users. Please create it first.';
  END IF;

  -- Summary
  IF admin_id IS NULL OR employee_id IS NULL THEN
    RAISE EXCEPTION 'One or more auth users are missing. Please create them first via Dashboard or seed script.';
  ELSE
    RAISE NOTICE '✓ Demo profiles seeded successfully!';
    RAISE NOTICE '  Admin: admin@company.com / admin123';
    RAISE NOTICE '  Employee: employee@company.com / employee123';
    IF engineering_dept_id IS NOT NULL THEN
      RAISE NOTICE '  Employee assigned to Engineering department';
    END IF;
  END IF;
END $$;

-- ==========================================
-- VERIFICATION: Check created profiles
-- ==========================================
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.is_active,
  p.created_at
FROM public.profiles p
WHERE p.email IN ('admin@company.com', 'employee@company.com')
ORDER BY p.role DESC, p.email;

