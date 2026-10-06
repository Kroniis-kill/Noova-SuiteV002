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
  Plus, ArrowUpRight, ArrowDownRight, 
  Receipt, Bell, Eye, EyeOff, Search, MonitorPlay, Key, 
  ChevronRight, SlidersHorizontal, PiggyBank, HelpCircle, RotateCcw, UserMinus, AlertOctagon, CheckCircle2,
  RefreshCw, DollarSign, User, Briefcase, Truck, UserPlus, BarChart3, AlertTriangle, ArrowLeft, Copy,
  ClipboardList, Trash2, X, Box, Cloud, CloudOff, UploadCloud, MessageCircle, Pencil, Check
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
import SyncIconButton from '../../../components/dashboard/SyncIconButton';
import { useSyncState } from '../../../hooks/useSyncState';
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
import Avatar from '../../../components/ui/Avatar';
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

                <div className="bg-surface-1 border border-border-subtle rounded-xl p-5 space-y-4 shadow-sm">
                    {clientName && (
                        <div className="flex justify-between items-center border-b border-hairline pb-3">
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

                <button onClick={onClose} className="w-full py-3.5 bg-surface-1 border border-border-subtle rounded-md text-text-muted font-semibold text-xs hover:text-text-primary transition-colors active:scale-95 shadow-sm">
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
    addReseller, addProvider, executeTransaction, serviceFailures, deleteFailure
  } = useData();

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isAdmin, subscription, accessStatus } = useSubscription();
  const haptic = useHaptic();
  const isNative = isNativePlatform();
  const { isOnline, isSyncing, pendingItems, pendingCount, processSyncQueue } = useOfflineSync();
  const { state: syncState, pendingCount: syncPending } = useSyncState();
  
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
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState('');
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
          image_url: svc.image_url,
          totalFree, 
          accounts: accountsWithSpace.map(a => ({ 
            id: a.id,
            email: a.email,
            password: a.password,
            available: a.maxScreens - calculateOccupancy(a) 
          })) 
        };
    }).sort((a, b) => b.totalFree - a.totalFree);
  }, [services, accounts]);

  const stockDataByUrgency = useMemo(() => {
    return [...stockData].sort((a, b) => a.totalFree - b.totalFree);
  }, [stockData]);

  const warningDays = settings.salesPreferences?.warningDays ?? 2;

  const expiringSalesGroups = useMemo(() => {
    const filtered = sales.filter(s => getDaysRemaining(s.expiryDate) <= warningDays);
    const groups = groupSalesByClientAndDate(filtered, clients, resellers);

    return groups.sort((a, b) => {
      const minA = Math.min(...a.renewalGroups.flatMap(g => g.sales).map(s => getDaysRemaining(s.expiryDate)));
      const minB = Math.min(...b.renewalGroups.flatMap(g => g.sales).map(s => getDaysRemaining(s.expiryDate)));
      return minA - minB;
    });
  }, [sales, clients, resellers, warningDays]);

  const expiringAccountsList = useMemo(() => {
    return accounts
      .filter(acc => acc.status !== 'inactiva' && getDaysRemaining(acc.endDate) <= warningDays)
      .sort((a, b) => getDaysRemaining(a.endDate) - getDaysRemaining(b.endDate));
  }, [accounts, warningDays]);

  const pendingFailures = useMemo(() => {
    return [...(serviceFailures || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [serviceFailures]);

  const handleSendExpiryReminder = (salesGroup: Sale[], client: Client) => {
    const days = getDaysRemaining(salesGroup[0]?.expiryDate);
    let type: 'warning2Days' | 'warning1Day' | 'expiration' = 'warning2Days';

    if (days <= 0) type = 'expiration';
    else if (days === 1) type = 'warning1Day';

    const message = getCombinedWhatsAppTemplate(type, salesGroup, client.name, accounts, settings, 'whatsapp', false);
    sendWhatsAppMessage(client.phone || '', message);
  };

  const handleRenewFromDashboard = (salesGroup: Sale[]) => {
    setSalesToRenew(salesGroup);
    setIsRenewModalOpen(true);
  };

  const handleSaveRate = () => {
    const value = parseFloat(rateInput.replace(',', '.'));

    if (isNaN(value) || value <= 0) {
      showToast('Ingresa una tasa válida', 'error');
      return;
    }

    updateSettings({ ...settings, exchangeRate: value });
    setIsEditingRate(false);
    showToast('Tasa de cambio actualizada', 'success');
  };

  const renderedActions = (widgets.quickActions || []).map(id => {
      const config: any = {
        'sale': {
          label: 'Vender',
          icon: ShoppingCart,
          color: 'text-brand-primary group-hover:bg-brand-primary',
          onClick: () => setIsSaleModalOpen(true)
        },
        'expense': {
          label: 'Gasto',
          icon: Receipt,
          color: 'text-brand-accent group-hover:bg-brand-accent',
          onClick: () => setIsExpenseModalOpen(true)
        },
        'stock': {
          label: 'Stock',
          icon: Search,
          color: 'text-status-success group-hover:bg-status-success',
          onClick: () => {
            setSelectedStockService(null);
            setIsStockFinderOpen(true);
          }
        },
        'services': {
          label: 'Servicios',
          icon: Layers,
          color: 'text-status-info-soft group-hover:bg-status-info-soft',
          onClick: () => setIsServiceModalOpen(true)
        },
        'expired': {
          label: 'Vencidas',
          icon: AlertOctagon,
          color: 'text-status-danger-soft group-hover:bg-status-danger-soft',
          onClick: () => setView('expired')
        },
        'add_client': {
          label: 'Cliente',
          icon: UserPlus,
          color: 'text-indigo-400 group-hover:bg-indigo-400',
          onClick: () => setIsClientModalOpen(true)
        },
        'add_reseller': {
          label: 'Revendedor',
          icon: Briefcase,
          color: 'text-status-warning-soft group-hover:bg-status-warning-soft',
          onClick: () => setIsResellerModalOpen(true)
        },
        'add_provider': {
          label: 'Proveedor',
          icon: Truck,
          color: 'text-cyan-400 group-hover:bg-cyan-400',
          onClick: () => setIsProviderModalOpen(true)
        },
        'agenda': {
          label: 'Agenda',
          icon: ClipboardList,
          color: 'text-status-danger-soft group-hover:bg-status-danger-soft',
          onClick: () => setView('agenda')
        },
        'trash': {
          label: 'Papelera',
          icon: Trash2,
          color: 'text-text-disabled group-hover:bg-zinc-500',
          onClick: () => setView('trash')
        },
        'reports': {
          label: 'Reportes',
          icon: BarChart3,
          color: 'text-purple-400 group-hover:bg-purple-400',
          onClick: () => setView('reports')
        },
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
      ? "bg-gradient-to-tr from-brand-primary to-brand-accent shadow-glow-primary-sm" 
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

      return {
        realMonthlyProfit: grossProfit - personalExpenses,
        isAccountingReset: !!startFilterDate,
        profitBreakdown: {
          revenue,
          serviceCosts: totalServiceCost,
          grossProfit,
          personalExpenses
        }
      };
  }, [movements, services, expenses, settings.analyticsPreferences]);

  const handleResetClick = () => setIsResetConfirmOpen(true);

  const confirmResetCalculation = async () => {
     try {
         await updateSettings({
           ...settings,
           analyticsPreferences: {
             ...(settings.analyticsPreferences || {}),
             accountingStartDate: new Date().toISOString()
           }
         });

         showToast('Cálculo reiniciado', 'success');
         setIsResetConfirmOpen(false);
         setIsProfitDetailOpen(false);
     } catch (error) {
         showToast('Error', 'error');
     }
  };

  const profitStatus = useMemo(() => {
      if (realMonthlyProfit < 3) return 'loss'; 
      if (realMonthlyProfit >= 3 && realMonthlyProfit <= 5) return 'low'; 

      return 'normal'; 
  }, [realMonthlyProfit]);

  const getProfitStyle = () => {
      switch(profitStatus) {
          case 'loss':
              return 'bg-status-danger/[0.06] border border-status-danger shadow-[0_0_20px_-5px_rgba(239,68,68,0.2)]';

          case 'low':
              return 'bg-status-warning/[0.06] border border-status-warning shadow-[0_0_20px_-5px_rgba(245,158,11,0.2)]';

          default:
              return 'bg-surface-1 border border-border-subtle shadow-lg';
      }
  };

  const monthlyMovements = useMemo(() => {
      const now = new Date();

      return movements.filter(m => {
          const d = new Date(m.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 
  }, [movements]);

  const toggleBalance = () => {
    haptic();
    setShowBalance(!showBalance);
  };

  const handleClientSubmit = (client: Client) => {
    addClient(client);
    showToast('Cliente registrado', 'success');
  };

  const handlePayableSubmit = (payable: PayableExpense) => {
    addPayable(payable);
    showToast('Gasto registrado', 'success');
  };

  const handleAccountFormSubmit = (data: FinancialAccount) => {
    if(editingAccount) {
      updateFinancialAccount(data);
    } else {
      addFinancialAccount(data);
    }

    setIsAccountFormOpen(false);
  };

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

  const handleFund = (acc: FinancialAccount) => {
    setTransactionAccount(acc);
    setTransactionMode('fund');
    setIsTransactionOpen(true);
  };

  const handleWithdraw = (acc: FinancialAccount) => {
    setTransactionAccount(acc);
    setTransactionMode('withdraw');
    setIsTransactionOpen(true);
  };

  const handleTransfer = (acc: FinancialAccount) => {
    setTransactionAccount(acc);
    setTransactionMode('transfer');
    setIsTransactionOpen(true);
  };

  const handleHistory = (acc: FinancialAccount) => {
    setHistoryAccount(acc);
    setIsMovementsModalOpen(true);
  };

  const handleEditAccount = (acc: FinancialAccount) => {
    setEditingAccount(acc);
    setIsAccountFormOpen(true);
  };

  const handleDeleteAccount = (id: string) => {
    deleteFinancialAccount(id);
    showToast('Billetera eliminada', 'success');
  };

  const handleToggleStatus = (acc: FinancialAccount) => {
    updateFinancialAccount({...acc, isActive: !acc.isActive});
  };

  const actions: ActionItem[] = [
    {
      label: 'Nueva Venta',
      icon: ShoppingCart,
      onClick: () => setIsSaleModalOpen(true),
      color: 'bg-brand-primary'
    },
    {
      label: 'Registrar Gasto',
      icon: Receipt,
      onClick: () => setIsExpenseModalOpen(true),
      color: 'bg-brand-accent'
    },
  ];

  const sortedAccounts = [...financialAccounts].sort(
    (a, b) => (b.isActive !== false ? 1 : 0) - (a.isActive !== false ? 1 : 0)
  );

  // Estado de sincronización real para el pie de la tarjeta (antes decía "Sincronizado"
  // aunque hubiera cambios pendientes por subir).
  const syncFooter = {
    ok: { label: 'Sincronizado', dot: 'bg-brand-lime' },
    pending: { label: `${syncPending} por subir`, dot: 'bg-status-warning' },
    sync: { label: 'Sincronizando', dot: 'bg-white animate-pulse' },
    offline: { label: 'Sin conexión', dot: 'bg-status-warning' },
    error: { label: 'Error al subir', dot: 'bg-status-danger' },
  }[syncState];

  return (
    <div className="min-h-dvh pb-32 bg-bg font-sans text-text-primary relative overflow-x-hidden">

      <div className={`px-[var(--mobile-side-pad)] pt-safe ${isNative ? 'mt-2' : 'mt-4'} relative z-10 space-y-6`}>

          {/* ================= ENCABEZADO ================= */}
          <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                  <Avatar
                    name={user?.name || 'Usuario'}
                    image={user?.avatar}
                    size={40}
                    className="rounded-full shrink-0"
                  />

                  <div className="flex flex-col">
                      <p className="text-text-disabled text-nano font-black uppercase tracking-[0.2em] leading-none mb-1">
                        {greeting}
                      </p>

                      <h1 className="text-xl font-black text-text-primary leading-none tracking-tight">
                          {user?.name?.split(' ')[0] || 'Hola'}
                          <span className="text-brand-primary">.</span>
                      </h1>
                  </div>
              </div>

              <div className="flex gap-3">
                  <AnimatePresence>
                      <SyncIconButton />
                  </AnimatePresence>

                  <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsNotifOpen(true)}
                      className="w-8 h-8 flex items-center justify-center text-text-muted relative transition-all hover:text-text-primary"
                  >
                      <Bell size={18} />

                      {(sales.filter(s => getDaysRemaining(s.expiryDate) <= warningDays).length > 0) && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-brand-accent rounded-full shadow-dot-accent" />
                      )}
                  </motion.button>
              </div>
          </div>

          {/* ================= TARJETA PRINCIPAL (Balance) ================= */}
          {widgets.showSales && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
                <div className="relative z-10 overflow-hidden rounded-lg bg-brand-gradient shadow-2xl p-3.5 transition-all duration-500 active:scale-[0.99]">

                    {/* Balance */}
                    <div className="flex justify-between items-start relative z-20">
                        <div className="flex flex-col">
                            <span className="flex items-center gap-2 text-white/70 text-micro font-black uppercase tracking-[0.2em] mb-2">
                                <PiggyBank size={12} className="text-white" />
                                Balance Total
                            </span>

                            <div className="flex items-baseline gap-1.5">
                                <span className="text-lg font-bold text-white/60">
                                  {settings.currency}
                                </span>

                                <h2 className="text-4xl font-black text-white tracking-tight">
                                    {showBalance ? formatMoney(walletStats.totalMain).split('.')[0] : '•••••'}

                                    <span className="text-2xl text-white/50">
                                      .{showBalance ? formatMoney(walletStats.totalMain).split('.')[1] : '••'}
                                    </span>
                                </h2>
                            </div>

                            {settings.subCurrency && (
                                <p className="text-white/70 text-tiny font-semibold mt-1 flex items-center gap-1.5">
                                    <RotateCcw size={9} className="text-white/70" />
                                    {showBalance ? formatMoney(walletStats.secondaryTotal) : '••••'} {settings.subCurrency}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col items-end gap-3">
                             <button aria-label="Mostrar u ocultar contraseña"
                               onClick={toggleBalance}
                               className="tap-44 w-8 h-8 flex items-center justify-center text-white transition-all"
                             >
                                {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
                             </button>

                             <span className="text-micro font-black text-brand-lime tracking-wider">
                               ACTIVO
                             </span>
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-micro font-semibold uppercase tracking-wider relative z-20">
                        <div className="flex items-center gap-1.5 text-white/60">
                             <div className={`w-1 h-1 rounded-full ${syncFooter.dot}`} />

                             {syncFooter.label}
                        </div>

                        <button
                          onClick={() => setView('reports')}
                          className="flex items-center gap-1 text-white/60 hover:text-white transition-colors"
                        >
                            Ver Reportes
                            <ChevronRight size={10} />
                        </button>
                    </div>
                </div>
            </motion.div>
          )}

          <SubscriptionAlert />
          <OnboardingWidget onNavigate={setView} />

          {/* Bento Grid Stats */}
          {widgets.showProfit && (
            <div className="grid grid-cols-2 gap-3">

              <motion.div 
                whileHover={{ y: -2 }}
                className="bg-surface-1/50 border border-hairline rounded-xl p-3 shadow-sm hover:border-status-success/30 transition-all group overflow-hidden relative"
              >
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-7 h-7 rounded-sm bg-status-success/10 text-status-success-soft flex items-center justify-center transition-transform group-hover:scale-105">
                      <TrendingUp size={14} strokeWidth={2.5} />
                   </div>

                   <p className="text-tiny text-text-secondary font-black uppercase tracking-[0.05em]">
                     VENTAS
                   </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-tiny text-text-disabled font-black uppercase">
                    {settings.currency}
                  </span>

                  <p className="text-xl font-black text-text-primary tracking-tighter leading-none">
                    {formatMoney(salesThisMonth)}
                  </p>
                </div>
              </motion.div>

              <motion.div 
                 whileHover={{ y: -2 }}
                 className="bg-surface-1/50 border border-hairline rounded-xl p-3 shadow-sm hover:border-rose-500/30 transition-all group overflow-hidden relative"
              >
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-7 h-7 rounded-sm bg-rose-500/10 text-rose-400 flex items-center justify-center transition-transform group-hover:scale-105">
                      <TrendingDown size={14} strokeWidth={2.5} />
                   </div>

                   <p className="text-tiny text-text-secondary font-black uppercase tracking-[0.05em]">
                     GASTOS
                   </p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-tiny text-text-disabled font-black uppercase">
                    {settings.currency}
                  </span>

                  <p className="text-xl font-black text-text-primary tracking-tighter leading-none">
                    {formatMoney(financeStats.expense)}
                  </p>
                </div>
              </motion.div>

            </div>
          )}

          {/* ================= ATAJOS RÁPIDOS ================= */}
          {widgets.showQuickActions && (
            <div className="px-1">
              <div className="grid grid-cols-4 gap-y-4">

                <button
                  onClick={() => setIsConfigModalOpen(true)}
                  className="flex flex-col items-center gap-1.5 active:scale-95 transition-all"
                >
                  <div className="w-[52px] h-[52px] rounded-md bg-brand-gradient shadow-glow-sm flex items-center justify-center">
                    <SlidersHorizontal
                      size={20}
                      className="text-white"
                      strokeWidth={2.25}
                    />
                  </div>

                  <span className="text-[10.5px] font-semibold text-text-primary leading-none">
                    Editar
                  </span>
                </button>

                {renderedActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className="flex flex-col items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <div className="w-[52px] h-[52px] rounded-md bg-surface-4 flex items-center justify-center">
                      <action.icon
                        size={20}
                        className="text-text-secondary"
                        strokeWidth={2}
                      />
                    </div>

                    <span className="text-[10.5px] font-medium text-text-secondary leading-none truncate max-w-[60px]">
                      {action.label}
                    </span>
                  </button>
                ))}

              </div>
            </div>
          )}

          {/* Tasa de cambio */}
          {widgets.showExchangeRate && (
            <div className="bg-surface-1 border border-border-subtle rounded-xl p-3.5 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-[rgb(var(--fg-rgb))]/5 text-text-muted flex items-center justify-center shrink-0">
                <RefreshCw size={16} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-tiny font-black text-text-disabled uppercase tracking-wider mb-0.5">
                  Tasa de cambio
                </p>

                {isEditingRate ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      type="number"
                      inputMode="decimal"
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      className="w-24 h-7 px-2 rounded-md bg-surface-sunken border border-brand-primary/30 text-label text-text-primary outline-none focus:ring-2 focus:ring-brand-primary/40"
                    />

                    <span className="text-caption text-text-muted">
                      {settings.subCurrency || 'Bs'}
                    </span>

                    <button aria-label="Confirmar"
                      onClick={handleSaveRate}
                      className="tap-44 w-6 h-6 rounded-md bg-status-success/15 text-status-success-soft flex items-center justify-center active:scale-90"
                    >
                      <Check size={12} />
                    </button>

                    <button aria-label="Cerrar"
                      onClick={() => setIsEditingRate(false)}
                      className="tap-44 w-6 h-6 rounded-md bg-[rgb(var(--fg-rgb))]/5 text-text-disabled flex items-center justify-center active:scale-90"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setRateInput(String(settings.exchangeRate || ''));
                      setIsEditingRate(true);
                    }}
                    className="flex items-center gap-1.5"
                  >
                    <span className="text-sm font-bold text-text-primary">
                      1 {settings.currency || 'USD'} = {(settings.exchangeRate || 0).toLocaleString()} {settings.subCurrency || 'Bs'}
                    </span>

                    <Pencil size={11} className="text-brand-primary" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Vencimientos · Ventas */}
          {widgets.showExpiringSales && expiringSalesGroups.length > 0 && (
            <div>
              <div className="flex justify-between items-center px-1 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-status-danger/15 text-status-danger-soft flex items-center justify-center">
                    <AlertTriangle size={14} />
                  </div>

                  <h3 className="text-sm font-bold text-text-primary tracking-tight">
                    Vencimientos · Ventas
                  </h3>

                  <span className="text-micro font-bold px-1.5 py-0.5 rounded-full bg-status-danger/15 text-status-danger-soft">
                    {expiringSalesGroups.length}
                  </span>
                </div>

                <button
                  onClick={() => setView('expired')}
                  className="text-tiny font-bold uppercase tracking-[0.12em] text-brand-primary hover:text-text-primary transition-colors flex items-center gap-1"
                >
                  Ver todos <ChevronRight size={12} />
                </button>
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar pr-0.5">
                {expiringSalesGroups.map(group => {
                  const groupSales = group.renewalGroups.flatMap(g => g.sales);

                  const client: Client = {
                    id: group.clientId,
                    name: group.clientName,
                    phone: group.clientPhone,
                    registrationDate: '',
                    activeServices: 0
                  } as Client;

                  return (
                    <ExpiredCard
                      key={group.clientId}
                      sales={groupSales}
                      client={client}
                      settings={settings}
                      onRenew={handleRenewFromDashboard}
                      onClick={() => setView('expired')}
                      onMessageClick={handleSendExpiryReminder}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Vencimientos · Cuentas */}
          {widgets.showExpiringAccounts && expiringAccountsList.length > 0 && (
            <div>
              <div className="flex justify-between items-center px-1 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-status-warning/15 text-status-warning-soft flex items-center justify-center">
                    <AlertOctagon size={14} />
                  </div>

                  <h3 className="text-sm font-bold text-text-primary tracking-tight">
                    Vencimientos · Cuentas
                  </h3>

                  <span className="text-micro font-bold px-1.5 py-0.5 rounded-full bg-status-warning/15 text-status-warning-soft">
                    {expiringAccountsList.length}
                  </span>
                </div>

                <button
                  onClick={() => setView('expired')}
                  className="text-tiny font-bold uppercase tracking-[0.12em] text-brand-primary hover:text-text-primary transition-colors flex items-center gap-1"
                >
                  Ver todos <ChevronRight size={12} />
                </button>
              </div>

              <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-0.5">
                {expiringAccountsList.map(acc => {
                  const days = getDaysRemaining(acc.endDate);
                  const isExpired = days < 0;
                  const service = services.find(s => s.id === acc.serviceId);

                  return (
                    <div
                      key={acc.id}
                      onClick={() => setView('expired')}
                      className="bg-surface-1 border border-border-subtle rounded-xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${isExpired ? 'bg-status-danger/10 text-status-danger-soft' : 'bg-status-warning/10 text-status-warning-soft'}`}>
                        {service?.image_url ? (
                          <img
                            src={service.image_url}
                            alt={service.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <AlertOctagon size={15} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-text-primary truncate">
                          {service?.name || 'Servicio'}
                        </p>

                        <p className="text-tiny text-text-disabled truncate">
                          {acc.email}
                        </p>
                      </div>

                      <span className={`text-micro font-bold px-2 py-0.5 rounded uppercase tracking-wide shrink-0 ${isExpired ? 'bg-status-danger/10 text-status-danger-soft' : 'bg-status-warning/10 text-status-warning-soft'}`}>
                        {isExpired
                          ? `Vencida ${Math.abs(days)}d`
                          : days === 0
                            ? 'Hoy'
                            : `${days}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock */}
          {widgets.showStock && stockDataByUrgency.length > 0 && (
            <div>
              <div className="flex justify-between items-center px-1 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-status-success/15 text-status-success-soft flex items-center justify-center">
                    <Search size={14} />
                  </div>

                  <h3 className="text-sm font-bold text-text-primary tracking-tight">
                    Stock
                  </h3>

                  <span className="text-micro font-bold px-1.5 py-0.5 rounded-full bg-[rgb(var(--fg-rgb))]/10 text-text-disabled">
                    {stockDataByUrgency.length}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setSelectedStockService(null);
                    setIsStockFinderOpen(true);
                  }}
                  className="text-tiny font-bold uppercase tracking-[0.12em] text-brand-primary hover:text-text-primary transition-colors flex items-center gap-1"
                >
                  Ver todos <ChevronRight size={12} />
                </button>
              </div>

              <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-0.5">
                {stockDataByUrgency.map(svc => {
                  const isOut = svc.totalFree === 0;
                  const isLow = !isOut && svc.totalFree <= 2;

                  const tone = isOut
                    ? {
                        bg: 'bg-status-danger/[0.06]',
                        border: 'border-status-danger/20',
                        chip: 'bg-status-danger/15 text-status-danger-soft',
                        text: 'text-status-danger-soft',
                        label: 'Sin stock'
                      }
                    : isLow
                      ? {
                          bg: 'bg-status-warning/[0.06]',
                          border: 'border-status-warning/20',
                          chip: 'bg-status-warning/15 text-status-warning-soft',
                          text: 'text-status-warning-soft',
                          label: 'Quedan pocos'
                        }
                      : {
                          bg: 'bg-surface-1',
                          border: 'border-border-subtle',
                          chip: 'bg-status-success/10 text-status-success-soft',
                          text: 'text-status-success-soft',
                          label: 'Disponible'
                        };

                  return (
                    <div
                      key={svc.id}
                      onClick={() => setSelectedStockService(svc)}
                      className={`${tone.bg} border ${tone.border} rounded-xl p-3 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer shadow-sm`}
                    >
                      <div className={`w-9 h-9 rounded-lg ${tone.chip} flex items-center justify-center shrink-0 overflow-hidden`}>
                        {svc.image_url ? (
                          <img
                            src={svc.image_url}
                            alt={svc.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Layers size={15} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-text-primary truncate">
                          {svc.name}
                        </p>

                        <p className={`text-tiny ${isOut || isLow ? tone.text : 'text-text-disabled'}`}>
                          {tone.label}
                        </p>
                      </div>

                      <span className={`text-base font-black shrink-0 ${tone.text}`}>
                        {svc.totalFree}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Agenda (fallas pendientes) */}
          {widgets.showAgenda && pendingFailures.length > 0 && (
            <div>
              <div className="flex justify-between items-center px-1 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-primary/15 text-brand-primary flex items-center justify-center">
                    <ClipboardList size={14} />
                  </div>

                  <h3 className="text-sm font-bold text-text-primary tracking-tight">
                    Agenda
                  </h3>

                  <span className="text-micro font-bold px-1.5 py-0.5 rounded-full bg-brand-primary/15 text-brand-primary">
                    {pendingFailures.length}
                  </span>
                </div>

                <button
                  onClick={() => setView('agenda')}
                  className="text-tiny font-bold uppercase tracking-[0.12em] text-brand-primary hover:text-text-primary transition-colors flex items-center gap-1"
                >
                  Ver todas <ChevronRight size={12} />
                </button>
              </div>

              <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-0.5">
                {pendingFailures.map(f => {
                  const sale = sales.find(s => s.id === f.saleId);
                  const client = sale ? clients.find(c => c.id === sale.clientId) : null;

                  const daysAgo = Math.max(
                    0,
                    Math.floor(
                      (Date.now() - new Date(f.createdAt).getTime()) /
                      (1000 * 3600 * 24)
                    )
                  );

                  const timeLabel =
                    daysAgo === 0
                      ? 'hoy'
                      : daysAgo === 1
                        ? 'hace 1 día'
                        : `hace ${daysAgo} días`;

                  const tone = daysAgo >= 3
                    ? {
                        bg: 'bg-status-danger/10',
                        text: 'text-status-danger-soft'
                      }
                    : daysAgo >= 1
                      ? {
                          bg: 'bg-status-warning/10',
                          text: 'text-status-warning-soft'
                        }
                      : {
                          bg: 'bg-brand-primary/10',
                          text: 'text-brand-primary'
                        };

                  return (
                    <div
                      key={f.id}
                      className="bg-surface-1 border border-border-subtle rounded-xl p-3 flex items-start gap-3 shadow-sm"
                    >
                      <div
                        onClick={() => setView('agenda')}
                        className={`w-9 h-9 rounded-lg ${tone.bg} ${tone.text} flex items-center justify-center shrink-0 cursor-pointer mt-0.5`}
                      >
                        <AlertTriangle size={15} />
                      </div>

                      <div
                        onClick={() => setView('agenda')}
                        className="flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-text-primary truncate">
                            {client?.name || 'Cliente'} {sale ? `· ${sale.serviceName}` : ''}
                          </p>

                          <span className={`text-micro font-semibold ${tone.text} shrink-0`}>
                            {timeLabel}
                          </span>
                        </div>

                        <p className="text-tiny text-text-disabled truncate mt-0.5">
                          {f.notes || 'Sin notas'}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFailure(f.id);
                        }}
                        className="tap-44 w-7 h-7 rounded-lg bg-status-success/15 text-status-success-soft flex items-center justify-center shrink-0 active:scale-90 transition-all mt-0.5"
                        title="Marcar como resuelto"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {widgets.showMovements && (
            <div className="pb-10">
              <div className="flex justify-between items-center px-1 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-primary/15 text-brand-primary flex items-center justify-center">
                    <ArrowUpRight size={14} />
                  </div>

                  <h3 className="text-sm font-bold text-text-primary tracking-tight">
                    Últimos movimientos
                  </h3>
                </div>

                <button
                  onClick={() => {
                    haptic('nav');
                    setView('accounts');
                  }}
                  className="text-tiny font-bold uppercase tracking-[0.12em] text-brand-primary hover:text-text-primary transition-colors flex items-center gap-1"
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
                      className="bg-surface-1 border border-border-subtle rounded-xl p-3 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isIncome ? 'bg-status-success/10 text-status-success-soft' : 'bg-status-danger/10 text-status-danger-soft'}`}>
                          {isIncome ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-text-primary truncate">
                            {mov.description || 'Movimiento'}
                          </p>

                          <p className="text-tiny text-text-disabled">
                            {new Date(mov.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 ml-2">
                        <span className={`text-sm font-bold ${isIncome ? 'text-status-success-soft' : 'text-status-danger-soft'}`}>
                          {isIncome ? '+' : '-'}{mov.amount}
                        </span>

                        <span className="text-micro text-text-disabled uppercase">
                          {mov.paymentMethod || 'Manual'}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {monthlyMovements.length === 0 && (
                  <div className="py-12 text-center text-text-disabled text-xs bg-surface-1 border border-hairline rounded-xl">
                    No hay movimientos este mes.
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => setView('personalize_home')}
            className="w-full py-3 rounded-xl border border-dashed border-border-strong text-text-disabled hover:text-text-primary hover:border-brand-primary/40 transition-all flex items-center justify-center gap-2 text-caption font-semibold uppercase tracking-wide"
          >
            <Plus size={14} /> Agregar widgets
          </button>
      </div>

      <ScrollFloatingActions actions={actions} />

      <SaleModal
        isOpen={isSaleModalOpen}
        onClose={() => setIsSaleModalOpen(false)}
        initialData={null}
      />

      <RenewModal
        isOpen={isRenewModalOpen}
        onClose={() => setIsRenewModalOpen(false)}
        salesToRenew={salesToRenew}
      />

      <ContactoModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSubmit={handleClientSubmit}
      />

      <PayableModal
        isOpen={isPayableModalOpen}
        onClose={() => setIsPayableModalOpen(false)}
        onSubmit={handlePayableSubmit}
      />

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      />

      <ServiceFormModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        initialData={null}
      />

      <WidgetConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        widgets={widgets}
        toggleWidget={toggleWidget}
        toggleQuickAction={toggleQuickAction}
      />

      <ResellerModal
        isOpen={isResellerModalOpen}
        onClose={() => setIsResellerModalOpen(false)}
        onSubmit={handleResellerSubmit}
      />

      <ProviderModal
        isOpen={isProviderModalOpen}
        onClose={() => setIsProviderModalOpen(false)}
        onSubmit={handleProviderSubmit}
      />

      <TransactionModal
        isOpen={isTransactionOpen}
        onClose={() => setIsTransactionOpen(false)}
        account={transactionAccount}
        mode={transactionMode}
      />

      <MovementsModal
        isOpen={isMovementsModalOpen}
        onClose={() => setIsMovementsModalOpen(false)}
        account={historyAccount}
      />

      <AccountFormModal
        isOpen={isAccountFormOpen}
        onClose={() => setIsAccountFormOpen(false)}
        onSubmit={handleAccountFormSubmit}
        initialData={editingAccount}
      />

      <MovementDetailModal
        isOpen={!!selectedMovement}
        onClose={() => setSelectedMovement(null)}
        movement={selectedMovement}
        settings={settings}
      />

      {/* MODAL BUSCADOR DE STOCK */}
      <Modal
        isOpen={isStockFinderOpen}
        onClose={() => setIsStockFinderOpen(false)}
        title="Consulta de Stock"
      >
         <div className="flex flex-col gap-3 pt-1">

            <div className="relative mb-2">
               <Search
                 className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled"
                 size={16}
               />

               <input aria-label="Filtrar por plataforma..."
                 placeholder="Filtrar por plataforma..."
                 className="w-full bg-surface-3 border border-hairline rounded-md pl-11 pr-4 py-3 text-sm text-text-primary outline-none"
               />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
               {stockData.map(s => (
                  <button 
                     key={s.id} 
                     onClick={() => setSelectedStockService(s)}
                     className="w-full p-4 rounded-xl bg-surface-1 border border-hairline flex justify-between items-center hover:border-status-success/40 transition-all active:scale-[0.98]"
                  >
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-md bg-status-success/10 flex items-center justify-center text-status-success-soft border border-status-success/20">
                          <Layers size={20} />
                        </div>

                        <span className="text-sm font-bold text-text-primary">
                          {s.name}
                        </span>
                     </div>

                     <div className="text-right">
                        <span className="text-lg font-black text-status-success-soft block leading-none">
                          {s.totalFree}
                        </span>

                        <span className="text-nano text-text-faint font-semibold uppercase tracking-widest">
                          Cupos Libres
                        </span>
                     </div>
                  </button>
               ))}

               {stockData.length === 0 && (
                  <div className="py-20 text-center opacity-30">
                     <Box size={40} className="mx-auto mb-2" />
                     <p className="text-xs">
                       Sin stock disponible actualmente.
                     </p>
                  </div>
               )}
            </div>
         </div>
      </Modal>

      {/* MODAL DETALLE DE CUENTAS POR SERVICIO SELECCIONADO */}
      <Modal
        isOpen={!!selectedStockService}
        onClose={() => setSelectedStockService(null)}
        title={`Stock: ${selectedStockService?.name}`}
      >
          <div className="space-y-3 pt-1">

              <p className="text-tiny font-semibold text-text-disabled uppercase tracking-widest mb-2 ml-1">
                Cuentas con cupo libre
              </p>

              <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                  {selectedStockService?.accounts.map((acc: any) => (
                      <div
                        key={acc.id}
                        className="bg-surface-3 border border-hairline p-4 rounded-xl flex justify-between items-center group relative overflow-hidden"
                      >
                          <div className="min-w-0 pr-2">
                              <p className="text-xs font-semibold text-text-primary truncate">
                                {acc.email}
                              </p>

                              <div className="flex items-center gap-2 mt-1">
                                 <Key size={10} className="text-text-faint" />

                                 <p className="text-tiny text-text-disabled font-mono group-hover:text-text-secondary">
                                   {acc.password}
                                 </p>
                              </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                  <span className="text-base font-black text-status-success-soft leading-none">
                                    {acc.available}
                                  </span>

                                  <p className="text-nano text-text-faint font-bold uppercase text-right">
                                    Cupos
                                  </p>
                              </div>

                              <button aria-label="Copiar" 
                                 onClick={() => {
                                   navigator.clipboard.writeText(`📧 ${acc.email}\n🔑 ${acc.password}`);
                                   showToast('Credenciales copiadas', 'success');
                                 }} 
                                 className="tap-44 w-8 h-8 flex items-center justify-center bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 rounded-lg text-text-disabled hover:text-text-primary transition-all active:scale-90"
                              >
                                 <Copy size={14}/>
                              </button>
                          </div>
                      </div>
                  ))}
              </div>

              <button
                onClick={() => setSelectedStockService(null)}
                className="w-full py-4 text-text-disabled text-xs font-semibold uppercase tracking-widest mt-2 active:text-text-primary flex items-center justify-center gap-2"
              >
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
