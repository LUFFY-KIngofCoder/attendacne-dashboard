import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const base = SUPABASE_URL ? SUPABASE_URL.replace(/\/+$/, '') : '';

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function verifyAdmin(userToken) {
  // get user info from auth
  const userRes = await fetch(`${base}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  if (!userRes.ok) return null;
  const user = await userRes.json();
  if (!user?.id) return null;

  // check profile role via service key
  const prof = await fetchJSON(`${base}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY },
  });
  if (!Array.isArray(prof) || prof.length === 0) return null;
  return prof[0].role === 'admin' ? user.id : null;
}

function monthRangeUTC(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { start, end };
}

function toDateStrUTC(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

    const auth = req.headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Missing auth token' });

    const adminId = await verifyAdmin(token);
    if (!adminId) return res.status(403).json({ error: 'Not authorized' });

    async function getBody(req) {
      if (req.json) {
        try { return await req.json(); } catch (e) { throw new Error('Invalid JSON body'); }
      }
      return await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', c => (data += c));
        req.on('end', () => {
          if (!data) return resolve({});
          try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('Invalid JSON body')); }
        });
        req.on('error', (err) => reject(err));
      });
    }

    let body;
    try {
      body = await getBody(req);
    } catch (e) {
      return res.status(400).json({ error: String(e.message || e) });
    }
    const year = Number(body.year);
    const month = Number(body.month);
    if (!year || !month) return res.status(400).json({ error: 'year and month required' });

    // 1. check pending attendances
    const { start, end } = monthRangeUTC(year, month);
    const startStr = toDateStrUTC(start);
    const endStr = toDateStrUTC(end);

    const pendingUrl = `${base}/rest/v1/attendance?date=gte.${startStr}&date=lte.${endStr}&is_approved=is.null&select=id,employee_id,date`;
    const pending = await fetchJSON(pendingUrl, { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } });
    if (Array.isArray(pending) && pending.length > 0) {
      return res.status(400).json({ error: 'Pending attendance approvals exist', count: pending.length });
    }

    // create cycle
    const cycleBody = { year, month, locked_by: adminId, locked_at: new Date().toISOString() };
    const cycleRes = await fetch(`${base}/rest/v1/salary_cycles`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(cycleBody),
    });
    if (!cycleRes.ok) throw new Error(await cycleRes.text());
    const cycleData = await cycleRes.json();
    const cycleId = Array.isArray(cycleData) ? cycleData[0].id : cycleData.id;

    // holidays
    const holidays = await fetchJSON(`${base}/rest/v1/holidays?date=gte.${startStr}&date=lte.${endStr}&select=date,is_holiday`, { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } });
    const holidaySet = new Set((holidays || []).filter(h=>h.is_holiday).map(h=>h.date));

    // profiles
    const profiles = await fetchJSON(`${base}/rest/v1/profiles?role=eq.employee&is_active=eq.true&monthly_salary=is.not.null&select=id,join_date,monthly_salary`, { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } });

    const earnings = [];
    for (const p of profiles) {
      const joinDate = new Date(p.join_date);
      const effectiveStart = joinDate > start ? joinDate : start;
      let totalEligible = 0;
      const days = [];
      for (let d = new Date(effectiveStart); d <= end; d.setUTCDate(d.getUTCDate()+1)) {
        const dow = d.getUTCDay();
        const dateStr = toDateStrUTC(d);
        if (dow === 0) continue;
        if (holidaySet.has(dateStr)) { totalEligible++; days.push({date: dateStr, isHoliday:true}); continue; }
        totalEligible++; days.push({date: dateStr, isHoliday:false});
      }
      if (totalEligible === 0) continue;
      const perDaySalary = Number((p.monthly_salary / totalEligible).toFixed(6));
      const attUrl = `${base}/rest/v1/attendance?employee_id=eq.${p.id}&date=gte.${startStr}&date=lte.${endStr}&select=date,status,is_approved`;
      const attRows = await fetchJSON(attUrl, { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } });
      const attMap = new Map((attRows||[]).map(a=>[a.date,a]));
      let gross = 0;
      for (const day of days) {
        if (day.isHoliday) { gross += perDaySalary; continue; }
        const att = attMap.get(day.date);
        if (!att) continue;
        if (att.is_approved === null) return res.status(400).json({ error: 'Pending attendance found during processing' });
        if (att.is_approved === false) continue;
        if (att.status === 'present') gross += perDaySalary;
        else if (att.status === 'half_day') gross += perDaySalary * 0.5;
      }
      earnings.push({ cycle_id: cycleId, employee_id: p.id, monthly_salary: p.monthly_salary, total_eligible_working_days: totalEligible, per_day_salary: perDaySalary, gross_earned: Number(gross.toFixed(2)) });
    }
    if (earnings.length > 0) {
      const post = await fetch(`${base}/rest/v1/salary_earnings`, { method: 'POST', headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type':'application/json' }, body: JSON.stringify(earnings) });
      if (!post.ok) throw new Error(await post.text());
    }

    return res.status(200).json({ ok: true, cycle_id: cycleId, inserted: earnings.length });
  } catch (err) {
    console.error('lock-salary error', err);
    return res.status(500).json({ error: String(err) });
  }
}
