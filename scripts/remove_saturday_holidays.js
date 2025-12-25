#!/usr/bin/env node
(async () => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
    if (!url || !key) {
      console.error('Missing environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL/SUPABASE_KEY).');
      process.exit(1);
    }

    const supabase = createClient(url, key);

    const { data, error } = await supabase.from('holidays').select('id,date');
    if (error) throw error;

    const saturdayIds = (data || []).filter(h => {
      const d = new Date(h.date + 'T00:00:00');
      return d.getDay() === 6;
    }).map(h => h.id);

    if (saturdayIds.length === 0) {
      console.log('No Saturday holiday records found.');
      process.exit(0);
    }

    const { error: delErr } = await supabase.from('holidays').delete().in('id', saturdayIds);
    if (delErr) throw delErr;

    console.log(`Deleted ${saturdayIds.length} Saturday holiday record(s).`);
  } catch (err) {
    console.error('Error removing Saturday holidays:', err);
    process.exit(1);
  }
})();
