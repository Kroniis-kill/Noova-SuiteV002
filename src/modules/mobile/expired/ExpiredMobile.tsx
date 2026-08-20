import React, { useState, useMemo } from 'react';
import { Sale, Account, Client, Reseller } from '../../../types';
import { SalesGroup, getCombinedWhatsAppTemplate } from '../../../utils/salesUtils';
import { getDaysRemaining } from '../../../utils/expiredUtils';
import ExpiredCard from '../../../components/expired/ExpiredCard';
import Modal from '../../../components/ui/Modal';
import { useData } from '../../../context/DataContext';
import { openWhatsAppBusiness } from '../../../utils/contactosUtils';
import { Search, AlertOctagon, Layers, Users, TrendingUp, Wallet, Filter, CheckCircle2, X, DollarSign, MessageCircle, AlertCircle, Clock, ChevronDown, Truck, Trash2, RefreshCw, Check, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollFloatingActions from '../../../components/ui/ScrollFloatingActions';

interface ExpiredMobileProps {
  activeTab: 'sales' | 'inventory';
  setActiveTab: (tab: 'sales' | 'inventory') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  groupedSales: SalesGroup[];
  expiredAccounts: Account[];
  totalRevenue: number;
  totalProfit: number;
  currency: string;
  onRenewSale: (sales: Sale[]) => void;
  onRenewAccount: (acc: Account) => void;
  onDeleteAccount: (acc: Account) => void;
  onCardClick: (group: SalesGroup) => void;
  filterService: string;
  setFilterService: (s: string) => void;
  servicesList: string[];
  providers: any[];
  services: any[];
  onBack?: () => void;
}

const ExpiredMobile: React.FC<ExpiredMobileProps> = ({
  activeTab, setActiveTab, searchQuery, setSearchQuery, groupedSales, expiredAccounts,
  totalRevenue, totalProfit, currency, onRenewSale, onRenewAccount, onDeleteAccount, onCardClick,
  filterService, setFilterService, servicesList, providers, services, onBack
}) => {
  
  const { settings, accounts } = useData();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [selectedSalesForMsg, setSelectedSalesForMsg] = useState<Sale[]>([]);
  const [selectedClientForMsg, setSelectedClientForMsg] = useState<Client | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { vencidos, vencenHoy } = useMemo(() => {
    const v: SalesGroup[] = [];
    const h: SalesGroup[] = [];
    
    groupedSales.forEach(group => {
      const minDays = Math.min(...group.renewalGroups.flatMap(rg => rg.sales).map(s => getDaysRemaining(s.expiryDate)));
      if (minDays < 0) v.push(group);
      else h.push(group);
    });
    
    return { vencidos: v, vencenHoy: h };
  }, [groupedSales]);

  const handleMessageClick = (sales: Sale[], client: Client) => {
    setSelectedSalesForMsg(sales);
    setSelectedClientForMsg(client);
    setSelectedIds(sales.map(s => s.id));
    setIsCurrencyModalOpen(true);
  };

  const toggleSale = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const sendNotification = (useSecondary: boolean) => {
    if (!selectedClientForMsg || selectedIds.length === 0) return;
    
    const targetSales = selectedSalesForMsg.filter(s => selectedIds.includes(s.id));
    if (targetSales.length === 0) return;

    const days = getDaysRemaining(targetSales[0]?.expiryDate);
    let type: 'warning2Days' | 'warning1Day' | 'expiration' = 'warning2Days';
    if (days <= 0) type = 'expiration';
    else if (days === 1) type = 'warning1Day';
    else type = 'warning2Days';

    const message = getCombinedWhatsAppTemplate(type, targetSales, selectedClientForMsg.name, accounts, settings, 'whatsapp', useSecondary);
    openWhatsAppBusiness(selectedClientForMsg.phone || '', message);
    setIsCurrencyModalOpen(false);
  };

  return (
    <div className="pb-32 pt-2 px-4 font-sans text-zinc-100 min-h-screen">
       <div className="mb-4 relative z-10">
          <div className="mb-4">
              <h1 className="text-2xl font-bold text-white tracking-tight">Vencimientos</h1>
              <p className="text-zinc-400 text-[11px] font-medium mt-0.5">Control de fechas y renovaciones</p>
          </div>
          
          {activeTab === 'sales' && (
             <div className="bg-surface-3 border border-white/10 p-5 rounded-xl relative overflow-hidden shadow-lg mb-6">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-2xl pointer-events-none -mr-6 -mt-6" />
                 <div className="relative z-10 text-center py-2">
                     <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1 flex items-center justify-center gap-2">
                        <Wallet size={12} /> Total por Cobrar
                     </p>
                     <p className="text-4xl font-extrabold text-white tracking-tight leading-none mb-3">
                         <span className="text-lg text-zinc-500 font-medium mr-1 align-top relative top-1">{currency}</span>
                         {totalRevenue.toLocaleString()}
                     </p>
                     <div className="inline-flex items-center gap-2 bg-status-success/10 border border-status-success/20 px-3 py-1.5 rounded-full">
                         <TrendingUp size={12} className="text-status-success-soft" />
                         <span className="text-[10px] font-semibold text-status-success-soft uppercase tracking-wide">
                             Ganancia Est.: {currency} {totalProfit.toLocaleString()}
                         </span>
                     </div>
                 </div>
             </div>
          )}
       </div>

       <div className="relative pb-4 pt-2 -mx-4 px-4 border-b border-white/5 mb-4">
          <div className="flex gap-2 items-center">
             <div className={`flex bg-surface-zinc p-1 rounded-md border border-white/10 transition-all duration-300 ${isSearchOpen ? 'w-0 opacity-0 overflow-hidden p-0 border-0' : 'flex-1'}`}>
                <button onClick={() => setActiveTab('sales')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-sm text-[11px] font-semibold transition-all ${activeTab === 'sales' ? 'bg-surface-4 text-white shadow-md' : 'text-zinc-500'}`}>
                   <Users size={14} /> Clientes
                </button>
                <button onClick={() => setActiveTab('inventory')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-sm text-[11px] font-semibold transition-all ${activeTab === 'inventory' ? 'bg-surface-4 text-white shadow-md' : 'text-zinc-500'}`}>
                   <Layers size={14} /> Stock
                </button>
             </div>

             <div className={`relative transition-all duration-300 ease-out ${isSearchOpen ? 'flex-1' : 'w-[44px]'}`}>
                <div className={`flex items-center h-[44px] ${isSearchOpen ? 'bg-surface-zinc border border-white/10 rounded-md px-3' : ''}`}>
                   <button onClick={() => setIsSearchOpen(true)} className={`w-[44px] h-[44px] flex items-center justify-center shrink-0 rounded-md transition-all ${isSearchOpen ? 'text-zinc-400 -ml-3' : 'bg-surface-zinc border border-white/10 text-zinc-400 hover:text-white'}`}>
                      <Search size={18} />
                   </button>
                   <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar..." className={`bg-transparent text-[13px] text-white outline-none w-full font-medium transition-all ${isSearchOpen ? 'opacity-100' : 'opacity-0 w-0'}`} />
                   {isSearchOpen && <button onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }} className="p-1 text-zinc-500"><X size={16} /></button>}
                </div>
             </div>
          </div>
       </div>

       <div className="space-y-6">
          <AnimatePresence mode='popLayout'>
             {activeTab === 'sales' && (
               <div className="space-y-6">
                  {vencidos.length > 0 && (
                    <div className="space-y-3">
                       <h3 className="text-[10px] font-semibold text-status-danger uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                          <AlertCircle size={14} /> Ya Vencidos
                       </h3>
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {vencidos.map((group, idx) => (
                             <motion.div key={group.clientId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                                <ExpiredCard sales={group.renewalGroups.flatMap(g => g.sales)} client={{ id: group.clientId, name: group.clientName, phone: group.clientPhone, registrationDate: '', activeServices: 0 }} settings={settings} onRenew={onRenewSale} onClick={() => onCardClick(group)} onMessageClick={handleMessageClick} />
                             </motion.div>
                          ))}
                       </div>
                    </div>
                  )}

                  {vencenHoy.length > 0 && (
                    <div className="space-y-3">
                       <h3 className="text-[10px] font-semibold text-status-expiring-soft uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                          <Clock size={14} /> Vencen Hoy / Pronto
                       </h3>
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {vencenHoy.map((group, idx) => (
                             <motion.div key={group.clientId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                                <ExpiredCard sales={group.renewalGroups.flatMap(g => g.sales)} client={{ id: group.clientId, name: group.clientName, phone: group.clientPhone, registrationDate: '', activeServices: 0 }} settings={settings} onRenew={onRenewSale} onClick={() => onCardClick(group)} onMessageClick={handleMessageClick} />
                             </motion.div>
                          ))}
                       </div>
                    </div>
                  )}

                  {groupedSales.length === 0 && (
                    <div className="py-24 flex flex-col items-center justify-center opacity-50">
                        <CheckCircle2 size={48} className="text-status-success mb-4" />
                        <h3 className="text-lg font-bold text-white">Todo en orden</h3>
                    </div>
                  )}
               </div>
             )}

             {activeTab === 'inventory' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                   {expiredAccounts.map((acc, idx) => {
                      const service = services.find(s => s.id === acc.serviceId);
                      const provider = acc.providerId ? providers.find(p => p.id === acc.providerId) : null;
                      const days = getDaysRemaining(acc.endDate);
                      const isExpired = days < 0;
                      
                      let statusColor = 'bg-zinc-500';
                      let statusBadge = 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
                      if (days < 0) { statusColor = 'bg-status-danger'; statusBadge = 'bg-status-danger/10 text-status-danger-soft border-status-danger/20'; }
                      else if (days === 0) { statusColor = 'bg-status-expiring'; statusBadge = 'bg-status-expiring/10 text-status-expiring-soft border-status-expiring/20'; }
                      else if (days <= 2) { statusColor = 'bg-status-warning'; statusBadge = 'bg-status-warning/10 text-status-warning-soft border-status-warning/20'; }

                      return (
                         <motion.div 
                            key={acc.id} 
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            exit={{ opacity: 0, height: 0 }} 
                            transition={{ delay: idx * 0.03 }} 
                            className="bg-surface-3 border border-white/[0.08] rounded-lg relative overflow-hidden shadow-sm"
                         >
                            <div className={`absolute top-0 left-0 bottom-0 w-1 ${statusColor}`} />
                            <div className="flex flex-col gap-3 p-4 pl-5">
                                <div className="flex justify-between items-start">
                                   <div className="min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                         <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-white/5 border-white/10 text-zinc-400 uppercase tracking-wide">{service?.name || 'Servicio'}</span>
                                         {provider && <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-status-info/10 border-status-info/20 text-status-info-soft uppercase tracking-wide flex items-center gap-1"><Truck size={10} /> {provider.name}</span>}
                                      </div>
                                      <h4 className="text-[13px] font-bold text-white truncate">{acc.email}</h4>
                                   </div>
                                   <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${statusBadge}`}>
                                      {isExpired ? 'Vencida' : days === 0 ? 'Hoy' : 'Por Vencer'}
                                   </span>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                   <p className={`text-[11px] font-mono font-medium ${isExpired ? 'text-status-danger-soft' : 'text-zinc-400'}`}>
                                      {isExpired ? `Venció hace ${Math.abs(days)}d` : days === 0 ? 'Expira hoy' : `${days} días restantes`}
                                   </p>
                                   <div className="flex gap-2">
                                      <button onClick={() => onDeleteAccount(acc)} className="w-8 h-8 flex items-center justify-center rounded-sm bg-white/5 text-zinc-500 hover:text-status-danger-soft border border-white/5 active:scale-90 transition-all">
                                         <Trash2 size={14} />
                                      </button>
                                      <button onClick={() => onRenewAccount(acc)} className="h-8 px-3 rounded-sm bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-[10px] font-semibold flex items-center gap-1.5 active:scale-95 transition-all">
                                         <RefreshCw size={12} /> Renovar
                                      </button>
                                   </div>
                                </div>
                            </div>
                         </motion.div>
                      );
                   })}
                </div>
             )}
          </AnimatePresence>
       </div>

       <Modal isOpen={isCurrencyModalOpen} onClose={() => setIsCurrencyModalOpen(false)} title="Enviar Aviso">
          <div className="space-y-4 pt-2">
             {selectedSalesForMsg.length > 1 && (
                <div className="mb-2">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase mb-2 block ml-1 tracking-wider">Servicios a incluir</label>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                        {selectedSalesForMsg.map(s => (
                            <button
                                key={s.id}
                                onClick={() => toggleSale(s.id)}
                                className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                                    selectedIds.includes(s.id) ? 'bg-brand-primary/10 border-brand-primary/30' : 'bg-white/5 border-white/5 opacity-60'
                                }`}
                            >
                                <span className={`text-xs font-semibold ${selectedIds.includes(s.id) ? 'text-white' : 'text-zinc-400'}`}>{s.serviceName}</span>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${selectedIds.includes(s.id) ? 'bg-brand-primary border-brand-primary text-white' : 'border-zinc-600'}`}>
                                    {selectedIds.includes(s.id) && <Check size={12} strokeWidth={3} />}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
             )}
             <div className="bg-surface-zinc border border-white/10 rounded-md p-4 text-center">
                <p className="text-sm text-zinc-300 font-medium mb-4">Selecciona la moneda</p>
                <div className="grid grid-cols-2 gap-3">
                   <button onClick={() => sendNotification(false)} disabled={selectedIds.length === 0} className="flex flex-col items-center justify-center p-4 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 transition-all active:scale-95 disabled:opacity-30">
                      <DollarSign size={20} className="text-brand-primary mb-2" />
                      <span className="text-xs font-semibold text-white uppercase">{settings.currency || 'USD'}</span>
                   </button>
                   <button onClick={() => sendNotification(true)} disabled={selectedIds.length === 0} className="flex flex-col items-center justify-center p-4 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 transition-all active:scale-95 disabled:opacity-30">
                      <RefreshCw size={20} className="text-status-success-soft mb-2" />
                      <span className="text-xs font-semibold text-white uppercase">{settings.subCurrency || 'SEC'}</span>
                   </button>
                </div>
             </div>
             <button onClick={() => setIsCurrencyModalOpen(false)} className="w-full py-3 text-zinc-500 text-xs font-semibold">Cancelar</button>
          </div>
       </Modal>
       <ScrollFloatingActions onBack={onBack} />
    </div>
  );
};

export default ExpiredMobile;