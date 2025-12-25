# Seeding Supabase (create demo users & profiles)

1. Create a Service Role key in the Supabase dashboard (Project Settings → API → Service Role Key).
2. Copy the values into a local `.env` (or export env vars):

```bash
export VITE_SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

3. Run the seed script (requires Node 18+):

```bash
node scripts/seed_supabase.js
```

The script will create two auth users and corresponding `profiles` rows:
- Admin: `admin@company.com` / `admin123` (role `admin`)
- Employee: `employee@company.com` / `employee123` (role `employee`)

Notes:
- The script uses the Supabase Admin API and the REST endpoint for `profiles`.
- After running, verify the `profiles` rows in Supabase SQL or the table editor.
- If you prefer manual creation, use the Supabase Dashboard -> Authentication -> Users, then insert rows into `public.profiles` with the returned `id`.
