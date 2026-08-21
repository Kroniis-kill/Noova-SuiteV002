import React, { useMemo, useState } from 'react';
import { SalesGroup, getCombinedWhatsAppTemplate } from '../../utils/salesUtils';
import { motion } from 'framer-motion';
import { Layers, MessageCircle, Trash2, ChevronRight, Clock, Briefcase, BellRing, DollarSign, RefreshCw, AlertTriangle, ClipboardList, Check, AlertCircle } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { sendWhatsAppMessage } from '../../utils/contactosUtils'; 
import Modal from '../ui/Modal';
import { getDaysRemaining } from '../../utils/expiredUtils';
import { Account, AppSettings } from '../../types';

interface SaleCardProps {
  group: SalesGroup;
  onClick: (group: SalesGroup) => void;
  onWhatsApp: (group: SalesGroup) => void;
  onDelete: (group: SalesGroup) => void;
  compact?: boolean;
  warningThreshold: number;
  hasFailingAccount: boolean;
  hasPendingFailInAgenda: boolean;
  settings: AppSettings;
  accounts: Account[];
}

const SaleCard: React.FC<SaleCardProps> = React.memo(({ group, onClick, onWhatsApp, onDelete, compact, warningThreshold, hasFailingAccount, hasPendingFailInAgenda, settings, accounts }) => {
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const allSales = group.renewalGroups.flatMap(g => g.sales);
  // Cambiado: Ahora suma el total de pantallas de todas las ventas del grupo
  const totalScreens = useMemo(() => allSales.reduce((acc, s) => acc + (s.screensCount || 1), 0), [allSales]);
  const isReseller = !!group.reseller;

  const urgentSales = useMemo(() => {
    return allSales.filter(s => getDaysRemaining(s.expiryDate) <= warningThreshold);
  }, [allSales, warningThreshold]);

  const { statusText, timeColor, cardStyle, indicatorColor, minD, isUrgent } = useMemo(() => {
    let minD = 999;
    allSales.forEach(s => {
      const diff = getDaysRemaining(s.expiryDate);
      if (diff < minD) minD = diff;
    });

    const isUrgent = minD <= warningThreshold;
    // Estilo 100% integrado: Fondo totalmente transparente
    const baseStyle = 'border-border-subtle hover:border-border-strong bg-transparent transition-colors duration-150 ease-out-soft';

    if (minD < 0) return { 
        statusText: `${Math.abs(minD)}D(V)`, 
        timeColor: 'text-status-danger-soft', 
        cardStyle: baseStyle,
        indicatorColor: 'bg-status-danger',
        minD, isUrgent
    };
    if (minD === 0) return { 
        statusText: 'HOY', 
        timeColor: 'text-status-expiring',
        cardStyle: baseStyle,
        indicatorColor: 'bg-status-expiring',
        minD, isUrgent
    };
    if (minD <= warningThreshold) return { 
        statusText: `${minD}D`, 
        timeColor: 'text-status-warning-soft',
        cardStyle: baseStyle,
        indicatorColor: 'bg-status-warning-soft',
        minD, isUrgent
    };
    
    return { 
        statusText: `${minD}D`, 
        timeColor: 'text-text-disabled', 
        cardStyle: baseStyle,
        indicatorColor: 'bg-zinc-700',
        minD, isUrgent
    };
  }, [allSales, warningThreshold]);

  const handleSmartWhatsApp = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isUrgent) {
          setSelectedIds(urgentSales.map(s => s.id));
          setShowCurrencyModal(true);
      }
      else onWhatsApp(group);
  };

  const toggleSale = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleConfirmCurrency = (useSecondary: boolean) => {
      if (selectedIds.length === 0) return;
      
      let type: any = 'warning2Days';
      const targetSales = allSales.filter(s => selectedIds.includes(s.id));
      const currentMinD = Math.min(...targetSales.map(s => getDaysRemaining(s.expiryDate)));

      if (currentMinD <= 0) type = 'expiration';
      else if (currentMinD === 1) type = 'warning1Day';
      else type = 'warning2Days';

      const message = getCombinedWhatsAppTemplate(type, targetSales, group.clientName, accounts, settings, 'whatsapp', useSecondary, false);
      sendWhatsAppMessage(group.clientPhone, message); 
      setShowCurrencyModal(false);
  };

  if (compact) {
    return (
      <>
        <div 
          onClick={() => onClick(group)}
          className={`relative border rounded-xl p-2.5 min-h-[132px] cursor-pointer flex flex-col justify-between h-full group active:scale-95 overflow-hidden ${cardStyle}`}
        >
            <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${indicatorColor}`} />
            
            {/* Header Indicators */}
            <div className="flex justify-between items-center w-full z-10 px-0.5">
                <div className="flex items-center gap-1 text-[9px] text-text-disabled font-medium bg-[rgb(var(--fg-rgb))]/[0.03] px-1.5 py-0.5 rounded-md">
                    <Layers size={10} strokeWidth={3} />
                    <span>{totalScreens}</span>
                </div>

                <div className="flex gap-1">
                    {hasFailingAccount && (
                        <div className="text-status-expiring bg-status-expiring/10 p-0.5 rounded-md" title="Falla Detectada">
                            <AlertTriangle size={10} strokeWidth={3} />
                        </div>
                    )}
                    {hasPendingFailInAgenda && (
                        <div className="text-status-danger bg-status-danger/10 p-0.5 rounded-md" title="En Agenda de Fallas">
                            <AlertCircle size={10} strokeWidth={3} />
                        </div>
                    )}
                    {isReseller && (
                       <div className="text-status-warning bg-status-warning/10 p-0.5 rounded-md" title="Cliente de Revendedor">
                           <Briefcase size={10} strokeWidth={3} />
                       </div>
                    )}
                </div>
            </div>

            {/* Central Identity Section */}
            <div className="flex-1 flex flex-col items-center justify-center gap-1 mt-1">
                <div className="relative">
                   <Avatar name={group.clientName} size={36} className="rounded-full shadow-md border border-[rgb(var(--fg-rgb))]/5" />
                </div>
                
                <div className="text-center w-full space-y-0.5">
                    <h3 className="text-[10px] font-semibold text-text-primary leading-tight tracking-tight line-clamp-2 px-1 not-italic">
                        {group.clientName}
                    </h3>
                    <div className={`flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-widest ${timeColor}`}>
                       <Clock size={8} strokeWidth={3} />
                       <span>{statusText}</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions Bottom */}
            <div className="flex items-center justify-between gap-2 mt-2 w-full shrink-0">
                <button 
                  onClick={handleSmartWhatsApp} 
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all active:scale-90 ${isUrgent ? 'bg-brand-whatsapp border-brand-whatsapp text-black shadow-glow-sm' : 'bg-[rgb(var(--fg-rgb))]/5 border-[rgb(var(--fg-rgb))]/[0.05] text-text-disabled hover:text-text-primary'}`}
                >
                   {isUrgent ? <BellRing size={12} fill="currentColor" /> : <MessageCircle size={12} />}
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(group); }} 
                  className="w-8 h-8 rounded-full bg-[rgb(var(--fg-rgb))]/5 text-text-faint border border-[rgb(var(--fg-rgb))]/[0.05] flex items-center justify-center hover:text-status-danger-soft transition-all active:scale-90"
                >
                   <Trash2 size={12} />
                </button>
            </div>
        </div>

        {showCurrencyModal && (
            <Modal isOpen={true} onClose={() => setShowCurrencyModal(false)} title="Enviar Aviso" zIndex={20000}>
              <div className="space-y-4 pt-2" onClick={e => e.stopPropagation()}>
                {urgentSales.length > 1 && (
                    <div className="mb-2">
                        <label className="text-[10px] font-semibold text-text-disabled uppercase mb-2 block ml-1 tracking-wider">Servicios a incluir</label>
                        <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                            {urgentSales.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => toggleSale(s.id)}
                                    className={`w-full p-3 rounded-md border flex items-center justify-between transition-all ${
                                        selectedIds.includes(s.id) ? 'bg-brand-primary/10 border-brand-primary/30' : 'bg-[rgb(var(--fg-rgb))]/5 border-[rgb(var(--fg-rgb))]/5 opacity-60'
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
                
                <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-md p-4 text-center">
                    <p className="text-sm text-text-secondary font-medium mb-4">Selecciona la moneda</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => handleConfirmCurrency(false)} disabled={selectedIds.length === 0} className="flex flex-col items-center justify-center p-4 rounded-md bg-surface-3 hover:bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/[0.08] transition-all active:scale-95 disabled:opacity-30"><DollarSign size={20} className="text-brand-primary mb-2" /><span className="text-xs font-semibold text-text-primary uppercase">{settings.currency}</span></button>
                      <button onClick={() => handleConfirmCurrency(true)} disabled={selectedIds.length === 0} className="flex flex-col items-center justify-center p-4 rounded-md bg-surface-3 hover:bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/[0.08] transition-all active:scale-95 disabled:opacity-30"><RefreshCw size={20} className="text-status-success-soft mb-2" /><span className="text-xs font-semibold text-text-primary uppercase">{settings.subCurrency}</span></button>
                    </div>
                </div>
                <button onClick={() => setShowCurrencyModal(false)} className="w-full py-3 text-text-disabled text-xs font-semibold">Cancelar</button>
              </div>
            </Modal>
        )}
      </>
    );
  }

  return (
    <>
      <div 
        onClick={() => onClick(group)}
        className={`relative overflow-hidden border rounded-xl p-0 cursor-pointer group ${cardStyle}`}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${indicatorColor}`} />
        
        <div className="p-5 pl-7 relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative shrink-0">
                  <Avatar name={group.clientName} size={48} className="rounded-full shadow-lg border border-[rgb(var(--fg-rgb))]/[0.08]" />
                  <div className="absolute -top-1 -right-1 flex gap-1">
                      {hasFailingAccount && (
                          <div className="bg-status-expiring text-black p-1 rounded-full border-2 border-surface-1 animate-pulse">
                              <AlertTriangle size={10} strokeWidth={3} />
                          </div>
                      )}
                      {hasPendingFailInAgenda && (
                          <div className="bg-status-danger text-white p-1 rounded-full border-2 border-surface-1">
                              <AlertCircle size={10} strokeWidth={3} />
                          </div>
                      )}
                  </div>
              </div>
              <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-text-primary truncate leading-tight not-italic">{group.clientName}</h3>
                      {isReseller && <span className="flex items-center gap-1 text-[9px] bg-status-warning/10 text-status-warning px-1.5 py-0.5 rounded border border-status-warning/20 font-bold uppercase"><Briefcase size={8} /> Socio</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted flex items-center gap-1"><Layers size={12} /> {totalScreens} Cupos</span>
                    <span className="text-text-faint">•</span>
                    <span className={`font-medium ${timeColor}`}>{statusText}</span>
                  </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-disabled group-hover:text-text-primary group-hover:bg-[rgb(var(--fg-rgb))]/10 transition-colors"><ChevronRight size={16} /></div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[rgb(var(--fg-rgb))]/[0.08]">
              <div className="flex flex-col">
                  <span className="text-[9px] font-semibold text-text-disabled uppercase tracking-wider">Total</span>
                  <span className="text-sm font-medium text-text-primary">${allSales.reduce((a,c)=>a+c.amount,0).toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                  <button onClick={handleSmartWhatsApp} className={`h-9 px-4 rounded-full border flex items-center gap-2 transition-colors active:scale-95 text-[11px] font-semibold ${isUrgent ? 'bg-brand-whatsapp text-black border-brand-whatsapp hover:brightness-110 shadow-glow' : 'bg-brand-whatsapp/10 text-brand-whatsapp border-brand-whatsapp/20 hover:bg-brand-whatsapp/20'}`}>
                    {isUrgent ? <BellRing size={14} fill="currentColor" /> : <MessageCircle size={14} />}
                    {isUrgent ? 'Recordar' : 'WhatsApp'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(group); }} className="h-9 w-9 rounded-full bg-status-danger/10 text-status-danger-soft border-status-danger/20 flex items-center justify-center hover:bg-status-danger/20 transition-colors active:scale-95"><Trash2 size={16} /></button>
              </div>
            </div>
        </div>
      </div>
      {showCurrencyModal && (
        <Modal isOpen={true} onClose={() => setShowCurrencyModal(false)} title="Enviar Aviso" zIndex={20000}>
          <div className="space-y-4 pt-2" onClick={e => e.stopPropagation()}>
            {urgentSales.length > 1 && (
                <div className="mb-2">
                    <label className="text-[10px] font-semibold text-text-disabled uppercase mb-2 block ml-1 tracking-wider">Servicios a incluir</label>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                        {urgentSales.map(s => (
                            <button
                                key={s.id}
                                onClick={() => toggleSale(s.id)}
                                className={`w-full p-3 rounded-md border flex items-center justify-between transition-all ${
                                    selectedIds.includes(s.id) ? 'bg-brand-primary/10 border-brand-primary/30' : 'bg-[rgb(var(--fg-rgb))]/5 border-[rgb(var(--fg-rgb))]/5 opacity-60'
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
            
            <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-md p-4 text-center">
                <p className="text-sm text-text-secondary font-medium mb-4">Selecciona la moneda</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleConfirmCurrency(false)} disabled={selectedIds.length === 0} className="flex flex-col items-center justify-center p-4 rounded-md bg-surface-3 hover:bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/[0.08] transition-all active:scale-95 disabled:opacity-30"><DollarSign size={20} className="text-brand-primary mb-2" /><span className="text-xs font-semibold text-text-primary uppercase">{settings.currency}</span></button>
                  <button onClick={() => handleConfirmCurrency(true)} disabled={selectedIds.length === 0} className="flex flex-col items-center justify-center p-4 rounded-md bg-surface-3 hover:bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/[0.08] transition-all active:scale-95 disabled:opacity-30"><RefreshCw size={20} className="text-status-success-soft mb-2" /><span className="text-xs font-semibold text-text-primary uppercase">{settings.subCurrency}</span></button>
                </div>
            </div>
            <button onClick={() => setShowCurrencyModal(false)} className="w-full py-3 text-text-disabled text-xs font-semibold">Cancelar</button>
          </div>
        </Modal>
      )}
    </>
  );
});

export default SaleCard;