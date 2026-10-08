
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';

import { Sale, Account } from '../../types';
import { getDaysRemaining, calculateProfit } from '../../utils/expiredUtils';
import { groupSalesByClientAndDate } from '../../utils/salesUtils';
import { useToast } from '../../context/ToastContext';
import { addTime, getLocalDateISO } from '../../utils/contactosUtils';

// Modules
// #10: ExpiredDesktop era un wrapper trivial — unificado a ExpiredMobile.
import ExpiredMobile from '../../modules/mobile/expired/ExpiredMobile';

// Modals
import RenewModal from '../../components/sales/RenewModal';
import AccountRenewModal from '../../components/inventario/AccountRenewModal';
import SaleDetailPage from '../../components/sales/SaleDetailPage';
import CuentaDetailModal from '../../components/inventario/CuentaDetailModal';
import CuentaModal from '../../components/inventario/CuentaModal';
import FailureAgendaModal from '../../components/inventario/FailureAgendaModal';
import { generateUUID } from '../../utils/uuid';

interface ExpiredPageProps {
  onBack?: () => void;
}

const ExpiredPage: React.FC<ExpiredPageProps> = ({ onBack }) => {
  
  const { sales, clients, services, accounts, providers, resellers, settings, deleteSale, updateSale, deleteAccount, updateAccount, addFailure, pendingAction, setPendingAction } = useData();
  const { showToast, showUndo } = useToast();

  // --- GLOBAL STATE ---
  const [activeTab, setActiveTab] = useState<'sales' | 'inventory'>('sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterService, setFilterService] = useState('all');

  // --- MODAL STATE ---
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [salesToRenew, setSalesToRenew] = useState<Sale[]>([]);
  
  const [isAccountRenewModalOpen, setIsAccountRenewModalOpen] = useState(false);
  const [accountToRenew, setAccountToRenew] = useState<Account | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  // --- MODAL DE CUENTA (Stock) ---
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isAccountDetailOpen, setIsAccountDetailOpen] = useState(false);
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [isFailureAgendaOpen, setIsFailureAgendaOpen] = useState(false);

  // --- DELETE STATE ---
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null); // For single sale delete inside details
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // ==========================================
  // PENDING ACTION HANDLER (Auto-Open Renewals)
  // ==========================================
  useEffect(() => {
    if (pendingAction && pendingAction.type === 'OPEN_RENEWAL') {
       // Search for the client group
       const targetClientId = pendingAction.targetId;
       
       // Construct group logic (similar to hook or util)
       const client = clients.find(c => c.id === targetClientId);
       if (client) {
           const clientSales = sales.filter(s => s.clientId === targetClientId);
           
           // Strategy: Find expired sales for this client and open renewal modal directly
           const expiredForClient = clientSales.filter(s => getDaysRemaining(s.expiryDate) <= 3);
           
           if (expiredForClient.length > 0) {
               setSalesToRenew(expiredForClient);
               setIsRenewModalOpen(true);
               // Also set active tab to sales just in case
               setActiveTab('sales');
           } else {
               // Fallback: Open detail sheet
               const reseller = client.resellerId ? resellers.find(r => r.id === client.resellerId) : undefined;
               const group = {
                   clientId: client.id,
                   clientName: client.name,
                   clientPhone: client.phone,
                   clientTelegram: client.telegram,
                   reseller,
                   renewalGroups: [] // Simplified for now, detail page re-calculates
               };
               setSelectedGroup(group);
               setIsDetailOpen(true);
           }
       }
       
       // Clear action
       setPendingAction(null);
    }
  }, [pendingAction, clients, sales, resellers, setPendingAction]);


  // ==========================================
  // LOGIC 1: SALES (CLIENTS)
  // ==========================================
  
  const warningDays = settings.salesPreferences?.warningDays ?? 2;

  const expiredSales = useMemo(() => {
    let result = sales.filter(sale => {
       const days = getDaysRemaining(sale.expiryDate);
       // Usa el umbral configurado en Configuración > Preferencia de Venta
       return days <= warningDays; 
    });
    return result;
  }, [sales, warningDays]);

  const groupedSales = useMemo(() => {
     let groups = groupSalesByClientAndDate(expiredSales, clients, resellers);
     
     if (searchQuery) {
        const lowerQ = searchQuery.toLowerCase();
        groups = groups.filter(g => 
           g.clientName.toLowerCase().includes(lowerQ) || 
           g.reseller?.name.toLowerCase().includes(lowerQ)
        );
     }
     
     // Ordenar por urgencia
     return groups.sort((a, b) => {
        const minA = Math.min(...a.renewalGroups.flatMap(g => g.sales).map(s => getDaysRemaining(s.expiryDate)));
        const minB = Math.min(...b.renewalGroups.flatMap(g => g.sales).map(s => getDaysRemaining(s.expiryDate)));
        return minA - minB;
     });
  }, [expiredSales, clients, resellers, searchQuery]);

  // "Por cobrar" = lo que vence hoy o pronto. Lo ya vencido se muestra aparte
  // (muchos vencidos son renovaciones que te tocan a ti, no deudas del cliente).
  const { totalRevenue, totalProfit, overdueRevenue, overdueCount } = useMemo(() => {
    return expiredSales.reduce((acc, sale) => {
       const svc = services.find(s => s.name === sale.serviceName);
       if (getDaysRemaining(sale.expiryDate) < 0) {
          acc.overdueRevenue += sale.amount || 0;
          acc.overdueCount += 1;
       } else {
          acc.totalRevenue += sale.amount || 0;
          acc.totalProfit += calculateProfit(sale, svc);
       }
       return acc;
    }, { totalRevenue: 0, totalProfit: 0, overdueRevenue: 0, overdueCount: 0 });
  }, [expiredSales, services]);

  // ==========================================
  // LOGIC 1B: RENOVAR CUENTA (planes prepagados)
  // El cliente ya pagó (expiryDate = "pagado hasta"); aquí solo se te recuerda
  // renovar la cuenta. Si "pagado hasta" ya está por vencer, la venta sale
  // arriba como cobro normal y no se duplica aquí.
  // ==========================================
  const groupedRenewals = useMemo(() => {
     const due = sales.filter(s =>
        s.isPrepaid && !!s.renewalDate &&
        getDaysRemaining(s.renewalDate) <= warningDays &&
        getDaysRemaining(s.expiryDate) > warningDays
     );
     let groups = groupSalesByClientAndDate(due, clients, resellers);
     if (searchQuery) {
        const lowerQ = searchQuery.toLowerCase();
        groups = groups.filter(g => g.clientName.toLowerCase().includes(lowerQ) || g.reseller?.name.toLowerCase().includes(lowerQ));
     }
     const minRenewal = (g: typeof groups[number]) =>
        Math.min(...g.renewalGroups.flatMap(rg => rg.sales).map(s => getDaysRemaining(s.renewalDate || s.expiryDate)));
     return groups.sort((a, b) => minRenewal(a) - minRenewal(b));
  }, [sales, clients, resellers, searchQuery, warningDays]);

  // "Ya renové": mueve la próxima renovación (hoy o la fecha prevista, la que sea más tarde) + N meses.
  const handleMarkRenewed = async (renewedSales: Sale[]) => {
    const today = getLocalDateISO();
    const previous = renewedSales.map(s => ({ ...s }));
    try {
      let nextLabel = '';
      for (const sale of renewedSales) {
        const current = (sale.renewalDate || '').split('T')[0];
        const base = current && current > today ? current : today;
        const next = addTime(base, sale.renewEveryMonths || 1, 0);
        nextLabel = next.split('-').reverse().join('/');
        await updateSale({ ...sale, renewalDate: next });
      }
      showUndo(`Cuenta renovada · próxima: ${nextLabel}`, async () => {
        try {
          for (const prev of previous) await updateSale(prev);
        } catch {
          showToast('No se pudo deshacer', 'error');
        }
      });
    } catch {
      showToast('No se pudo registrar la renovación', 'error');
    }
  };

  // ==========================================
  // LOGIC 2: INVENTORY (ACCOUNTS)
  // ==========================================

  const expiredAccounts = useMemo(() => {
    let result = accounts.filter(acc => {
       if (acc.status === 'inactiva') return false;
       const days = getDaysRemaining(acc.endDate);
       // Usa el mismo umbral configurado en Configuración > Preferencia de Venta
       return days <= warningDays; 
    });

    if (searchQuery) {
       result = result.filter(a => a.email.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (filterService !== 'all') {
       const svc = services.find(s => s.name === filterService);
       if (svc) result = result.filter(a => a.serviceId === svc.id);
    }

    return result.sort((a, b) => getDaysRemaining(a.endDate) - getDaysRemaining(b.endDate));
  }, [accounts, searchQuery, services, filterService, warningDays]);

  const uniqueInventoryServices = useMemo(() => {
     const ids = new Set(accounts.map(a => a.serviceId));
     return services.filter(s => ids.has(s.id)).map(s => s.name).sort();
  }, [accounts, services]);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleRenewSale = (salesGroup: Sale[]) => {
    setSalesToRenew(salesGroup);
    setIsRenewModalOpen(true);
  };

  const handleRenewAccount = (acc: Account) => {
    setAccountToRenew(acc);
    setIsAccountRenewModalOpen(true);
  };

  const handleAccountClick = (acc: Account) => {
    setSelectedAccount(acc);
    setIsAccountDetailOpen(true);
  };

  const handleAccountFormSubmit = async (data: Partial<Account>) => {
    if (!selectedAccount) return;
    try {
      await updateAccount({ ...selectedAccount, ...data } as Account);
      showToast('Cuenta actualizada', 'success');
      setIsAccountFormOpen(false);
    } catch {
      showToast('Error al guardar datos', 'error');
    }
  };

  const handleConfirmFailureReport = async (addToAgenda: boolean) => {
    if (!selectedAccount || selectedAccount.status === 'fallando') return;
    try {
      await updateAccount({ ...selectedAccount, status: 'fallando', failure_started_at: new Date().toISOString() });
      if (addToAgenda) {
        const todayStr = new Date().toISOString().split('T')[0];
        const activeSales = sales.filter(s => s.accountId === selectedAccount.id && s.expiryDate >= todayStr);
        for (const sale of activeSales) {
          await addFailure({
            id: generateUUID(),
            userId: '',
            saleId: sale.id,
            notes: `Falla masiva reportada en cuenta ${selectedAccount.email}`,
            createdAt: new Date().toISOString()
          });
        }
        showToast(`Falla reportada y ${activeSales.length} clientes agregados a la agenda`, 'success');
      } else {
        showToast('Falla reportada correctamente', 'info');
      }
    } catch {
      showToast('Error al procesar reporte', 'error');
    } finally {
      setIsFailureAgendaOpen(false);
      setIsAccountDetailOpen(false);
    }
  };

  const handleDeleteAccountRequest = (acc: Account) => {
    setAccountToDelete(acc);
  };

  const confirmDeleteAccount = () => {
    if (accountToDelete) {
      deleteAccount(accountToDelete.id);
      showToast('Cuenta de inventario eliminada', 'success');
      setAccountToDelete(null);
    }
  };

  const handleDeleteSingleSale = (id: string) => {
     deleteSale(id);
     showToast('Venta eliminada', 'success');
  };

  const handleCardClick = (group: any) => {
     setSelectedGroup(group);
     setIsDetailOpen(true);
  };

  const sharedProps = {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    groupedSales,
    expiredAccounts,
    totalRevenue,
    totalProfit,
    overdueRevenue,
    overdueCount,
    groupedRenewals,
    onMarkRenewed: handleMarkRenewed,
    currency: settings.currency,
    onRenewSale: handleRenewSale,
    onRenewAccount: handleRenewAccount,
    onDeleteAccount: handleDeleteAccountRequest,
    onAccountClick: handleAccountClick,
    onCardClick: handleCardClick,
    filterService,
    setFilterService,
    servicesList: uniqueInventoryServices,
    providers,
    services,
    onBack
  };

  return (
    <>
      <ExpiredMobile {...sharedProps} />

      {/* --- SHARED MODALS --- */}
      
      <RenewModal 
         isOpen={isRenewModalOpen} 
         onClose={() => setIsRenewModalOpen(false)} 
         salesToRenew={salesToRenew} 
      />

      {accountToRenew && (
         <AccountRenewModal
            isOpen={isAccountRenewModalOpen}
            onClose={() => { setIsAccountRenewModalOpen(false); setAccountToRenew(null); }}
            accounts={[accountToRenew]}
            serviceName={services.find(s => s.id === accountToRenew.serviceId)?.name || 'Servicio'}
         />
      )}

      <SaleDetailPage 
         isOpen={isDetailOpen}
         onClose={() => setIsDetailOpen(false)}
         group={selectedGroup}
         onEdit={() => {}} 
         onDelete={handleDeleteSingleSale}
      />

      <CuentaDetailModal
        isOpen={isAccountDetailOpen}
        onClose={() => setIsAccountDetailOpen(false)}
        account={selectedAccount}
        onEdit={() => { setIsAccountDetailOpen(false); setIsAccountFormOpen(true); }}
        onRenew={(acc) => { setIsAccountDetailOpen(false); handleRenewAccount(acc); }}
        onToggleStatus={(acc) => {
          const isPaused = acc.status === 'inactiva';
          updateAccount({ ...acc, status: isPaused ? 'activa' : 'inactiva' });
          showToast(isPaused ? 'Cuenta activada' : 'Cuenta pausada', 'info');
        }}
        onToggleFailure={(acc) => {
          if (acc.status === 'fallando') {
            updateAccount({ ...acc, status: 'activa', failure_started_at: undefined });
            showToast('Falla resuelta', 'info');
          } else {
            setSelectedAccount(acc);
            setIsFailureAgendaOpen(true);
          }
        }}
        onDelete={(id) => {
          const acc = accounts.find(a => a.id === id);
          if (acc) { setIsAccountDetailOpen(false); setAccountToDelete(acc); }
        }}
      />

      <FailureAgendaModal
        isOpen={isFailureAgendaOpen}
        onClose={() => setIsFailureAgendaOpen(false)}
        account={selectedAccount}
        onConfirm={handleConfirmFailureReport}
      />

      <CuentaModal
        isOpen={isAccountFormOpen}
        onClose={() => setIsAccountFormOpen(false)}
        onSubmit={handleAccountFormSubmit}
        serviceId={selectedAccount?.serviceId ?? null}
        services={services}
        initialData={selectedAccount}
      />

      {/* DELETE ACCOUNT CONFIRMATION */}
      <ConfirmDialog
        isOpen={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        onConfirm={confirmDeleteAccount}
        title="Eliminar Cuenta"
        message={<>Se eliminará la cuenta <strong className="text-text-primary">{accountToDelete?.email}</strong> del inventario. Perderás el historial.</>}
        confirmLabel="Eliminar"
        tone="danger"
      />

    </>
  );
};

export default ExpiredPage;
