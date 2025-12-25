import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Dev-only: log masked env values to help debug "Invalid API key" client errors
if (import.meta.env.MODE !== 'production') {
  try {
    const maskedKey = supabaseAnonKey
      ? `${supabaseAnonKey.slice(0, 6)}...${supabaseAnonKey.slice(-6)}`
      : null;
    // eslint-disable-next-line no-console
    console.info('[dev] Supabase URL:', supabaseUrl);
    // eslint-disable-next-line no-console
    console.info('[dev] Supabase anon key (masked):', maskedKey);
  } catch (e) {
    // ignore
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
