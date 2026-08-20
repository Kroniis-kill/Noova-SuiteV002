
import React, { useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { useUIStore } from '../../../store/uiStore';
import { 
  TrendingUp, Users, Layers, ShoppingCart, Activity, 
  DollarSign, ArrowUpRight, 
  Calendar, CheckCircle2, AlertTriangle, Briefcase, Truck,
  MonitorPlay, PieChart as PieChartIcon,
  TrendingDown, LayoutGrid, Zap
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { getDaysRemaining } from '../../../utils/expiredUtils';
import { calculateOccupancy } from '../../../utils/inventarioUtils';
import AnimatedLogo from '../../../components/ui/AnimatedLogo';
import OnboardingWidget from '../../../components/dashboard/OnboardingWidget';

const DashboardProDesktop: React.FC = () => {
  const { sales, clients, accounts, services, movements, settings, expenses } = useData();
  const { user } = useAuth();
  const { setDashboardMode } = useUIStore();

  // --- LÓGICA DE DATOS ---
  const formatMoney = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 2 });
  const currency = settings.currency || '$';

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  // 1. Métricas Globales
  const totalRevenue = useMemo(() => sales.reduce((acc, s) => acc + s.amount, 0), [sales]);
  const stockAvailable = useMemo(() => {
    return accounts.reduce((acc, a) => acc + (a.maxScreens - calculateOccupancy(a)), 0);
  }, [accounts]);
  
  // 2. Gráfico de Tendencia
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
        const daySales = sales.filter(s => s.date && s.date.startsWith(date)).reduce((acc, s) => acc + s.amount, 0);
        const dayExpenses = movements.filter(m => m.date && m.date.startsWith(date) && (m.type === 'withdrawal' || m.type === 'transfer_out')).reduce((acc, m) => acc + m.amount, 0);
        return {
            name: date.split('-').slice(2).join('/'),
            ingresos: daySales,
            egresos: dayExpenses
        };
    });
  }, [sales, movements]);

  const serviceDistribution = useMemo(() => {
    const stats: Record<string, number> = {};
    sales.forEach(s => {
      stats[s.serviceName] = (stats[s.serviceName] || 0) + 1;
    });
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [sales]);

  const COLORS = ['#6A2CFF', '#FF1493', '#10b981', '#f59e0b', '#3b82f6'];

  return (
    <div className="space-y-8 pb-10">
      
      {/* HEADER INTEGRADO (IDÉNTICO AL LITE) */}
      <div className="flex justify-between items-center bg-surface-3 border border-white/5 p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md p-[1.5px] bg-gradient-to-tr from-brand-primary to-brand-accent shadow-glow">
                 <div className="w-full h-full rounded-sm bg-surface-3 flex items-center justify-center">
                    <AnimatedLogo size={40} showFill={true} isStatic={true} />
                 </div>
              </div>
              <div>
                  <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">{greeting}</p>
                  <h1 className="text-2xl font-extrabold text-white tracking-tight">{user?.name || 'Administrador'}</h1>
              </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setDashboardMode('lite')} 
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-md text-xs font-semibold text-zinc-400 hover:text-brand-primary transition-all group"
             >
                <LayoutGrid size={16} className="group-hover:rotate-12 transition-transform" />
                Modo Esencial
             </button>
             <div className="w-[1px] h-8 bg-white/10 mx-2" />
             <div className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-md text-brand-primary text-xs font-semibold">
                <Zap size={14} fill="currentColor" />
                Centro de Inteligencia Pro
             </div>
          </div>
      </div>

      {/* HEADER KPI GRID */}
      <OnboardingWidget />
      <div className="grid grid-cols-4 gap-6">
        <KPICard title="Ventas Totales" value={sales.length} icon={ShoppingCart} color="blue" trend="+8%" desc="Volumen histórico" />
        <KPICard title="Ingresos" value={`${currency}${formatMoney(totalRevenue)}`} icon={DollarSign} color="emerald" trend="+12%" desc="Facturación total" />
        <KPICard title="Inventario Activo" value={accounts.filter(a => a.status === 'activa').length} icon={Layers} color="indigo" trend={`${stockAvailable} cupos`} desc="Disponibilidad real" />
        <KPICard title="Cartera Clientes" value={clients.length} icon={Users} color="purple" trend="Nuevos +3" desc="Base de usuarios" />
      </div>

      <div className="grid grid-cols-12 gap-6 h-[450px]">
        <div className="col-span-8 bg-surface-3 border border-white/10 rounded-2xl p-8 shadow-xl flex flex-col relative overflow-hidden">
           <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-primary/5 blur-[100px] pointer-events-none" />
           <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-8 relative z-10">
              <Activity className="text-brand-primary" size={20} /> Rendimiento Operativo
           </h3>
           <div className="flex-1 w-full min-h-0 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={chartData}>
                    <defs>
                       <linearGradient id="proInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                       <linearGradient id="proExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 11, fontWeight: 600}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 11}} />
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={3} fill="url(#proInc)" />
                    <Area type="monotone" dataKey="egresos" stroke="#ef4444" strokeWidth={3} fill="url(#proExp)" />
                 </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="col-span-4 bg-surface-3 border border-white/10 rounded-2xl p-8 shadow-xl flex flex-col">
           <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><PieChartIcon className="text-brand-accent" size={18} /> Top Ventas</h3>
           <div className="flex-1 relative">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={serviceDistribution} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                      {serviceDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#09090b', border: 'none', borderRadius: '8px' }} />
                 </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-2xl font-bold text-white">{sales.length}</span><span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-widest">Total</span></div>
           </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon: Icon, color, trend, desc }: any) => {
    const colorStyles: Record<string, string> = {
        blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
        purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    };
    return (
        <div className="bg-surface-3 border border-white/10 rounded-2xl p-6 shadow-sm group hover:border-brand-primary/30 transition-all">
            <div className="flex justify-between items-start mb-4"><div className={`p-3 rounded-md border ${colorStyles[color]}`}><Icon size={24} /></div><div className={`px-2 py-1 rounded-full text-[10px] font-semibold border ${colorStyles[color]}`}>{trend}</div></div>
            <div><p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-widest">{title}</p><h4 className="text-2xl font-extrabold text-white mt-1 tracking-tight">{value}</h4><p className="text-zinc-600 text-[11px] mt-2 font-medium">{desc}</p></div>
        </div>
    );
};

export default DashboardProDesktop;
