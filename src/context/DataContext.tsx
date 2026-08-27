
import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { Service, Account, Client, Sale, FinancialAccount, Movement, Reseller, AppSettings, PayableExpense, Provider, Expense, SupplyPurchase, FinancialSummary, ActivityLog, LogAction, LogEntity, AppNotification, PendingAction, ProfileHistoryEntry, ExpenseCategory, ServiceFailure } from '../types';
import { useAuth } from './AuthContext';
import { useSystemNotifications } from '../hooks/useSystemNotifications';
import { generateUUID } from '../utils/uuid';
import { addTime } from '../utils/contactosUtils';
import { useToast } from './ToastContext';
import { supabase } from '../supabaseClient';
import { useQueryClient } from '@tanstack/react-query';

// Import New Modular Hooks
import { useClients } from '../hooks/queries/useClients';
import { useSales } from '../hooks/queries/useSales';
import { useInventory } from '../hooks/queries/useInventory';
import { useSupabaseData } from '../hooks/useSupabaseData'; 
import { backupService } from '../services/backupService';
import { tryPatchRealtimeEvent } from '../hooks/queries/realtimePatch';

interface DataContextType {
  serviceFailures: ServiceFailure[];
  addFailure: (f: ServiceFailure) => Promise<void>;
  deleteFailure: (id: string) => Promise<void>;
  services: Service[];
  accounts: Account[];
  clients: Client[];
  sales: Sale[];
  financialAccounts: FinancialAccount[];
  movements: Movement[];
  resellers: Reseller[];
  providers: Provider[]; 
  settings: AppSettings;
  payableExpenses: PayableExpense[];
  expenses: Expense[];
  supplies: SupplyPurchase[];
  activityLogs: ActivityLog[];
  expenseCategories: ExpenseCategory[]; 
  
  notifications: AppNotification[];
  pendingAction: PendingAction | null;
  setPendingAction: (action: PendingAction | null) => void;
  
  addService: (s: Service) => Promise<void>;
  updateService: (s: Service) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  
  addAccount: (a: Account) => Promise<void>;
  updateAccount: (a: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  
  addClient: (c: Client) => Promise<boolean>; 
  updateClient: (c: Client) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  regeneratePortalToken: (clientId: string) => Promise<string>;
  
  addSale: (s: Sale) => Promise<boolean>; 
  deleteSale: (id: string) => Promise<void>;
  updateSale: (s: Sale) => Promise<boolean>;
  
  addFinancialAccount: (f: FinancialAccount) => void;
  updateFinancialAccount: (f: FinancialAccount) => void;
  deleteFinancialAccount: (id: string) => void;
  executeTransaction: (movement: Movement) => void;
  executeTransfer: (originId: string, destId: string, balance: number, rate: number, description: string) => void;
  deleteMovement: (id: string) => void; 
  recalculateBalance: (accountId: string) => void; 
  reconcileMovement: (id: string) => Promise<void>; 

  addPayable: (p: PayableExpense) => void;
  deletePayable: (id: string) => void;
  updatePayable: (p: PayableExpense) => void;

  addReseller: (r: Reseller) => void;
  updateReseller: (r: Reseller) => void;
  deleteReseller: (id: string, strategy: 'delete_clients' | 'unlink') => void;

  addProvider: (p: Provider) => void;
  updateProvider: (p: Provider) => void;
  deleteProvider: (id: string, strategy: 'delete_accounts' | 'unlink') => void;

  addExpense: (e: Expense) => void;
  updateExpense: (e: Expense) => void;
  deleteExpense: (id: string) => void;
  addSupply: (s: SupplyPurchase) => void;
  updateSupply: (s: SupplyPurchase) => void;
  deleteSupply: (id: string) => void;
  
  addCategory: (c: ExpenseCategory) => Promise<void>; 
  updateCategory: (c: ExpenseCategory) => Promise<void>; 
  deleteCategory: (id: string) => Promise<void>; 

  updateSettings: (s: AppSettings) => void;
  getSummaryForPeriod: (period: 'day' | 'week' | 'month' | 'year') => FinancialSummary;
  
  logAction: (action: LogAction, entity: LogEntity, details: string) => void;
  exportData: () => Promise<void>; 

  addProfileHistory: (h: ProfileHistoryEntry) => Promise<void>;
  getProfileHistory: (accountId: string) => Promise<ProfileHistoryEntry[]>;

  loadMoreSales: () => Promise<void>;
  hasMoreSales: boolean;
  isSalesLoading: boolean;
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const clientActions = useClients();
  const saleActions = useSales();
  const inventoryActions = useInventory();
  const dbLegacy = useSupabaseData(user?.id);

  const notifications = useSystemNotifications(inventoryActions.accounts, saleActions.sales, dbLegacy.payableExpenses, clientActions.clients, inventoryActions.services);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // --- REAL-TIME SUBSCRIPTION LOGIC (con reconexión robusta) ---
  useEffect(() => {
    if (!user?.id) return;

    const tables = [
      'sales', 'clients', 'accounts', 'movements', 'services',
      'resellers', 'providers', 'expenses', 'payable_expenses',
      'expense_categories', 'financial_accounts'
    ];

    const debounceTimers: Record<string, NodeJS.Timeout> = {};
    let channels: ReturnType<typeof supabase.channel>[] = [];
    let resubscribeTimer: NodeJS.Timeout | null = null;
    let mounted = true;

    // Solo se usa como red de seguridad: si el patch quirúrgico falla (tabla
    // sin mapper, forma de dato inesperada, etc.), caemos al invalidate
    // completo de antes, pero eso ya no es el camino feliz.
    const invalidateFallback = (table: string) => {
      const queryKey = table;
      if (debounceTimers[queryKey]) clearTimeout(debounceTimers[queryKey]);
      debounceTimers[queryKey] = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [queryKey, user.id] });
      }, 1500);
    };

    const setup = () => {
      if (!mounted) return;
      // Limpia canales viejos antes de re-suscribir
      channels.forEach(ch => { try { supabase.removeChannel(ch); } catch {} });
      channels = tables.map(table =>
        supabase
          .channel(`realtime:${table}:${user.id}:${Date.now()}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table, filter: `user_id=eq.${user.id}` },
            (payload: any) => {
              // Camino feliz: parcheamos la fila puntual en la cache, sin
              // volver a pedir la tabla completa a Supabase.
              const patched = tryPatchRealtimeEvent(
                queryClient,
                table,
                user.id,
                payload.eventType,
                { new: payload.new, old: payload.old }
              );
              if (!patched) invalidateFallback(table);
            },
          )
          .subscribe((status) => {
            // #5: Reconexión automática si el canal se cae o expira
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              if (!mounted) return;
              if (resubscribeTimer) return; // ya hay un retry programado
              console.warn(`[Realtime] ${table} status=${status}, re-suscribiendo en 5s...`);
              resubscribeTimer = setTimeout(() => {
                resubscribeTimer = null;
                // Invalida todo para recuperar el estado perdido durante la desconexión
                tables.forEach(t => queryClient.invalidateQueries({ queryKey: [t, user.id] }));
                setup();
              }, 5000);
            }
          })
      );
    };

    setup();

    return () => {
      mounted = false;
      if (resubscribeTimer) clearTimeout(resubscribeTimer);
      Object.values(debounceTimers).forEach(t => clearTimeout(t));
      channels.forEach(ch => { try { supabase.removeChannel(ch); } catch {} });
    };
  }, [user?.id, queryClient]);

  const autoRenewedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (dbLegacy.isLoading || !user || !inventoryActions.accounts.length) return;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    const accountsToAutoRenew = inventoryActions.accounts.filter((acc: any) => 
      acc.autoRenewal === true && acc.endDate <= todayStr && acc.status !== 'inactiva' && acc.status !== 'trash' && !autoRenewedRef.current.has(acc.id)
    );

    if (accountsToAutoRenew.length > 0) {
      accountsToAutoRenew.forEach(async (acc: any) => {
        autoRenewedRef.current.add(acc.id);
        const nextDate = addTime(acc.endDate, 1, 0);
        try {
            await inventoryActions.updateAccount.mutateAsync({
                ...acc,
                endDate: nextDate,
                status: 'activa',
                notes: (acc.notes || '') + `\n[SISTEMA: Renovada automáticamente 1 mes -> ${nextDate}]`
            });
            showToast(`Cuenta ${acc.email} renovada automáticamente`, 'success');
        } catch (e: any) {
            autoRenewedRef.current.delete(acc.id);
        }
      });
    }
  }, [inventoryActions.accounts, dbLegacy.isLoading, user, inventoryActions.updateAccount, showToast]);

  const loadMoreSales = async () => {
    if (saleActions.hasNextPage && !saleActions.isFetchingNextPage) {
       await saleActions.fetchNextPage();
    }
  };

  // --- AUTO-BACKUP LOGIC ---
  useEffect(() => {
    const checkAndBackup = async () => {
      if (!user?.id || !dbLegacy.settings.backupPreferences?.autoBackup || dbLegacy.isLoading) return;
      
      const prefs = dbLegacy.settings.backupPreferences;
      const last = prefs.lastBackup ? new Date(prefs.lastBackup) : new Date(0);
      const now = new Date();
      
      let intervalDays = 7; // Weekly by default
      if (prefs.frequency === 'daily') intervalDays = 1;
      if (prefs.frequency === 'monthly') intervalDays = 30;
      
      const diffMs = now.getTime() - last.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      
      if (diffDays >= intervalDays) {
         console.log(`[AutoBackup] Prompting user for ${prefs.frequency} backup...`);
         
         const handleAutoBackupDownload = async () => {
            try {
               await backupService.exportData(user.id);
               dbLegacy.updateSettings({
                  ...dbLegacy.settings,
                  backupPreferences: {
                     ...prefs,
                     lastBackup: now.toISOString()
                  }
               });
               showToast('Respaldo completado', 'success');
            } catch (e) {
               console.error('Manual backup from auto-trigger failed:', e);
               showToast('Error al generar respaldo', 'error');
            }
         };

         showToast(
            '¡Es hora de realizar tu respaldo periódico! Toca para descargar ahora.', 
            'info', 
            { 
               duration: 10000,
               onClick: handleAutoBackupDownload
            }
         );

         // We mark it even if they don't download, or should we wait?
         // User wants one notification per period. 
         // Let's mark it as prompted to avoid spamming every refresh.
         dbLegacy.updateSettings({
            ...dbLegacy.settings,
            backupPreferences: {
               ...prefs,
               lastBackup: now.toISOString() 
            }
         });
      }
    };

    // Delay the check to not interfere with initial load
    const timer = setTimeout(checkAndBackup, 10000);
    return () => clearTimeout(timer);
  }, [user?.id, dbLegacy.settings.backupPreferences, dbLegacy.isLoading, dbLegacy.updateSettings, showToast]);

  // Reemplaza a dbLegacy.getSummaryForPeriod (ver nota en useSupabaseData.ts):
  // usa saleActions.sales, que es la fuente real y actualizada de ventas.
  const getSummaryForPeriod = (period: 'day' | 'week' | 'month' | 'year'): FinancialSummary => {
    const now = new Date();
    let start = new Date();
    if (period === 'day') start.setHours(0, 0, 0, 0);
    else if (period === 'week') start.setDate(now.getDate() - 7);
    else if (period === 'month') start.setDate(1);
    else if (period === 'year') start.setMonth(0, 1);

    const relevantSales = saleActions.sales.filter((s) => new Date(s.date) >= start);
    const relevantExpenses = (dbLegacy.expenses || []).filter((e: any) => new Date(e.date) >= start);
    const relevantSupplies = (dbLegacy.supplies || []).filter((s: any) => new Date(s.date) >= start);

    const income = relevantSales.reduce((sum, s) => sum + (s.amount || 0), 0);
    const expensesTotal = relevantExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    const suppliesTotal = relevantSupplies.reduce((sum: number, s: any) => sum + (s.totalCost || 0), 0);

    return {
      period,
      from: start.toISOString(),
      to: now.toISOString(),
      income,
      expenses: expensesTotal,
      suppliesCost: suppliesTotal,
      fixedCosts: 0,
      netProfit: income - expensesTotal - suppliesTotal,
    };
  };

  const contextValue = useMemo(() => ({
      serviceFailures: dbLegacy.serviceFailures,
      addFailure: dbLegacy.addFailure,
      deleteFailure: dbLegacy.deleteFailure,
      clients: clientActions.clients,
      sales: saleActions.sales,
      accounts: inventoryActions.accounts,
      services: inventoryActions.services,
      providers: inventoryActions.providers,
      financialAccounts: dbLegacy.financialAccounts,
      movements: dbLegacy.movements,
      resellers: dbLegacy.resellers,
      settings: dbLegacy.settings,
      payableExpenses: dbLegacy.payableExpenses,
      expenses: dbLegacy.expenses,
      supplies: dbLegacy.supplies,
      activityLogs: dbLegacy.activityLogs,
      expenseCategories: dbLegacy.expenseCategories,
      notifications,
      pendingAction, 
      setPendingAction,
      addService: async (s: Service) => { await inventoryActions.addService.mutateAsync(s); },
      updateService: async (s: Service) => { await inventoryActions.updateService.mutateAsync(s); },
      deleteService: async (id: string) => { await inventoryActions.deleteService.mutateAsync(id); },
      addAccount: async (a: Account) => { await inventoryActions.addAccount.mutateAsync(a); },
      updateAccount: async (a: Account) => { await inventoryActions.updateAccount.mutateAsync(a); },
      deleteAccount: async (id: string) => { await inventoryActions.deleteAccount.mutateAsync(id); },
      addClient: async (c: Client) => { await clientActions.addClient.mutateAsync(c); return true; },
      updateClient: async (c: Client) => { await clientActions.updateClient.mutateAsync(c); },
      deleteClient: async (id: string) => { await clientActions.deleteClient.mutateAsync(id); },
      regeneratePortalToken: async (id: string) => await clientActions.regeneratePortalToken.mutateAsync(id),
      addSale: async (s: Sale) => { 
          await saleActions.addSale.mutateAsync(s); 
          if (s.assignedProfiles && s.assignedProfiles.length > 0) {
             s.assignedProfiles.forEach(p => {
                if (p.name && p.name !== 'Disponible') {
                    const clientName = clientActions.clients.find((c: any) => c.id === s.clientId)?.name;
                    dbLegacy.addProfileHistory({
                        id: generateUUID(), userId: user?.id || '', accountId: s.accountId,
                        profileName: p.name, clientName: clientName || 'Cliente',
                        pin: p.pin, actionType: 'ASSIGNED', createdAt: new Date().toISOString()
                    });
                }
             });
          }
          dbLegacy.logAction('CREATE', 'SALE', `Venta registrada: ${s.serviceName}`);
          return true; 
      },
      deleteSale: async (id: string) => { await saleActions.deleteSale.mutateAsync(id); },
      updateSale: async (s: Sale) => { await saleActions.updateSale.mutateAsync(s); return true; },
      addFinancialAccount: dbLegacy.addFinancialAccount,
      updateFinancialAccount: dbLegacy.updateFinancialAccount,
      deleteFinancialAccount: dbLegacy.deleteFinancialAccount,
      executeTransaction: dbLegacy.executeTransaction,
      executeTransfer: dbLegacy.executeTransfer,
      deleteMovement: dbLegacy.deleteMovement,
      recalculateBalance: dbLegacy.recalculateBalance,
      reconcileMovement: dbLegacy.reconcileMovement,
      addReseller: dbLegacy.addReseller,
      updateReseller: dbLegacy.updateReseller,
      deleteReseller: dbLegacy.deleteReseller,
      addProvider: dbLegacy.addProvider,
      updateProvider: dbLegacy.updateProvider,
      deleteProvider: dbLegacy.deleteProvider,
      addPayable: dbLegacy.addPayable,
      updatePayable: dbLegacy.updatePayable,
      deletePayable: dbLegacy.deletePayable,
      addExpense: dbLegacy.addExpense,
      updateExpense: dbLegacy.updateExpense,
      deleteExpense: dbLegacy.deleteExpense,
      addSupply: dbLegacy.addSupply,
      updateSupply: dbLegacy.updateSupply,
      deleteSupply: dbLegacy.deleteSupply,
      addCategory: dbLegacy.addCategory,
      updateCategory: dbLegacy.updateCategory,
      deleteCategory: dbLegacy.deleteCategory,
      updateSettings: dbLegacy.updateSettings,
      getSummaryForPeriod,
      logAction: dbLegacy.logAction,
      exportData: dbLegacy.exportData,
      addProfileHistory: dbLegacy.addProfileHistory,
      getProfileHistory: dbLegacy.getProfileHistory,
      loadMoreSales, 
      hasMoreSales: !!saleActions.hasNextPage,
      isSalesLoading: saleActions.isFetchingNextPage,
      // Critical loading state: Only wait for settings and core financial data
      // Sales and Clients can load in the background or show partial data
      isLoading: dbLegacy.isLoading || inventoryActions.isLoading || saleActions.isLoading
  }), [
      // #2: deps por campo (no por objeto) → evita rebuild del context value en cada render.
      // Las acciones (mutateAsync, callbacks) son referencias estables; sólo dependemos de datos.
      dbLegacy.serviceFailures, dbLegacy.financialAccounts, dbLegacy.movements,
      dbLegacy.resellers, dbLegacy.settings, dbLegacy.payableExpenses,
      dbLegacy.expenses, dbLegacy.supplies, dbLegacy.activityLogs, dbLegacy.expenseCategories,
      clientActions.clients, saleActions.sales, saleActions.hasNextPage, saleActions.isFetchingNextPage, saleActions.isLoading,
      inventoryActions.accounts, inventoryActions.services, inventoryActions.providers, inventoryActions.isLoading,
      dbLegacy.isLoading,
      notifications, pendingAction, user?.id,
  ]);

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
