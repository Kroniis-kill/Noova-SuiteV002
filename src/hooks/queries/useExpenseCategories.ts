import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabaseClient';
import { withRetry } from '../../utils/supabaseUtils';
import { cacheUtils } from '../../utils/cacheUtils';
import { mappers } from '../../utils/mappers';
import { ExpenseCategory } from '../../types';
import { useOfflineSync } from '../useOfflineSync';
import { useToast } from '../../context/ToastContext';
import { resolveUserId } from './queryHelpers';

/**
 * Expense categories entity: query + add/update/delete mutations.
 * Extracted from useSupabaseData (god-hook split).
 */
export function useExpenseCategories(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { addToSyncQueue, isNetworkError } = useOfflineSync(userId);
  const { showToast } = useToast();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['expense_categories', userId] });

  const expenseCategoriesQ = useQuery({
    queryKey: ['expense_categories', userId],
    queryFn: async () => {
      if (!userId || userId === 'offline-user-id') return [];
      const { data, error } = await withRetry(() =>
        supabase.from('expense_categories').select('id, name, color').eq('user_id', userId)
      );
      if (error) return [];
      const mappedData = (data || []).map(mappers.expenseCategory.fromDb);
      cacheUtils.save('expense_categories', mappedData, userId);
      return mappedData;
    },
    initialData: () => cacheUtils.load<ExpenseCategory[]>('expense_categories', userId) || undefined,
    enabled: !!userId && userId !== 'offline-user-id',
    staleTime: 1000 * 60 * 60 * 24,
  });

  const addCategory = useMutation({
    mutationFn: async (c: ExpenseCategory) => {
      const activeId = await resolveUserId(userId);
      if (!activeId) throw new Error('No auth');
      const dbData = mappers.expenseCategory.toDb(c, activeId);
      try {
        const { error } = await withRetry(() => supabase.from('expense_categories').insert([dbData]));
        if (error) throw error;
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('CREATE', 'CATEGORY', dbData);
          showToast('Categoría guardada localmente', 'info');
          return;
        }
        throw error;
      }
    },
    onSuccess: invalidate,
  }).mutateAsync;

  const updateCategory = useMutation({
    mutationFn: async (c: ExpenseCategory) => {
      const activeId = await resolveUserId(userId);
      if (!activeId) throw new Error('No auth');
      const dbData = mappers.expenseCategory.toDb(c, activeId);
      try {
        const { error } = await withRetry(() => supabase.from('expense_categories').update(dbData).eq('id', c.id));
        if (error) throw error;
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('UPDATE', 'CATEGORY', dbData);
          showToast('Cambios guardados localmente', 'info');
          return;
        }
        throw error;
      }
    },
    onSuccess: invalidate,
  }).mutateAsync;

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      try {
        const { error } = await withRetry(() => supabase.from('expense_categories').delete().eq('id', id));
        if (error) throw error;
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('DELETE', 'CATEGORY', { id });
          showToast('Eliminación pendiente', 'info');
          return;
        }
        throw error;
      }
    },
    onSuccess: invalidate,
  }).mutateAsync;

  return { expenseCategoriesQ, addCategory, updateCategory, deleteCategory };
}
