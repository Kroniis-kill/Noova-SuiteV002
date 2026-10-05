import { getSupabaseErrorMessage } from '../utils/errorUtils';
import { QueryClient, MutationCache } from '@tanstack/react-query';
import { showGlobalToast } from '../context/ToastContext';
import { useSaveStatus } from '../store/saveStatusStore';
import { cacheUtils } from '../utils/cacheUtils';

// Antes: la mayoría de mutaciones "legacy" (financial_accounts, resellers,
// providers, expenses, supplies, payables, categorías, transferencias...)
// no tenían onError. Si Supabase devolvía un error real (no de red — esos
// ya se manejan aparte con la cola offline), el usuario no se enteraba:
// el error solo quedaba en la consola o como promesa rechazada.
//
// Este manejador global asegura que CUALQUIER mutación fallida muestre
// algo al usuario, sin tener que tocar cada una de las ~20 mutaciones
// legacy una por una. Las mutaciones que YA manejan su propio error
// (useClients/useSales/useInventory, que hacen rollback + su propio
// showToast) se marcan con meta.skipGlobalErrorToast para no duplicar el
// aviso.
//
// Además alimenta el indicador de guardado (saveStatusStore) con el resultado
// REAL de cada mutación: guardado en servidor, guardado solo en el dispositivo
// (cola offline) o error. Para saber si una mutación terminó "en cola" se
// compara el contador de encolados al empezar y al terminar.
const epochAtStart = new Map<number, number>();

const mutationCache = new MutationCache({
  onMutate: (_variables: unknown, mutation: any) => {
    const store = useSaveStatus.getState();
    epochAtStart.set(mutation.mutationId, store.queueEpoch);
    store.begin();
  },
  onSuccess: (_data: unknown, _variables: unknown, _context: unknown, mutation: any) => {
    const store = useSaveStatus.getState();
    const start = epochAtStart.get(mutation.mutationId);
    epochAtStart.delete(mutation.mutationId);
    store.end(start !== undefined && store.queueEpoch !== start ? 'queued' : 'confirmed');
  },
  onError: (error: any, _variables, _context, mutation) => {
    epochAtStart.delete((mutation as any).mutationId);
    const message = getSupabaseErrorMessage(error);
    useSaveStatus.getState().failMutation(message);
    if (mutation.options.meta?.skipGlobalErrorToast) return;
    showGlobalToast('No se pudo completar la acción', 'error', { description: message });
  },
});

export const queryClient = new QueryClient({
  mutationCache,
  defaultOptions: {
    queries: {
      // Frescura razonable; realtime es la fuente principal de invalidación.
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 60,
      retry: 2,

      // SINGLE SOURCE OF TRUTH para refetch en foreground:
      // useOfflineSync maneja visibilitychange/appStateChange y dispara
      // invalidateQueries() cuando corresponde. Evitamos duplicar con
      // refetchOnWindowFocus (que dispararía además en cada blur/focus de tab).
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      refetchOnMount: true,
    },
  },
});

// ─────────────────────────────────────────────────────────────
// Persistencia de la caché local ("write-through").
//
// Problema que corrige: los datos se guardaban en localStorage SOLO cuando se
// leían del servidor. Si editabas algo (la pantalla lo mostraba bien por la
// actualización optimista) y salías/volvías a entrar, la app arrancaba con la
// foto vieja de la última lectura y parecía que "no se guardó nada".
// Ahora cada vez que cambia el contenido de una consulta (optimista, rollback,
// realtime o lectura) se guarda su estado actual, con un pequeño debounce.
// ─────────────────────────────────────────────────────────────
const PERSISTED_KEYS = new Set([
  'clients', 'services', 'accounts', 'providers', 'expense_categories',
  'financial_accounts', 'movements', 'resellers', 'payable_expenses',
  'expenses', 'supplies', 'logs', 'service_failures', 'settings',
]);

const persistTimers = new Map<string, ReturnType<typeof setTimeout>>();

queryClient.getQueryCache().subscribe((event) => {
  if (event.type !== 'updated' || event.action.type !== 'success') return;
  const [name, userId] = event.query.queryKey as [string, string | undefined];
  if (!userId || userId === 'offline-user-id') return;

  let cacheKey: string;
  if (name === 'sales') cacheKey = 'sales_p1';
  else if (PERSISTED_KEYS.has(name)) cacheKey = name;
  else return;

  const timerKey = `${cacheKey}:${userId}`;
  const existing = persistTimers.get(timerKey);
  if (existing) clearTimeout(existing);
  persistTimers.set(
    timerKey,
    setTimeout(() => {
      persistTimers.delete(timerKey);
      const data: any = queryClient.getQueryData([name, userId]);
      const payload = name === 'sales' ? data?.pages?.[0] : data;
      if (payload !== undefined && payload !== null) cacheUtils.save(cacheKey, payload, userId);
    }, 300)
  );
});
