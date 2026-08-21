import { createClient } from '@supabase/supabase-js';

const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const configuredKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// A safe placeholder keeps static builds and the consumer demo route available
// before a Supabase project is connected. Requests will still surface a useful
// authentication/database error until real public credentials are provided.
const supabaseUrl = configuredUrl?.startsWith('http') ? configuredUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = configuredKey || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
