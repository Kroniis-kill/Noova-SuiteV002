
import React, { useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { useUIStore } from '../../../store/uiStore';
import { 
  TrendingUp, Clock, ShoppingCart, Layers, 
  MonitorPlay, AlertTriangle, Users, DollarSign,
  ChevronRight, Activity, Zap, Wallet, ArrowUpRight, ArrowDownRight,
  LayoutGrid
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ViewState } from '../../../types';
import { getDaysRemaining } from '../../../utils/expiredUtils';
import { calculateOccupancy } from '../../../utils/inventarioUtils';
import AnimatedLogo from '../../../components/ui/AnimatedLogo';
import NotificationCenter from '../../../components/ui/NotificationCenter';
import { isNativePlatform } from '../../../utils/platformUtils';

interface DashboardProMobileProps {
  setView: (view: ViewState) => void;
}

const DashboardProMobile: React.FC<DashboardProMobileProps> = ({ setView }) => {
  const { sales, movements, settings, accounts, clients, expenses } = useData();
  const { user } = useAuth();
  const { setDashboardMode } = useUIStore();
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const isNative = isNativePlatform();
  
  const formatMoney = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const currency = settings.currency || '$';

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  const totalBalance = useMemo(() => {
    return movements.reduce((acc, m) => {
        const isInc = m.type === 'funding' || m.type === 'transfer_in';
        return isInc ? acc + m.amount : acc - m.amount;
    }, 0);
  }, [movements]);

  const monthlySales = useMemo(() => {
    const now = new Date();
    return sales.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((acc, s) => acc + s.amount, 0);
  }, [sales]);

  const stockUrgent = useMemo(() => accounts.filter(a => getDaysRemaining(a.endDate) <= 3).length, [accounts]);

  const stats = [
    { label: 'Ventas Mes', value: `${currency}${formatMoney(monthlySales)}`, icon: ShoppingCart, color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
    { label: 'Clientes', value: clients.length, icon: Users, color: 'text-status-info-soft', bg: 'bg-status-info/10' },
    { label: 'Stock Disp.', value: accounts.reduce((acc, a) => acc + (a.maxScreens - calculateOccupancy(a)), 0), icon: Layers, color: 'text-status-success-soft', bg: 'bg-status-success/10' },
    { label: 'Vencimientos', value: stockUrgent, icon: Clock, color: 'text-status-danger-soft', bg: 'bg-status-danger/10' },
  ];

  return (
    <div className="min-h-screen pb-32 bg-bg font-sans text-zinc-100 relative overflow-x-hidden">
       <div className="fixed top-0 left-0 w-full h-[400px] bg-gradient-to-b from-brand-primary/10 to-transparent pointer-events-none z-0" />
       <div className={`px-6 pt-safe ${isNative ? 'mt-3' : 'mt-6'} pb-4 relative z-10 flex justify-between items-center`}>
          <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-sm p-px shrink-0 bg-gradient-to-tr from-brand-primary to-brand-accent shadow-[0_0_15px_rgba(106,44,255,0.4)]">
                 <div className="w-full h-full rounded-sm bg-surface-3 flex items-center justify-center overflow-hidden">
                    <AnimatedLogo size={36} showFill={true} isStatic={true} />
                 </div>
              </div>
              <div><p className="text-zinc-400 text-[11px] font-semibold uppercase tracking-wider">{greeting}</p><h1 className="text-lg font-bold text-white leading-tight">{user?.name?.split(' ')[0] || 'Usuario'}</h1></div>
          </div>
          <div className="flex gap-2">
             <motion.button whileTap={{ scale: 0.9 }} onClick={() => setDashboardMode('lite')} className="w-10 h-10 rounded-full bg-surface-3 border border-white/10 flex items-center justify-center text-brand-primary shadow-sm"><LayoutGrid size={18} /></motion.button>
             <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsNotifOpen(true)} className="w-10 h-10 rounded-full bg-surface-3 border border-white/10 flex items-center justify-center text-zinc-400 relative shadow-sm"><Activity size={18} />{stockUrgent > 0 && (<span className="absolute top-2.5 right-3 w-2 h-2 bg-status-danger rounded-full" />)}</motion.button>
          </div>
       </div>
       <div className="px-6 space-y-6">
          <div className="bg-surface-3 border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-3xl -mr-6 -mt-6" />
             <div className="flex flex-col items-center text-center">
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Patrimonio Global</span>
                <h1 className="text-5xl font-extrabold text-white tracking-tighter mb-1"><span className="text-2xl text-zinc-600 mr-1">$</span>{formatMoney(totalBalance)}</h1>
                <div className="flex items-center gap-2 mt-4"><div className="px-3 py-1.5 bg-status-success/10 border border-status-success/20 rounded-full flex items-center gap-1.5"><ArrowUpRight size={14} className="text-status-success-soft" /><span className="text-[11px] font-semibold text-status-success-soft">Rendimiento Pro</span></div></div>
             </div>
             <div className="mt-8 pt-6 border-t border-white/5 flex justify-between">
                <div className="text-center px-4 border-r border-white/5 flex-1"><p className="text-[9px] font-bold text-zinc-500 uppercase mb-1">Ingresos Mes</p><p className="text-sm font-bold text-white">+{formatMoney(monthlySales)}</p></div>
                <div className="text-center px-4 flex-1"><p className="text-[9px] font-bold text-zinc-500 uppercase mb-1">Egresos Mes</p><p className="text-sm font-bold text-status-danger-soft">-{formatMoney(expenses.reduce((acc,e) => acc + e.amount, 0))}</p></div>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
             {stats.map((s, i) => (
                <div key={i} className="bg-surface-zinc border border-white/5 rounded-xl p-4 flex flex-col justify-between h-[110px] relative overflow-hidden group active:scale-95 transition-all">
                   <div className={`w-9 h-9 rounded-md ${s.bg} ${s.color} flex items-center justify-center border border-white/5`}><s.icon size={18} /></div>
                   <div className="mt-auto"><p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{s.label}</p><p className="text-lg font-extrabold text-white">{s.value}</p></div>
                </div>
             ))}
          </div>
          <div className="space-y-3">
             <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest px-1">Alertas Pro</h3>
             <div className="bg-surface-3 border border-white/10 rounded-xl overflow-hidden">
                <button onClick={() => setView('expired')} className="w-full flex items-center justify-between p-5 border-b border-white/5 active:bg-white/5 transition-colors"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-md bg-status-danger/10 text-status-danger flex items-center justify-center"><AlertTriangle size={20} /></div><div className="text-left"><h4 className="text-sm font-bold text-white">Renovaciones Críticas</h4><p className="text-[10px] text-zinc-500">{stockUrgent} clientes por vencer</p></div></div><ChevronRight size={18} className="text-zinc-600" /></button>
                <button onClick={() => setView('inventory')} className="w-full flex items-center justify-between p-5 active:bg-white/5 transition-colors"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-md bg-status-warning/10 text-status-warning flex items-center justify-center"><Layers size={20} /></div><div className="text-left"><h4 className="text-sm font-bold text-white">Stock e Inventario</h4><p className="text-[10px] text-zinc-500">Gestión de cupos activos</p></div></div><ChevronRight size={18} className="text-zinc-600" /></button>
             </div>
          </div>
       </div>
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

export default DashboardProMobile;
