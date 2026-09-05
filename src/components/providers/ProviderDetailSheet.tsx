
import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Provider, Account, Service } from '../../types';
import { X, MessageCircle, Send, Phone, Calendar, Layers, ExternalLink, Copy, CheckCircle2, AlertCircle, Ban, Edit2, Trash2, Truck } from 'lucide-react';
import { sendWhatsAppMessage, formatDate } from '../../utils/contactosUtils'; 
import { useIsMobile } from '../../hooks/useIsMobile';
import { useToast } from '../../context/ToastContext';

interface ProviderDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  provider: Provider | null;
  accounts: Account[];
  services: Service[];
  onEdit: (p: Provider) => void;
  onAccountClick: (acc: Account) => void;
  onDelete?: (p: Provider) => void;
}

const ProviderDetailSheet: React.FC<ProviderDetailSheetProps> = ({ 
  isOpen, onClose, provider, accounts, services, onEdit, onAccountClick, onDelete
}) => {
  const isMobile = useIsMobile();
  const { showToast } = useToast();
  
  const providerAccounts = useMemo(() => {
    if (!provider) return [];
    return accounts.filter(a => a.providerId === provider.id);
  }, [accounts, provider]);

  const activeCount = providerAccounts.filter(a => a.status === 'activa').length;
  const expiredCount = providerAccounts.filter(a => a.status === 'vencida' || a.status === 'por_vencer').length;

  if (!isOpen || !provider) return null;

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    showToast('Copiado al portapapeles', 'success');
  };

  const getStatusConfig = (status: string) => {
      switch(status) {
          case 'activa': return { icon: CheckCircle2, color: 'text-status-success-soft', bg: 'bg-status-success/10 border-status-success/20' };
          case 'por_vencer': return { icon: AlertCircle, color: 'text-status-warning-soft', bg: 'bg-status-warning/10 border-status-warning/20' };
          case 'vencida': return { icon: AlertCircle, color: 'text-status-danger-soft', bg: 'bg-status-danger/10 border-status-danger/20' };
          default: return { icon: Ban, color: 'text-text-disabled', bg: 'bg-zinc-500/10 border-zinc-500/20' };
      }
  };

  // Animation variants
  const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
  const modalVariants = isMobile ? { hidden: { y: "100%" }, visible: { y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } }, exit: { y: "100%" } } : { hidden: { opacity: 0, scale: 0.95, y: 20 }, visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2 } }, exit: { opacity: 0, scale: 0.95, y: 20 } };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div variants={backdropVariants} initial="hidden" animate="visible" exit="exit" onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" />
          <div className={`fixed inset-0 z-[9999] flex justify-center pointer-events-none ${isMobile ? 'items-end' : 'items-center'}`}>
            <motion.div 
                variants={modalVariants} 
                initial="hidden" 
                animate="visible" 
                exit="exit" 
                className={`pointer-events-auto bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 shadow-2xl flex flex-col overflow-hidden ${isMobile ? 'w-full rounded-t-xl max-h-[90dvh]' : 'w-[800px] h-[650px] rounded-xl'}`}
            >
                {/* Header / Cover Style similar to Resellers */}
                <div className="relative shrink-0 p-6 pb-6 border-b border-[rgb(var(--fg-rgb))]/5">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                    
                    {isMobile && <div className="w-12 h-1.5 bg-[rgb(var(--fg-rgb))]/10 rounded-full mx-auto mb-6 cursor-grab active:cursor-grabbing" onClick={onClose} />}

                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-5">
                            <div 
                                className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold text-text-primary shadow-glow border border-[rgb(var(--fg-rgb))]/10"
                                style={{ backgroundColor: provider.color }}
                            >
                                {provider.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-text-primary tracking-tight">{provider.name}</h2>
                                <div className="flex items-center gap-2 mt-1.5">
                                    {provider.whatsapp && (
                                        <button onClick={() => sendWhatsAppMessage(provider.whatsapp, '')} className="px-2.5 py-1 rounded-lg bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/5 hover:bg-brand-whatsapp/10 hover:text-brand-whatsapp transition-colors flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
                                            <MessageCircle size={12} /> {provider.whatsapp}
                                        </button>
                                    )}
                                    {provider.telegram && (
                                        <button onClick={() => window.open(`https://t.me/${provider.telegram?.replace('@','')}`, '_blank')} className="px-2.5 py-1 rounded-lg bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/5 hover:bg-brand-telegram/10 hover:text-brand-telegram transition-colors flex items-center gap-1.5 text-[11px] font-medium text-text-muted">
                                            <Send size={12} /> Telegram
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            <button onClick={() => { onClose(); onEdit(provider); }} className="w-9 h-9 rounded-full bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
                                <Edit2 size={16} />
                            </button>
                            {onDelete && (
                                <button onClick={() => onDelete(provider)} className="w-9 h-9 rounded-full bg-status-danger/10 hover:bg-status-danger/20 border border-status-danger/10 flex items-center justify-center text-status-danger-soft transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            )}
                            <button onClick={onClose} className="w-9 h-9 rounded-full bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-surface-sunken border-b border-[rgb(var(--fg-rgb))]/5">
                    <div className="p-4 text-center border-r border-[rgb(var(--fg-rgb))]/5">
                        <p className="text-[10px] text-text-disabled font-semibold uppercase tracking-wider mb-1">Cuentas Totales</p>
                        <p className="text-lg font-bold text-text-primary">{providerAccounts.length}</p>
                    </div>
                    <div className="p-4 text-center border-r border-[rgb(var(--fg-rgb))]/5">
                        <p className="text-[10px] text-text-disabled font-semibold uppercase tracking-wider mb-1">Stock Activo</p>
                        <p className="text-lg font-bold text-status-success-soft">{activeCount}</p>
                    </div>
                    <div className="p-4 text-center">
                        <p className="text-[10px] text-text-disabled font-semibold uppercase tracking-wider mb-1">Alertas</p>
                        <p className="text-lg font-bold text-status-warning-soft">{expiredCount}</p>
                    </div>
                </div>

                {/* Accounts List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-surface-1">
                    <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                        <Layers size={16} className="text-brand-primary" /> Inventario Suministrado
                    </h3>
                    
                    {providerAccounts.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-[rgb(var(--fg-rgb))]/5 rounded-xl opacity-50">
                            <Truck size={32} className="text-text-faint mb-2" />
                            <p className="text-text-disabled text-xs">No hay cuentas registradas.</p>
                        </div>
                    ) : (
                        <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {providerAccounts.map(acc => {
                                const service = services.find(s => s.id === acc.serviceId);
                                const statusStyle = getStatusConfig(acc.status);
                                const StatusIcon = statusStyle.icon;
                                
                                return (
                                    <div key={acc.id} onClick={() => onAccountClick(acc)} className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 p-4 rounded-xl hover:bg-surface-4 cursor-pointer transition-all group hover:border-[rgb(var(--fg-rgb))]/10">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="text-text-primary font-bold text-sm truncate max-w-[180px]">{acc.email}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] text-text-muted font-bold bg-[rgb(var(--fg-rgb))]/5 px-2 py-0.5 rounded border border-[rgb(var(--fg-rgb))]/5">
                                                        {service?.name || 'Servicio'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${statusStyle.bg} ${statusStyle.color}`}>
                                                <StatusIcon size={12} />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-[rgb(var(--fg-rgb))]/5">
                                            <div className="flex items-center gap-1.5 text-text-disabled text-[11px]">
                                                <Calendar size={12} />
                                                <span>Vence: <span className="text-text-secondary font-mono">{formatDate(acc.endDate)}</span></span>
                                            </div>
                                            <button 
                                                onClick={(e) => handleCopy(acc.email, e)}
                                                className="text-[10px] font-semibold text-brand-primary flex items-center gap-1 hover:text-text-primary transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Copy size={10} /> Copiar
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ProviderDetailSheet;
