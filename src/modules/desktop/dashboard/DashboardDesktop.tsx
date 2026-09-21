import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useHaptic } from '../../../hooks/useHaptic';
import { useUIStore } from '../../../store/uiStore';
import { useOfflineSync } from '../../../hooks/useOfflineSync';
import { useDashboardWidgets } from '../../../hooks/useDashboardWidgets';
import {
  TrendingUp, TrendingDown, ShoppingCart, Layers, Receipt, Bell, Eye, EyeOff, Search,
  ChevronRight, SlidersHorizontal, PiggyBank, RotateCcw, AlertOctagon, CheckCircle2,
  RefreshCw, User, Briefcase, Truck, UserPlus, BarChart3, ArrowLeft, Copy, Key,
  ArrowUpRight, ArrowDownRight, ClipboardList, Trash2, Box, Cloud, CloudOff, UploadCloud,
  CalendarClock, LineChart, ArrowRight
} from 'lucide-react';
import { Movement, Sale, Reseller, Provider, Client } from '../../../types';
import { calculateOccupancy } from '../../../utils/inventarioUtils';
import { getDaysRemaining } from '../../../utils/expiredUtils';

// Modals y widgets
import NotificationCenter from '../../../components/ui/NotificationCenter';
import SaleModal from '../../../components/sales/SaleModal';
import RenewModal from '../../../components/sales/RenewModal';
import ContactoModal from '../../../components/contactos/ContactoModal';
import ExpenseModal from '../../../components/accounting/ExpenseModal';
import ServiceFormModal from '../../../components/services/ServiceFormModal';
import ResellerModal from '../../../components/revendedores/ResellerModal';
import ProviderModal from '../../../components/providers/ProviderModal';
import Modal from '../../../components/ui/Modal';
import SubscriptionAlert from '../../../components/ui/SubscriptionAlert';
import OnboardingWidget from '../../../components/dashboard/OnboardingWidget';
import SyncStatusWidget from '../../../components/dashboard/SyncStatusWidget';
import SyncQueueModal from '../../../components/dashboard/SyncQueueModal';
import WidgetConfigModal from '../../../components/dashboard/WidgetConfigModal';

// --- HELPERS ---

// index.css aplica a TODOS los inputs fondo, borde, radio de 16px, anillo de foco y
// font-size: 16px !important. Esta clase los neutraliza para inputs que viven dentro
// de un contenedor con su propio estilo (el contenedor dibuja el borde y el foco).
const CLEAN_INPUT = "w-full min-w-0 !bg-transparent !border-0 !ring-0 focus:!ring-0 !rounded-none !p-0 !m-0 outline-none appearance-none";

const CARD = "bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl transition-colors hover:border-[rgb(var(--fg-rgb))]/[0.14]";

const SECTION_LABEL = "text-[11px] font-bold text-text-disabled uppercase tracking-widest";

const formatMoney = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const isSameDay = (iso: string, day: Date) => {
  const d = new Date(iso);
  return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
};

// Barras pequeñas (últimos 12 días). El color viene de la clase text-* del contenedor.
const MiniBars: React.FC<{ data: number[]; className: string }> = ({ data, className }) => {
  const max = Math.max(...data, 0);
  const barWidth = 120 / data.length;
  return (
    <svg viewBox="0 0 120 36" preserveAspectRatio="none" className={`w-full h-9 ${className}`} aria-hidden="true">
      {data.map((value, i) => {
        const height = max > 0 ? Math.max(2, (value / max) * 34) : 2;
        return <rect key={i} x={i * barWidth + 1} y={36 - height} width={barWidth - 3} height={height} rx={1.5} fill="currentColor" opacity={i === data.length - 1 ? 1 : 0.45} />;
      })}
    </svg>
  );
};

type ProfitStatus = 'loss' | 'low' | 'normal';

const PROFIT_UI: Record<ProfitStatus, { label: string; pill: string; text: string; bar: string }> = {
  loss: { label: 'Pérdida', pill: 'bg-status-danger/10 text-status-danger-soft', text: 'text-status-danger-soft', bar: 'bg-status-danger' },
  low: { label: 'Baja', pill: 'bg-status-warning/10 text-status-warning-soft', text: 'text-status-warning-soft', bar: 'bg-status-warning' },
  normal: { label: 'Normal', pill: 'bg-status-success/10 text-status-success-soft', text: 'text-status-success-soft', bar: 'bg-status-success' },
};

const getExpiryPill = (days: number) => {
  if (days < 0) return { label: 'Vencida', cls: 'bg-status-danger/10 text-status-danger-soft' };
  if (days === 0) return { label: 'Hoy', cls: 'bg-status-warning/10 text-status-warning-soft' };
  if (days <= 3) return { label: `${days} d`, cls: 'bg-status-warning/10 text-status-warning-soft' };
  return { label: `${days} d`, cls: 'bg-status-success/10 text-status-success-soft' };
};

// --- DETALLE DE MOVIMIENTO ---

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
                <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-5 space-y-4 shadow-sm">
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

// --- DASHBOARD DE ESCRITORIO ---

const DashboardDesktop: React.FC = () => {
  const {
    sales, movements, settings, financialAccounts, accounts, services, clients,
    addClient, expenses, addReseller, addProvider
  } = useData();
  const { user } = useAuth();
  const { showToast } = useToast();
  const haptic = useHaptic();
  const { setView } = useUIStore();
  const { isOnline, isSyncing, pendingItems, pendingCount } = useOfflineSync();
  const { widgets, toggleWidget, toggleQuickAction } = useDashboardWidgets();

  // Visibilidad del balance desde el store global
  const showBalance = useUIStore(state => state.showBalance);
  const setShowBalance = useUIStore(state => state.setShowBalance);

  // Modals
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isResellerModalOpen, setIsResellerModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isStockFinderOpen, setIsStockFinderOpen] = useState(false);
  const [selectedStockService, setSelectedStockService] = useState<any | null>(null);
  const [stockFilter, setStockFilter] = useState('');
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [salesToRenew, setSalesToRenew] = useState<Sale[]>([]);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

  // --- CÁLCULOS ---

  const salesThisMonthList = useMemo(() => {
    const now = new Date();
    return sales.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [sales]);

  const salesThisMonth = useMemo(() => salesThisMonthList.reduce((acc, s) => acc + s.amount, 0), [salesThisMonthList]);

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

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  const todayLabel = useMemo(() => new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }), []);

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

  const activeWalletsCount = financialAccounts.filter(acc => acc.isActive !== false).length;

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
    const expenseCount = movements
        .filter(m => (m.type === 'withdrawal' || m.type === 'transfer_out') && isThisMonth(m.date)).length;
    return { income, expense, expenseCount, profit: income - expense };
  }, [sales, movements, settings]);

  const { realMonthlyProfit, profitRevenue } = useMemo(() => {
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
      return { realMonthlyProfit: grossProfit - personalExpenses, profitRevenue: revenue };
  }, [movements, services, expenses, settings.analyticsPreferences]);

  const profitStatus: ProfitStatus = useMemo(() => {
      if (realMonthlyProfit < 3) return 'loss'; 
      if (realMonthlyProfit >= 3 && realMonthlyProfit <= 5) return 'low'; 
      return 'normal'; 
  }, [realMonthlyProfit]);

  const profitUi = PROFIT_UI[profitStatus];

  const profitMargin = profitRevenue > 0 ? Math.max(0, Math.min(100, Math.round((realMonthlyProfit / profitRevenue) * 100))) : 0;

  const monthlyMovements = useMemo(() => {
      const now = new Date();
      return movements.filter(m => {
          const d = new Date(m.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); 
  }, [movements]);

  // Últimos 12 días para las barras de Ventas y Gastos
  const { salesSeries, expenseSeries } = useMemo(() => {
    const days: Date[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push(d);
    }
    const isExpense = (m: Movement) => m.type === 'withdrawal' || m.type === 'transfer_out';
    return {
      salesSeries: days.map(day => sales.filter(s => isSameDay(s.date, day)).reduce((acc, s) => acc + s.amount, 0)),
      expenseSeries: days.map(day => movements.filter(m => isExpense(m) && isSameDay(m.date, day)).reduce((acc, m) => acc + (m.usdEquivalent || convertToMain(m.amount, m.currency)), 0)),
    };
  }, [sales, movements, settings]);

  // Ventas que vencen en 7 días o menos (las de cuentas en falla tienen el tiempo congelado y no cuentan)
  const expiringSales = useMemo(() => {
    return sales
      .map(sale => {
        const account = accounts.find(a => a.id === sale.accountId);
        return { sale, account, days: getDaysRemaining(sale.expiryDate, account) };
      })
      .filter(item => item.account?.status !== 'fallando' && item.days <= 7)
      .sort((a, b) => a.days - b.days);
  }, [sales, accounts]);

  const failingAccounts = useMemo(() => accounts.filter(a => a.status === 'fallando'), [accounts]);
  const affectedClientsCount = useMemo(() => {
    const failingIds = new Set(failingAccounts.map(a => a.id));
    return new Set(sales.filter(s => failingIds.has(s.accountId)).map(s => s.clientId)).size;
  }, [failingAccounts, sales]);

  const filteredStock = useMemo(() => {
    const q = stockFilter.trim().toLowerCase();
    return q ? stockData.filter(s => s.name.toLowerCase().includes(q)) : stockData;
  }, [stockData, stockFilter]);

  // --- HANDLERS ---

  const toggleBalance = () => { haptic(); setShowBalance(!showBalance); };
  const handleClientSubmit = (client: Client) => { addClient(client); showToast('Cliente registrado', 'success'); };

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

  const openStockFinder = () => { haptic('nav'); setSelectedStockService(null); setStockFilter(''); setIsStockFinderOpen(true); };

  const openRenew = (sale: Sale) => { haptic('nav'); setSalesToRenew([sale]); setIsRenewModalOpen(true); };

  // Atajos rápidos configurables (los ids se eligen en "Editar")
  const quickActionsConfig: Record<string, { label: string; icon: React.ElementType; color: string; onClick: () => void }> = {
    sale: { label: 'Vender', icon: ShoppingCart, color: 'text-brand-primary', onClick: () => setIsSaleModalOpen(true) },
    expense: { label: 'Gasto', icon: Receipt, color: 'text-brand-accent', onClick: () => setIsExpenseModalOpen(true) },
    stock: { label: 'Stock', icon: Search, color: 'text-status-success', onClick: openStockFinder },
    services: { label: 'Servicios', icon: Layers, color: 'text-status-info-soft', onClick: () => setIsServiceModalOpen(true) },
    expired: { label: 'Vencidas', icon: AlertOctagon, color: 'text-status-danger-soft', onClick: () => setView('expired') },
    add_client: { label: 'Cliente', icon: UserPlus, color: 'text-indigo-400', onClick: () => setIsClientModalOpen(true) },
    add_reseller: { label: 'Revendedor', icon: Briefcase, color: 'text-status-warning-soft', onClick: () => setIsResellerModalOpen(true) },
    add_provider: { label: 'Proveedor', icon: Truck, color: 'text-cyan-400', onClick: () => setIsProviderModalOpen(true) },
    agenda: { label: 'Agenda', icon: ClipboardList, color: 'text-status-danger-soft', onClick: () => setView('agenda') },
    trash: { label: 'Papelera', icon: Trash2, color: 'text-text-disabled', onClick: () => setView('trash') },
    reports: { label: 'Reportes', icon: BarChart3, color: 'text-purple-400', onClick: () => setView('reports') },
  };
  const renderedActions = (widgets.quickActions || []).map(id => quickActionsConfig[id]).filter(Boolean);

  // Estado de sincronización (chip del encabezado)
  const syncChip = isSyncing
    ? { label: 'Sincronizando', cls: 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary', icon: <RefreshCw size={14} className="animate-spin" /> }
    : !isOnline
      ? { label: 'Sin conexión', cls: 'bg-status-danger/10 border-status-danger/20 text-status-danger-soft', icon: <CloudOff size={14} /> }
      : pendingCount > 0
        ? { label: `${pendingCount} pendientes`, cls: 'bg-brand-lime/10 border-brand-lime/20 text-brand-lime', icon: <UploadCloud size={14} /> }
        : { label: 'Sincronizado', cls: 'bg-status-success/10 border-status-success/20 text-status-success-soft', icon: <Cloud size={14} /> };

  const hasKpiRow = widgets.showSales || widgets.showProfit;
  const kpiGridCols = widgets.showSales && widgets.showProfit
    ? 'grid-cols-2 xl:grid-cols-[1.7fr_1fr_1fr_1fr]'
    : widgets.showSales ? 'grid-cols-1' : 'grid-cols-3';
  const hasSidePanel = widgets.showExchangeRate || widgets.showInventory;

  return (
    <div className="animate-fade-in w-full pb-6 text-text-primary">
      <SyncQueueModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} pendingItems={pendingItems} isOnline={isOnline} />

      {/* ───────── ENCABEZADO ───────── */}
      <div className="flex items-center justify-between gap-6 mb-5">
        <div className="min-w-0">
          <p className={SECTION_LABEL}>{greeting}</p>
          <h1 className="text-3xl font-black tracking-tighter leading-tight mt-1 truncate">
            {user?.name?.split(' ')[0] || 'Hola'}<span className="text-brand-primary">.</span>
          </h1>
          <p className="text-[13px] text-text-disabled mt-0.5 first-letter:uppercase">{todayLabel}</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => pendingCount > 0 && setIsSyncModalOpen(true)}
            className={`h-10 px-4 rounded-full border text-xs font-semibold flex items-center gap-2 transition-colors ${syncChip.cls}`}
          >
            {syncChip.icon} {syncChip.label}
          </button>
          <button
            onClick={() => { haptic('nav'); setIsNotifOpen(true); }}
            aria-label="Notificaciones"
            className="relative w-11 h-11 rounded-md bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            <Bell size={18} />
            {sales.some(s => getDaysRemaining(s.expiryDate) <= 1) && (
              <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-brand-accent rounded-full shadow-[0_0_10px_#FF1493]" />
            )}
          </button>
          <button
            onClick={() => { haptic('nav'); setIsExpenseModalOpen(true); }}
            className="h-11 px-5 rounded-md bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 hover:bg-surface-4 text-sm font-semibold text-text-secondary hover:text-text-primary flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Receipt size={17} className="text-brand-accent" /> Registrar gasto
          </button>
          <button
            onClick={() => { haptic('nav'); setIsSaleModalOpen(true); }}
            className="btn-primary h-11 px-5 rounded-md text-sm flex items-center justify-center gap-2"
          >
            <ShoppingCart size={17} /> Nueva venta
          </button>
        </div>
      </div>

      {/* Avisos (suscripción, sincronización, primeros pasos): no ocupan espacio si no hay ninguno */}
      <div className="space-y-3 mb-5 empty:hidden">
        <SubscriptionAlert />
        <SyncStatusWidget />
        <OnboardingWidget onNavigate={setView} />
      </div>

      {/* ───────── MÉTRICAS ───────── */}
      {hasKpiRow && (
        <div className={`grid gap-3 ${kpiGridCols}`}>

          {widgets.showSales && (
            <div className={`${CARD} p-6 flex flex-col justify-between min-h-[196px] ${widgets.showProfit ? 'col-span-2 xl:col-span-1' : ''}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className={`${SECTION_LABEL} flex items-center gap-2`}><PiggyBank size={15} className="text-brand-primary" /> Balance total</p>
                  <div className="flex items-baseline gap-2 mt-3.5">
                    <span className="text-lg font-bold text-text-faint">{settings.currency}</span>
                    <h2 className="text-4xl xl:text-[44px] font-black tracking-tighter leading-none">
                      {showBalance ? formatMoney(walletStats.totalMain).split('.')[0] : '•••••'}
                      <span className="text-2xl text-text-disabled opacity-60">.{showBalance ? formatMoney(walletStats.totalMain).split('.')[1] : '••'}</span>
                    </h2>
                  </div>
                  {settings.subCurrency && (
                    <p className="text-[13px] text-text-disabled mt-2 flex items-center gap-1.5">
                      <RotateCcw size={13} className="text-brand-accent" />
                      {showBalance ? formatMoney(walletStats.secondaryTotal) : '••••'} {settings.subCurrency}
                    </p>
                  )}
                </div>
                <button
                  onClick={toggleBalance}
                  aria-label={showBalance ? 'Ocultar balance' : 'Mostrar balance'}
                  className="w-10 h-10 rounded-full bg-[rgb(var(--fg-rgb))]/[0.04] border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-disabled hover:text-text-primary transition-colors"
                >
                  {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
              <div className="mt-4 pt-3.5 border-t border-[rgb(var(--fg-rgb))]/5 flex items-center justify-between">
                <span className="text-xs text-text-disabled flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-status-success' : 'bg-status-danger'}`} />
                  {activeWalletsCount} {activeWalletsCount === 1 ? 'billetera activa' : 'billeteras activas'}
                </span>
                <button onClick={() => { haptic('nav'); setView('reports'); }} className="text-xs font-semibold text-brand-primary hover:text-text-primary transition-colors flex items-center gap-1">
                  Ver reportes <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {widgets.showProfit && (
            <>
              <div className={`${CARD} p-5 flex flex-col justify-between`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-[34px] h-[34px] rounded-md bg-status-success/10 text-status-success-soft flex items-center justify-center"><TrendingUp size={17} strokeWidth={2.5} /></div>
                    <span className="text-[13px] text-text-muted font-medium">Ventas</span>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[rgb(var(--fg-rgb))]/5 text-text-disabled">Este mes</span>
                </div>
                <div className="mt-3">
                  <p className="text-[28px] font-black tracking-tighter leading-none"><span className="text-xs text-text-disabled font-bold mr-1">{settings.currency}</span>{formatMoney(salesThisMonth)}</p>
                  <p className="text-xs text-text-disabled mt-1.5">{salesThisMonthList.length} {salesThisMonthList.length === 1 ? 'venta' : 'ventas'}</p>
                </div>
                <MiniBars data={salesSeries} className="text-status-success mt-2.5" />
              </div>

              <div className={`${CARD} p-5 flex flex-col justify-between`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-[34px] h-[34px] rounded-md bg-rose-500/10 text-rose-400 flex items-center justify-center"><TrendingDown size={17} strokeWidth={2.5} /></div>
                    <span className="text-[13px] text-text-muted font-medium">Gastos</span>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[rgb(var(--fg-rgb))]/5 text-text-disabled">Este mes</span>
                </div>
                <div className="mt-3">
                  <p className="text-[28px] font-black tracking-tighter leading-none"><span className="text-xs text-text-disabled font-bold mr-1">{settings.currency}</span>{formatMoney(financeStats.expense)}</p>
                  <p className="text-xs text-text-disabled mt-1.5">{financeStats.expenseCount} {financeStats.expenseCount === 1 ? 'movimiento' : 'movimientos'}</p>
                </div>
                <MiniBars data={expenseSeries} className="text-rose-400 mt-2.5" />
              </div>

              <div className={`${CARD} p-5 flex flex-col justify-between`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-[34px] h-[34px] rounded-md bg-brand-primary/15 text-brand-primary-hi flex items-center justify-center"><LineChart size={17} strokeWidth={2.5} /></div>
                    <span className="text-[13px] text-text-muted font-medium">Ganancia real</span>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${profitUi.pill}`}>{profitUi.label}</span>
                </div>
                <div className="mt-3">
                  <p className={`text-[28px] font-black tracking-tighter leading-none ${profitUi.text}`}><span className="text-xs text-text-disabled font-bold mr-1">{settings.currency}</span>{formatMoney(realMonthlyProfit)}</p>
                  <p className="text-xs text-text-disabled mt-1.5">Ingresos − costos − retiros</p>
                </div>
                <div className="mt-4 flex items-center gap-2.5">
                  <div className="flex-1 h-1.5 rounded-full bg-[rgb(var(--fg-rgb))]/[0.06] overflow-hidden"><div className={`h-full rounded-full ${profitUi.bar}`} style={{ width: `${profitMargin}%` }} /></div>
                  <span className="text-[11px] text-text-disabled font-semibold shrink-0">Margen {profitMargin}%</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ───────── CONTENIDO PRINCIPAL ───────── */}
      <div className={`grid gap-3 mt-3 items-start ${hasSidePanel ? 'grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'}`}>

        {/* Columna izquierda: atajos + movimientos */}
        <div className="flex flex-col gap-3 min-w-0">

          {widgets.showQuickActions && (
            <div className={`${CARD} p-5`}>
              <div className="flex items-center justify-between mb-3.5">
                <h3 className={SECTION_LABEL}>Atajos rápidos</h3>
                <button onClick={() => setIsConfigModalOpen(true)} className="text-xs font-semibold text-text-disabled hover:text-text-primary transition-colors flex items-center gap-1.5">
                  <SlidersHorizontal size={13} /> Editar
                </button>
              </div>
              {renderedActions.length > 0 ? (
                <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))' }}>
                  {renderedActions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => { haptic('nav'); action.onClick(); }}
                      className="h-[88px] rounded-lg bg-surface-sunken border border-[rgb(var(--fg-rgb))]/[0.06] flex flex-col items-center justify-center gap-2 text-text-disabled hover:text-text-primary hover:border-[rgb(var(--fg-rgb))]/[0.16] hover:-translate-y-px active:scale-95 transition-all group"
                    >
                      <div className={`w-[38px] h-[38px] rounded-md bg-[rgb(var(--fg-rgb))]/[0.04] flex items-center justify-center transition-transform group-hover:scale-105 ${action.color}`}>
                        <action.icon size={19} strokeWidth={2.5} />
                      </div>
                      <span className="text-xs font-semibold">{action.label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-xs text-text-disabled">No hay atajos. Usa Editar para elegir cuáles mostrar.</p>
              )}
            </div>
          )}

          <div className={`${CARD} overflow-hidden`}>
            <div className="flex items-center justify-between px-5 pt-[18px] pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-[30px] h-[30px] rounded-md bg-brand-primary/15 text-brand-primary-hi flex items-center justify-center"><ArrowUpRight size={15} /></div>
                <h3 className="text-[15px] font-bold tracking-tight">Últimos movimientos</h3>
              </div>
              <button onClick={() => { haptic('nav'); setView('accounts'); }} className="text-xs font-semibold text-brand-primary hover:text-text-primary transition-colors flex items-center gap-1">
                Ver todos <ChevronRight size={14} />
              </button>
            </div>

            {monthlyMovements.length > 0 ? (
              <>
                <div className="grid grid-cols-[44px_minmax(0,1fr)_110px_120px_120px] gap-3 items-center px-5 py-2 border-t border-[rgb(var(--fg-rgb))]/5">
                  <span />
                  <span className={SECTION_LABEL}>Concepto</span>
                  <span className={SECTION_LABEL}>Fecha</span>
                  <span className={SECTION_LABEL}>Método</span>
                  <span className={`${SECTION_LABEL} text-right`}>Monto</span>
                </div>
                {monthlyMovements.slice(0, 6).map(mov => {
                  const isIncome = mov.type === 'funding' || mov.type === 'transfer_in';
                  return (
                    <button
                      key={mov.id}
                      onClick={() => setSelectedMovement(mov)}
                      className="w-full grid grid-cols-[44px_minmax(0,1fr)_110px_120px_120px] gap-3 items-center px-5 py-3 border-t border-[rgb(var(--fg-rgb))]/5 text-left hover:bg-[rgb(var(--fg-rgb))]/[0.02] transition-colors"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isIncome ? 'bg-status-success/10 text-status-success-soft' : 'bg-status-danger/10 text-status-danger-soft'}`}>
                        {isIncome ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <span className="text-sm font-semibold truncate">{mov.description || 'Movimiento'}</span>
                      <span className="text-[13px] text-text-disabled">{new Date(mov.date).toLocaleDateString()}</span>
                      <span><span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[rgb(var(--fg-rgb))]/5 text-text-muted capitalize">{mov.paymentMethod || 'Manual'}</span></span>
                      <span className="text-right">
                        <span className={`block text-[15px] font-bold ${isIncome ? 'text-status-success-soft' : 'text-status-danger-soft'}`}>{isIncome ? '+' : '-'}{formatMoney(mov.amount)}</span>
                        <span className="block text-[10px] text-text-faint font-semibold">{mov.currency}</span>
                      </span>
                    </button>
                  );
                })}
              </>
            ) : (
              <div className="py-14 text-center text-text-disabled text-xs border-t border-[rgb(var(--fg-rgb))]/5">
                No hay movimientos este mes.
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: alertas, vencimientos y stock */}
        {hasSidePanel && (
          <div className="flex flex-col gap-3 min-w-0">

            {widgets.showExchangeRate && failingAccounts.length > 0 && (
              <div className="rounded-xl p-4 flex items-center gap-3 bg-status-danger/[0.06] border border-status-danger/25">
                <div className="w-9 h-9 rounded-md bg-status-danger/15 text-status-danger-soft flex items-center justify-center shrink-0"><AlertOctagon size={18} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{failingAccounts.length} {failingAccounts.length === 1 ? 'cuenta en falla' : 'cuentas en falla'}</p>
                  <p className="text-xs text-status-danger-soft/80 mt-0.5">Afectan a {affectedClientsCount} {affectedClientsCount === 1 ? 'cliente' : 'clientes'}</p>
                </div>
                <button onClick={() => { haptic('nav'); setView('agenda'); }} className="text-xs font-semibold text-status-danger-soft hover:text-text-primary transition-colors flex items-center gap-1 shrink-0">
                  Agenda <ArrowRight size={14} />
                </button>
              </div>
            )}

            {widgets.showExchangeRate && (
              <div className={`${CARD} overflow-hidden`}>
                <div className="flex items-center justify-between px-5 pt-[18px] pb-3.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-bold tracking-tight">Vencen pronto</h3>
                    {expiringSales.length > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-status-warning/10 text-status-warning-soft">{expiringSales.length}</span>}
                  </div>
                  <button onClick={() => { haptic('nav'); setView('expired'); }} className="text-xs font-semibold text-brand-primary hover:text-text-primary transition-colors flex items-center gap-1">
                    Ver todas <ChevronRight size={14} />
                  </button>
                </div>
                {expiringSales.length > 0 ? (
                  expiringSales.slice(0, 5).map(({ sale, days }) => {
                    const clientName = clients.find(c => c.id === sale.clientId)?.name || 'Cliente';
                    const pill = getExpiryPill(days);
                    return (
                      <div key={sale.id} className="flex items-center gap-3 px-5 py-3 border-t border-[rgb(var(--fg-rgb))]/5">
                        <div className="w-[34px] h-[34px] rounded-full bg-surface-3 flex items-center justify-center text-xs font-bold shrink-0">{clientName.substring(0, 2).toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{clientName}</p>
                          <p className="text-xs text-text-disabled truncate mt-0.5">{sale.serviceName}</p>
                        </div>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ${pill.cls}`}>{pill.label}</span>
                        <button onClick={() => openRenew(sale)} aria-label={`Renovar ${sale.serviceName}`} className="w-8 h-8 rounded-lg bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 text-brand-primary-hi flex items-center justify-center transition-all active:scale-90 shrink-0">
                          <CalendarClock size={16} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 flex flex-col items-center gap-2 text-text-disabled border-t border-[rgb(var(--fg-rgb))]/5">
                    <CheckCircle2 size={26} strokeWidth={1.5} className="text-status-success-soft" />
                    <p className="text-xs">Nada por vencer esta semana.</p>
                  </div>
                )}
              </div>
            )}

            {widgets.showInventory && (
              <div className={`${CARD} p-5`}>
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-[15px] font-bold tracking-tight">Stock disponible</h3>
                  <button onClick={openStockFinder} className="text-xs font-semibold text-brand-primary hover:text-text-primary transition-colors flex items-center gap-1">
                    Consultar <ChevronRight size={14} />
                  </button>
                </div>
                {stockData.length > 0 ? (
                  <div className="space-y-3.5">
                    {stockData.slice(0, 4).map(s => (
                      <button key={s.id} onClick={() => { haptic('nav'); setSelectedStockService(s); }} className="w-full text-left group">
                        <div className="flex justify-between text-[13px] mb-1.5">
                          <span className="font-medium group-hover:text-text-primary transition-colors truncate pr-2">{s.name}</span>
                          <span className="font-bold text-status-success-soft shrink-0">{s.totalFree} {s.totalFree === 1 ? 'cupo' : 'cupos'}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[rgb(var(--fg-rgb))]/[0.06] overflow-hidden">
                          <div className="h-full rounded-full bg-status-success" style={{ width: `${(s.totalFree / stockData[0].totalFree) * 100}%` }} />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center gap-2 text-text-disabled">
                    <Box size={26} strokeWidth={1.5} />
                    <p className="text-xs">Sin stock disponible actualmente.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ───────── MODALES ───────── */}
      <SaleModal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} initialData={null} />
      <RenewModal isOpen={isRenewModalOpen} onClose={() => setIsRenewModalOpen(false)} salesToRenew={salesToRenew} />
      <ContactoModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onSubmit={handleClientSubmit} />
      <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} />
      <ServiceFormModal isOpen={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} initialData={null} />
      <WidgetConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} widgets={widgets} toggleWidget={toggleWidget} toggleQuickAction={toggleQuickAction} />
      <ResellerModal isOpen={isResellerModalOpen} onClose={() => setIsResellerModalOpen(false)} onSubmit={handleResellerSubmit} />
      <ProviderModal isOpen={isProviderModalOpen} onClose={() => setIsProviderModalOpen(false)} onSubmit={handleProviderSubmit} />
      <MovementDetailModal isOpen={!!selectedMovement} onClose={() => setSelectedMovement(null)} movement={selectedMovement} settings={settings} />
      <NotificationCenter
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onNavigate={(view) => {
          setIsNotifOpen(false);
          setView(view);
        }}
      />

      {/* CONSULTA DE STOCK */}
      <Modal isOpen={isStockFinderOpen} onClose={() => setIsStockFinderOpen(false)} title="Consulta de stock">
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex items-center gap-3 h-[50px] px-4 bg-surface-sunken rounded-md border border-[rgb(var(--fg-rgb))]/10 focus-within:border-brand-primary/40 transition-colors">
            <Search size={16} className="text-text-faint shrink-0" />
            <input
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value)}
              placeholder="Filtrar por plataforma..."
              className={`${CLEAN_INPUT} h-full text-text-primary placeholder:text-text-faint`}
            />
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
            {filteredStock.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStockService(s)}
                className="w-full p-3 rounded-xl bg-surface-zinc border border-[rgb(var(--fg-rgb))]/5 flex items-center gap-3 text-left hover:border-status-success/40 transition-all active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-md bg-status-success/10 flex items-center justify-center text-status-success-soft border border-status-success/20 shrink-0"><Layers size={18} /></div>
                <span className="flex-1 min-w-0 text-sm font-bold text-text-primary truncate">{s.name}</span>
                <div className="text-right shrink-0">
                  <span className="text-lg font-black text-status-success-soft block leading-none">{s.totalFree}</span>
                  <span className="text-[10px] text-text-faint font-semibold">{s.totalFree === 1 ? 'Cupo libre' : 'Cupos libres'}</span>
                </div>
              </button>
            ))}
            {filteredStock.length === 0 && (
              <div className="py-16 text-center opacity-40">
                <Box size={40} className="mx-auto mb-2" />
                <p className="text-xs">{stockData.length === 0 ? 'Sin stock disponible actualmente.' : 'No se encontraron plataformas.'}</p>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* CUENTAS CON CUPO DE LA PLATAFORMA ELEGIDA */}
      <Modal isOpen={!!selectedStockService} onClose={() => setSelectedStockService(null)} title={`Stock: ${selectedStockService?.name}`}>
        <div className="space-y-3 pt-1">
          <p className="text-[10px] font-bold text-text-disabled uppercase tracking-widest ml-1">Cuentas con cupo libre</p>
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
            {selectedStockService?.accounts.map((acc: any) => (
              <div key={acc.id} className="bg-surface-zinc border border-[rgb(var(--fg-rgb))]/5 p-3 rounded-xl flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-text-primary truncate">{acc.email}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Key size={11} className="text-text-faint shrink-0" />
                    <p className="text-[11px] text-text-disabled font-mono truncate">{acc.password}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-black text-status-success-soft leading-none block">{acc.available}</span>
                  <span className="text-[10px] text-text-faint font-semibold">{acc.available === 1 ? 'Cupo' : 'Cupos'}</span>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(`📧 ${acc.email}\n🔑 ${acc.password}`); showToast('Credenciales copiadas', 'success'); }}
                  aria-label="Copiar credenciales"
                  className="w-9 h-9 flex items-center justify-center bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 rounded-lg text-text-disabled hover:text-text-primary transition-all active:scale-90 shrink-0"
                >
                  <Copy size={15} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={() => setSelectedStockService(null)} className="w-full h-[52px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-4 text-text-secondary hover:text-text-primary rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-2">
            <ArrowLeft size={16} /> Volver a la lista
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default DashboardDesktop;
