# How to Delete Auth Users Completely

## Why Auth Users Aren't Deleted Automatically

When you use "Permanently Delete" in the admin panel, it removes the user from the `profiles` table and all related data (attendance, worklogs). However, the user account in Supabase Auth (`auth.users`) remains.

**Reason:** Deleting from `auth.users` requires Admin API access (service role key), which should **never** be exposed in client-side code for security reasons.

---

## Option 1: Supabase Dashboard (Easiest)

1. Go to **Supabase Dashboard → Authentication → Users**
2. Search for the user by email
3. Click the **three dots (⋮)** next to the user
4. Click **"Delete User"**
5. Confirm deletion

**Note:** This will also delete the profile automatically if you have triggers set up.

---

## Option 2: Backend API Endpoint (Recommended for Production)

Create a backend API endpoint that uses the Admin API:

### Example: Node.js/Express

```javascript
// Backend endpoint: DELETE /api/users/:userId
app.delete('/api/users/:userId', async (req, res) => {
  const { userId } = req.params;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Delete from auth.users using Admin API
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
  });
  
  if (response.ok) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});
```

Then call this from your frontend:

```typescript
// In EmployeeManagement.tsx
const handleHardDelete = async (id: string) => {
  // ... existing code ...
  
  // Delete from profiles (existing code)
  await supabase.from('profiles').delete().eq('id', id);
  
  // Delete from auth.users via backend API
  await fetch(`/api/users/${id}`, { method: 'DELETE' });
};
```

---

## Option 3: SQL Function (Advanced)

Create a database function that uses `pg_net` or similar to call Admin API:

```sql
-- This requires pg_net extension and is complex
-- Not recommended unless you're familiar with PostgreSQL functions
```

---

## Option 4: Update Hard Delete to Include Auth Deletion

If you want to add auth deletion to the existing hard delete function, you'll need to:

1. Create a backend API endpoint (as shown in Option 2)
2. Update `handleHardDelete` in `EmployeeManagement.tsx` to call this endpoint
3. Make sure your backend has the `SUPABASE_SERVICE_ROLE_KEY` environment variable

---

## Current Behavior

Right now, when you click "Permanently Delete":
- ✅ Deletes from `profiles` table
- ✅ Cascades delete to `attendance` and `worklogs`
- ❌ Does NOT delete from `auth.users` (requires manual deletion or backend API)

The user will see an alert explaining they need to delete from Supabase Dashboard.

---

## Recommendation

For development: Use Supabase Dashboard to delete auth users manually.

For production: Create a backend API endpoint that handles both profile and auth user deletion securely.


