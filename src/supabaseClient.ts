import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// LOCK PROPIO (reemplaza a `processLock` de supabase-js)
// ---------------------------------------------------------------------------
// `processLock` usa la Web Locks API (navigator.locks) para serializar las
// operaciones de auth (getSession/refreshSession/signIn...). Este mecanismo
// tiene un bug ampliamente reportado (supabase-js #1594, #2111, #2013,
// supabase/supabase#43565): si la app pasa a segundo plano (o el WebView se
// suspende) justo mientras se sostiene el lock, este queda "zombie" y NUNCA
// se libera. A partir de ahí, TODAS las llamadas siguientes a supabase.auth.*
// y a supabase.from(...) quedan esperando ese lock para siempre -> la app se
// congela y solo se recupera cerrando y reabriendo el proceso (que crea un
// WebView nuevo y borra el lock).
//
// En Noova, al ser una app Capacitor (un único WebView, sin pestañas reales
// que coordinar), no necesitamos el lock a nivel de sistema operativo: nos
// alcanza con serializar dentro del mismo contexto de JS, con un timeout de
// seguridad para que jamás quede colgado.
let lockChain: Promise<void> = Promise.resolve();

async function inMemoryLock<R>(
  _name: string,
  acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  // Nos "enganchamos" a la cadena anterior, pero con un timeout: si el paso
  // previo tarda demasiado, seguimos igual en vez de esperar indefinidamente.
  const previous = lockChain;
  let release: () => void;
  lockChain = new Promise<void>((resolve) => { release = resolve; });

  const timeoutMs = acquireTimeout > 0 ? acquireTimeout : 10000;
  await Promise.race([
    previous,
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);

  try {
    return await fn();
  } finally {
    release!();
  }
}

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
    // Ver comentario arriba: mutex propio en memoria en vez de `processLock`
    // (que usa navigator.locks y puede quedar bloqueado para siempre en
    // apps móviles/Capacitor al pasar a segundo plano).
    lock: inMemoryLock,
  },
});
