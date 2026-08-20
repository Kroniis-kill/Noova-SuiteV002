import { createClient, processLock } from '@supabase/supabase-js';

// Prefer env vars when available; fall back to known publishable values so dev/prod can be split
// without breaking existing deployments. The anon key is a publishable JWT — safe in the bundle.
export const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  'https://mqvwphfgvcqoolxogjqu.supabase.co';

export const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xdndwaGZndmNxb29seG9nanF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3NDI3NjAsImV4cCI6MjA3OTMxODc2MH0.cAXiN0KhchTb9MhSFJDyIz5H7d9Yk6UnJ1RijRJuAyY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'noova_auth_token_v3',
    storage: window.localStorage,
    // processLock keeps cross-tab refresh safe WITHOUT the Web LockManager,
    // which was the source of the original timeout. Replaces the unsafe
    // `lock: (n,t,fn) => fn()` bypass that disabled all race protection.
    lock: processLock,
  },
});
