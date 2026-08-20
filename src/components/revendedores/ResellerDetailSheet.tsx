
import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Reseller, Client, Sale } from '../../types';
import { X, MessageCircle, Edit2, Trash2, Users, ChevronRight, Send, Briefcase } from 'lucide-react';
import { openWhatsAppBusiness } from '../../utils/contactosUtils';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getInitials } from '../../utils/revendedoresUtils';

interface ResellerDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  reseller: Reseller | null;
  clients: Client[];
  sales: Sale[];
  onEdit: (r: Reseller) => void;
  onDelete: (r: Reseller) => void;
  onClientClick: (client: Client) => void;
}

const ResellerDetailSheet: React.FC<ResellerDetailSheetProps> = ({ 
  isOpen, onClose, reseller, clients, sales, onEdit, onDelete, onClientClick
}) => {
  const isMobile = useIsMobile();

  // Filter Logic
  const assignedClients = useMemo(() => {
    if (!reseller) return [];
    return clients.filter(c => c.resellerId === reseller.id);
  }, [clients, reseller]);

  const assignedSales = useMemo(() => {
    if (!reseller || assignedClients.length === 0) return [];
    const clientIds = assignedClients.map(c => c.id);
    return sales.filter(s => clientIds.includes(s.clientId));
  }, [sales, assignedClients, reseller]);

  // Stats
  const totalRevenue = assignedSales.reduce((acc, curr) => acc + curr.amount, 0);
  const activeClientsCount = assignedClients.filter(c => c.activeServices > 0).length;

  if (!isOpen || !reseller) return null;

  // Contact Logic
  const hasWhatsApp = !!reseller.whatsapp;
  const hasTelegram = !!reseller.telegram;

  const handleTelegram = () => {
    if (reseller.telegram) {
        const user = reseller.telegram.replace('@', '');
        window.open(`https://t.me/${user}`, '_blank');
    }
  };

  // Animations
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  const modalVariants = isMobile ? {
    hidden: { y: "100%" },
    visible: { y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
    exit: { y: "100%" }
  } : {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.95, y: 20 }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            variants={backdropVariants}
            initial="hidden" animate="visible" exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
          />
          
          <div className={`fixed inset-0 z-[9999] flex justify-center pointer-events-none ${isMobile ? 'items-end' : 'items-center'}`}>
            <motion.div
                variants={modalVariants}
                initial="hidden" animate="visible" exit="exit"
                className={`
                    pointer-events-auto bg-surface-3 border border-white/10 shadow-2xl flex flex-col overflow-hidden
                    ${isMobile 
                        ? 'w-full rounded-t-2xl max-h-[85dvh]' 
                        : 'w-[800px] h-[650px] rounded-2xl'
                    }
                `}
            >
                {/* Header / Cover */}
                <div className="relative shrink-0 p-6 pb-6 border-b border-white/5">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                    
                    {isMobile && <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 cursor-grab active:cursor-grabbing" onClick={onClose} />}

                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-5">
                            <div 
                                className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold text-white shadow-glow border border-white/10"
                                style={{ backgroundColor: reseller.color }}
                            >
                                {getInitials(reseller.name)}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">{reseller.name}</h2>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[11px] font-mono text-zinc-400">
                                        {reseller.code}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            <button onClick={() => { onClose(); onEdit(reseller); }} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => { onClose(); onDelete(reseller); }} className="w-9 h-9 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 flex items-center justify-center text-red-400 transition-colors">
                                <Trash2 size={16} />
                            </button>
                            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Dynamic Contact Actions */}
                    <div className="flex gap-2 mt-6">
                         {hasWhatsApp && (
                            <button 
                               onClick={() => openWhatsAppBusiness(reseller.whatsapp, '')}
                               className={`h-11 rounded-md bg-brand-whatsapp/10 border border-brand-whatsapp/20 text-brand-whatsapp text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-brand-whatsapp/20 ${hasTelegram ? 'flex-1' : 'w-full'}`}
                            >
                               <MessageCircle size={18} /> WhatsApp
                            </button>
                         )}
                         
                         {hasTelegram && (
                            <button 
                               onClick={handleTelegram}
                               className={`h-11 rounded-md bg-brand-telegram/10 border border-brand-telegram/20 text-brand-telegram text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-brand-telegram/20 ${hasWhatsApp ? 'flex-1' : 'w-full'}`}
                            >
                               <Send size={18} /> Telegram
                            </button>
                         )}

                         {!hasWhatsApp && !hasTelegram && (
                            <div className="w-full h-11 rounded-md bg-surface-zinc border border-white/5 flex items-center justify-center text-zinc-500 text-xs font-medium">
                               Sin métodos de contacto registrados
                            </div>
                         )}
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-surface-sunken border-b border-white/5">
                    <div className="p-4 text-center border-r border-white/5">
                        <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">Total Generado</p>
                        <p className="text-lg font-bold text-emerald-400">${totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="p-4 text-center border-r border-white/5">
                        <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">Clientes Activos</p>
                        <p className="text-lg font-bold text-white">{activeClientsCount}</p>
                    </div>
                    <div className="p-4 text-center">
                        <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-1">Total Clientes</p>
                        <p className="text-lg font-bold text-zinc-300">{assignedClients.length}</p>
                    </div>
                </div>

                {/* Clients List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-surface-1">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Briefcase size={16} className="text-brand-primary" /> Cartera de Clientes
                    </h3>

                    {assignedClients.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-xl">
                            <p className="text-zinc-500 text-xs">Este revendedor no tiene clientes.</p>
                        </div>
                    ) : (
                        <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {assignedClients.map(client => (
                                <button 
                                    key={client.id} 
                                    onClick={() => onClientClick(client)}
                                    className="bg-surface-3 border border-white/5 p-3 rounded-lg flex items-center justify-between hover:bg-surface-4 hover:border-white/10 cursor-pointer transition-all group w-full text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xs font-semibold text-zinc-400 group-hover:text-white transition-colors">
                                            {client.name.substring(0,2).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white truncate max-w-[120px]">{client.name}</p>
                                            <p className="text-[10px] text-zinc-500 font-mono group-hover:text-zinc-400">{client.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${client.activeServices > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-500'}`}>
                                            {client.activeServices} Serv.
                                        </span>
                                        <ChevronRight size={14} className="text-zinc-600 group-hover:text-white transition-colors" />
                                    </div>
                                </button>
                            ))}
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

export default ResellerDetailSheet;
