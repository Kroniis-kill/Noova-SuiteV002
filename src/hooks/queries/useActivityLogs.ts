import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { withRetry } from '../../utils/supabaseUtils';
import { mappers } from '../../utils/mappers';
import { cacheUtils } from '../../utils/cacheUtils';
import { ActivityLog, ServiceFailure } from '../../types';

export function useActivityLogs(userId: string | undefined) {
  return useQuery({
    queryKey: ['logs', userId],
    queryFn: async () => {
      if (!userId || userId === 'offline-user-id') return [];
      const { data } = await withRetry(() =>
        supabase
          .from('activity_logs')
          .select('id, user_id, action, entity, details, timestamp')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
      );
      const mappedData = (data || []).map(mappers.log.fromDb);
      cacheUtils.save('logs', mappedData, userId);
      return mappedData;
    },
    initialData: () => cacheUtils.load<ActivityLog[]>('logs', userId) || undefined,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useServiceFailuresQ(userId: string | undefined) {
  return useQuery({
    queryKey: ['service_failures', userId],
    queryFn: async () => {
      if (!userId || userId === 'offline-user-id') return [];
      const { data, error } = await withRetry(() =>
        supabase
          .from('service_failures')
          .select('id, user_id, sale_id, notes, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      );
      if (error) throw error;
      const mappedData = (data || []).map(mappers.serviceFailure.fromDb);
      cacheUtils.save('service_failures', mappedData, userId);
      return mappedData;
    },
    initialData: () => cacheUtils.load<ServiceFailure[]>('service_failures', userId) || undefined,
    enabled: !!userId && userId !== 'offline-user-id',
    staleTime: 0,
  });
}
