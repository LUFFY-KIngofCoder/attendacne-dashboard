# All Database Commands - Quick Reference

## 🚀 Complete Setup (Do This First)

### 1. Reset Database
**File:** `db/reset_complete.sql`
- Copy entire file → Paste in Supabase SQL Editor → Run

### 2. Add Departments
**File:** `db/add_departments.sql`
- Copy entire file → Paste in Supabase SQL Editor → Run
- **OR** run: `npm run seed` (includes departments)

### 3. Add Users & Profiles
**Option A: Use Seed Script (Recommended)**
```bash
npm run seed
```
This does everything: departments + users + profiles

**Option B: Manual Steps**
1. Create users via Supabase Dashboard (see `db/ADD_USERS_GUIDE.md`)
2. Run: `db/seed_demo_users.sql` in SQL Editor

---

## 📋 Individual Commands

### Add a Single Department
```sql
INSERT INTO public.departments (name)
VALUES ('Your Department Name')
ON CONFLICT (name) DO NOTHING;
```

### Add Multiple Departments
```sql
INSERT INTO public.departments (name)
VALUES
  ('Engineering'),
  ('Sales'),
  ('Marketing')
ON CONFLICT (name) DO NOTHING;
```

### View All Departments
```sql
SELECT id, name, created_at 
FROM public.departments 
ORDER BY name;
```

### Update Department Name
```sql
UPDATE public.departments
SET name = 'New Name'
WHERE name = 'Old Name';
```

### Delete Department (only if no employees assigned)
```sql
DELETE FROM public.departments
WHERE name = 'Department Name';
```

---

### Add a User (via Dashboard)
1. Go to **Authentication → Users → Add User**
2. Email: `user@example.com`
3. Password: `password123`
4. ✅ **Auto Confirm User**: ON
5. Click **Create User**

### Add Profile for Existing User
```sql
-- First get the user ID
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Then insert profile (replace <USER_ID> with actual UUID)
INSERT INTO public.profiles (id, email, full_name, role, department_id, is_active)
VALUES (
  '<USER_ID>',
  'user@example.com',
  'Full Name',
  'employee',  -- or 'admin'
  NULL,       -- or department UUID
  true
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department_id = EXCLUDED.department_id,
    is_active = EXCLUDED.is_active;
```

### Assign Employee to Department
```sql
-- Get department ID
SELECT id, name FROM public.departments WHERE name = 'Engineering';

-- Update employee (replace <USER_ID> and <DEPT_ID>)
UPDATE public.profiles
SET department_id = '<DEPT_ID>'
WHERE id = '<USER_ID>';
```

---

## ✅ Verification Queries

### Check Everything is Set Up
```sql
-- Departments
SELECT COUNT(*) as department_count FROM public.departments;

-- Users
SELECT COUNT(*) as user_count FROM auth.users;

-- Profiles
SELECT 
  p.email,
  p.full_name,
  p.role,
  p.is_active,
  d.name as department
FROM public.profiles p
LEFT JOIN public.departments d ON p.department_id = d.id
ORDER BY p.role DESC, p.email;
```

### Check RLS Policies
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

### Check Functions & Triggers
```sql
-- Functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public';

-- Triggers
SELECT tgname, tgrelid::regclass 
FROM pg_trigger 
WHERE tgname LIKE '%user%' OR tgname LIKE '%updated%';
```

---

## 🔧 Troubleshooting

### "Permission denied" Error
- Make sure you ran `db/reset_complete.sql`
- Check you're logged in as admin when testing

### "User already exists"
- User exists in auth.users
- Use `db/seed_demo_users.sql` to update profile
- Or update manually via SQL

### Departments Not Showing
- Run `db/add_departments.sql`
- Or check: `SELECT * FROM public.departments;`

### Users Show as Inactive
```sql
UPDATE public.profiles 
SET is_active = true 
WHERE email = 'user@example.com';
```

---

## 📁 File Reference

- `db/reset_complete.sql` - Full database reset
- `db/add_departments.sql` - Add sample departments
- `db/seed_demo_users.sql` - Create demo profiles (requires auth users first)
- `scripts/seed_supabase.js` - Complete seed script (departments + users + profiles)
- `db/ADD_USERS_GUIDE.md` - Detailed user creation guide

