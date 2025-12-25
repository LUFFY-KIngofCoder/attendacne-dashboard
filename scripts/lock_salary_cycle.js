#!/usr/bin/env node
import 'dotenv/config';

// Usage: node scripts/lock_salary_cycle.js --year=2025 --month=12 --admin=<admin_id>

import minimist from 'minimist';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const base = SUPABASE_URL.replace(/\/+$/, '');

function parseArgs() {
  const argv = minimist(process.argv.slice(2));
  const year = Number(argv.year || argv.y);
  const month = Number(argv.month || argv.m);
  const admin = argv.admin || argv.a;
  if (!year || !month || !admin) {
    console.error('Usage: --year=YYYY --month=MM --admin=<admin_id>');
    process.exit(1);
  }
  return { year, month, admin };
}

function monthRange(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start, end };
}

function toDateStrUTC(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

(async () => {
  const { year, month, admin } = parseArgs();
  console.log(`Locking salary cycle for ${year}-${String(month).padStart(2, '0')}...`);

  // 1. Check for any pending attendance approvals in the month
  const { start, end } = monthRange(year, month);
  const startStr = toDateStrUTC(start);
  const endStr = toDateStrUTC(end);

  const pendingUrl = `${base}/rest/v1/attendance?date=gte.${startStr}&date=lte.${endStr}&is_approved=is.null&select=id,employee_id,date`;
  const pending = await fetchJSON(pendingUrl);
  if (Array.isArray(pending) && pending.length > 0) {
    console.error('Cannot lock: there are pending attendance approvals.');
    console.error('Pending count:', pending.length);
    process.exit(1);
  }

  // 2. Create salary cycle
  const cycleBody = { year, month, locked_by: admin, locked_at: new Date().toISOString() };
  const cycle = await postJSON(`${base}/rest/v1/salary_cycles`, cycleBody);
  const cycleId = Array.isArray(cycle) ? cycle[0].id : cycle.id;

  // 3. Load holidays in range
  const holidays = await fetchJSON(`${base}/rest/v1/holidays?date=gte.${startStr}&date=lte.${endStr}&select=date,is_holiday`);
  const holidaySet = new Set((holidays || []).filter(h=>h.is_holiday).map(h=>h.date));

  // 4. Load active employees with monthly_salary
  const profiles = await fetchJSON(`${base}/rest/v1/profiles?role=eq.employee&is_active=eq.true&monthly_salary=is.not.null&select=id,join_date,monthly_salary`);

  const earningsToInsert = [];

  for (const p of profiles) {
    const joinDate = new Date(p.join_date);
    const periodStart = start;
    const effectiveStart = joinDate > periodStart ? joinDate : periodStart;
    const effectiveStartStr = toDateStrUTC(effectiveStart);

    // compute eligible working days (exclude Sundays and holidays)
    let totalEligible = 0;
    const days = [];
    for (let d = new Date(effectiveStart); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dow = d.getUTCDay();
      const dateStr = toDateStrUTC(d);
      if (dow === 0) continue; // Sunday non-working
      if (holidaySet.has(dateStr)) {
        totalEligible += 1; // holidays are paid and count as working day
        days.push({ date: dateStr, isHoliday: true });
        continue;
      }
      // weekday working day
      totalEligible += 1;
      days.push({ date: dateStr, isHoliday: false });
    }

    if (totalEligible === 0) continue; // nothing to compute

    const perDaySalary = Number((p.monthly_salary / totalEligible).toFixed(6));

    // fetch attendance for employee in period
    const attUrl = `${base}/rest/v1/attendance?employee_id=eq.${p.id}&date=gte.${startStr}&date=lte.${endStr}&select=date,status,is_approved`;
    const attRows = await fetchJSON(attUrl);
    const attMap = new Map((attRows || []).map(a => [a.date, a]));

    // daily credit
    let gross = 0;
    for (const day of days) {
      if (day.isHoliday) {
        gross += perDaySalary;
        continue;
      }
      const att = attMap.get(day.date);
      if (!att) {
        // no attendance row: treated as absent (auto-absent should have been inserted at EOD)
        continue;
      }
      if (att.is_approved === null) {
        console.error('Found a pending attendance after earlier check - aborting.');
        process.exit(1);
      }
      if (att.is_approved === false) {
        // denied => treated as absent
        continue;
      }
      // approved
      if (att.status === 'present') gross += perDaySalary;
      else if (att.status === 'half_day') gross += perDaySalary * 0.5;
      else if (att.status === 'on_leave') gross += 0; // paid leave handled separately by admin
      else if (att.status === 'absent') gross += 0;
    }

    earningsToInsert.push({
      cycle_id: cycleId,
      employee_id: p.id,
      monthly_salary: p.monthly_salary,
      total_eligible_working_days: totalEligible,
      per_day_salary: perDaySalary,
      gross_earned: Number(gross.toFixed(2)),
    });
  }

  if (earningsToInsert.length > 0) {
    await postJSON(`${base}/rest/v1/salary_earnings`, earningsToInsert);
  }

  console.log('Salary cycle locked and earnings recorded.');
})();
