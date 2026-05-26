import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://atkstqfnwdbwhplukkiq.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'dummy-key';

if (supabaseAnonKey === 'dummy-key') {
  console.error('⚠ Missing VITE_SUPABASE_ANON_KEY in .env.local file. API calls will fail.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
