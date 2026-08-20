
import React, { useState } from 'react';
import { 
  TrendingUp, TrendingDown, Wallet, Users, Layers, 
  Download, Calendar, BarChart3, PieChart, ArrowUpRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import { DateRangeType, ReportMetrics, ChartDataPoint, TopItem, ServiceBreakdown } from '../../../utils/reportUtils';

interface ReportsMobileProps {
  metrics: ReportMetrics;
  trendData: ChartDataPoint[];
  topServices: TopItem[];
  topClients: TopItem[];
  breakdown: ServiceBreakdown[];
  range: DateRangeType;
  setRange: (r: DateRangeType) => void;
  onExport: () => void;
  currency: string;
}

const ReportsMobile: React.FC<ReportsMobileProps> = ({
  metrics, trendData, topServices, topClients, breakdown,
  range, setRange, onExport, currency
}) => {
  const [chartTab, setChartTab] = useState<'finance' | 'volume'>('finance');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const formatMoney = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="pb-32 font-sans text-zinc-100 min-h-screen">
       
       {/* 1. HEADER & DATE FILTER (Not sticky) */}
       <div className="pb-4 pt-2 px-4">
          <div className="flex justify-between items-center mb-4">
             <h1 className="text-2xl font-black text-white tracking-tight">Reportes</h1>
             <button 
               onClick={onExport}
               className="w-10 h-10 rounded-full bg-surface-3 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors active:scale-95"
             >
                <Download size={18} />
             </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
             {['current_month', 'last_month', 'year', 'all'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r as DateRangeType)}
                  className={`px-4 py-2 rounded-md text-[11px] font-semibold whitespace-nowrap border transition-all ${
                    range === r 
                      ? 'bg-gradient-to-r from-brand-primary to-brand-accent text-white border-transparent shadow-lg shadow-brand-primary/20' 
                      : 'bg-surface-zinc border-white/10 text-zinc-500'
                  }`}
                >
                   {r === 'current_month' ? 'Este Mes' : r === 'last_month' ? 'Mes Pasado' : r === 'year' ? 'Año' : 'Histórico'}
                </button>
             ))}
          </div>
       </div>

       <motion.div 
         variants={containerVariants}
         initial="hidden"
         animate="visible"
         className="px-4 mt-6 space-y-6"
       >
          
          {/* 2. KPI CARDS (Swipeable Look) */}
          <div className="grid grid-cols-2 gap-3">
             <motion.div variants={itemVariants} className="bg-surface-3 border border-white/[0.08] rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-status-success/10 rounded-full blur-xl -mr-4 -mt-4" />
                <div className="flex items-center gap-2 mb-2 text-status-success-soft">
                   <Wallet size={16} />
                   <span className="text-[10px] font-semibold uppercase tracking-wider">Ganancia Neta</span>
                </div>
                <p className="text-2xl font-bold text-white tracking-tight">{currency}{formatMoney(metrics.totalProfit)}</p>
                <div className="flex items-center gap-1 mt-1">
                   <span className={`text-[10px] font-semibold ${metrics.profitGrowth >= 0 ? 'text-status-success-soft' : 'text-status-danger-soft'}`}>
                      {metrics.profitGrowth >= 0 ? '+' : ''}{metrics.profitGrowth.toFixed(1)}%
                   </span>
                   <span className="text-[10px] text-zinc-600">vs periodo ant.</span>
                </div>
             </motion.div>

             <motion.div variants={itemVariants} className="bg-surface-3 border border-white/[0.08] rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-brand-primary/10 rounded-full blur-xl -mr-4 -mt-4" />
                <div className="flex items-center gap-2 mb-2 text-brand-primary">
                   <TrendingUp size={16} />
                   <span className="text-[10px] font-semibold uppercase tracking-wider">Ventas</span>
                </div>
                <p className="text-2xl font-bold text-white tracking-tight">{currency}{formatMoney(metrics.totalSales)}</p>
                <div className="flex items-center gap-1 mt-1">
                   <span className={`text-[10px] font-semibold ${metrics.salesGrowth >= 0 ? 'text-status-success-soft' : 'text-status-danger-soft'}`}>
                      {metrics.salesGrowth >= 0 ? '+' : ''}{metrics.salesGrowth.toFixed(1)}%
                   </span>
                   <span className="text-[10px] text-zinc-600">crecimiento</span>
                </div>
             </motion.div>
          </div>

          {/* 3. CHART SECTION */}
          <motion.div variants={itemVariants} className="bg-surface-3 border border-white/10 rounded-xl p-5 shadow-lg">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                   <BarChart3 size={16} className="text-zinc-400" /> Rendimiento
                </h3>
                <div className="flex bg-surface-sunken p-1 rounded-sm">
                   <button onClick={() => setChartTab('finance')} className={`px-3 py-1 rounded-sm text-[10px] font-semibold transition-all ${chartTab === 'finance' ? 'bg-surface-4 text-white' : 'text-zinc-500'}`}>$$$</button>
                   <button onClick={() => setChartTab('volume')} className={`px-3 py-1 rounded-sm text-[10px] font-semibold transition-all ${chartTab === 'volume' ? 'bg-surface-4 text-white' : 'text-zinc-500'}`}>Vol</button>
                </div>
             </div>

             <div className="h-[220px] w-full relative">
                <ResponsiveContainer width="99%" height="100%">
                   {chartTab === 'finance' ? (
                      <AreaChart data={trendData}>
                         <defs>
                            <linearGradient id="gradIncM" x1="0" y1="0" x2="0" y2="1">
                               <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                               <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 10}} dy={10} />
                         <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '11px' }} />
                         <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fill="url(#gradIncM)" />
                      </AreaChart>
                   ) : (
                      <BarChart data={trendData}>
                         <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#52525b', fontSize: 10}} dy={10} />
                         <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '11px' }} />
                         <Bar dataKey="salesCount" radius={[4, 4, 0, 0]}>
                            {trendData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={(entry.salesCount || 0) > 5 ? '#8b5cf6' : '#6366f1'} />
                            ))}
                         </Bar>
                      </BarChart>
                   )}
                </ResponsiveContainer>
             </div>
          </motion.div>

          {/* 4. TOP SERVICES LIST */}
          <motion.div variants={itemVariants}>
             <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3 px-2">Top Servicios</h3>
             <div className="space-y-2">
                {topServices.map((item, idx) => (
                   <div key={item.id} className="bg-surface-3 border border-white/5 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary text-[10px] font-semibold border border-brand-primary/20">
                            #{idx + 1}
                         </div>
                         <span className="text-sm font-bold text-white">{item.name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className="text-sm font-bold text-white">{item.value}</span>
                         <span className="text-[10px] text-zinc-500">ventas</span>
                      </div>
                   </div>
                ))}
             </div>
          </motion.div>

          {/* 5. TOP CLIENTS LIST */}
          <motion.div variants={itemVariants}>
             <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3 px-2">Mejores Clientes</h3>
             <div className="space-y-2">
                {topClients.map((item, idx) => (
                   <div key={item.id} className="bg-surface-3 border border-white/5 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-status-success/10 flex items-center justify-center text-status-success-soft text-[10px] font-semibold border border-status-success/20">
                            <Users size={14} />
                         </div>
                         <span className="text-sm font-bold text-white">{item.name}</span>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className="text-sm font-bold text-white">{currency}{formatMoney(item.value)}</span>
                         <span className="text-[10px] text-zinc-500">invertido</span>
                      </div>
                   </div>
                ))}
             </div>
          </motion.div>

       </motion.div>
    </div>
  );
};

export default ReportsMobile;
