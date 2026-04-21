// =============================================
// HWKV Config
// Replace these with your Supabase project values
// Found in: Supabase Dashboard → Settings → API
// =============================================

const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tasting capacity
const TASTING_CAPACITY = 20;
