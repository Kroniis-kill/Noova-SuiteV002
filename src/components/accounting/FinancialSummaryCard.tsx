import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { 
  TrendingUp, TrendingDown, Wallet, Activity, 
  ArrowUpRight, ArrowDownRight, BarChart3, PieChart
} from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, YAxis } from 'recharts';
import { motion } from 'framer-motion';

const FinancialSummaryCard: React.FC = () => {
  const { getSummaryForPeriod, settings, movements } = useData();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  const summary = useMemo(() => getSummaryForPeriod(period), [period, getSummaryForPeriod, movements]);
  const currency = settings.currency || '$';

  const chartData = useMemo(() => {
     const data = [];
     const points = 7; 
     const baseInc = summary.income > 0 ? summary.income / points : 100;
     const baseExp = (summary.expenses + summary.suppliesCost) > 0 ? (summary.expenses + summary.suppliesCost) / points : 40;

     for (let i = 0; i < points; i++) {
        data.push({
           name: i === points - 1 ? 'Hoy' : `${points - 1 - i}d`,
           ingresos: Math.round(baseInc * (0.8 + Math.random() * 0.4)),
           egresos: Math.round(baseExp * (0.7 + Math.random() * 0.6))
        });
     }
     return data;
  }, [summary]);

  const totalOutflow = summary.expenses + summary.suppliesCost;
  const margin = summary.income > 0 ? (summary.netProfit / summary.income) * 100 : 0;

  return (
    <div className="bg-surface-sunken border border-[rgb(var(--fg-rgb))]/[0.06] rounded-xl p-5 shadow-2xl relative overflow-hidden flex flex-col">
       <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

       <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
             <h2 className="text-sm font-bold text-primary flex items-center gap-2 tracking-tight uppercase">
                <BarChart3 className="text-brand-primary" size={16} />
                Inteligencia Real
             </h2>
             <p className="text-faint text-[8px] font-black uppercase tracking-[0.2em] mt-1">Análisis de Flujo</p>
          </div>
          
          <div className="flex bg-bg p-1 rounded-sm border border-[rgb(var(--fg-rgb))]/[0.05]">
             {['week', 'month', 'year'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p as any)}
                  className={`px-3 py-1 rounded-xs text-[8px] font-black uppercase tracking-widest transition-all ${period === p ? 'bg-surface-4 text-primary' : 'text-faint hover:text-muted'}`}
                >
                   {p === 'week' ? 'Sem' : p === 'month' ? 'Mes' : 'Año'}
                </button>
             ))}
          </div>
       </div>

       <div className="grid grid-cols-3 gap-3 mb-6 relative z-10">
          <div className="bg-surface-3/40 rounded-lg p-3.5 border border-[rgb(var(--fg-rgb))]/[0.03]">
             <div className="flex items-center gap-1.5 text-status-success mb-1">
                <ArrowUpRight size={12} strokeWidth={3} />
                <span className="text-[8px] font-black uppercase tracking-widest">Ingresos</span>
             </div>
             <p className="text-sm font-bold text-primary font-mono">{currency}{summary.income.toLocaleString()}</p>
          </div>

          <div className="bg-surface-3/40 rounded-lg p-3.5 border border-[rgb(var(--fg-rgb))]/[0.03]">
             <div className="flex items-center gap-1.5 text-status-danger mb-1">
                <ArrowDownRight size={12} strokeWidth={3} />
                <span className="text-[8px] font-black uppercase tracking-widest">Egresos</span>
             </div>
             <p className="text-sm font-bold text-primary font-mono">{currency}{totalOutflow.toLocaleString()}</p>
          </div>

          <div className="bg-brand-primary/5 rounded-lg p-3.5 border border-brand-primary/10">
             <div className="flex items-center gap-1.5 text-brand-primary mb-1">
                <Wallet size={12} strokeWidth={3} />
                <span className="text-[8px] font-black uppercase tracking-widest">Beneficio</span>
             </div>
             <p className="text-sm font-bold text-primary font-mono">{currency}{summary.netProfit.toLocaleString()}</p>
          </div>
       </div>

       {/* SOLUCIÓN: Altura mínima fija y debounce para ResponsiveContainer */}
       <div className="w-full h-24 relative z-10 mb-4 min-h-[96px]">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
             <AreaChart data={chartData}>
                <defs>
                   <linearGradient id="gradIncMin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                   </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <YAxis hide />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', fontSize: '9px' }}
                />
                <Area type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} fill="url(#gradIncMin)" />
             </AreaChart>
          </ResponsiveContainer>
       </div>

       <div className="mt-2 pt-4 border-t border-[rgb(var(--fg-rgb))]/[0.03] flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
             <div className={`w-9 h-9 rounded-sm flex items-center justify-center border shadow-inner ${margin >= 20 ? 'bg-status-success/5 text-status-success border-status-success/10' : 'bg-status-warning/5 text-status-warning border-status-warning/10'}`}>
                <PieChart size={16} strokeWidth={2} />
             </div>
             <div>
                <p className="text-[8px] text-faint font-black uppercase tracking-[0.2em]">Margen Neto</p>
                <p className="text-sm font-bold text-primary font-mono">{margin.toFixed(1)}%</p>
             </div>
          </div>
          
          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${margin >= 20 ? 'bg-status-success/5 text-status-success border-status-success/20' : 'bg-status-warning/5 text-status-warning border-status-warning/20'}`}>
             {margin >= 20 ? 'Status Ok' : 'Low ROI'}
          </span>
       </div>
    </div>
  );
};

export default FinancialSummaryCard;