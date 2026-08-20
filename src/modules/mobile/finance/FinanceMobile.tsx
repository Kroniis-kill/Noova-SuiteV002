
import React, { useState } from 'react';
import { FinancialAccount, Movement, PayableExpense, Sale, Client } from '../../../types';
import AccountCard from '../../../components/cuentas/AccountCard';
import PayableCard from '../../../components/cuentas/PayableCard';
import ExpenseList from '../../../components/accounting/ExpenseList';
import { 
  Wallet, Plus, Receipt, 
  PieChart, Clock, ArrowUpRight, ArrowDownRight,
  TrendingUp, Users, Target, CalendarDays, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHighlightAction } from '../../../hooks/useHighlightAction';
import { getDaysRemaining } from '../../../utils/inventarioUtils';

export interface FinanceProps {
  financialAccounts: FinancialAccount[];
  combinedPayables: any[];
  settings: any;
  walletStats: { totalMain: number; secondaryTotal: number };
  incomeStats: { month: number };
  expenseStats: { month: number };
  recentMovements: Movement[];
  chartData: any[];
  reportData: any;
  reportRange: any;
  setReportRange: (r: any) => void;
  onExportReport: () => void;
  onFund: (acc: FinancialAccount) => void;
  onWithdraw: (acc: FinancialAccount) => void;
  onTransfer: (acc: FinancialAccount) => void;
  onHistory: (acc: FinancialAccount) => void;
  onEditAccount: (acc: FinancialAccount) => void;
  onDeleteAccount: (id: string) => void;
  onToggleStatus: (acc: FinancialAccount) => void;
  onPayPayable: (item: any) => void;
  onEditPayable: (item: any) => void;
  onDeletePayable: (id: string) => void;
  onNewAccount: () => void;
  onNewPayable: () => void;
  onNewExpense: () => void;
  sales: Sale[];
  movements: Movement[];
  clients: Client[];
  initialTab?: 'summary' | 'wallets' | 'movements' | 'payables';
}

const FinanceMobile: React.FC<FinanceProps> = (props) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'wallets' | 'movements' | 'payables'>(props.initialTab || 'summary');
  const isHighlighted = useHighlightAction('accounts');
  const sortedAccounts = [...props.financialAccounts].sort((a, b) => (b.isActive !== false ? 1 : 0) - (a.isActive !== false ? 1 : 0));

  const TABS = [
    { id: 'summary', label: 'Reportes', icon: PieChart },
    { id: 'wallets', label: 'Billeteras', icon: Wallet },
    { id: 'movements', label: 'Movimientos', icon: Receipt },
    { id: 'payables', label: 'Agenda', icon: Clock }
  ];

  // Helper to calculate earnings dynamically
  const getEarnings = (period: string) => {
    const now = new Date();
    let start = new Date(0);
    let end = new Date();
    if (period === 'day') {
       start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
       const wThisDay = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1);
       start = new Date(now.getFullYear(), now.getMonth(), wThisDay);
    } else if (period === 'month') {
       start = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    const pSales = (props.sales || []).filter(s => new Date(s.date) >= start && new Date(s.date) <= end).reduce((a, b) => a + b.amount, 0);
    const pExp = (props.movements || []).filter(m => (m.type === 'withdrawal' || m.type === 'transfer_out') && new Date(m.date) >= start && new Date(m.date) <= end).reduce((a, m) => {
        if (m.usdEquivalent && m.usdEquivalent > 0) return a + m.usdEquivalent;
        return a + (m.amount / (m.exchangeRate || props.settings.exchangeRate || 1));
    }, 0);
    return Math.max(0, pSales - pExp);
  };

  const dailyProfit = getEarnings('day');
  const weeklyProfit = getEarnings('week');
  const monthlyProfit = getEarnings('month');
  const totalProfit = getEarnings('all');

  // Filter movements based on reportRange for the movements tab if needed, but the user requested all movements
  const allMovements = [...(props.movements || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Format currency
  const formatCurrency = (val: number) => {
     return new Intl.NumberFormat('es-US', { style: 'currency', currency: props.settings?.currency || 'USD' }).format(val);
  };

  return (
    <div className="pb-40 font-sans text-zinc-100 min-h-screen px-4">
       <div className="pt-safe mt-6 mb-6 flex justify-between items-center relative z-10">
          <div>
             <h1 className="text-2xl font-black text-white tracking-tight">Finanzas</h1>
             <p className="text-zinc-400 text-[10px] font-semibold uppercase tracking-[0.15em] mt-1">Capital Management</p>
          </div>
          <button 
             onClick={props.onNewExpense}
             className="w-10 h-10 bg-secondary rounded-md flex items-center justify-center text-white shadow-glow active:scale-90 transition-all shadow-secondary/20"
          >
             <Receipt size={18} strokeWidth={2.5} />
          </button>
       </div>

       <div className="mb-8 sticky top-4 z-40">
          <div className="bg-surface-1/90 backdrop-blur-xl p-1 rounded-md flex border border-white/[0.05] shadow-2xl">
             {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-3 rounded-sm text-[8px] font-black uppercase tracking-widest flex flex-col items-center gap-1 transition-all relative ${activeTab === tab.id ? 'text-white' : 'text-zinc-600'}`}
                >
                   {activeTab === tab.id && (
                       <motion.div 
                        layoutId="activeTabFinanceMicro"
                        className="absolute inset-0 bg-surface-4 rounded-sm border border-white/5"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                       />
                   )}
                   <tab.icon size={14} className="relative z-10" />
                   <span className="relative z-10">{tab.label}</span>
                </button>
             ))}
          </div>
       </div>

       <div className="relative z-10">
          <AnimatePresence mode='wait'>
             {activeTab === 'summary' && (
                <motion.div 
                  key="summary" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  className="space-y-6"
                >
                   {/* GANANCIAS KPIs */}
                   <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Ganancia Diaria', val: dailyProfit, icon: TrendingUp },
                        { label: 'Semanal', val: weeklyProfit, icon: TrendingUp },
                        { label: 'Mensual', val: monthlyProfit, icon: TrendingUp },
                        { label: 'Total', val: totalProfit, icon: TrendingUp },
                      ].map((kpi, i) => (
                        <div key={i} className="bg-surface-1 border border-white/5 rounded-lg p-4 flex flex-col justify-between h-24">
                           <div className="flex justify-between items-start">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{kpi.label}</span>
                              <kpi.icon size={14} className="text-brand-primary" />
                           </div>
                           <span className="text-lg font-black text-white">{formatCurrency(kpi.val)}</span>
                        </div>
                      ))}
                   </div>

                   {/* FILTER ROW */}
                   <div className="flex items-center justify-between bg-black/40 border border-white/5 p-1 rounded-full">
                      {['current_month', 'last_month', 'year', 'all'].map(r => (
                        <button 
                          key={r}
                          onClick={() => props.setReportRange(r)}
                          className={`flex-1 py-2 text-[10px] font-semibold rounded-full transition-all ${props.reportRange === r ? 'bg-surface-4 text-white shadow-sm' : 'text-zinc-500'}`}
                        >
                          {r === 'current_month' ? 'Mes' : r === 'last_month' ? 'Mes Ant.' : r === 'year' ? 'Año' : 'Todo'}
                        </button>
                      ))}
                   </div>

                   <div className="grid grid-cols-1 gap-4">
                      {/* TOP VENTAS */}
                      <div className="bg-surface-sunken border border-white/[0.05] rounded-xl p-5">
                         <div className="flex items-center gap-2 mb-4">
                            <Target size={14} className="text-brand-primary" />
                            <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Top Ventas</h3>
                         </div>
                         <div className="space-y-3">
                            {(props.reportData?.topServicesProfit || []).slice(0, 3).map((svc: any) => (
                               <div key={svc.id} className="flex justify-between items-center p-3 bg-white/5 rounded-2xl border border-white/5">
                                  <span className="text-xs font-semibold text-white">{svc.name}</span>
                                  <span className="text-[11px] font-mono font-black text-emerald-400">{formatCurrency(svc.value)}</span>
                               </div>
                            ))}
                            {(!props.reportData?.topServicesProfit || props.reportData.topServicesProfit.length === 0) && (
                               <div className="text-center py-4 text-xs font-semibold text-zinc-600">No hay ventas registradas</div>
                            )}
                         </div>
                      </div>

                      {/* CLIENT RETENTION */}
                      <div className="bg-surface-sunken border border-brand-primary/10 rounded-xl p-5 relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl" />
                         <div className="flex items-center gap-2 mb-4 relative z-10">
                            <Users size={14} className="text-brand-primary" />
                            <h3 className="text-[10px] font-bold text-brand-primary uppercase tracking-widest">Retención de Clientes</h3>
                         </div>
                         <div className="flex items-end justify-between relative z-10">
                            <div>
                               <p className="text-[10px] font-semibold text-zinc-500 mb-1">Clientes Activos</p>
                               <span className="text-3xl font-black text-white">{props.reportData?.metrics?.activeClients || 0}</span>
                            </div>
                            <div className="text-right">
                               <p className="text-[10px] font-semibold text-zinc-500 mb-1">Total Registrados</p>
                               <span className="text-xl font-bold text-zinc-400">{props.clients?.length || 0}</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </motion.div>
             )}

             {activeTab === 'wallets' && (
                <motion.div 
                  key="wallets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                   <div className="flex justify-between items-center px-1">
                      <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Cuentas de Origen</h3>
                      <button onClick={props.onNewAccount} className={`text-[8px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 ${isHighlighted ? 'ring-4 ring-primary animate-pulse' : ''}`}>
                        + Nueva
                      </button>
                   </div>
                   <div className="space-y-4">
                      {sortedAccounts.map(acc => (
                         <AccountCard key={acc.id} account={acc} settings={props.settings} onFund={props.onFund} onWithdraw={props.onWithdraw} onTransfer={props.onTransfer} onHistory={props.onHistory} onEdit={props.onEditAccount} onDelete={props.onDeleteAccount} onToggleStatus={props.onToggleStatus} compact={false} />
                      ))}
                   </div>
                </motion.div>
             )}

             {activeTab === 'movements' && (
                <motion.div 
                  key="movements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                   <div className="flex justify-between items-center px-1">
                      <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Todos los Movimientos</h3>
                   </div>
                   <div className="space-y-3">
                      {allMovements.map(mov => {
                         const isInc = mov.type === 'funding' || mov.type === 'transfer_in';
                         return (
                            <div key={mov.id} className="flex items-center justify-between p-4 bg-surface-1 rounded-lg border border-white/[0.05]">
                               <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isInc ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                     {isInc ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                  </div>
                                  <div className="min-w-0">
                                     <p className="text-xs font-semibold text-white truncate max-w-[160px]">{mov.description || 'Movimiento'}</p>
                                     <p className="text-[9px] font-black tracking-widest text-zinc-500 mt-1 uppercase">{new Date(mov.date).toLocaleDateString()}</p>
                                  </div>
                               </div>
                               <span className={`text-sm font-bold font-mono ${isInc ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {isInc ? '+' : '-'}{formatCurrency(mov.amount)}
                               </span>
                            </div>
                         );
                      })}
                      {allMovements.length === 0 && (
                         <div className="text-center py-10 text-zinc-500 text-xs font-semibold">No hay movimientos registrados</div>
                      )}
                   </div>
                </motion.div>
             )}

             {activeTab === 'payables' && (
                <motion.div 
                  key="payables" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                  className="space-y-4"
                >
                   <div className="flex justify-between items-center px-1">
                      <h3 className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Pagos Pendientes</h3>
                      <button onClick={props.onNewPayable} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white"><Plus size={14} /></button>
                   </div>
                   {props.combinedPayables.map(item => (
                     <PayableCard key={item.id} item={item} onPay={props.onPayPayable} onDelete={props.onDeletePayable} onEdit={props.onEditPayable} />
                   ))}
                </motion.div>
             )}
          </AnimatePresence>
       </div>
    </div>
  );
};

export default FinanceMobile;
