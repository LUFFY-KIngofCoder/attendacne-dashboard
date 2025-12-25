# Quick Start: Reset Database & Seed Demo Users

## All Commands in Order

### Step 1: Reset Database (Run in Supabase SQL Editor)
**File:** `db/reset_complete.sql`
- Copy entire file content
- Paste into Supabase SQL Editor
- Click "Run"
- ✅ Should complete without errors

### Step 2: Create Auth Users

**Option A: Supabase Dashboard (Recommended)**
1. Go to **Authentication → Users → Add User**
2. Create:
   - Email: `admin@company.com`
   - Password: `admin123`
   - ✅ Auto Confirm User: **ON**
   - Click "Create User"
3. Repeat for:
   - Email: `employee@company.com`
   - Password: `employee123`
   - ✅ Auto Confirm User: **ON**

**Option B: Node Script**
```bash
export VITE_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
node scripts/seed_supabase.js
```

### Step 3: Seed Profiles (Run in Supabase SQL Editor)
**File:** `db/seed_demo_users.sql`
- Copy entire file content
- Paste into Supabase SQL Editor
- Click "Run"
- ✅ Should show success messages

## Verify Everything Works

```sql
-- Check profiles
SELECT email, full_name, role, is_active 
FROM public.profiles 
WHERE email IN ('admin@company.com', 'employee@company.com');
```

Expected output:
- `admin@company.com` | `Admin User` | `admin` | `true`
- `employee@company.com` | `Demo Employee` | `employee` | `true`

## Test Login

1. Open your app
2. Login as: `admin@company.com` / `admin123`
3. Try editing/deleting employees - should work now! ✅

