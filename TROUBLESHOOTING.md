# Troubleshooting: "Error saving employee" in Admin Panel

## Common Causes & Solutions

### 1. Email Confirmation Required (Most Common)

**Problem:** Supabase requires email confirmation by default, which blocks `signUp()` from creating users immediately.

**Solution:** Disable email confirmation in Supabase settings:

1. Go to **Supabase Dashboard → Authentication → Settings**
2. Scroll to **"Email Auth"** section
3. Find **"Enable email confirmations"**
4. **Turn it OFF** (uncheck the box)
5. Click **"Save"**

**Alternative:** Keep email confirmation ON but users will need to click confirmation links before they can login.

---

### 2. RLS Policy Issue

**Problem:** Admin might not have permission to insert profiles.

**Check:** Run this SQL to verify RLS policies exist:

```sql
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY policyname;
```

**Expected:** You should see:
- `profiles_admin_full` with `cmd = 'ALL'`
- `profiles_select_own` with `cmd = 'SELECT'`
- `profiles_update_own` with `cmd = 'UPDATE'`

**Fix:** If missing, run `db/reset_complete.sql` again.

---

### 3. Check Browser Console for Actual Error

The updated code now shows the actual error message. Check your browser's Developer Console (F12) for detailed error messages.

**Common errors:**
- `"Email rate limit exceeded"` → Wait a few minutes and try again
- `"User already registered"` → User already exists, try editing instead
- `"Invalid email"` → Check email format
- `"Password should be at least 6 characters"` → Use longer password

---

### 4. Profile Not Created by Trigger

**Problem:** The `handle_new_user()` trigger might not have fired.

**Check:** Run this SQL:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

**Fix:** If empty, run `db/reset_complete.sql` to recreate triggers.

---

### 5. Department ID Issue

**Problem:** If you selected a department, make sure it exists.

**Check:**
```sql
SELECT id, name FROM public.departments;
```

**Fix:** Run `db/add_departments.sql` if departments are missing.

---

## Quick Fix Checklist

1. ✅ **Disable email confirmation** in Supabase Dashboard
2. ✅ **Check browser console** for actual error message
3. ✅ **Verify RLS policies** exist (run SQL above)
4. ✅ **Verify triggers** exist (run SQL above)
5. ✅ **Ensure departments exist** (run `db/add_departments.sql`)
6. ✅ **Make sure you're logged in as admin** (check profile role)

---

## Testing After Fix

1. Open browser console (F12)
2. Try adding a new employee
3. Check console for any errors
4. If error appears, copy the exact message and check this guide

---

## Still Not Working?

If you've tried all the above:

1. **Check Supabase Logs:**
   - Go to **Supabase Dashboard → Logs → Postgres Logs**
   - Look for errors when you try to create a user

2. **Verify Admin Status:**
   ```sql
   SELECT id, email, role FROM public.profiles 
   WHERE email = 'your-admin-email@company.com';
   ```
   Should show `role = 'admin'`

3. **Test RLS Policy Directly:**
   ```sql
   -- This should work if you're logged in as admin
   SELECT public.is_admin(auth.uid());
   ```
   Should return `true`

4. **Share the exact error message** from browser console for further help.

