
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useSubscription } from '../../../context/SubscriptionContext';
import { useHaptic } from '../../../hooks/useHaptic';
import { useUIStore } from '../../../store/uiStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../supabaseClient';
import {
  TrendingUp, TrendingDown, Clock,
  ShoppingCart, Layers,
  // Added Box icon to imports
  Plus, ArrowUpRight, ArrowDownRight, 
  Receipt, Bell, Eye, EyeOff, Search, MonitorPlay, Key, 
  ChevronRight, SlidersHorizontal, PiggyBank, HelpCircle, RotateCcw, UserMinus, AlertOctagon, CheckCircle2,
  RefreshCw, DollarSign, User, Briefcase, Truck, UserPlus, BarChart3, AlertTriangle, ArrowLeft, Copy,
  ClipboardList, Trash2, X, Box, Cloud, CloudOff, UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ViewState, Movement, FinancialAccount, Sale, Reseller, Provider, Client, PayableExpense } from '../../../types';
import { calculateOccupancy } from '../../../utils/inventarioUtils';

// Modals
import NotificationCenter from '../../../components/ui/NotificationCenter';
import SaleModal from '../../../components/sales/SaleModal';
import ContactoModal from '../../../components/contactos/ContactoModal';
import PayableModal from '../../../components/cuentas/PayableModal'; 
import ExpenseModal from '../../../components/accounting/ExpenseModal'; 
import ServiceFormModal from '../../../components/services/ServiceFormModal';
import Skeleton from '../../../components/ui/Skeleton';
import Modal from '../../../components/ui/Modal'; 
import OnboardingWidget from '../../../components/dashboard/OnboardingWidget'; 
import SyncStatusWidget from '../../../components/dashboard/SyncStatusWidget';
import SyncQueueModal from '../../../components/dashboard/SyncQueueModal';
import WidgetConfigModal from '../../../components/dashboard/WidgetConfigModal';
import SubscriptionAlert from '../../../components/ui/SubscriptionAlert';
import RenewModal from '../../../components/sales/RenewModal';
import TransactionModal from '../../../components/cuentas/TransactionModal';
import MovementsModal from '../../../components/cuentas/MovementsModal';
import AccountFormModal from '../../../components/cuentas/AccountFormModal';
import ResellerModal from '../../../components/revendedores/ResellerModal';
import ProviderModal from '../../../components/providers/ProviderModal';

// Utils
import { getDaysRemaining } from '../../../utils/expiredUtils';
import { getCombinedWhatsAppTemplate, groupSalesByClientAndDate } from '../../../utils/salesUtils';
import { sendWhatsAppMessage, getLocalDateISO } from '../../../utils/contactosUtils';
import { isNativePlatform } from '../../../utils/platformUtils';
import { useOfflineSync } from '../../../hooks/useOfflineSync';

// Custom Hooks
import { useDashboardWidgets } from '../../../hooks/useDashboardWidgets';

// Components
import AccountCard from '../../../components/cuentas/AccountCard';
import ScrollFloatingActions, { ActionItem } from '../../../components/ui/ScrollFloatingActions';
import AnimatedLogo from '../../../components/ui/AnimatedLogo'; 
import ExpiredCard from '../../../components/expired/ExpiredCard';

const MovementDetailModal: React.FC<{ isOpen: boolean; onClose: () => void; movement: Movement | null; settings: any }> = ({ isOpen, onClose, movement, settings }) => {
    if (!movement) return null;
    const isIncome = movement.type === 'funding' || movement.type === 'transfer_in';
    const date = new Date(movement.date);
    
    const mainCurrency = settings.currency || 'USD';
    const subCurrency = settings.subCurrency || 'SEC';
    const rate = settings.exchangeRate || 1;
    
    let amountMain = 0;
    let amountSec = 0;
    const isMovMain = movement.currency === mainCurrency;
    const conversionRate = movement.exchangeRate || rate;

    if (isMovMain) {
        amountMain = movement.amount;
        amountSec = amountMain * conversionRate;
    } else {
        amountSec = movement.amount;
        amountMain = conversionRate > 0 ? amountSec / conversionRate : 0;
    }
    
    let clientName = null;
    const desc = movement.description || '';
    if (desc.includes('Venta:') || desc.includes('Renovación:')) {
        const parts = desc.split(' a ');
        if (parts.length > 1) {
            clientName = parts[parts.length - 1].trim();
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalle Movimiento">
            <div className="pt-2 pb-4 space-y-4">
                <div className={`p-5 rounded-xl text-center border relative overflow-hidden ${isIncome ? 'bg-status-success/10 border-status-success/20' : 'bg-status-danger/10 border-status-danger/20'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${isIncome ? 'bg-status-success/20 text-status-success-soft' : 'bg-status-danger/20 text-status-danger-soft'}`}>
                        {isIncome ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                    </div>
                    <p className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2">{isIncome ? 'Ingreso Registrado' : 'Egreso Registrado'}</p>
                    <div className="flex flex-col gap-1 items-center justify-center">
                        <p className={`text-3xl font-extrabold ${isIncome ? 'text-status-success-soft' : 'text-status-danger-soft'}`}>
                            {isIncome ? '+' : '-'}{amountMain.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} <span className="text-sm font-medium opacity-70">{mainCurrency}</span>
                        </p>
                        {subCurrency && (
                            <p className="text-sm font-medium text-text-disabled">
                                ≈ {amountSec.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {subCurrency}
                            </p>
                        )}
                    </div>
                </div>
                <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-lg p-5 space-y-4 shadow-sm">
                    {clientName && (
                        <div className="flex justify-between items-center border-b border-[rgb(var(--fg-rgb))]/5 pb-3">
                            <span className="text-text-disabled text-xs font-semibold uppercase flex items-center gap-1"><User size={12}/> Cliente</span>
                            <span className="text-text-primary text-sm font-bold text-right">{clientName}</span>
                        </div>
                    )}
                    <div className="space-y-1">
                        <span className="text-text-disabled text-xs font-semibold uppercase block">Concepto</span>
                        <p className="text-text-primary text-sm font-medium leading-relaxed">{movement.description || 'Sin descripción'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                            <span className="text-text-disabled text-xs font-semibold uppercase block mb-1">Fecha</span>
                            <span className="text-text-primary text-sm font-mono bg-[rgb(var(--fg-rgb))]/5 px-2 py-1 rounded-md">{date.toLocaleDateString()}</span>
                        </div>
                        <div>
                            <span className="text-text-disabled text-xs font-semibold uppercase block mb-1">Hora</span>
                            <span className="text-text-primary text-sm font-mono bg-[rgb(var(--fg-rgb))]/5 px-2 py-1 rounded-md">{date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <span className="text-text-disabled text-xs font-semibold uppercase">Método</span>
                        <span className="text-text-primary text-xs font-semibold bg-[rgb(var(--fg-rgb))]/10 px-3 py-1 rounded-full capitalize">{movement.paymentMethod || 'Manual'}</span>
                    </div>
                </div>
                <button onClick={onClose} className="w-full py-3.5 bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-md text-text-muted font-semibold text-xs hover:text-text-primary transition-colors active:scale-95 shadow-sm">
                    Cerrar
                </button>
            </div>
        </Modal>
    );
};

interface DashboardMobileProps {
  setView: (view: ViewState) => void;
}

const DashboardMobile: React.FC<DashboardMobileProps> = ({ setView }) => {
  const {
    sales, movements, settings, financialAccounts, accounts, services, clients,
    addClient, addPayable, isLoading, expenses, supplies, updateSettings, resellers,
    addFinancialAccount, updateFinancialAccount, deleteFinancialAccount, 
    addReseller, addProvider, executeTransaction
  } = useData();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isAdmin, subscription, accessStatus } = useSubscription();
  const haptic = useHaptic();
  const isNative = isNativePlatform();
  const { isOnline, isSyncing, pendingItems, pendingCount, processSyncQueue } = useOfflineSync();
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  
  // Visibilidad del balance desde el store global
  const showBalance = useUIStore(state => state.showBalance);
  const setShowBalance = useUIStore(state => state.setShowBalance);
  
  const { widgets, toggleWidget, toggleQuickAction } = useDashboardWidgets();

  const formatMoney = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const [activeTab, setActiveTab] = useState<'wallets' | 'movements'>('wallets');

  // Modals
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isPayableModalOpen, setIsPayableModalOpen] = useState(false); 
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isResellerModalOpen, setIsResellerModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isStockFinderOpen, setIsStockFinderOpen] = useState(false); 
  const [selectedStockService, setSelectedStockService] = useState<any | null>(null);
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [salesToRenew, setSalesToRenew] = useState<Sale[]>([]);
  const [isProfitDetailOpen, setIsProfitDetailOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [transactionAccount, setTransactionAccount] = useState<FinancialAccount | null>(null);
  const [transactionMode, setTransactionMode] = useState<'fund' | 'withdraw' | 'transfer'>('fund');
  const [isMovementsModalOpen, setIsMovementsModalOpen] = useState(false);
  const [historyAccount, setHistoryAccount] = useState<FinancialAccount | null>(null);
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

  const salesThisMonth = useMemo(() => {
    const now = new Date();
    return sales.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((acc, s) => acc + s.amount, 0);
  }, [sales]);

  const stockData = useMemo(() => {
    return services.map(svc => {
        const accountsWithSpace = accounts.filter(a => a.serviceId === svc.id && a.status === 'activa' && (a.maxScreens - calculateOccupancy(a)) > 0);
        const totalFree = accountsWithSpace.reduce((sum, acc) => sum + (acc.maxScreens - calculateOccupancy(acc)), 0);
        return { 
          id: svc.id, 
          name: svc.name, 
          totalFree, 
          accounts: accountsWithSpace.map(a => ({ 
            id: a.id,
            email: a.email,
            password: a.password,
            available: a.maxScreens - calculateOccupancy(a) 
          })) 
        };
    }).filter(s => s.totalFree > 0).sort((a, b) => b.totalFree - a.totalFree);
  }, [services, accounts]);

  const renderedActions = (widgets.quickActions || []).map(id => {
      const config: any = {
        'sale': { label: 'Vender', icon: ShoppingCart, color: 'text-brand-primary group-hover:bg-brand-primary', onClick: () => setIsSaleModalOpen(true) },
        'expense': { label: 'Gasto', icon: Receipt, color: 'text-brand-accent group-hover:bg-brand-accent', onClick: () => setIsExpenseModalOpen(true) },
        'stock': { label: 'Stock', icon: Search, color: 'text-status-success group-hover:bg-status-success', onClick: () => { setSelectedStockService(null); setIsStockFinderOpen(true); } },
        'services': { label: 'Servicios', icon: Layers, color: 'text-status-info-soft group-hover:bg-status-info-soft', onClick: () => setIsServiceModalOpen(true) },
        'expired': { label: 'Vencidas', icon: AlertOctagon, color: 'text-status-danger-soft group-hover:bg-status-danger-soft', onClick: () => setView('expired') },
        'add_client': { label: 'Cliente', icon: UserPlus, color: 'text-indigo-400 group-hover:bg-indigo-400', onClick: () => setIsClientModalOpen(true) },
        'add_reseller': { label: 'Revendedor', icon: Briefcase, color: 'text-status-warning-soft group-hover:bg-status-warning-soft', onClick: () => setIsResellerModalOpen(true) },
        'add_provider': { label: 'Proveedor', icon: Truck, color: 'text-cyan-400 group-hover:bg-cyan-400', onClick: () => setIsProviderModalOpen(true) },
        'agenda': { label: 'Agenda', icon: ClipboardList, color: 'text-status-danger-soft group-hover:bg-status-danger-soft', onClick: () => setView('agenda') },
        'trash': { label: 'Papelera', icon: Trash2, color: 'text-text-disabled group-hover:bg-zinc-500', onClick: () => setView('trash') },
        'reports': { label: 'Reportes', icon: BarChart3, color: 'text-purple-400 group-hover:bg-purple-400', onClick: () => setView('reports') },
      };
      return config[id];
  }).filter(Boolean);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  const isPro = subscription && subscription.plan !== 'free';
  const logoWrapperStyle = isAdmin 
    ? "bg-gradient-to-br from-status-warning-soft to-yellow-600 shadow-[0_0_20px_rgba(251,191,36,0.6)] border border-yellow-500/50" 
    : isPro
      ? "bg-gradient-to-tr from-brand-primary to-brand-accent shadow-[0_0_15px_rgba(106,44,255,0.4)]" 
      : "bg-gradient-to-tr from-zinc-500 to-zinc-700 border border-zinc-600 shadow-sm"; 

  const convertToMain = (amount: number, fromCurrency: string) => {
    if (!amount || isNaN(amount)) return 0;
    if (fromCurrency === settings.currency) return amount;
    const rate = settings.exchangeRate || 1;
    const strongCurrencies = ['USD', 'USDT', 'USDC', 'EUR'];
    const isMainStrong = strongCurrencies.includes(settings.currency);
    const isFromStrong = strongCurrencies.includes(fromCurrency);
    if (isMainStrong && !isFromStrong) return rate > 0 ? amount / rate : amount;
    if (!isMainStrong && isFromStrong) return amount * rate;
    return amount;
  };

  const walletStats = useMemo(() => {
    let totalMain = 0;
    financialAccounts.forEach(acc => {
      if(acc.isActive !== false) {
          totalMain += convertToMain(acc.balance, acc.currency);
      }
    });
    const rate = settings.exchangeRate || 1;
    const isMainStrong = ['USD', 'USDT', 'USDC', 'EUR'].includes(settings.currency);
    const secondaryTotal = isMainStrong ? totalMain * rate : (rate > 0 ? totalMain / rate : 0);
    return { totalMain, secondaryTotal };
  }, [financialAccounts, settings.currency, settings.exchangeRate]);

  const financeStats = useMemo(() => {
    const now = new Date();
    const isThisMonth = (d: string) => {
      const date = new Date(d);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    };
    const income = movements
        .filter(m => (m.type === 'funding' || m.type === 'transfer_in') && isThisMonth(m.date) && m.paymentMethod !== 'Venta Directa')
        .reduce((acc, m) => acc + (m.usdEquivalent || convertToMain(m.amount, m.currency)), 0) 
        + sales.filter(s => isThisMonth(s.date)).reduce((acc, s) => acc + s.amount, 0);
    const expense = movements
        .filter(m => (m.type === 'withdrawal' || m.type === 'transfer_out') && isThisMonth(m.date))
        .reduce((acc, m) => acc + (m.usdEquivalent || convertToMain(m.amount, m.currency)), 0);
    return { income, expense, profit: income - expense };
  }, [sales, movements, settings]);

  const { realMonthlyProfit, profitBreakdown, isAccountingReset } = useMemo(() => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); 
      const currentMonthStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`;
      let startFilterDate: Date | null = null;
      if (settings.analyticsPreferences?.accountingStartDate) {
          const customStart = new Date(settings.analyticsPreferences.accountingStartDate);
          if (customStart.getMonth() === currentMonth && customStart.getFullYear() === currentYear) {
              startFilterDate = customStart;
          }
      }
      const isRelevant = (dateStr: string) => {
          if (!dateStr) return false;
          if (startFilterDate) return new Date(dateStr) >= startFilterDate;
          return dateStr.startsWith(currentMonthStr);
      };
      const incomeMovements = movements.filter(m => (m.type === 'funding' || m.type === 'transfer_in') && isRelevant(m.date));
      let revenue = 0;
      let totalServiceCost = 0;
      incomeMovements.forEach(m => {
          const amount = m.usdEquivalent || convertToMain(m.amount, m.currency);
          revenue += amount;
          const matchedService = services.find(s => m.description.toLowerCase().includes(s.name.toLowerCase()));
          if (matchedService) {
              let cost = (matchedService.type === 'cuenta_completa') 
                ? (matchedService.investmentPrice || (matchedService.cost * matchedService.screens)) 
                : matchedService.cost;
              totalServiceCost += cost;
          }
      });
      const grossProfit = revenue - totalServiceCost;
      const currentExpenses = expenses.filter(e => isRelevant(e.date));
      const personalExpenses = currentExpenses
          .filter(e => {
             const cat = (e.category || '').toLowerCase();
             return cat === 'personal' || cat === 'retiro' || cat === 'gastos personales';
          })
          .reduce((acc, e) => acc + e.amount, 0);
      return { realMonthlyProfit: grossProfit - personalExpenses, isAccountingReset: !!startFilterDate, profitBreakdown: { revenue, serviceCosts: totalServiceCost, grossProfit, personalExpenses } };
  }, [movements, services, expenses, settings.analyticsPreferences]);

  const handleResetClick = () => setIsResetConfirmOpen(true);

  const confirmResetCalculation = async () => {
     try {
         await updateSettings({ ...settings, analyticsPreferences: { ...(settings.analyticsPreferences || {}), accountingStartDate: new Date().toISOString() } });
         showToast('Cálculo reiniciado', 'success');
         setIsResetConfirmOpen(false);
         setIsProfitDetailOpen(false);
     } catch (error) { showToast('Error', 'error'); }
  };

  const profitStatus = useMemo(() => {
      if (realMonthlyProfit < 3) return 'loss'; 
      if (realMonthlyProfit >= 3 && realMonthlyProfit <= 5) return 'low'; 
      return 'normal'; 
  }, [realMonthlyProfit]);

  const getProfitStyle = () => {
      switch(profitStatus) {
          case 'loss': return 'bg-status-danger/[0.06] border border-status-danger shadow-[0_0_20px_-5px_rgba(239,68,68,0.2)]';
          case 'low': return 'bg-status-warning/[0.06] border border-status-warning shadow-[0_0_20px_-5px_rgba(245,158,11,0.2)]';
          default: return 'bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] shadow-lg';
      }
  };

  const monthlyMovements = useMemo(() => {
      const now = new Date();
      return movements.filter(m => {
          const d = new Date(m.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 
  }, [movements]);

  const toggleBalance = () => { haptic(); setShowBalance(!showBalance); };
  const handleClientSubmit = (client: Client) => { addClient(client); showToast('Cliente registrado', 'success'); };
  const handlePayableSubmit = (payable: PayableExpense) => { addPayable(payable); showToast('Gasto registrado', 'success'); };
  const handleAccountFormSubmit = (data: FinancialAccount) => { if(editingAccount) updateFinancialAccount(data); else addFinancialAccount(data); setIsAccountFormOpen(false); };

  const handleResellerSubmit = (data: Reseller) => {
    addReseller(data);
    showToast('Socio registrado', 'success');
    setIsResellerModalOpen(false);
  };

  const handleProviderSubmit = (data: Provider) => {
    addProvider(data);
    showToast('Proveedor registrado', 'success');
    setIsProviderModalOpen(false);
  };

  const handleFund = (acc: FinancialAccount) => { setTransactionAccount(acc); setTransactionMode('fund'); setIsTransactionOpen(true); };
  const handleWithdraw = (acc: FinancialAccount) => { setTransactionAccount(acc); setTransactionMode('withdraw'); setIsTransactionOpen(true); };
  const handleTransfer = (acc: FinancialAccount) => { setTransactionAccount(acc); setTransactionMode('transfer'); setIsTransactionOpen(true); };
  const handleHistory = (acc: FinancialAccount) => { setHistoryAccount(acc); setIsMovementsModalOpen(true); };
  const handleEditAccount = (acc: FinancialAccount) => { setEditingAccount(acc); setIsAccountFormOpen(true); };
  const handleDeleteAccount = (id: string) => { deleteFinancialAccount(id); showToast('Billetera eliminada', 'success'); };
  const handleToggleStatus = (acc: FinancialAccount) => { updateFinancialAccount({...acc, isActive: !acc.isActive}); };

  const actions: ActionItem[] = [
    { label: 'Nueva Venta', icon: ShoppingCart, onClick: () => setIsSaleModalOpen(true), color: 'bg-brand-primary' },
    { label: 'Registrar Gasto', icon: Receipt, onClick: () => setIsExpenseModalOpen(true), color: 'bg-brand-accent' },
  ];

  const sortedAccounts = [...financialAccounts].sort((a, b) => (b.isActive !== false ? 1 : 0) - (a.isActive !== false ? 1 : 0));

  return (
    <div className="min-h-screen pb-32 bg-bg font-sans text-text-primary relative overflow-x-hidden">
      <SyncQueueModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} pendingItems={pendingItems} isOnline={isOnline} />
      <div className={`px-[var(--mobile-side-pad)] pt-safe ${isNative ? 'mt-2' : 'mt-4'} pb-5 relative z-50 flex justify-between items-center sticky top-0 transition-colors duration-500 ${isSyncing ? 'bg-brand-primary/5' : ''}`}>
          <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-sm p-px shrink-0 transition-all duration-700 shadow-glow-sm ${logoWrapperStyle}`}>
                 <div className="w-full h-full rounded-sm bg-surface-sunken flex items-center justify-center overflow-hidden">
                    <AnimatedLogo size={28} showFill={true} isStatic={true} />
                 </div>
              </div>
              <div className="flex flex-col">
                  <p className="text-text-disabled text-[8px] font-black uppercase tracking-[0.2em] leading-none mb-1">{greeting}</p>
                  <h1 className="text-lg font-black text-text-primary leading-none tracking-tighter">
                    {user?.name?.split(' ')[0] || 'Hola'}
                    <span className="text-brand-primary">.</span>
                  </h1>
              </div>
          </div>
          <div className="flex gap-2">
             <motion.button 
                whileTap={{ scale: 0.95 }} 
                onClick={() => pendingCount > 0 && setIsSyncModalOpen(true)} 
                className={`w-9 h-9 rounded-sm border flex items-center justify-center shadow-inner relative transition-all active:bg-[rgb(var(--fg-rgb))]/[0.08] ${isSyncing ? 'bg-brand-primary/10 border-brand-primary/30' : 'bg-[rgb(var(--fg-rgb))]/[0.03] border-[rgb(var(--fg-rgb))]/10'}`}
             >
                {isSyncing ? (
                   <motion.div
                     animate={{ rotate: 360 }}
                     transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                   >
                     <RefreshCw size={16} className="text-brand-primary" />
                   </motion.div>
                ) : !isOnline ? (
                   <CloudOff size={16} className="text-status-danger" />
                ) : pendingCount > 0 ? (
                   <UploadCloud size={16} className="text-brand-lime" />
                ) : (
                   <Cloud size={16} className="text-status-success" />
                )}
             </motion.button>
             <motion.button 
                whileTap={{ scale: 0.95 }} 
                onClick={() => setIsNotifOpen(true)} 
                className="w-9 h-9 rounded-sm bg-[rgb(var(--fg-rgb))]/[0.03] border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-muted relative shadow-inner transition-all hover:text-text-primary"
             >
                <Bell size={16} />
                {(sales.filter(s => getDaysRemaining(s.expiryDate) <= 1).length > 0) && (
                   <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-brand-accent rounded-full shadow-[0_0_10px_#FF1493]" />
                )}
             </motion.button>
          </div>
      </div>
      <div className="px-[var(--mobile-side-pad)] relative z-10 space-y-6">
          <SubscriptionAlert />
          <SyncStatusWidget />
          <OnboardingWidget onNavigate={setView} />
          
          {widgets.showSales && (
            <motion.div 
              layout 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="group relative"
            >
                {/* Balance Card Premium */}
                
                <div className="relative z-10 overflow-hidden rounded-2xl bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] shadow-2xl p-6 transition-all duration-500 hover:border-[rgb(var(--fg-rgb))]/[0.12] active:scale-[0.99] group/card">
                    
                    <div className="flex justify-between items-start relative z-20">
                        <div className="flex flex-col">
                            <span className="flex items-center gap-2 text-text-disabled text-[9px] font-black uppercase tracking-[0.2em] mb-3">
                                <PiggyBank size={12} className="text-brand-primary" />
                                Balance Total
                            </span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-lg font-bold text-text-faint">{settings.currency}</span>
                                <h2 className="text-3xl font-black text-text-primary tracking-tighter">
                                    {showBalance ? formatMoney(walletStats.totalMain).split('.')[0] : '•••••'}
                                    <span className="text-xl text-text-disabled opacity-50">
                                      .{showBalance ? formatMoney(walletStats.totalMain).split('.')[1] : '••'}
                                    </span>
                                </h2>
                            </div>
                            {settings.subCurrency && (
                                <p className="text-text-disabled text-[10px] font-semibold mt-1.5 flex items-center gap-1.5 opacity-60">
                                    <RotateCcw size={9} className="text-brand-accent" />
                                    {showBalance ? formatMoney(walletStats.secondaryTotal) : '••••'} {settings.subCurrency}
                                </p>
                            )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-6">
                             <button 
                               onClick={toggleBalance} 
                               className="w-9 h-9 rounded-full bg-[rgb(var(--fg-rgb))]/[0.03] border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-disabled hover:text-text-primary transition-all shadow-inner"
                             >
                                {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
                             </button>
                             <span className="text-[9px] font-black text-brand-lime bg-brand-lime/10 px-2.5 py-0.5 rounded-full border border-brand-lime/20">ACTIVO</span>
                        </div>
                    </div>

                    <div className="mt-6 pt-5 border-t border-[rgb(var(--fg-rgb))]/5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider relative z-20">
                        <div className="flex items-center gap-2 text-text-disabled">
                             <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-status-success shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-status-danger shadow-[0_0_8px_rgba(239,68,68,0.5)]'} animate-pulse`} />
                             {isOnline ? 'Sincronizado' : 'Offline'}
                        </div>
                        <button 
                          onClick={() => setView('reports')}
                          className="flex items-center gap-1.5 text-brand-primary hover:translate-x-1 transition-transform"
                        >
                            Ver Reportes
                            <ChevronRight size={12} />
                        </button>
                    </div>
                </div>
            </motion.div>
          )}

          {/* Bento Grid Stats */}
          {widgets.showProfit && (
            <div className="grid grid-cols-2 gap-3">
              <motion.div 
                whileHover={{ y: -2 }}
                className="bg-surface-1/50 border border-[rgb(var(--fg-rgb))]/[0.05] rounded-lg p-4 shadow-sm hover:border-status-success/30 transition-all group overflow-hidden relative"
              >
                <div className="absolute -top-6 -right-6 w-16 h-16 bg-status-success/5 blur-2xl rounded-full" />
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-sm bg-status-success/10 text-status-success-soft flex items-center justify-center transition-transform group-hover:scale-105">
                         <TrendingUp size={16} strokeWidth={2.5} />
                      </div>
                      <p className="text-[10px] text-text-secondary font-black uppercase tracking-[0.05em]">VENTAS</p>
                   </div>
                   <span className="text-[8px] font-black text-text-faint bg-[rgb(var(--fg-rgb))]/5 px-1.5 py-0.5 rounded-md uppercase tracking-widest">MES</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] text-text-disabled font-black uppercase">{settings.currency}</span>
                  <p className="text-xl font-black text-text-primary tracking-tighter leading-none">
                    {formatMoney(salesThisMonth)}
                  </p>
                </div>
              </motion.div>

              <motion.div 
                 whileHover={{ y: -2 }}
                 className="bg-surface-1/50 border border-[rgb(var(--fg-rgb))]/[0.05] rounded-lg p-4 shadow-sm hover:border-rose-500/30 transition-all group overflow-hidden relative"
              >
                <div className="absolute -top-6 -right-6 w-16 h-16 bg-rose-500/5 blur-2xl rounded-full" />
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-sm bg-rose-500/10 text-rose-400 flex items-center justify-center transition-transform group-hover:scale-105">
                         <TrendingDown size={16} strokeWidth={2.5} />
                      </div>
                      <p className="text-[10px] text-text-secondary font-black uppercase tracking-[0.05em]">GASTOS</p>
                   </div>
                   <span className="text-[8px] font-black text-text-faint bg-[rgb(var(--fg-rgb))]/5 px-1.5 py-0.5 rounded-md uppercase tracking-widest">MES</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] text-text-disabled font-black uppercase">{settings.currency}</span>
                  <p className="text-xl font-black text-text-primary tracking-tighter leading-none">
                    {formatMoney(financeStats.expense)}
                  </p>
                </div>
              </motion.div>
            </div>
          )}

          {/* Quick Actions Bento Style */}
          {widgets.showQuickActions && (
            <div className="space-y-3">
               <div className="flex items-center justify-between px-1">
                  <h3 className="text-[11px] font-bold text-text-primary tracking-widest uppercase">Atajos Rápidos</h3>
                  <button onClick={() => setIsConfigModalOpen(true)} className="text-[9px] font-black text-text-disabled hover:text-text-primary transition-colors flex items-center gap-1.5 uppercase tracking-[0.15em]">
                     EDITAR <SlidersHorizontal size={9} />
                  </button>
               </div>
               <motion.div className="flex gap-3 overflow-x-auto no-scrollbar snap-x pb-1" layout>
                 {renderedActions.map((action, index) => (
                   <button 
                     key={index} 
                     onClick={action.onClick} 
                     className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.06] rounded-lg min-w-[88px] h-[88px] p-2.5 flex flex-col items-center justify-center gap-2.5 active:scale-95 transition-all shadow-xl hover:border-[rgb(var(--fg-rgb))]/10 group snap-center"
                   >
                     <div className={`w-10 h-10 rounded-md flex items-center justify-center transition-all duration-300 shadow-inner group-hover:scale-110 group-hover:shadow-glow-sm ${action.color.split(' ')[0]} bg-[rgb(var(--fg-rgb))]/[0.02]`}>
                       <action.icon size={20} strokeWidth={2.5} />
                     </div>
                     <span className="text-[9px] font-black text-text-disabled group-hover:text-text-primary transition-colors uppercase tracking-tight">{action.label}</span>
                   </button>
                 ))}
               </motion.div>
            </div>
          )}

          <div className="pb-10">
            <div className="flex justify-between items-center px-1 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-primary/15 text-brand-primary flex items-center justify-center">
                  <ArrowUpRight size={14} />
                </div>
                <h3 className="text-sm font-bold text-text-primary tracking-tight">Últimos movimientos</h3>
              </div>
              <button
                onClick={() => { haptic('nav'); setView('accounts'); }}
                className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-primary hover:text-text-primary transition-colors flex items-center gap-1"
              >
                Ver todos <ChevronRight size={12} />
              </button>
            </div>
            <div className="space-y-2">
              {monthlyMovements.slice(0, 5).map(mov => {
                const isIncome = mov.type === 'funding' || mov.type === 'transfer_in';
                return (
                  <div
                    key={mov.id}
                    onClick={() => setSelectedMovement(mov)}
                    className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isIncome ? 'bg-status-success/10 text-status-success-soft' : 'bg-status-danger/10 text-status-danger-soft'}`}>
                        {isIncome ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-text-primary truncate">{mov.description || 'Movimiento'}</p>
                        <p className="text-[10px] text-text-disabled">{new Date(mov.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-2">
                      <span className={`text-sm font-bold ${isIncome ? 'text-status-success-soft' : 'text-status-danger-soft'}`}>
                        {isIncome ? '+' : '-'}{mov.amount}
                      </span>
                      <span className="text-[9px] text-text-disabled uppercase">{mov.paymentMethod || 'Manual'}</span>
                    </div>
                  </div>
                );
              })}
              {monthlyMovements.length === 0 && (
                <div className="py-12 text-center text-text-disabled text-xs bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.06] rounded-xl">
                  No hay movimientos este mes.
                </div>
              )}
            </div>
          </div>
      </div>
      <ScrollFloatingActions actions={actions} />
      <SaleModal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} initialData={null} />
      <ContactoModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onSubmit={handleClientSubmit} />
      <PayableModal isOpen={isPayableModalOpen} onClose={() => setIsPayableModalOpen(false)} onSubmit={handlePayableSubmit} />
      <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} />
      <ServiceFormModal isOpen={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} initialData={null} />
      <WidgetConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} widgets={widgets} toggleWidget={toggleWidget} toggleQuickAction={toggleQuickAction} />
      <ResellerModal isOpen={isResellerModalOpen} onClose={() => setIsResellerModalOpen(false)} onSubmit={handleResellerSubmit} />
      <ProviderModal isOpen={isProviderModalOpen} onClose={() => setIsProviderModalOpen(false)} onSubmit={handleProviderSubmit} />
      <TransactionModal isOpen={isTransactionOpen} onClose={() => setIsTransactionOpen(false)} account={transactionAccount} mode={transactionMode} />
      <MovementsModal isOpen={isMovementsModalOpen} onClose={() => setIsMovementsModalOpen(false)} account={historyAccount} />
      <AccountFormModal isOpen={isAccountFormOpen} onClose={() => setIsAccountFormOpen(false)} onSubmit={handleAccountFormSubmit} initialData={editingAccount} />
      <MovementDetailModal isOpen={!!selectedMovement} onClose={() => setSelectedMovement(null)} movement={selectedMovement} settings={settings} />

      {/* MODAL BUSCADOR DE STOCK */}
      <Modal isOpen={isStockFinderOpen} onClose={() => setIsStockFinderOpen(false)} title="Consulta de Stock">
         <div className="flex flex-col gap-3 pt-1">
            <div className="relative mb-2">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled" size={16} />
               <input placeholder="Filtrar por plataforma..." className="w-full bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 rounded-xl pl-11 pr-4 py-3 text-sm text-text-primary outline-none" />
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
               {stockData.map(s => (
                  <button 
                     key={s.id} 
                     onClick={() => setSelectedStockService(s)}
                     className="w-full p-4 rounded-lg bg-surface-1 border border-[rgb(var(--fg-rgb))]/5 flex justify-between items-center hover:border-status-success/40 transition-all active:scale-[0.98]"
                  >
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-md bg-status-success/10 flex items-center justify-center text-status-success-soft border border-status-success/20"><Layers size={20} /></div>
                        <span className="text-sm font-bold text-text-primary">{s.name}</span>
                     </div>
                     <div className="text-right">
                        <span className="text-lg font-black text-status-success-soft block leading-none">{s.totalFree}</span>
                        <span className="text-[8px] text-text-faint font-semibold uppercase tracking-widest">Cupos Libres</span>
                     </div>
                  </button>
               ))}
               {stockData.length === 0 && (
                  <div className="py-20 text-center opacity-30">
                     <Box size={40} className="mx-auto mb-2" />
                     <p className="text-xs">Sin stock disponible actualmente.</p>
                  </div>
               )}
            </div>
         </div>
      </Modal>

      {/* MODAL DETALLE DE CUENTAS POR SERVICIO SELECCIONADO */}
      <Modal isOpen={!!selectedStockService} onClose={() => setSelectedStockService(null)} title={`Stock: ${selectedStockService?.name}`}>
          <div className="space-y-3 pt-1">
              <p className="text-[10px] font-semibold text-text-disabled uppercase tracking-widest mb-2 ml-1">Cuentas con cupo libre</p>
              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                  {selectedStockService?.accounts.map((acc: any) => (
                      <div key={acc.id} className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 p-4 rounded-lg flex justify-between items-center group relative overflow-hidden">
                          <div className="min-w-0 pr-2">
                              <p className="text-xs font-semibold text-text-primary truncate">{acc.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                 <Key size={10} className="text-text-faint" />
                                 <p className="text-[10px] text-text-disabled font-mono group-hover:text-text-secondary">{acc.password}</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                  <span className="text-base font-black text-status-success-soft leading-none">{acc.available}</span>
                                  <p className="text-[7px] text-text-faint font-bold uppercase text-right">Cupos</p>
                              </div>
                              <button 
                                 onClick={() => { navigator.clipboard.writeText(`📧 ${acc.email}\n🔑 ${acc.password}`); showToast('Credenciales copiadas', 'success'); }} 
                                 className="w-8 h-8 flex items-center justify-center bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 rounded-lg text-text-disabled hover:text-text-primary transition-all active:scale-90"
                              >
                                 <Copy size={14}/>
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
              <button onClick={() => setSelectedStockService(null)} className="w-full py-4 text-text-disabled text-xs font-semibold uppercase tracking-widest mt-2 active:text-text-primary flex items-center justify-center gap-2">
                  <ArrowLeft size={14} /> Volver a la lista
              </button>
          </div>
      </Modal>
      <NotificationCenter 
         isOpen={isNotifOpen} 
         onClose={() => setIsNotifOpen(false)} 
         onNavigate={(view) => {
            setIsNotifOpen(false);
            setView(view);
         }} 
      />
      <NotificationCenter 
         isOpen={isNotifOpen} 
         onClose={() => setIsNotifOpen(false)} 
         onNavigate={(view) => {
            setIsNotifOpen(false);
            setView(view);
         }} 
      />
    </div>
  );
};

export default DashboardMobile;
