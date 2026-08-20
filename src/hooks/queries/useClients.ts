
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { Client } from '../../types';
import { mappers } from '../../utils/mappers';
import { useAuth } from '../../context/AuthContext';
import { generateUUID } from '../../utils/uuid';
import { generateClientSlug } from '../../utils/contactosUtils'; 
import { getSupabaseErrorMessage } from '../../utils/errorUtils';
import { withRetry } from '../../utils/supabaseUtils';
import { cacheUtils } from '../../utils/cacheUtils';
import { useOfflineSync } from '../useOfflineSync';
import { useToast } from '../../context/ToastContext';
import { scheduleReconcile } from './scheduleReconcile';
import { fetchAllPaginated } from './fetchAllPaginated';

export const useClients = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const { addToSyncQueue, isNetworkError } = useOfflineSync(userId);
  const { showToast } = useToast();

  const query = useQuery({
    queryKey: ['clients', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Chunked fetch: avoids Supabase's silent 1000-row cap.
      const data = await fetchAllPaginated<any>((from, to) =>
        supabase
          .from('clients')
          .select('id, name, phone, telegram, registration_date, active_services, notes, reseller_id, tags, is_blocked, portal_alias, portal_pin, original_name, original_phone, portal_slug, portal_token')
          .eq('user_id', userId)
          .order('registration_date', { ascending: false })
          .range(from, to)
      );

      const mappedData = data.map((c: any) => mappers.client.fromDb(c));
      cacheUtils.save('clients', mappedData, userId);
      return mappedData;
    },
    initialData: () => {
      return cacheUtils.load<Client[]>('clients', userId) || undefined;
    },
    enabled: !!userId,
    // Realtime + scheduleReconcile keep this fresh; 30s prevents back-to-back refetches.
    staleTime: 30_000,
  });

  const addClient = useMutation({
    meta: { skipGlobalErrorToast: true }, // ya maneja rollback + showToast en su propio onError
    mutationFn: async (client: Client) => {
      if (!userId) throw new Error("No autorizado");
      const clientName = (client.name || '').trim();
      const finalClient: Client = {
        ...client,
        id: client.id || generateUUID(),
        name: clientName,
        slug: client.slug || generateClientSlug(clientName),
        portalToken: client.portalToken || generateUUID(),
        registrationDate: client.registrationDate || new Date().toISOString().split('T')[0],
        activeServices: client.activeServices || 0,
        isBlocked: client.isBlocked || false,
        tags: client.tags || ['Nuevo']
      };
      
      try {
        const { error } = await withRetry(() => supabase.from('clients').insert([mappers.client.toDb(finalClient, userId)]));
        if (error) throw new Error(getSupabaseErrorMessage(error));
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('CREATE', 'CLIENT', mappers.client.toDb(finalClient, userId));
          showToast('Cliente guardado localmente', 'info');
          return finalClient;
        }
        throw error;
      }
      return finalClient;
    },
    onMutate: async (newClient) => {
      await queryClient.cancelQueries({ queryKey: ['clients', userId] });
      const previousClients = queryClient.getQueryData(['clients', userId]);
      queryClient.setQueryData(['clients', userId], (old: any) => [newClient, ...(old || [])]);
      return { previousClients };
    },
    onError: (err: any, newClient, context) => {
      if (context?.previousClients) {
        queryClient.setQueryData(['clients', userId], context.previousClients);
      }
      showToast(`Error al guardar cliente: ${err.message || 'Error desconocido'}`, 'error');
    },
    onSettled: () => {
      // Backup reconciliation: marks stale, no immediate refetch.
      scheduleReconcile(queryClient, ['clients', userId]);
    }
  });

  const updateClient = useMutation({
    meta: { skipGlobalErrorToast: true }, // ya maneja rollback + showToast en su propio onError
    mutationFn: async (client: Client) => {
      if (!userId) throw new Error("No autorizado");
      try {
        const { error } = await withRetry(() => supabase.from('clients').update(mappers.client.toDb(client, userId)).eq('id', client.id));
        if (error) throw new Error(getSupabaseErrorMessage(error));
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('UPDATE', 'CLIENT', mappers.client.toDb(client, userId));
          showToast('Cambios guardados localmente', 'info');
          return;
        }
        throw error;
      }
    },
    onMutate: async (updatedClient) => {
      await queryClient.cancelQueries({ queryKey: ['clients', userId] });
      const previousClients = queryClient.getQueryData(['clients', userId]);
      queryClient.setQueryData(['clients', userId], (old: any) => 
        old?.map((c: any) => c.id === updatedClient.id ? updatedClient : c)
      );
      return { previousClients };
    },
    onError: (err: any, updatedClient, context) => {
      if (context?.previousClients) {
        queryClient.setQueryData(['clients', userId], context.previousClients);
      }
      showToast(`Error al actualizar cliente: ${err.message || 'Error desconocido'}`, 'error');
    },
    onSettled: () => {
      scheduleReconcile(queryClient, ['clients', userId]);
    }
  });

  const deleteClient = useMutation({
    meta: { skipGlobalErrorToast: true }, // ya maneja rollback + showToast en su propio onError
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("No autorizado");
      try {
        const { error } = await withRetry(() => supabase.from('clients').delete().eq('id', id));
        if (error) throw new Error(getSupabaseErrorMessage(error));
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('DELETE', 'CLIENT', { id });
          showToast('Eliminación pendiente de sincronización', 'info');
          return;
        }
        throw error;
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['clients', userId] });
      const previousClients = queryClient.getQueryData(['clients', userId]);
      queryClient.setQueryData(['clients', userId], (old: any) => 
        old?.filter((c: any) => c.id !== id)
      );
      return { previousClients };
    },
    onError: (err: any, id, context) => {
      if (context?.previousClients) {
        queryClient.setQueryData(['clients', userId], context.previousClients);
      }
      showToast(`Error al eliminar cliente: ${err.message || 'Error desconocido'}`, 'error');
    },
    onSettled: () => {
      scheduleReconcile(queryClient, ['clients', userId]);
    }
  });

  // Added regeneratePortalToken mutation to handle security token refreshes for the client portal
  const regeneratePortalToken = useMutation({
    mutationFn: async (clientId: string) => {
      if (!userId) throw new Error("No autorizado");
      
      const { data: client, error: fetchError } = await withRetry(() => supabase
        .from('clients')
        .select('name')
        .eq('id', clientId)
        .single());
        
      if (fetchError || !client) throw new Error("Cliente no encontrado");

      const newSlug = generateClientSlug(client.name);
      const newToken = generateUUID();

      const { error } = await withRetry(() => supabase
        .from('clients')
        .update({ 
          portal_alias: newSlug,
          portal_token: newToken,
          portal_pin: null 
        })
        .eq('id', clientId));

      if (error) throw new Error(getSupabaseErrorMessage(error));
      return newSlug;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['clients', userId] });
    }
  });

  return {
    clients: query.data || [],
    isLoading: query.isLoading,
    addClient,
    updateClient,
    deleteClient,
    // Fix: export regeneratePortalToken to resolve Property 'regeneratePortalToken' does not exist error
    regeneratePortalToken
  };
};
