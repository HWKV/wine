// =============================================
// HWKV Config
// Replace these with your Supabase project values
// Found in: Supabase Dashboard → Settings → API
// =============================================

const SUPABASE_URL = 'https://djpkrsaumvwvtpidutlw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dftS9ZL7n8BTFwZmqDW23Q_I0UN1YRq';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Tasting capacity
const TASTING_CAPACITY = 20;
