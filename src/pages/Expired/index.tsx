
import React, { useMemo, useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';

import { Sale, Account } from '../../types';
import { getDaysRemaining, calculateProfit } from '../../utils/expiredUtils';
import { groupSalesByClientAndDate } from '../../utils/salesUtils';
import { useToast } from '../../context/ToastContext';

// Modules
// #10: ExpiredDesktop era un wrapper trivial — unificado a ExpiredMobile.
import ExpiredMobile from '../../modules/mobile/expired/ExpiredMobile';

// Modals
import RenewModal from '../../components/sales/RenewModal';
import AccountRenewModal from '../../components/inventario/AccountRenewModal';
import SaleDetailPage from '../../components/sales/SaleDetailPage';
import Modal from '../../components/ui/Modal';
import { Trash2 } from 'lucide-react';

interface ExpiredPageProps {
  onBack?: () => void;
}

const ExpiredPage: React.FC<ExpiredPageProps> = ({ onBack }) => {
  
  const { sales, clients, services, accounts, providers, resellers, settings, deleteSale, deleteAccount, pendingAction, setPendingAction } = useData();
  const { showToast } = useToast();

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
  
  const expiredSales = useMemo(() => {
    let result = sales.filter(sale => {
       const days = getDaysRemaining(sale.expiryDate);
       // Adjusted rule: Show clients when they have 1 day or less remaining
       return days <= 1; 
    });
    return result;
  }, [sales]);

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

  const { totalRevenue, totalProfit } = useMemo(() => {
    return expiredSales.reduce((acc, sale) => {
       const svc = services.find(s => s.name === sale.serviceName);
       acc.totalRevenue += sale.amount || 0;
       acc.totalProfit += calculateProfit(sale, svc);
       return acc;
    }, { totalRevenue: 0, totalProfit: 0 });
  }, [expiredSales, services]);

  // ==========================================
  // LOGIC 2: INVENTORY (ACCOUNTS)
  // ==========================================

  const expiredAccounts = useMemo(() => {
    let result = accounts.filter(acc => {
       if (acc.status === 'inactiva') return false;
       const days = getDaysRemaining(acc.endDate);
       // Adjusted rule: Show stock when 2 days or less remaining
       return days <= 2; 
    });

    if (searchQuery) {
       result = result.filter(a => a.email.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (filterService !== 'all') {
       const svc = services.find(s => s.name === filterService);
       if (svc) result = result.filter(a => a.serviceId === svc.id);
    }

    return result.sort((a, b) => getDaysRemaining(a.endDate) - getDaysRemaining(b.endDate));
  }, [accounts, searchQuery, services, filterService]);

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
    currency: settings.currency,
    onRenewSale: handleRenewSale,
    onRenewAccount: handleRenewAccount,
    onDeleteAccount: handleDeleteAccountRequest,
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

      {/* DELETE ACCOUNT CONFIRMATION */}
      <Modal isOpen={!!accountToDelete} onClose={() => setAccountToDelete(null)} title="Eliminar Cuenta">
         <div className="space-y-4 pt-2">
            <div className="bg-status-danger/10 border border-status-danger/20 p-4 rounded-xl flex gap-4 items-start">
                <div className="bg-status-danger/20 p-3 rounded-full shrink-0">
                    <Trash2 size={24} className="text-status-danger" />
                </div>
                <div>
                    <h4 className="text-text-primary font-bold text-sm">¿Estás seguro?</h4>
                    <p className="text-text-muted text-xs mt-1 leading-relaxed">
                        Se eliminará la cuenta <strong>{accountToDelete?.email}</strong> del inventario. Perderás el historial.
                    </p>
                </div>
            </div>
            <div className="flex gap-3">
                <button onClick={() => setAccountToDelete(null)} className="flex-1 py-3 rounded-md bg-[rgb(var(--fg-rgb))]/5 text-text-muted text-xs font-semibold hover:bg-[rgb(var(--fg-rgb))]/10 transition-colors">
                    Cancelar
                </button>
                <button onClick={confirmDeleteAccount} className="flex-1 py-3 rounded-md bg-status-danger text-white text-xs font-semibold hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-colors">
                    Sí, Eliminar
                </button>
            </div>
         </div>
      </Modal>

    </>
  );
};

export default ExpiredPage;
