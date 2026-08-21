import { createClient } from '@supabase/supabase-js';

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const configuredKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// This fallback permits static builds before credentials are configured. At runtime,
// authentication calls require the real public URL and anon key from .env.local.
const supabaseUrl = configuredUrl?.startsWith('http') ? configuredUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = configuredKey || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
