import { QueryClient, MutationCache } from '@tanstack/react-query';
import { showGlobalToast } from '../context/ToastContext';

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
const mutationCache = new MutationCache({
  onError: (error: any, _variables, _context, mutation) => {
    if (mutation.options.meta?.skipGlobalErrorToast) return;
    const message = error?.message || 'Ocurrió un error. Intenta de nuevo.';
    showGlobalToast(`Error: ${message}`, 'error');
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