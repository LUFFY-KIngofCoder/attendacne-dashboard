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
    const { cycle_id, employee_id, amount, note } = body;
    if (!cycle_id || !employee_id || !amount) return res.status(400).json({ error: 'cycle_id, employee_id, amount required' });

    const payload = { cycle_id, employee_id, amount: Number(amount), note };
    const post = await fetch(`${base}/rest/v1/salary_payments`, { method: 'POST', headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type':'application/json', Prefer:'return=representation' }, body: JSON.stringify(payload) });
    if (!post.ok) throw new Error(await post.text());
    const data = await post.json();
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error('add-payment error', err);
    return res.status(500).json({ error: String(err) });
  }
}
