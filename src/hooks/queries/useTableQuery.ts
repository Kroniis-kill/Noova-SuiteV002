import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { withRetry } from '../../utils/supabaseUtils';
import { cacheUtils } from '../../utils/cacheUtils';
import { fetchAllPaginated } from './fetchAllPaginated';

export interface TableQueryOptions {
  /** Orden de lectura. Recomendado siempre que se use un límite, para que "los N más recientes" sean realmente los más recientes. */
  orderBy?: { column: string; ascending?: boolean };
  /** true = trae TODAS las filas (en bloques de 1000) en vez de cortar en `limit`. */
  all?: boolean;
}

/**
 * Generic per-user table query with localStorage cache + offline-safe defaults.
 * Extracted from the legacy `useSupabaseData` god-hook so each entity can
 * declare its query in its own module.
 */
export function useTableQuery<T>(
  key: string,
  table: string,
  userId: string | undefined,
  mapper: (d: any) => T,
  setter: ((data: T[]) => void) | undefined,
  enabled = true,
  limit = 1000,
  columns = '*',
  options: TableQueryOptions = {}
) {
  return useQuery({
    queryKey: [key, userId],
    queryFn: async () => {
      if (!userId || userId === 'offline-user-id') return [];
      const buildQuery = (from: number, to: number) => {
        let q: any = supabase.from(table).select(columns).eq('user_id', userId);
        if (options.orderBy) {
          q = q.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? false });
          // Desempate estable: sin esto, el orden entre filas con la misma fecha puede
          // cambiar entre bloques y repetir u omitir filas al paginar.
          q = q.order('id', { ascending: true });
        }
        return q.range(from, to);
      };

      let rows: any[];
      if (options.all) {
        rows = await fetchAllPaginated<any>((from, to) => buildQuery(from, to));
      } else {
        const { data, error } = await withRetry(() => buildQuery(0, limit - 1));
        if (error) {
          console.error(`Error fetching ${table}:`, error);
          throw error;
        }
        rows = data || [];
      }
      const mappedData = rows.map(mapper);
      // El setter es opcional: react-query YA es la fuente de verdad de estos
      // datos (accesible via el valor de retorno / cache). No hace falta
      // duplicarlos en un store aparte (ver notas en useSupabaseData.ts).
      setter?.(mappedData);
      cacheUtils.save(key, mappedData, userId);
      return mappedData;
    },
    initialData: () => cacheUtils.load<T[]>(key, userId) || undefined,
    initialDataUpdatedAt: () => cacheUtils.loadedAt(key, userId) ?? undefined,
    enabled: !!userId && userId !== 'offline-user-id' && enabled,
    // No fijamos staleTime/refetchOnMount aquí: heredan la config global de
    // queryClient.ts (staleTime 30s). Antes esto forzaba un refetch completo
    // de la tabla cada vez que el usuario navegaba a la pantalla, aunque los
    // datos tuvieran segundos de antigüedad. Realtime + invalidación
    // quirúrgica (ver DataContext.tsx) son ahora la fuente principal de
    // frescura, no el refetch-on-mount.
    gcTime: 1000 * 60 * 60,
  });
}
