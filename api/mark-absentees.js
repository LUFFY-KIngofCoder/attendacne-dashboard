import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const base = SUPABASE_URL ? SUPABASE_URL.replace(/\/+$/, '') : '';

function getTodayDateStrIST() {
  // Compute today's date in IST (UTC+5:30)
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return { dateStr: `${y}-${m}-${d}`, dayOfWeek: ist.getUTCDay() };
}

async function isHoliday(dateStr, dayOfWeek) {
  // Check holidays table for explicit entry
  const url = `${base}/rest/v1/holidays?date=eq.${dateStr}&select=is_holiday`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch holidays: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  if (Array.isArray(rows) && rows.length > 0) {
    const rec = rows[0];
    return !!rec.is_holiday;
  }

  // Default: Sundays are holidays unless explicitly overridden
  if (dayOfWeek === 0) return true;
  return false;
}

async function fetchActiveEmployees() {
  const url = `${base}/rest/v1/profiles?role=eq.employee&is_active=eq.true`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch profiles: ${res.status} ${await res.text()}`);
  return res.json();
}

async function fetchTodayAttendance(dateStr) {
  const url = `${base}/rest/v1/attendance?date=eq.${dateStr}&select=employee_id`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch attendance: ${res.status} ${await res.text()}`);
  return res.json();
}

async function insertAbsentees(rows) {
  if (rows.length === 0) return { inserted: 0 };
  const url = `${base}/rest/v1/attendance`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(rows),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Failed to insert attendance: ${res.status} ${JSON.stringify(data)}`);
  return { inserted: Array.isArray(data) ? data.length : 1, data };
}

export default async function handler(req, res) {
  // If CRON_SECRET is configured, require Authorization header from Vercel cron
  if (process.env.CRON_SECRET) {
    const auth = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn('Unauthorized cron invocation');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  try {
    const { dateStr, dayOfWeek } = getTodayDateStrIST();

    // Skip if today is a holiday
    const holiday = await isHoliday(dateStr, dayOfWeek);
    if (holiday) {
      return res.status(200).json({ inserted: 0, message: 'Today is a holiday — no absentees marked.' });
    }

    const [profiles, attendance] = await Promise.all([fetchActiveEmployees(), fetchTodayAttendance(dateStr)]);

    const presentIds = new Set((attendance || []).map((r) => r.employee_id));
    const toInsert = (profiles || [])
      .filter((p) => !presentIds.has(p.id))
      .map((p) => ({
        employee_id: p.id,
        date: dateStr,
        status: 'absent',
        work_mode: null,
        reason: 'Auto-marked absent',
        check_in_time: null,
        check_out_time: null,
        is_approved: true,
        approved_by: null,
        approved_at: new Date().toISOString(),
      }));

    if (toInsert.length === 0) {
      return res.status(200).json({ inserted: 0, message: 'No missing attendance records.' });
    }

    const result = await insertAbsentees(toInsert);
    return res.status(200).json({ inserted: result.inserted });
  } catch (err) {
    console.error('Error in mark-absentees API:', err);
    return res.status(500).json({ error: String(err) });
  }
}
