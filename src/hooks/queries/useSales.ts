
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { Sale } from '../../types';
import { mappers } from '../../utils/mappers';
import { useAuth } from '../../context/AuthContext';
import { withRetry } from '../../utils/supabaseUtils';
import { cacheUtils } from '../../utils/cacheUtils';
import { useOfflineSync } from '../useOfflineSync';
import { useToast } from '../../context/ToastContext';
import { scheduleReconcile } from './scheduleReconcile';

const PAGE_SIZE = 200; 

export const useSales = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const { addToSyncQueue, isNetworkError } = useOfflineSync(userId);
  const { showToast } = useToast();

  const query = useInfiniteQuery({
    queryKey: ['sales', userId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) return [];
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data, error } = await withRetry(() => 
        supabase
          .from('sales')
          .select('id, client_id, account_id, service_name, sale_type, amount, date, expiry_date, screens_count, assigned_profiles, exchange_rate, is_partial, initial_payment, invited_email, invited_password, reseller_id, notes')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .range(from, to)
      );
      
      if (error) throw error;
      const mappedData = (data as any[] || []).map(mappers.sale.fromDb);
      
      // Cache first page for instant loading
      if (pageParam === 0) {
        cacheUtils.save('sales_p1', mappedData, userId);
      }
      
      return mappedData;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length; 
    },
    initialData: () => {
      const cached = cacheUtils.load<Sale[]>('sales_p1', userId);
      if (cached) {
        return {
          pages: [cached],
          pageParams: [0]
        };
      }
      return undefined;
    },
    enabled: !!userId,
    staleTime: 0, 
  });

  const addSale = useMutation({
    meta: { skipGlobalErrorToast: true }, // ya maneja rollback + showToast en su propio onError
    mutationFn: async (sale: Sale) => {
      if (!userId) throw new Error("No auth");
      try {
        // RPC transaccional: inserta la venta Y sincroniza los perfiles/
        // pantallas ocupadas de la cuenta en una sola operación atómica en
        // el servidor (antes esto se hacía -o se dejaba de hacer- en
        // varios pasos separados desde el cliente).
        const { error } = await withRetry(() =>
          supabase.rpc('create_sale_with_sync', { p_sale: mappers.sale.toDb(sale, userId) })
        );
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['accounts', userId] });
      } catch (error) {
        if (isNetworkError(error)) {
          console.warn("Network error detected, queueing sale for offline sync");
          await addToSyncQueue('CREATE', 'SALE', mappers.sale.toDb(sale, userId));
          showToast('Venta guardada localmente (sin conexión)', 'info');
          return sale;
        }
        throw error;
      }
      return sale;
    },
    onMutate: async (newSale) => {
      await queryClient.cancelQueries({ queryKey: ['sales', userId] });
      const previousSalesPages = queryClient.getQueryData(['sales', userId]);
      
      queryClient.setQueryData(['sales', userId], (old: any) => {
          if (!old) return { pages: [[newSale]], pageParams: [0] };
          const newPages = [...old.pages];
          newPages[0] = [newSale, ...newPages[0]];
          return { ...old, pages: newPages };
      });
      
      return { previousSalesPages };
    },
    onError: (err: any, newSale, context) => {
      if (context?.previousSalesPages) {
          queryClient.setQueryData(['sales', userId], context.previousSalesPages);
      }
      showToast(`Error al guardar venta: ${err.message || 'Error desconocido'}`, 'error');
    },
    onSettled: () => {
      scheduleReconcile(queryClient, ['sales', userId]);
    }
  });

  const updateSale = useMutation({
    meta: { skipGlobalErrorToast: true }, // ya maneja rollback + showToast en su propio onError
    mutationFn: async (sale: Sale) => {
      if (!userId) throw new Error("No auth");
      try {
        // RPC transaccional: aplica los cambios a la venta Y resincroniza
        // la cuenta (libera lo viejo, ocupa lo nuevo). Antes esto era un
        // UPDATE plano que nunca tocaba `accounts` — si editabas la cuenta
        // o los perfiles de una venta, el inventario quedaba desincronizado.
        const { error } = await withRetry(() =>
          supabase.rpc('update_sale_with_sync', { p_sale: mappers.sale.toDb(sale, userId) })
        );
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['accounts', userId] });
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('UPDATE', 'SALE', mappers.sale.toDb(sale, userId));
          showToast('Cambios guardados localmente', 'info');
          return sale;
        }
        throw error;
      }
      return sale;
    },
    onMutate: async (updatedSale) => {
      await queryClient.cancelQueries({ queryKey: ['sales', userId] });
      const previousSalesPages = queryClient.getQueryData(['sales', userId]);

      queryClient.setQueryData(['sales', userId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any[]) => 
            page.map(sale => sale.id === updatedSale.id ? updatedSale : sale)
          )
        };
      });

      return { previousSalesPages };
    },
    onError: (err: any, updatedSale, context) => {
      if (context?.previousSalesPages) {
        queryClient.setQueryData(['sales', userId], context.previousSalesPages);
      }
      showToast(`Error al actualizar venta: ${err.message || 'Error desconocido'}`, 'error');
    },
    onSettled: () => {
      scheduleReconcile(queryClient, ['sales', userId]);
    }
  });

  const deleteSale = useMutation({
    meta: { skipGlobalErrorToast: true }, // ya maneja rollback + showToast en su propio onError
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("No auth");
      try {
        // RPC transaccional: borra la venta Y libera de vuelta los
        // perfiles/pantallas de la cuenta, atómicamente.
        const { error } = await withRetry(() => supabase.rpc('delete_sale_with_sync', { p_sale_id: id }));
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['accounts', userId] });
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('DELETE', 'SALE', { id });
          showToast('Eliminación pendiente de sincronización', 'info');
          return;
        }
        throw error;
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['sales', userId] });
      const previousSalesPages = queryClient.getQueryData(['sales', userId]);

      queryClient.setQueryData(['sales', userId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any[]) => page.filter(sale => sale.id !== id))
        };
      });

      return { previousSalesPages };
    },
    onError: (err: any, id, context) => {
      if (context?.previousSalesPages) {
        queryClient.setQueryData(['sales', userId], context.previousSalesPages);
      }
      showToast(`Error al eliminar venta: ${err.message || 'Error desconocido'}`, 'error');
    },
    onSettled: () => {
      scheduleReconcile(queryClient, ['sales', userId]);
    }
  });

  const sales = query.data?.pages.flat() || [];

  return { sales, isLoading: query.isLoading, isFetchingNextPage: query.isFetchingNextPage, hasNextPage: query.hasNextPage, fetchNextPage: query.fetchNextPage, addSale, updateSale, deleteSale };
};
