
import { PostgrestResponse, PostgrestSingleResponse } from '@supabase/postgrest-js';
import { supabase } from '../supabaseClient';

/**
 * Deduplicated refresh: si varias queries fallan con 401 al mismo tiempo,
 * solo se dispara UNA llamada a refreshSession y todas comparten el resultado.
 * Evita la "tormenta de refrescos" de 8s × N tablas que congela la UI.
 */
let refreshInFlight: Promise<boolean> | null = null;
let lastRefreshAt = 0;
const REFRESH_COOLDOWN_MS = 5000; // No reintentar refresh más de 1 vez cada 5s

async function sharedRefresh(): Promise<boolean> {
  const now = Date.now();
  if (refreshInFlight) return refreshInFlight;
  // Cooldown: si acabamos de refrescar y falló, no insistir
  if (now - lastRefreshAt < REFRESH_COOLDOWN_MS) return false;

  refreshInFlight = (async () => {
    let timeoutId: any;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Refresh timeout')), 3000);
      });
      await Promise.race([supabase.auth.refreshSession(), timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);
      return true;
    } catch {
      if (timeoutId) clearTimeout(timeoutId);
      return false;
    } finally {
      lastRefreshAt = Date.now();
      // Liberar el lock en el próximo tick para que llamadas concurrentes reciban el mismo promise
      setTimeout(() => { refreshInFlight = null; }, 0);
    }
  })();

  return refreshInFlight;
}

/**
 * Executes a Supabase query with exponential backoff retries.
 * - Auth errors (401): UN intento de refresh deduplicado; si falla, se devuelve el error sin más reintentos.
 * - Network/5xx: hasta `maxRetries` reintentos con backoff.
 */
export async function withRetry<T = any>(
  queryFn: () => PromiseLike<T> | Promise<T>,
  maxRetries = 2,
  initialDelay = 500,
  timeoutMs = 6000
): Promise<T> {
  let lastError: any;
  let authRetried = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let timeoutId: any;
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Offline. Navegador sin conexión a internet.');
      }

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Supabase request timeout.')), timeoutMs);
      });

      const result = await Promise.race([queryFn(), timeoutPromise]);
      if (timeoutId) clearTimeout(timeoutId);

      const error = (result as any).error;
      if (error) {
        const status = (error as any).status;
        const message = (error as any).message || '';
        const code = (error as any).code || '';
        const isNetworkError = !status || status >= 500 || message.includes('fetch');
        const isAuthError = status === 401 || code === 'PGRST301';

        if (isAuthError && !authRetried) {
          // Un único intento de refresh compartido + un único reintento
          authRetried = true;
          lastError = error;
          const refreshed = await sharedRefresh();
          if (refreshed) {
            continue; // reintentar query con la nueva sesión
          }
          // Refresh falló: devolver el error sin seguir intentando
          return result;
        }

        if (isNetworkError && attempt < maxRetries) {
          lastError = error;
          const delay = initialDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      return result;
    } catch (error: any) {
      if (timeoutId) clearTimeout(timeoutId);
      lastError = error;
      const message = error.message || '';
      const isNetworkError =
        message.includes('fetch') ||
        message.includes('NetworkError') ||
        message.includes('Failed to fetch') ||
        message.includes('timeout');

      if (isNetworkError && attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  return { data: null, error: lastError, count: null, status: 0, statusText: '' } as any;
}
