import React, { useState, useMemo } from 'react';
import { Sale, Account, Client, Reseller } from '../../../types';
import { SalesGroup, getCombinedWhatsAppTemplate } from '../../../utils/salesUtils';
import { getDaysRemaining } from '../../../utils/expiredUtils';
import ExpiredCard from '../../../components/expired/ExpiredCard';
import ExpiredAccountCard from '../../../components/expired/ExpiredAccountCard';
import Modal from '../../../components/ui/Modal';
import { useData } from '../../../context/DataContext';
import { openWhatsAppBusiness } from '../../../utils/contactosUtils';
import { Search, AlertOctagon, Layers, Users, TrendingUp, Wallet, Filter, CheckCircle2, X, DollarSign, MessageCircle, AlertCircle, Clock, CalendarClock, ChevronDown, Truck, Trash2, RefreshCw, Check, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollFloatingActions from '../../../components/ui/ScrollFloatingActions';

interface ExpiredMobileProps {
  activeTab: 'sales' | 'inventory';
  setActiveTab: (tab: 'sales' | 'inventory') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  groupedSales: SalesGroup[];
  groupedRenewals?: SalesGroup[];
  onMarkRenewed?: (sales: Sale[]) => void;
  expiredAccounts: Account[];
  totalRevenue: number;
  totalProfit: number;
  overdueRevenue?: number;
  overdueCount?: number;
  currency: string;
  onRenewSale: (sales: Sale[]) => void;
  onRenewAccount: (acc: Account) => void;
  onDeleteAccount: (acc: Account) => void;
  onAccountClick: (acc: Account) => void;
  onCardClick: (group: SalesGroup) => void;
  filterService: string;
  setFilterService: (s: string) => void;
  servicesList: string[];
  providers: any[];
  services: any[];
  onBack?: () => void;
}

const ExpiredMobile: React.FC<ExpiredMobileProps> = ({
  activeTab, setActiveTab, searchQuery, setSearchQuery, groupedSales, groupedRenewals = [] as SalesGroup[], onMarkRenewed, expiredAccounts,
  totalRevenue, totalProfit, overdueRevenue = 0, overdueCount = 0, currency, onRenewSale, onRenewAccount, onDeleteAccount, onAccountClick, onCardClick,
  filterService, setFilterService, servicesList, providers, services, onBack
}) => {

  const { settings, accounts } = useData();
  const warningDays = settings.salesPreferences?.warningDays ?? 2;

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
    <div className="pb-32 pt-2 px-4 font-sans text-text-primary min-h-dvh">

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-black text-text-primary tracking-tight">Vencimientos</h1>
        <p className="text-text-muted text-tiny font-semibold uppercase tracking-[0.15em] mt-1">
          Vencidos y por vencer en {warningDays} {warningDays === 1 ? 'día' : 'días'}
        </p>
      </div>

      {/* Resumen (compacto): lo vencido va aparte y no suma al total por cobrar */}
      {activeTab === 'sales' && (
        <div className="bg-surface-1 border border-border-subtle rounded-xl px-4 py-3 mb-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-md bg-brand-primary/15 text-brand-primary flex items-center justify-center shrink-0">
                <Wallet size={13} />
              </div>
              <p className="text-tiny font-semibold text-text-disabled uppercase tracking-widest truncate">Por cobrar</p>
            </div>
            <span className="inline-flex items-center gap-1 text-tiny font-medium text-status-success-soft/80 shrink-0">
              <TrendingUp size={11} />
              Gan. {currency} {totalProfit.toLocaleString()}
            </span>
          </div>
          <p className="text-3xl font-extrabold text-text-primary tracking-tight leading-none mt-2">
            <span className="text-base text-text-disabled font-medium mr-1 align-top relative top-0.5">{currency}</span>
            {totalRevenue.toLocaleString()}
          </p>
          {overdueCount > 0 && (
            <div className="mt-2.5 pt-2 border-t border-hairline flex items-center justify-between gap-3 text-tiny">
              <span className="flex items-center gap-1.5 text-text-disabled min-w-0 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-status-danger shrink-0" />
                Vencidos (aparte) · {overdueCount} {overdueCount === 1 ? 'servicio' : 'servicios'}
              </span>
              <span className="font-semibold text-status-danger-soft shrink-0">{currency} {overdueRevenue.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs + búsqueda */}
      <div className="relative pb-4 pt-1 -mx-4 px-4 border-b border-border-subtle mb-4">
        <div className="flex gap-2 items-center">
          <div className={`flex bg-surface-sunken p-1 rounded-md border border-border-subtle transition-all duration-300 ${isSearchOpen ? 'w-0 opacity-0 overflow-hidden p-0 border-0' : 'flex-1'}`}>
            <button onClick={() => setActiveTab('sales')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-sm text-caption font-semibold transition-all ${activeTab === 'sales' ? 'bg-surface-1 text-text-primary shadow-md' : 'text-text-disabled'}`}>
              <Users size={14} /> Clientes
              {groupedSales.length > 0 && (
                <span className={`text-micro font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'sales' ? 'bg-brand-primary/15 text-brand-primary' : 'bg-[rgb(var(--fg-rgb))]/10 text-text-disabled'}`}>
                  {groupedSales.length}
                </span>
              )}
            </button>
            <button onClick={() => setActiveTab('inventory')} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-sm text-caption font-semibold transition-all ${activeTab === 'inventory' ? 'bg-surface-1 text-text-primary shadow-md' : 'text-text-disabled'}`}>
              <Layers size={14} /> Stock
              {expiredAccounts.length > 0 && (
                <span className={`text-micro font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'inventory' ? 'bg-brand-primary/15 text-brand-primary' : 'bg-[rgb(var(--fg-rgb))]/10 text-text-disabled'}`}>
                  {expiredAccounts.length}
                </span>
              )}
            </button>
          </div>

          <div className={`relative transition-all duration-300 ease-out ${isSearchOpen ? 'flex-1' : 'w-[44px]'}`}>
            <div className={`flex items-center h-[44px] ${isSearchOpen ? 'bg-surface-sunken border border-border-subtle rounded-md px-3' : ''}`}>
              <button aria-label="Buscar" onClick={() => setIsSearchOpen(true)} className={`w-[44px] h-[44px] flex items-center justify-center shrink-0 rounded-md transition-all ${isSearchOpen ? 'text-text-muted -ml-3' : 'bg-surface-sunken border border-border-subtle text-text-muted hover:text-text-primary'}`}>
                <Search size={18} />
              </button>
              <input aria-label="Buscar" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar..." className={`bg-transparent text-body-sm text-text-primary outline-none w-full font-medium transition-all ${isSearchOpen ? 'opacity-100' : 'opacity-0 w-0'}`} />
              {isSearchOpen && <button aria-label="Cerrar" onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }} className="p-1 text-text-disabled"><X size={16} /></button>}
            </div>
          </div>
        </div>

        {/* Filtro por servicio (solo Stock) */}
        {activeTab === 'inventory' && servicesList.length > 0 && (
          <div className="flex gap-2 mt-3 overflow-x-auto custom-scrollbar pb-1">
            <button
              onClick={() => setFilterService('all')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-caption font-semibold border transition-all flex items-center gap-1.5 ${filterService === 'all' ? 'bg-brand-primary/15 border-brand-primary/30 text-brand-primary' : 'bg-surface-sunken border-border-subtle text-text-disabled'}`}
            >
              <Filter size={11} /> Todos
            </button>
            {servicesList.map(name => (
              <button
                key={name}
                onClick={() => setFilterService(name)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-caption font-semibold border transition-all ${filterService === name ? 'bg-brand-primary/15 border-brand-primary/30 text-brand-primary' : 'bg-surface-sunken border-border-subtle text-text-disabled'}`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <AnimatePresence mode='popLayout'>
          {activeTab === 'sales' && (
            <div className="space-y-6">
              {vencidos.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 ml-1">
                    <div className="w-7 h-7 rounded-lg bg-status-danger/15 text-status-danger-soft flex items-center justify-center">
                      <AlertCircle size={13} />
                    </div>
                    <h3 className="text-tiny font-semibold text-status-danger-soft uppercase tracking-[0.2em]">Ya vencidos</h3>
                  </div>
                  <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
                    {vencidos.map((group, idx) => (
                      <motion.div key={group.clientId} className="h-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                        <ExpiredCard sales={group.renewalGroups.flatMap(g => g.sales)} client={{ id: group.clientId, name: group.clientName, phone: group.clientPhone, registrationDate: '', activeServices: 0 }} settings={settings} onRenew={onRenewSale} onClick={() => onCardClick(group)} onMessageClick={handleMessageClick} variant="grid" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {vencenHoy.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 ml-1">
                    <div className="w-7 h-7 rounded-lg bg-status-expiring/15 text-status-expiring-soft flex items-center justify-center">
                      <Clock size={13} />
                    </div>
                    <h3 className="text-tiny font-semibold text-status-expiring-soft uppercase tracking-[0.2em]">Vencen hoy / pronto</h3>
                  </div>
                  <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
                    {vencenHoy.map((group, idx) => (
                      <motion.div key={group.clientId} className="h-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                        <ExpiredCard sales={group.renewalGroups.flatMap(g => g.sales)} client={{ id: group.clientId, name: group.clientName, phone: group.clientPhone, registrationDate: '', activeServices: 0 }} settings={settings} onRenew={onRenewSale} onClick={() => onCardClick(group)} onMessageClick={handleMessageClick} variant="grid" />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {groupedRenewals.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 ml-1">
                    <div className="w-7 h-7 rounded-lg bg-status-success/15 text-status-success-soft flex items-center justify-center">
                      <CalendarClock size={13} />
                    </div>
                    <h3 className="text-tiny font-semibold text-status-success-soft uppercase tracking-[0.2em]">Renovar cuenta · prepagado</h3>
                  </div>
                  <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
                    {groupedRenewals.map((group, idx) => (
                      <motion.div key={group.clientId} className="h-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                        <ExpiredCard sales={group.renewalGroups.flatMap(g => g.sales)} client={{ id: group.clientId, name: group.clientName, phone: group.clientPhone, registrationDate: '', activeServices: 0 }} settings={settings} onRenew={onRenewSale} onClick={() => onCardClick(group)} variant="grid" renewalMode onMarkRenewed={onMarkRenewed} />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {groupedSales.length === 0 && groupedRenewals.length === 0 && (
                <div className="py-24 flex flex-col items-center justify-center opacity-50">
                  <CheckCircle2 size={48} className="text-status-success mb-4" />
                  <h3 className="text-lg font-bold text-text-primary">Todo en orden</h3>
                </div>
              )}
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 pb-24">
              {expiredAccounts.map((acc, idx) => (
                <motion.div key={acc.id} className="h-full" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                  <ExpiredAccountCard
                    account={acc}
                    service={services.find(s => s.id === acc.serviceId)}
                    onClick={onAccountClick}
                    onRenew={onRenewAccount}
                    onDelete={onDeleteAccount}
                  />
                </motion.div>
              ))}

              {expiredAccounts.length === 0 && (
                <div className="col-span-full py-24 flex flex-col items-center justify-center opacity-50">
                  <CheckCircle2 size={48} className="text-status-success mb-4" />
                  <h3 className="text-lg font-bold text-text-primary">Todo en orden</h3>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      <Modal isOpen={isCurrencyModalOpen} onClose={() => setIsCurrencyModalOpen(false)} title="Enviar aviso">
        <div className="space-y-4 pt-2">
          {selectedSalesForMsg.length > 1 && (
            <div className="mb-2">
              <label className="text-tiny font-semibold text-text-disabled uppercase mb-2 block ml-1 tracking-wider">Servicios a incluir</label>
              <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                {selectedSalesForMsg.map(s => (
                  <button
                    key={s.id}
                    onClick={() => toggleSale(s.id)}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                      selectedIds.includes(s.id) ? 'bg-brand-primary/10 border-brand-primary/30' : 'bg-[rgb(var(--fg-rgb))]/5 border-border-subtle opacity-60'
                    }`}
                  >
                    <span className={`text-xs font-semibold ${selectedIds.includes(s.id) ? 'text-text-primary' : 'text-text-muted'}`}>{s.serviceName}</span>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${selectedIds.includes(s.id) ? 'bg-brand-primary border-brand-primary text-white' : 'border-zinc-600'}`}>
                      {selectedIds.includes(s.id) && <Check size={12} strokeWidth={3} />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="bg-surface-sunken border border-border-subtle rounded-md p-4 text-center">
            <p className="text-sm text-text-secondary font-medium mb-4">Selecciona la moneda</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => sendNotification(false)} disabled={selectedIds.length === 0} className="flex flex-col items-center justify-center p-4 rounded-md bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 border border-border-subtle transition-all active:scale-95 disabled:opacity-30">
                <DollarSign size={20} className="text-brand-primary mb-2" />
                <span className="text-xs font-semibold text-text-primary uppercase">{settings.currency || 'USD'}</span>
              </button>
              <button onClick={() => sendNotification(true)} disabled={selectedIds.length === 0} className="flex flex-col items-center justify-center p-4 rounded-md bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 border border-border-subtle transition-all active:scale-95 disabled:opacity-30">
                <RefreshCw size={20} className="text-status-success-soft mb-2" />
                <span className="text-xs font-semibold text-text-primary uppercase">{settings.subCurrency || 'SEC'}</span>
              </button>
            </div>
          </div>
          <button onClick={() => setIsCurrencyModalOpen(false)} className="w-full py-3 text-text-disabled text-xs font-semibold">Cancelar</button>
        </div>
      </Modal>
      <ScrollFloatingActions onBack={onBack} />
    </div>
  );
};

export default ExpiredMobile;
