# How to Add Users - Multiple Methods

## Method 1: Using the Seed Script (Easiest - Recommended)

The seed script now automatically creates departments AND users:

```bash
npm run seed
```

This will:
- ✅ Create all departments
- ✅ Create admin@company.com / admin123
- ✅ Create employee@company.com / employee123
- ✅ Assign employee to Engineering department

---

## Method 2: Supabase Dashboard (Manual)

### Step 1: Create Auth User
1. Go to **Supabase Dashboard → Authentication → Users**
2. Click **"Add User"** or **"Invite User"**
3. Fill in:
   - **Email**: `admin@company.com`
   - **Password**: `admin123`
   - ✅ **Auto Confirm User**: Check this box
   - ✅ **Send Invite Email**: Uncheck (optional)
4. Click **"Create User"**
5. Repeat for `employee@company.com` / `employee123`

### Step 2: Create Profile (if trigger didn't auto-create)
Run this SQL in Supabase SQL Editor:

```sql
-- Get the user IDs first
SELECT id, email FROM auth.users 
WHERE email IN ('admin@company.com', 'employee@company.com');

-- Then insert/update profiles (replace UUIDs with actual IDs from above)
INSERT INTO public.profiles (id, email, full_name, role, is_active)
VALUES
  ('<ADMIN_UUID>', 'admin@company.com', 'Admin User', 'admin', true),
  ('<EMPLOYEE_UUID>', 'employee@company.com', 'Demo Employee', 'employee', true)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;
```

**Note:** The `handle_new_user()` trigger should auto-create profiles, but you may need to update the role for admin.

---

## Method 3: Using Supabase Admin API (curl/Postman)

### Create Auth User via API:

```bash
# Replace YOUR_PROJECT_URL and YOUR_SERVICE_ROLE_KEY
curl -X POST 'YOUR_PROJECT_URL/auth/v1/admin/users' \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "admin123",
    "email_confirm": true
  }'
```

### Then create profile (if needed):

```bash
# Get the user ID from the response above, then:
curl -X POST 'YOUR_PROJECT_URL/rest/v1/profiles' \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "id": "<USER_ID_FROM_ABOVE>",
    "email": "admin@company.com",
    "full_name": "Admin User",
    "role": "admin"
  }'
```

---

## Method 4: SQL Only (Requires Service Role Access)

**⚠️ Warning:** This method bypasses Supabase Auth and is not recommended for production. Use only for testing.

```sql
-- This won't work directly because auth.users is protected
-- You need to use the Admin API or Dashboard to create auth users first
```

---

## Troubleshooting

### "User already exists" Error
- The user already exists in `auth.users`
- Use `db/seed_demo_users.sql` to update the profile instead
- Or manually update via Dashboard → Authentication → Users → Edit User

### "Permission denied" Error
- Make sure you're using the **Service Role Key** (not anon key) for API calls
- Check that RLS policies are set up correctly (run `db/reset_complete.sql`)

### Profile Not Created Automatically
- Check if the `handle_new_user()` trigger exists:
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
  ```
- If missing, run `db/reset_complete.sql` to recreate triggers

### User Shows as "Inactive"
- Check the profile's `is_active` field:
  ```sql
  SELECT id, email, full_name, role, is_active 
  FROM public.profiles 
  WHERE email = 'admin@company.com';
  ```
- Update if needed:
  ```sql
  UPDATE public.profiles 
  SET is_active = true 
  WHERE email = 'admin@company.com';
  ```

---

## Quick Verification

After adding users, verify everything works:

```sql
-- Check auth users exist
SELECT id, email, created_at 
FROM auth.users 
WHERE email IN ('admin@company.com', 'employee@company.com');

-- Check profiles exist
SELECT id, email, full_name, role, is_active, department_id
FROM public.profiles 
WHERE email IN ('admin@company.com', 'employee@company.com');

-- Check departments exist
SELECT id, name FROM public.departments ORDER BY name;
```

Expected output:
- ✅ 2 auth users
- ✅ 2 profiles (admin role='admin', employee role='employee')
- ✅ 6 departments

