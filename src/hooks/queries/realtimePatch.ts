import { QueryClient } from '@tanstack/react-query';
import { mappers } from '../../utils/mappers';

/**
 * Antes: cualquier INSERT/UPDATE/DELETE en Realtime invalidaba la query
 * completa de la tabla, forzando un refetch de hasta 1000 filas por un
 * solo cambio.
 *
 * Ahora: usamos el payload que ya viaja en el evento de Realtime
 * (payload.new / payload.old) para parchear directamente la cache de
 * react-query con setQueryData. Cero round-trips extra a Supabase.
 *
 * Fallback: si el mapeo falla por cualquier razón, devolvemos `false` y
 * quien llama puede decidir invalidar como antes (red de seguridad).
 */

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

interface TablePatchConfig {
  queryKey: (userId: string) => unknown[];
  mapper: (d: any) => { id: string };
  shape: 'array' | 'infinite-sales';
}

const TABLE_CONFIG: Record<string, TablePatchConfig> = {
  clients: { queryKey: (u) => ['clients', u], mapper: mappers.client.fromDb, shape: 'array' },
  accounts: { queryKey: (u) => ['accounts', u], mapper: mappers.account.fromDb, shape: 'array' },
  services: { queryKey: (u) => ['services', u], mapper: mappers.service.fromDb, shape: 'array' },
  movements: { queryKey: (u) => ['movements', u], mapper: mappers.movement.fromDb, shape: 'array' },
  resellers: { queryKey: (u) => ['resellers', u], mapper: mappers.reseller.fromDb, shape: 'array' },
  providers: { queryKey: (u) => ['providers', u], mapper: mappers.provider.fromDb, shape: 'array' },
  expenses: { queryKey: (u) => ['expenses', u], mapper: mappers.expense.fromDb, shape: 'array' },
  payable_expenses: { queryKey: (u) => ['payable_expenses', u], mapper: mappers.payable.fromDb, shape: 'array' },
  expense_categories: { queryKey: (u) => ['expense_categories', u], mapper: mappers.expenseCategory.fromDb, shape: 'array' },
  financial_accounts: { queryKey: (u) => ['financial_accounts', u], mapper: mappers.financial.fromDb, shape: 'array' },
  sales: { queryKey: (u) => ['sales', u], mapper: mappers.sale.fromDb, shape: 'infinite-sales' },
};

function patchArrayShape(queryClient: QueryClient, queryKey: unknown[], event: RealtimeEvent, row: any, oldId: string | undefined) {
  queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
    if (!old) return old; // Nada en cache todavía: el primer fetch normal ya traerá esto.
    if (event === 'DELETE') {
      return old.filter((item) => item.id !== oldId);
    }
    const idx = old.findIndex((item) => item.id === row.id);
    if (idx === -1) {
      // INSERT (o UPDATE de una fila que aún no teníamos, p.ej. otro dispositivo)
      return [row, ...old];
    }
    const next = [...old];
    next[idx] = row;
    return next;
  });
}

function patchSalesInfinite(queryClient: QueryClient, queryKey: unknown[], event: RealtimeEvent, row: any, oldId: string | undefined) {
  queryClient.setQueryData(queryKey, (old: any) => {
    if (!old?.pages) return old;
    if (event === 'DELETE') {
      return { ...old, pages: old.pages.map((page: any[]) => page.filter((s) => s.id !== oldId)) };
    }
    let found = false;
    const pages = old.pages.map((page: any[]) =>
      page.map((s) => {
        if (s.id === row.id) {
          found = true;
          return row;
        }
        return s;
      })
    );
    if (!found) {
      // Venta nueva (de otro dispositivo/pestaña): la agregamos al inicio de la primera página.
      pages[0] = [row, ...(pages[0] || [])];
    }
    return { ...old, pages };
  });
}

/**
 * Intenta parchear la cache quirúrgicamente. Devuelve true si lo logró.
 * Si la tabla no está mapeada o algo falla, devuelve false para que el
 * caller haga un invalidateQueries de respaldo.
 */
export function tryPatchRealtimeEvent(
  queryClient: QueryClient,
  table: string,
  userId: string,
  eventType: RealtimeEvent,
  payload: { new: any; old: any }
): boolean {
  const config = TABLE_CONFIG[table];
  if (!config) return false;

  try {
    const queryKey = config.queryKey(userId);
    const oldId = payload.old?.id;
    const row = eventType === 'DELETE' ? null : config.mapper(payload.new);

    if (config.shape === 'array') {
      patchArrayShape(queryClient, queryKey, eventType, row, oldId);
    } else {
      patchSalesInfinite(queryClient, queryKey, eventType, row, oldId);
    }
    return true;
  } catch (e) {
    console.error(`[Realtime] No se pudo parchear "${table}", se hará invalidateQueries de respaldo:`, e);
    return false;
  }
}
