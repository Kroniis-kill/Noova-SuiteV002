
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Service, Account, Client, Sale, FinancialAccount, Movement, Reseller, AppSettings, PayableExpense, Provider, Expense, SupplyPurchase, ActivityLog, LogAction, LogEntity, ScreenProfile, ProfileHistoryEntry, ExpenseCategory, ServiceFailure } from '../types';
import { generateUUID } from '../utils/uuid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mappers } from '../utils/mappers';
import { withRetry } from '../utils/supabaseUtils';
import { cacheUtils } from '../utils/cacheUtils';
import { useOfflineSync } from './useOfflineSync';
import { useToast } from '../context/ToastContext';
import { DEFAULT_SETTINGS } from '../constants/defaultSettings';
import { useTableQuery as useSharedTableQuery } from './queries/useTableQuery';
import { useSettings } from './queries/useSettings';
import { useExpenseCategories } from './queries/useExpenseCategories';
import { useActivityLogs, useServiceFailuresQ } from './queries/useActivityLogs';

// DEFAULT_SETTINGS lives in src/constants/defaultSettings.ts (split out)


export const useSupabaseData = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const { addToSyncQueue, isNetworkError } = useOfflineSync(userId);
  const { showToast } = useToast();
  const SALES_PAGE_SIZE = 50;
  const [salesPage, setSalesPage] = useState(0);
  const [hasMoreSales, setHasMoreSales] = useState(true);

  const getValidUserId = async () => {
    if (userId && userId !== 'offline-user-id') return userId;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;
    return null;
  };

  const logInternal = async (action: LogAction, entity: LogEntity, details: string) => {
    const activeId = await getValidUserId();
    if (!activeId) return;
    try {
      await withRetry(() => 
        supabase.from('activity_logs').insert({
          user_id: activeId,
          action,
          entity,
          details,
          timestamp: new Date().toISOString()
        })
      );
    } catch (e) {
      console.error("Error logging activity:", e);
    }
  };

  // Shared table-query helper extracted to ./queries/useTableQuery
  const useTableQuery = <T>(
    key: string, table: string, mapper: (d: any) => T,
    enabled = true, limit = 1000, columns = '*'
  ) => useSharedTableQuery<T>(key, table, userId, mapper, undefined, enabled, limit, columns);

  // REMOVED REDUNDANT QUERIES (Handled by modular hooks: useClients, useSales, useInventory)

  // Nota: estas queries ya NO escriben en un store de Zustand paralelo.
  // react-query es la única fuente de verdad — los datos se leen desde acá
  // mismo (financialAccountsQ.data, etc.) y desde DataContext.tsx.
  const financialAccountsQ = useTableQuery('financial_accounts', 'financial_accounts', mappers.financial.fromDb, true, 1000, 'id, name, currency, balance, payment_methods, is_active');
  const movementsQ = useTableQuery('movements', 'movements', mappers.movement.fromDb, true, 500, '*');
  const resellersQ = useTableQuery('resellers', 'resellers', mappers.reseller.fromDb, true, 1000, 'id, name, code, whatsapp, telegram, color, registration_date');
  const providersQ = useTableQuery('providers', 'providers', mappers.provider.fromDb, true, 1000, 'id, name, whatsapp, telegram, color, registration_date, quality_score');
  const payableExpensesQ = useTableQuery('payable_expenses', 'payable_expenses', mappers.payable.fromDb, true, 1000, 'id, name, amount, currency, due_date, recurrence');
  const expensesQ = useTableQuery('expenses', 'expenses', mappers.expense.fromDb, true, 1000, '*');
  const suppliesQ = useTableQuery('supplies', 'supplies', mappers.supply.fromDb, true, 1000, '*');
  
  // service_failures + activity_logs queries movidos a ./queries/useActivityLogs
  const serviceFailuresQ = useServiceFailuresQ(userId);

  // expense_categories query + 3 mutations live in ./queries/useExpenseCategories
  const { expenseCategoriesQ, addCategory, updateCategory, deleteCategory } = useExpenseCategories(userId);

  // settings query + updateSettings mutation live in ./queries/useSettings
  const { settingsQ, updateSettings } = useSettings(userId);

  const activityLogsQ = useActivityLogs(userId);

  // updateSettings moved to ./queries/useSettings


  // addClient/updateClient/deleteClient/updateAccount/addAccount/deleteAccount
  // (legacy) fueron eliminados de acá: eran código muerto — DataContext usa
  // clientActions.* (useClients.ts) e inventoryActions.* (useInventory.ts).
  // Mantenerlos duplicados acá invitaba a que algún componente nuevo se
  // conectara sin querer a la versión sin optimistic-update / sin
  // paginación completa.

  // addCategory/updateCategory/deleteCategory moved to ./queries/useExpenseCategories

  const reconcileMovement = useMutation({ 
    mutationFn: async (id: string) => { 
      const activeId = await getValidUserId();
      if (!activeId) throw new Error("No Auth"); 
      const { error } = await withRetry(() => supabase.from('movements').update({ reconciled: true, reconciled_at: new Date().toISOString(), reconciled_by: activeId }).eq('id', id)); 
      if(error) throw error; 
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movements', userId] }) 
  }).mutateAsync;
  
  const addFailure = useMutation({
    mutationFn: async (f: ServiceFailure) => {
        const activeId = await getValidUserId();
        if (!activeId) throw new Error("No Auth");
        const dbData = mappers.serviceFailure.toDb(f, activeId);
        try {
          const { error } = await withRetry(() => supabase.from('service_failures').insert([dbData]));
          if (error) throw error;
        } catch (error) {
          if (isNetworkError(error)) {
            await addToSyncQueue('CREATE', 'SERVICE', dbData);
            showToast('Falla guardada localmente', 'info');
            return;
          }
          throw error;
        }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['service_failures', userId] })
  }).mutateAsync;

  const deleteFailure = useMutation({
    mutationFn: async (id: string) => {
        const activeId = await getValidUserId();
        if (!activeId) throw new Error("No Auth");
        try {
          const { error } = await withRetry(() => supabase.from('service_failures').delete().eq('id', id));
          if (error) throw error;
        } catch (error) {
          if (isNetworkError(error)) {
            await addToSyncQueue('DELETE', 'SERVICE', { id });
            showToast('Eliminación pendiente', 'info');
            return;
          }
          throw error;
        }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['service_failures', userId] })
  }).mutateAsync;

  // REMOVED: addService, updateService, deleteService (Moved to useInventory)
  // updateSale/deleteSale (legacy) fueron eliminados de acá: eran código
  // muerto — DataContext usa saleActions.updateSale/deleteSale de
  // useSales.ts, no estas versiones. La lógica de sincronizar la cuenta al
  // borrar una venta que vivía acá ahora es la RPC `delete_sale_with_sync`
  // (ver supabase/migrations/0001_transactional_rpcs.sql), que sí está
  // conectada al flujo real.
  const addFinancialAccount = useMutation({ 
    mutationFn: async (f: FinancialAccount) => { 
      const activeId = await getValidUserId();
      if (!activeId) throw new Error("No auth");
      const dbData = mappers.financial.toDb(f, activeId);
      try {
        const { error } = await withRetry(() => supabase.from('financial_accounts').insert([dbData])); 
        if(error) throw error; 
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('CREATE', 'FINANCE', dbData);
          showToast('Cuenta financiera guardada localmente', 'info');
          return;
        }
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial_accounts', userId] }) 
  }).mutateAsync;
  const updateFinancialAccount = useMutation({ 
    mutationFn: async (f: FinancialAccount) => { 
      const activeId = await getValidUserId();
      if (!activeId) throw new Error("No auth");
      const dbData = mappers.financial.toDb(f, activeId);
      try {
        const { error } = await withRetry(() => supabase.from('financial_accounts').update(dbData).eq('id', f.id)); 
        if(error) throw error; 
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('UPDATE', 'FINANCE', dbData);
          showToast('Cambios guardados localmente', 'info');
          return;
        }
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial_accounts', userId] }) 
  }).mutateAsync;
  const deleteFinancialAccount = useMutation({ 
    mutationFn: async (id: string) => { 
      const activeId = await getValidUserId();
      if (!activeId) throw new Error("No auth");
      try {
        const { error } = await withRetry(() => supabase.from('financial_accounts').delete().eq('id', id)); 
        if(error) throw error; 
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('DELETE', 'FINANCE', { id });
          showToast('Eliminación pendiente', 'info');
          return;
        }
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['financial_accounts', userId] }) 
  }).mutateAsync;
  const addMovement = useMutation({ 
    mutationFn: async (m: Movement) => { 
      const activeId = await getValidUserId();
      if (!activeId) throw new Error("No auth");
      const dbData = mappers.movement.toDb(m, activeId);
      try {
        const { error } = await withRetry(() => supabase.from('movements').insert([dbData])); 
        if(error) {
          console.error("Supabase insert error (movements):", error);
          throw error;
        }
      } catch (error: any) {
        if (isNetworkError(error)) {
          await addToSyncQueue('CREATE', 'MOVEMENT', dbData);
          showToast('Movimiento guardado localmente', 'info');
          return;
        }
        showToast(`Error al guardar movimiento: ${error?.message || 'desconocido'}`, 'error');
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movements', userId] }) 
  }).mutateAsync;
  const deleteMovement = useMutation({ 
    mutationFn: async (id: string) => { 
      const activeId = await getValidUserId();
      if (!activeId) throw new Error("No auth");
      try {
        const { error } = await withRetry(() => supabase.from('movements').delete().eq('id', id)); 
        if(error) throw error; 
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('DELETE', 'MOVEMENT', { id });
          showToast('Eliminación pendiente', 'info');
          return;
        }
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['movements', userId] }) 
  }).mutateAsync;
  const addReseller = useMutation({ 
    mutationFn: async (r: Reseller) => { 
      const activeId = await getValidUserId();
      if (!activeId) throw new Error("No auth");
      const dbData = mappers.reseller.toDb(r, activeId);
      try {
        const { error } = await withRetry(() => supabase.from('resellers').insert([dbData])); 
        if(error) {
          console.error("Supabase insert error (resellers):", error);
          throw error;
        }
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('CREATE', 'RESELLER', dbData);
          showToast('Reseller guardado localmente', 'info');
          return;
        }
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resellers', userId] }) 
  }).mutateAsync;

  const updateReseller = useMutation({ 
    mutationFn: async (r: Reseller) => { 
      const activeId = await getValidUserId();
      if (!activeId) throw new Error("No auth");
      const dbData = mappers.reseller.toDb(r, activeId);
      try {
        const { error } = await withRetry(() => supabase.from('resellers').update(dbData).eq('id', r.id)); 
        if(error) throw error; 
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('UPDATE', 'RESELLER', dbData);
          showToast('Cambios guardados localmente', 'info');
          return;
        }
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resellers', userId] }) 
  }).mutateAsync;
  const deleteReseller = async (id: string, strategy: string) => { if (strategy === 'unlink') await withRetry(() => supabase.from('clients').update({ reseller_id: null }).eq('reseller_id', id)); else if (strategy === 'delete_clients') await withRetry(() => supabase.from('clients').delete().eq('reseller_id', id)); const { error } = await withRetry(() => supabase.from('resellers').delete().eq('id', id)); if(error) throw error; queryClient.invalidateQueries({ queryKey: ['resellers', userId] }); queryClient.invalidateQueries({ queryKey: ['clients', userId] }); };
  const addProvider = useMutation({ 
    mutationFn: async (p: Provider) => { 
      const activeId = await getValidUserId();
      if (!activeId) throw new Error("No auth");
      const dbData = mappers.provider.toDb(p, activeId);
      try {
        const { error } = await withRetry(() => supabase.from('providers').insert([dbData])); 
        if(error) {
          console.error("Supabase insert error (providers):", error);
          throw error;
        }
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('CREATE', 'PROVIDER', dbData);
          showToast('Proveedor guardado localmente', 'info');
          return;
        }
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers', userId] }) 
  }).mutateAsync;

  const updateProvider = useMutation({ 
    mutationFn: async (p: Provider) => { 
      const activeId = await getValidUserId();
      if (!activeId) throw new Error("No auth");
      const dbData = mappers.provider.toDb(p, activeId);
      try {
        const { error } = await withRetry(() => supabase.from('providers').update(dbData).eq('id', p.id)); 
        if(error) throw error; 
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('UPDATE', 'PROVIDER', dbData);
          showToast('Cambios guardados localmente', 'info');
          return;
        }
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['providers', userId] }) 
  }).mutateAsync;
  const deleteProvider = async (id: string, strategy: string) => { if (strategy === 'unlink') await withRetry(() => supabase.from('accounts').update({ provider_id: null }).eq('provider_id', id)); else if (strategy === 'delete_accounts') await withRetry(() => supabase.from('accounts').delete().eq('provider_id', id)); const { error } = await withRetry(() => supabase.from('providers').delete().eq('id', id)); if(error) throw error; queryClient.invalidateQueries({ queryKey: ['providers', userId] }); queryClient.invalidateQueries({ queryKey: ['accounts', userId] }); };
  const addPayable = useMutation({ 
    mutationFn: async (p: PayableExpense) => { 
      const activeId = await getValidUserId();
      if (!activeId) throw new Error("No auth");
      const dbData = mappers.payable.toDb(p, activeId);
      try {
        const { error } = await withRetry(() => supabase.from('payable_expenses').insert([dbData])); 
        if(error) throw error; 
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('CREATE', 'PAYABLE', dbData);
          showToast('Gasto programado guardado localmente', 'info');
          return;
        }
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payable_expenses', userId] }) 
  }).mutateAsync;

  const updatePayable = useMutation({ 
    mutationFn: async (p: PayableExpense) => { 
      const activeId = await getValidUserId();
      if (!activeId) throw new Error("No auth");
      const dbData = mappers.payable.toDb(p, activeId);
      try {
        const { error } = await withRetry(() => supabase.from('payable_expenses').update(dbData).eq('id', p.id)); 
        if(error) throw error; 
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('UPDATE', 'PAYABLE', dbData);
          showToast('Cambios guardados localmente', 'info');
          return;
        }
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payable_expenses', userId] }) 
  }).mutateAsync;

  const deletePayable = useMutation({ 
    mutationFn: async (id: string) => { 
      try {
        const { error } = await withRetry(() => supabase.from('payable_expenses').delete().eq('id', id)); 
        if(error) throw error; 
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('DELETE', 'PAYABLE', { id });
          showToast('Eliminación pendiente', 'info');
          return;
        }
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payable_expenses', userId] }) 
  }).mutateAsync;
  const addExpense = useMutation({ 
    mutationFn: async (e: Expense) => { 
      const activeId = await getValidUserId();
      if (!activeId) throw new Error("No auth");
      const currentRate = settingsQ.data?.exchangeRate || 1; 
      const expenseWithRate = { ...e, exchangeRate: e.exchangeRate || currentRate }; 
      const dbData = mappers.expense.toDb(expenseWithRate, activeId);
      try {
        const { error } = await withRetry(() => supabase.from('expenses').insert([dbData])); 
        if(error) {
          console.error("Supabase insert error (expenses):", error);
          throw error;
        }
      } catch (error: any) {
        if (isNetworkError(error)) {
          await addToSyncQueue('CREATE', 'EXPENSE', dbData);
          showToast('Gasto guardado localmente', 'info');
          return;
        }
        showToast(`Error al guardar gasto: ${error?.message || 'desconocido'}`, 'error');
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses', userId] }) 
  }).mutateAsync;

  const updateExpense = useMutation({ 
    mutationFn: async (e: Expense) => { 
      const activeId = await getValidUserId();
      if (!activeId) throw new Error("No auth");
      const dbData = mappers.expense.toDb(e, activeId);
      try {
        const { error } = await withRetry(() => supabase.from('expenses').update(dbData).eq('id', e.id)); 
        if(error) throw error; 
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('UPDATE', 'EXPENSE', dbData);
          showToast('Cambios guardados localmente', 'info');
          return;
        }
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses', userId] }) 
  }).mutateAsync;

  const deleteExpense = useMutation({ 
    mutationFn: async (id: string) => { 
      try {
        const { error } = await withRetry(() => supabase.from('expenses').delete().eq('id', id)); 
        if(error) throw error; 
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('DELETE', 'EXPENSE', { id });
          showToast('Eliminación pendiente', 'info');
          return;
        }
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses', userId] }) 
  }).mutateAsync;

  const addSupply = useMutation({ 
    mutationFn: async (s: SupplyPurchase) => { 
      const activeId = await getValidUserId();
      if (!activeId) throw new Error("No auth");
      const currentRate = settingsQ.data?.exchangeRate || 1; 
      const supplyWithRate = { ...s, exchangeRate: s.exchangeRate || currentRate }; 
      const dbData = mappers.supply.toDb(supplyWithRate, activeId);
      try {
        const { error } = await withRetry(() => supabase.from('supplies').insert([dbData])); 
        if(error) throw error; 
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('CREATE', 'SUPPLY', dbData);
          showToast('Compra guardada localmente', 'info');
          return;
        }
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['supplies', userId] }) 
  }).mutateAsync;

  const updateSupply = useMutation({ 
    mutationFn: async (s: SupplyPurchase) => { 
      const activeId = await getValidUserId();
      if (!activeId) throw new Error("No auth");
      const dbData = mappers.supply.toDb(s, activeId);
      try {
        const { error } = await withRetry(() => supabase.from('supplies').update(dbData).eq('id', s.id)); 
        if(error) throw error; 
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('UPDATE', 'SUPPLY', dbData);
          showToast('Cambios guardados localmente', 'info');
          return;
        }
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['supplies', userId] }) 
  }).mutateAsync;

  const deleteSupply = useMutation({ 
    mutationFn: async (id: string) => { 
      try {
        const { error } = await withRetry(() => supabase.from('supplies').delete().eq('id', id)); 
        if(error) throw error; 
      } catch (error) {
        if (isNetworkError(error)) {
          await addToSyncQueue('DELETE', 'SUPPLY', { id });
          showToast('Eliminación pendiente', 'info');
          return;
        }
        throw error;
      }
    }, 
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['supplies', userId] }) 
  }).mutateAsync;

  // addSale (legacy) fue eliminado de acá: era código muerto (DataContext
  // usa saleActions.addSale de useSales.ts) y además tenía un bug real —
  // leía `store.clients` (Zustand), que nunca se llena desde que los
  // clientes se migraron a un hook modular, así que `clientName` siempre
  // caía al fallback 'Cliente'. La sincronización de perfiles que hacía
  // este bloque ahora vive en la RPC `create_sale_with_sync`.

  const addProfileHistory = async (h: ProfileHistoryEntry) => { 
    try { 
      const activeId = await getValidUserId();
      if (!activeId) return;
      const { error } = await withRetry(() => supabase.from('profile_history').insert([mappers.profileHistory.toDb(h, activeId)])); 
      if (error) throw error; 
    } catch(e) { 
      console.error(e); 
    } 
  };
  const getProfileHistory = async (accountId: string): Promise<ProfileHistoryEntry[]> => { try { const { data, error } = await withRetry(() => supabase.from('profile_history').select('id, user_id, account_id, profile_name, client_name, pin, action_type, created_at, notes').eq('account_id', accountId).order('created_at', { ascending: false })); if(error) throw error; return data.map(mappers.profileHistory.fromDb); } catch (e) { console.error(e); return []; } };
  // Antes: insertaba el movimiento y LUEGO leía el balance actual desde
  // Zustand (que podía estar desactualizado) para calcular y guardar el
  // nuevo balance en una segunda llamada separada — no atómico. Ahora es
  // una sola RPC transaccional.
  const executeTransaction = async (movement: Movement) => {
    const activeId = await getValidUserId();
    if (!activeId) return;
    const { error } = await withRetry(() =>
      supabase.rpc('execute_single_movement', { p_movement: mappers.movement.toDb(movement, activeId) })
    );
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['movements', userId] });
    queryClient.invalidateQueries({ queryKey: ['financial_accounts', userId] });
  };
  // Antes: 4 llamadas HTTP secuenciales desde el cliente (insertar movimiento
  // salida, actualizar balance origen, insertar movimiento entrada,
  // actualizar balance destino) — si se cortaba la conexión a mitad de
  // camino, quedaba el dinero "salido" de una cuenta sin haber "entrado" a
  // la otra. Ahora es una sola RPC transaccional (ver supabase/migrations).
  const executeTransfer = async (originId: string, destId: string, amount: number, rate: number, description: string) => {
    const { error } = await withRetry(() =>
      supabase.rpc('execute_transfer', {
        p_origin_id: originId,
        p_dest_id: destId,
        p_amount: amount,
        p_rate: rate,
        p_description: description,
      })
    );
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['financial_accounts', userId] });
    queryClient.invalidateQueries({ queryKey: ['movements', userId] });
  };
  // recalculateBalance ahora usa una RPC transaccional (sum() en el propio
  // Postgres) en vez de traer TODO el historial de movimientos al cliente
  // para sumarlo en JS. Ver supabase/migrations para la función `recalculate_account_balance`.
  const recalculateBalance = async (accountId: string) => {
    const { error } = await withRetry(() => supabase.rpc('recalculate_account_balance', { p_account_id: accountId }));
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['financial_accounts', userId] });
  };

  // NOTA: getSummaryForPeriod se movió a DataContext.tsx.
  // Antes vivía acá y filtraba `store.sales` (el array de Zustand), que
  // desde que las ventas se migraron a useSales.ts (hook modular) YA NO SE
  // LLENA NUNCA — quedó en `[]` para siempre. Efecto real en producción:
  // el "Resumen financiero" (FinancialSummaryCard y la pestaña Cuentas)
  // mostraba ingresos en $0 sin importar las ventas reales que hubiera.
  
  const exportData = async () => { if (!userId) return; };

  const isLoading = 
    financialAccountsQ.isLoading || 
    movementsQ.isLoading || 
    settingsQ.isLoading ||
    resellersQ.isLoading ||
    providersQ.isLoading ||
    payableExpensesQ.isLoading ||
    expensesQ.isLoading;
  const loadMoreSales = async () => { /* Handled by useSales */ };

  return {
    serviceFailures: serviceFailuresQ.data || [],
    addFailure,
    deleteFailure,
    // services/accounts/clients/sales: manejados por hooks modulares
    // (useInventory, useClients, useSales) — DataContext.tsx los consume
    // de ahí directamente, no de acá.
    financialAccounts: financialAccountsQ.data || [],
    movements: movementsQ.data || [],
    resellers: resellersQ.data || [],
    providers: providersQ.data || [],
    settings: settingsQ.data || DEFAULT_SETTINGS,
    payableExpenses: payableExpensesQ.data || [],
    expenses: expensesQ.data || [],
    supplies: suppliesQ.data || [],
    activityLogs: activityLogsQ.data || [],
    expenseCategories: expenseCategoriesQ.data || [], 
    
    isLoading,
    addFinancialAccount, updateFinancialAccount, deleteFinancialAccount,
    executeTransaction,
    executeTransfer,
    recalculateBalance,
    exportData,
    
    reconcileMovement,
    addCategory,
    updateCategory,
    deleteCategory,
    // Fix: Exporting missing properties to satisfy DataContext.tsx requirements
    addProfileHistory,
    getProfileHistory,
    logAction: logInternal,
    updateSettings,
    deleteMovement,
    addReseller,
    updateReseller,
    deleteReseller,
    addProvider,
    updateProvider,
    deleteProvider,
    addPayable,
    updatePayable,
    deletePayable,
    addExpense,
    updateExpense,
    deleteExpense,
    addSupply,
    updateSupply,
    deleteSupply,
  };
};
