-- ==========================================
-- ADD DEPARTMENTS
-- Run this in Supabase SQL Editor
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

-- Verify departments were added
SELECT id, name, created_at 
FROM public.departments 
ORDER BY name;

-- ==========================================
-- To add a single department manually:
-- ==========================================
-- INSERT INTO public.departments (name)
-- VALUES ('Your Department Name')
-- ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- To update a department name:
-- ==========================================
-- UPDATE public.departments
-- SET name = 'New Department Name'
-- WHERE name = 'Old Department Name';

-- ==========================================
-- To delete a department (only if no employees assigned):
-- ==========================================
-- DELETE FROM public.departments
-- WHERE name = 'Department Name';

