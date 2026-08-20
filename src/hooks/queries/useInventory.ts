
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { Account, Service, Provider } from '../../types';
import { mappers } from '../../utils/mappers';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { withRetry } from '../../utils/supabaseUtils';
import { cacheUtils } from '../../utils/cacheUtils';
import { useOfflineSync } from '../useOfflineSync';
import { scheduleReconcile } from './scheduleReconcile';
import { fetchAllPaginated } from './fetchAllPaginated';

export const useInventory = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const { addToSyncQueue, isNetworkError } = useOfflineSync(userId);
  const { showToast } = useToast();

  const servicesQ = useQuery({
    queryKey: ['services', userId],
    queryFn: async () => {
        if (!userId) return [];
        const { data, error } = await withRetry(() => 
          supabase
            .from('services')
            .select('id, name, cost, screens, type, investment_price, public_price, reseller_price, image_url')
            .eq('user_id', userId)
        );
        if (error) throw error;
        const mappedData = (data as any[] || []).map(mappers.service.fromDb);
        cacheUtils.save('services', mappedData, userId);
        return mappedData;
    },
    initialData: () => cacheUtils.load<Service[]>('services', userId) || undefined,
    initialDataUpdatedAt: () => cacheUtils.loadedAt('services', userId) ?? undefined,
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const accountsQ = useQuery({
    queryKey: ['accounts', userId],
    queryFn: async () => {
        if (!userId) return [];
        const data = await fetchAllPaginated<any>((from, to) =>
          supabase
            .from('accounts')
            .select('id, service_id, email, password, country, start_date, end_date, status, notes, max_screens, used_screens, profiles, plan, account_type, provider_id, auto_renewal, failure_started_at')
            .eq('user_id', userId)
            .range(from, to)
        );
        const mappedData = data.map(mappers.account.fromDb);
        cacheUtils.save('accounts', mappedData, userId);
        return mappedData;
    },
    initialData: () => cacheUtils.load<Account[]>('accounts', userId) || undefined,
    initialDataUpdatedAt: () => cacheUtils.loadedAt('accounts', userId) ?? undefined,
    enabled: !!userId,
    // Realtime + scheduleReconcile keep this fresh; 30s prevents thrashing.
    staleTime: 30_000,
    refetchOnMount: 'always',
  });

  const addAccount = useMutation({
    meta: { skipGlobalErrorToast: true }, // ya maneja rollback + showToast en su propio onError
      mutationFn: async (acc: Account) => {
          if(!userId) throw new Error("Sesión expirada");
          try {
            const { error } = await withRetry(() => supabase.from('accounts').insert([mappers.account.toDb(acc, userId)]));
            if(error) throw error;
          } catch (error) {
            if (isNetworkError(error)) {
              await addToSyncQueue('CREATE', 'ACCOUNT', mappers.account.toDb(acc, userId));
              showToast('Cuenta guardada localmente', 'info');
              return acc;
            }
            throw error;
          }
          return acc;
      },
      onMutate: async (newAccount) => {
          await queryClient.cancelQueries({ queryKey: ['accounts', userId] });
          const previousAccounts = queryClient.getQueryData(['accounts', userId]);
          queryClient.setQueryData(['accounts', userId], (old: any) => [newAccount, ...(old || [])]);
          return { previousAccounts };
      },
      onError: (err: any, newAccount, context) => {
          if (context?.previousAccounts) {
              queryClient.setQueryData(['accounts', userId], context.previousAccounts);
          }
          showToast(`Error al guardar cuenta: ${err.message || 'Error desconocido'}`, 'error');
      },
      onSettled: () => {
         const fresh = queryClient.getQueryData<Account[]>(['accounts', userId]);
         if (fresh) cacheUtils.save('accounts', fresh, userId);
         scheduleReconcile(queryClient, ['accounts', userId]);
      }
  });

  const updateAccount = useMutation({
    meta: { skipGlobalErrorToast: true }, // ya maneja rollback + showToast en su propio onError
      mutationFn: async (acc: Account) => {
          if(!userId) throw new Error("No Auth");
          try {
            const { error } = await withRetry(() => supabase.from('accounts').update(mappers.account.toDb(acc, userId)).eq('id', acc.id));
            if(error) throw error;
          } catch (error) {
            if (isNetworkError(error)) {
              await addToSyncQueue('UPDATE', 'ACCOUNT', mappers.account.toDb(acc, userId));
              showToast('Cambios guardados localmente', 'info');
              return acc;
            }
            throw error;
          }
          return acc;
      },
      onMutate: async (updatedAccount) => {
          await queryClient.cancelQueries({ queryKey: ['accounts', userId] });
          const previousAccounts = queryClient.getQueryData(['accounts', userId]);
          queryClient.setQueryData(['accounts', userId], (old: any) => 
            old?.map((a: any) => a.id === updatedAccount.id ? updatedAccount : a)
          );
          return { previousAccounts };
      },
      onError: (err: any, updatedAccount, context) => {
          if (context?.previousAccounts) {
              queryClient.setQueryData(['accounts', userId], context.previousAccounts);
          }
          showToast(`Error al actualizar cuenta: ${err.message || 'Error desconocido'}`, 'error');
      },
      onSettled: () => {
        const fresh = queryClient.getQueryData<Account[]>(['accounts', userId]);
        if (fresh) cacheUtils.save('accounts', fresh, userId);
        scheduleReconcile(queryClient, ['accounts', userId]);
      }
  });

  const deleteAccount = useMutation({
    meta: { skipGlobalErrorToast: true }, // ya maneja rollback + showToast en su propio onError
      mutationFn: async (id: string) => {
          if(!userId) throw new Error("No Auth");
          try {
            const { error } = await withRetry(() => supabase.from('accounts').delete().eq('id', id));
            if(error) throw error;
          } catch (error) {
            if (isNetworkError(error)) {
              await addToSyncQueue('DELETE', 'ACCOUNT', { id });
              showToast('Eliminación pendiente de sincronización', 'info');
              return;
            }
            throw error;
          }
      },
      onMutate: async (id) => {
          await queryClient.cancelQueries({ queryKey: ['accounts', userId] });
          const previousAccounts = queryClient.getQueryData(['accounts', userId]);
          queryClient.setQueryData(['accounts', userId], (old: any) => 
            old?.filter((a: any) => a.id !== id)
          );
          return { previousAccounts };
      },
      onError: (err: any, id, context) => {
          if (context?.previousAccounts) {
              queryClient.setQueryData(['accounts', userId], context.previousAccounts);
          }
          showToast(`Error al eliminar cuenta: ${err.message || 'Error desconocido'}`, 'error');
      },
      onSettled: () => {
         const fresh = queryClient.getQueryData<Account[]>(['accounts', userId]);
         if (fresh) cacheUtils.save('accounts', fresh, userId);
         scheduleReconcile(queryClient, ['accounts', userId]);
      }
  });

  const providersQ = useQuery({
      queryKey: ['providers', userId],
      queryFn: async () => {
          if (!userId) return [];
          const { data, error } = await withRetry(() => 
            supabase
              .from('providers')
              .select('id, name, whatsapp, telegram, color, registration_date, quality_score')
              .eq('user_id', userId)
          );
          if (error) throw error;
          const mappedData = (data as any[] || []).map(mappers.provider.fromDb);
          cacheUtils.save('providers', mappedData, userId);
          return mappedData;
      },
      initialData: () => cacheUtils.load<Provider[]>('providers', userId) || undefined,
      initialDataUpdatedAt: () => cacheUtils.loadedAt('providers', userId) ?? undefined,
      enabled: !!userId,
      staleTime: 1000 * 60 * 5,
      refetchOnMount: 'always',
  });

  const addService = useMutation({
      mutationFn: async (s: Service) => {
          if(!userId) throw new Error("No Auth");
          try {
            const { error } = await withRetry(() => supabase.from('services').insert([mappers.service.toDb(s, userId)]));
            if(error) throw error;
          } catch (error) {
            if (isNetworkError(error)) {
              await addToSyncQueue('CREATE', 'SERVICE', mappers.service.toDb(s, userId));
              showToast('Servicio guardado localmente', 'info');
              return s;
            }
            throw error;
          }
          return s;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services', userId] })
  });

  const updateService = useMutation({
      mutationFn: async (s: Service) => {
          if(!userId) throw new Error("No Auth");
          try {
            const { error } = await withRetry(() => supabase.from('services').update(mappers.service.toDb(s, userId)).eq('id', s.id));
            if(error) throw error;
          } catch (error) {
            if (isNetworkError(error)) {
              await addToSyncQueue('UPDATE', 'SERVICE', mappers.service.toDb(s, userId));
              showToast('Cambios guardados localmente', 'info');
              return s;
            }
            throw error;
          }
          return s;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services', userId] })
  });

  const deleteService = useMutation({
      mutationFn: async (id: string) => {
          if(!userId) throw new Error("No Auth");
          try {
            const { error } = await withRetry(() => supabase.from('services').delete().eq('id', id));
            if(error) throw error;
          } catch (error) {
            if (isNetworkError(error)) {
              await addToSyncQueue('DELETE', 'SERVICE', { id });
              showToast('Eliminación pendiente de sincronización', 'info');
              return;
            }
            throw error;
          }
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services', userId] })
  });

  return {
    services: servicesQ.data || [],
    accounts: accountsQ.data || [],
    providers: providersQ.data || [],
    isLoading: servicesQ.isLoading || accountsQ.isLoading || providersQ.isLoading,
    addAccount,
    updateAccount,
    deleteAccount,
    addService,
    updateService,
    deleteService
  };
};
