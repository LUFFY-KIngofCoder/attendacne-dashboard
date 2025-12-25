# Complete Database Reset & Seed Guide

## Quick Start: 3-Step Process

### Step 1: Run the Full Reset SQL
Copy and paste the entire contents of `db/reset_complete.sql` into **Supabase SQL Editor** and run it.

This will:
- ✅ Drop all existing tables, policies, functions, triggers
- ✅ Recreate everything from scratch with correct schema
- ✅ Set up RLS policies, helper functions, and triggers

### Step 2: Create Auth Users

**Option A: Supabase Dashboard (Easiest)**
1. Go to **Authentication → Users → Add User**
2. Create user:
   - Email: `admin@company.com`
   - Password: `admin123`
   - ✅ Check "Auto Confirm User"
   - Click "Create User"
3. Repeat for:
   - Email: `employee@company.com`
   - Password: `employee123`
   - ✅ Check "Auto Confirm User"

**Option B: Use Seed Script (Requires Service Role Key)**
```bash
# Set environment variables
export VITE_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run seed script
node scripts/seed_supabase.js
```

**Option C: Supabase Admin API (curl)**
```bash
# Replace YOUR_PROJECT_URL and YOUR_SERVICE_ROLE_KEY
curl -X POST 'YOUR_PROJECT_URL/auth/v1/admin/users' \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123","email_confirm":true}'

curl -X POST 'YOUR_PROJECT_URL/auth/v1/admin/users' \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"employee@company.com","password":"employee123","email_confirm":true}'
```

### Step 3: Seed Profiles (Run in Supabase SQL Editor)

Copy and paste the entire contents of `db/seed_demo_users.sql` into **Supabase SQL Editor** and run it.

This will:
- ✅ Automatically find the auth users by email
- ✅ Create/update profiles with correct roles
- ✅ Show success messages if everything worked

**Alternative Manual Method:**
If the automated script doesn't work, first run this to get UUIDs:
```sql
SELECT id, email FROM auth.users 
WHERE email IN ('admin@company.com', 'employee@company.com');
```

Then manually insert:
```sql
INSERT INTO public.profiles (id, email, full_name, role, is_active)
VALUES
  ('<ADMIN_UUID_FROM_ABOVE>', 'admin@company.com', 'Admin User', 'admin', true),
  ('<EMPLOYEE_UUID_FROM_ABOVE>', 'employee@company.com', 'Demo Employee', 'employee', true)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;
```

## Verification

After completing all steps, verify everything works:

```sql
-- Check profiles exist
SELECT id, email, full_name, role, is_active 
FROM public.profiles 
WHERE email IN ('admin@company.com', 'employee@company.com');

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_admin', 'handle_new_user', 'set_updated_at');
```

## Login Credentials

After seeding:
- **Admin**: `admin@company.com` / `admin123`
- **Employee**: `employee@company.com` / `employee123`

## Troubleshooting

**Error: "permission denied for table profiles"**
- Make sure you ran Step 1 (reset SQL) completely
- Verify RLS policies were created (check verification queries above)
- Ensure you're logged in as admin when testing

**Error: "auth user not found"**
- Make sure Step 2 completed successfully
- Check Authentication → Users in Supabase Dashboard
- Re-run Step 3 seed script

**All users show as "Inactive"**
- Check that `is_active` column exists: `\d public.profiles` in SQL editor
- Verify profiles were inserted with `is_active = true`
- Re-run Step 3 seed script

