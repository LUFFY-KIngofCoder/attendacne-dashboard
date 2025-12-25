Vercel scheduled job: mark absentees
=================================

This project includes a serverless endpoint at `api/mark-absentees.js` which marks active employees as `absent` for the current date if they haven't submitted attendance yet.

Setup (Vercel)
---------------

1. Add Environment Variables in your Vercel Project Settings -> Environment Variables:
   - `VITE_SUPABASE_URL` = your Supabase URL (e.g. https://xyz.supabase.co)
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service role key (keep this secret)

2. Deploy the project to Vercel.

3. Create a Vercel Cron Job:
   - In Vercel dashboard, open your project -> Settings -> Cron Jobs (or use Integrations -> Scheduled Functions)
   - Add a job that calls the path: `/api/mark-absentees`
   - Schedule: daily at **23:59 IST**. Vercel uses UTC for scheduling; 23:59 IST = 18:29 UTC. Set the job to run at `18:29` UTC.
   - Use method `GET` or `POST` (the endpoint accepts both in this implementation).

4. Secure the endpoint with `CRON_SECRET` (recommended)

- In Vercel Project Settings -> Environment Variables add `CRON_SECRET` with a random secret value.
- Vercel will include this secret in the `Authorization` header for cron invocations as `Bearer <secret>`.
- The serverless endpoint checks this header and will reject calls without the correct secret.

Example server-side check (already implemented in `api/mark-absentees.js`):

```js
if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
  return res.status(401).end('Unauthorized');
}
```

Notes
-----
- The endpoint inserts absent rows for the same date it runs (today).
- The endpoint requires the Service Role key to insert rows via the Supabase REST API.
- After the endpoint inserts an absent record for a user, that date will be considered recorded and users cannot self-mark for that date unless an admin edits the record.

Testing locally
----------------
- Add the two environment variables into a `.env` file locally.
- Run the endpoint locally (or run the script equivalent):

```bash
npm run mark-absentees
# or
node -r dotenv/config scripts/mark_absentees.js
```
