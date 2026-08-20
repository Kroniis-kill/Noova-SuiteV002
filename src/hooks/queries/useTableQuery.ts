import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { withRetry } from '../../utils/supabaseUtils';
import { cacheUtils } from '../../utils/cacheUtils';

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
  columns = '*'
) {
  return useQuery({
    queryKey: [key, userId],
    queryFn: async () => {
      if (!userId || userId === 'offline-user-id') return [];
      const { data, error } = await withRetry(() =>
        supabase
          .from(table)
          .select(columns)
          .eq('user_id', userId)
          .range(0, limit - 1)
      );
      if (error) {
        console.error(`Error fetching ${table}:`, error);
        throw error;
      }
      const mappedData = (data || []).map(mapper);
      // El setter es opcional: react-query YA es la fuente de verdad de estos
      // datos (accesible via el valor de retorno / cache). No hace falta
      // duplicarlos en un store aparte (ver notas en useSupabaseData.ts).
      setter?.(mappedData);
      cacheUtils.save(key, mappedData, userId);
      return mappedData;
    },
    initialData: () => cacheUtils.load<T[]>(key, userId) || undefined,
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
