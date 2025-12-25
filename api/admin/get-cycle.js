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
  const userRes = await fetch(`${base}/auth/v1/user`, { headers: { Authorization: `Bearer ${userToken}` } });
  if (!userRes.ok) return null;
  const user = await userRes.json();
  if (!user?.id) return null;
  const prof = await fetchJSON(`${base}/rest/v1/profiles?id=eq.${user.id}&select=role`, { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } });
  if (!Array.isArray(prof) || prof.length === 0) return null;
  return prof[0].role === 'admin' ? user.id : null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).end('Method Not Allowed');
    const auth = req.headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Missing auth token' });
    const adminId = await verifyAdmin(token);
    if (!adminId) return res.status(403).json({ error: 'Not authorized' });

    const year = Number(req.query?.year || req.url.split('?').pop()?.match(/year=(\d{4})/)?.[1]);
    const month = Number(req.query?.month || req.url.split('?').pop()?.match(/month=(\d{1,2})/)?.[1]);
    if (!year || !month) return res.status(400).json({ error: 'year and month required' });

    // fetch cycle
    const cycles = await fetchJSON(`${base}/rest/v1/salary_cycles?year=eq.${year}&month=eq.${month}&select=*&limit=1`, { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } });
    const cycle = Array.isArray(cycles) && cycles.length > 0 ? cycles[0] : null;
    // fetch earnings and payments
    const earnings = await fetchJSON(`${base}/rest/v1/salary_earnings?cycle_id=eq.${cycle?.id || 'null'}&select=*`, { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } });
    const payments = await fetchJSON(`${base}/rest/v1/salary_payments?cycle_id=eq.${cycle?.id || 'null'}&select=*`, { headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY } });

    return res.status(200).json({ cycle, earnings, payments });
  } catch (err) {
    console.error('get-cycle error', err);
    return res.status(500).json({ error: String(err) });
  }
}
