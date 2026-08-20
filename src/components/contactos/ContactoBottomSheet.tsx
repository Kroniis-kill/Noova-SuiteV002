import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Client } from '../../types';
import { Phone, MessageCircle, Edit2, Trash2, X, Calendar, Layers, Briefcase, Send, Globe, Copy, RefreshCw, Zap, History } from 'lucide-react';
import { formatDate, generateClientSlug } from '../../utils/contactosUtils';
import WhatsAppMenu from '../sales/WhatsAppMenu';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';
import ClientHistory from './ClientHistory';
import ClientPurchaseHistory from './ClientPurchaseHistory';

interface ContactoBottomSheetProps {
  client: Client | null;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
  initialTab?: 'info' | 'purchases' | 'history';
}

const ContactoBottomSheet: React.FC<ContactoBottomSheetProps> = ({ client, onClose, onEdit, onDelete, initialTab = 'info' }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [messagePlatform, setMessagePlatform] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [activeTab, setActiveTab] = useState<'info' | 'purchases' | 'history'>(initialTab); // Tab State
  const { showToast } = useToast();
  const { updateClient, regeneratePortalToken } = useData();

  useEffect(() => {
     if(client) setActiveTab(initialTab);
  }, [client, initialTab]);

  const sheetVariants = {
    hidden: { y: "100%", opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 350, mass: 0.6 } },
    exit: { y: "100%", opacity: 0, transition: { type: "spring", damping: 25, stiffness: 350, mass: 0.6 } }
  };

  if (typeof document === 'undefined') return null;

  const handleMessageClick = (platform: 'whatsapp' | 'telegram') => {
    if (platform === 'telegram' && !client?.telegram) return alert('El cliente no tiene Telegram configurado.');
    setMessagePlatform(platform);
    setIsMenuOpen(true);
  };
  
  const handlePortalAction = async () => {
      if (!client) return;
      let alias = client.portalAlias;
      let isNew = false;
      if (!alias) {
         try {
            alias = generateClientSlug(client.name);
            await updateClient({ ...client, portalAlias: alias });
            isNew = true;
         } catch(e) {
            showToast('Error al activar portal', 'error');
            return;
         }
      }
      const baseUrl = 'https://noova-suite.vercel.app';
      const link = `${baseUrl}/portal/${alias}`;
      navigator.clipboard.writeText(link);
      showToast(isNew ? 'Portal activado y enlace copiado' : 'Enlace copiado al portapapeles', 'success');
  };

  const handleRegenerate = async () => {
      if(!client) return;
      if (!window.confirm("Se generarán nuevas credenciales de seguridad. ¿Continuar?")) return;
      try {
          const newAlias = generateClientSlug(client.name);
          await updateClient({ ...client, portalAlias: newAlias, portalPin: undefined }); 
          showToast('Credenciales regeneradas', 'success');
      } catch(e) {
          showToast('Error al regenerar', 'error');
      }
  };

  return createPortal(
    <AnimatePresence>
      {client && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
          />
          
          <div className="fixed inset-0 z-[9999] flex items-end justify-center pointer-events-none">
            <motion.div
                variants={sheetVariants}
                initial="hidden" animate="visible" exit="exit"
                className="pointer-events-auto bg-surface-1 rounded-t-xl border-t border-border-subtle p-6 pb-12 shadow-modal w-full max-w-md mx-auto md:rounded-lg md:bottom-6 md:relative overflow-hidden flex flex-col"
                style={{ maxHeight: '90dvh' }}
            >
                <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 cursor-pointer shrink-0" onClick={onClose} />
                
                {/* Header */}
                <div className="flex flex-col items-center mb-6 shrink-0">
                    <div className="w-24 h-24 rounded-xl p-0.5 bg-gradient-to-tr from-brand-primary to-brand-accent shadow-[0_0_30px_rgba(106,44,255,0.3)] mb-3">
                        <div className="w-full h-full rounded-xl bg-surface-3 flex items-center justify-center overflow-hidden border-2 border-surface-3">
                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=1c1c1e&color=fff&size=128&bold=true`} alt={client.name} className="w-full h-full object-cover" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-white text-center tracking-tight leading-tight">{client.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-mono text-zinc-400 border border-white/5">{client.phone}</span>
                        {client.resellerId && (<span className="px-3 py-1 bg-amber-500/10 rounded-full text-xs font-semibold text-amber-400 border border-amber-500/20 flex items-center gap-1"><Briefcase size={10} /> Revendedor</span>)}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-surface-zinc p-1 rounded-md border border-white/10 mb-6 shrink-0">
                    <button onClick={() => setActiveTab('info')} className={`flex-1 py-2.5 rounded-sm text-xs font-semibold transition-all ${activeTab === 'info' ? 'bg-surface-4 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>Info</button>
                    <button onClick={() => setActiveTab('purchases')} className={`flex-1 py-2.5 rounded-sm text-xs font-semibold transition-all ${activeTab === 'purchases' ? 'bg-surface-4 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>Compras</button>
                    <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 rounded-sm text-xs font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-surface-4 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}>Eventos</button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab === 'info' ? (
                        <div className="space-y-6">
                            <div className="flex gap-2">
                                <button onClick={handlePortalAction} className={`flex-1 rounded-md p-3 flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-[0.98] ${client.portalAlias ? 'bg-brand-primary/10 border border-brand-primary/20 text-brand-primary hover:bg-brand-primary/20' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}>
                                    {client.portalAlias ? <Globe size={16} /> : <Zap size={16} />}
                                    {client.portalAlias ? 'Link Portal' : 'Activar Portal'}
                                </button>
                                {client.portalAlias && (
                                    <button onClick={handleRegenerate} className="w-12 bg-surface-3 border border-white/10 rounded-md flex items-center justify-center text-zinc-400 hover:text-white transition-colors active:scale-95" title="Regenerar Token"><RefreshCw size={16} /></button>
                                )}
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                               <button onClick={() => handleMessageClick('whatsapp')} className="flex flex-col items-center gap-2 group"><div className="w-14 h-14 rounded-xl bg-brand-whatsapp/10 text-brand-whatsapp flex items-center justify-center border border-brand-whatsapp/20 group-active:scale-90 transition-transform shadow-lg shadow-brand-whatsapp/10"><MessageCircle size={24} /></div><span className="text-[10px] font-semibold text-zinc-400">WhatsApp</span></button>
                               <button onClick={() => handleMessageClick('telegram')} className={`flex flex-col items-center gap-2 group ${!client.telegram ? 'opacity-50' : ''}`}><div className="w-14 h-14 rounded-xl bg-brand-telegram/10 text-brand-telegram flex items-center justify-center border border-brand-telegram/20 group-active:scale-90 transition-transform shadow-lg shadow-brand-telegram/10"><Send size={24} /></div><span className="text-[10px] font-semibold text-zinc-400">Telegram</span></button>
                               <button onClick={() => { onEdit(client); }} className="flex flex-col items-center gap-2 group"><div className="w-14 h-14 rounded-xl bg-white/5 text-white flex items-center justify-center border border-white/10 group-active:scale-90 transition-transform"><Edit2 size={24} /></div><span className="text-[10px] font-semibold text-zinc-400">Editar</span></button>
                               <button onClick={() => { onDelete(client.id); onClose(); }} className="flex flex-col items-center gap-2 group"><div className="w-14 h-14 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20 group-active:scale-90 transition-transform"><Trash2 size={24} /></div><span className="text-[10px] font-semibold text-zinc-400">Eliminar</span></button>
                            </div>

                            <div className="bg-surface-1 rounded-xl p-1 border border-white/5 mb-4">
                                <div className="flex items-center justify-between p-4 border-b border-white/5"><div className="flex items-center gap-3 text-zinc-400"><Layers size={18} /><span className="text-sm font-medium">Servicios Activos</span></div><span className="text-sm font-bold text-white bg-white/5 px-3 py-1 rounded-full">{client.activeServices}</span></div>
                                <div className="flex items-center justify-between p-4"><div className="flex items-center gap-3 text-zinc-400"><Calendar size={18} /><span className="text-sm font-medium">Registrado</span></div><span className="text-sm font-medium text-zinc-300">{formatDate(client.registrationDate)}</span></div>
                            </div>
                        </div>
                    ) : activeTab === 'purchases' ? (
                        <ClientPurchaseHistory clientId={client.id} />
                    ) : (
                        <ClientHistory clientId={client.id} clientName={client.name ?? ''} />
                    )}
                </div>

                <div className="pt-4 mt-auto">
                    <button onClick={onClose} className="w-full py-4 text-zinc-500 text-xs font-semibold uppercase tracking-widest active:text-white transition-colors">Cerrar</button>
                </div>

                <WhatsAppMenu 
                   isOpen={isMenuOpen} 
                   onClose={() => setIsMenuOpen(false)} 
                   sales={[]} 
                   clientName={client.name} 
                   clientPhone={client.phone ?? ''} 
                   clientTelegram={client.telegram}
                   platform={messagePlatform}
                />

            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default ContactoBottomSheet;