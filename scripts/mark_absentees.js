#!/usr/bin/env node
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing environment variables. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const base = SUPABASE_URL.replace(/\/+$/, '');

// Compute today's date in IST (UTC+5:30) to match business day
const now = new Date();
const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
const dateStr = `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(
  ist.getUTCDate(),
).padStart(2, '0')}`;
const dayOfWeek = ist.getUTCDay();

async function isHoliday(dateStr, dayOfWeek) {
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
    return !!rows[0].is_holiday;
  }
  // Default: Sundays are holidays unless overridden
  return dayOfWeek === 0;
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

async function fetchTodayAttendance() {
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

(async () => {
  try {
    console.log(`Marking absentees for date ${dateStr}...`);

    const holiday = await isHoliday(dateStr, dayOfWeek);
    if (holiday) {
      console.log('Today is a holiday — skipping absentee marking.');
      process.exit(0);
    }

    const [profiles, attendance] = await Promise.all([fetchActiveEmployees(), fetchTodayAttendance()]);

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
      console.log('No missing attendance records — nothing to do.');
      process.exit(0);
    }

    const result = await insertAbsentees(toInsert);
    console.log(`Inserted ${result.inserted} absent records.`);
  } catch (err) {
    console.error('Error marking absentees:', err);
    process.exit(1);
  }
})();
