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
                className="pointer-events-auto bg-surface-1 rounded-t-xl border border-[rgb(var(--fg-rgb))]/5 w-full max-w-[400px] mx-auto md:rounded-xl md:bottom-6 md:relative overflow-hidden flex flex-col"
                style={{ maxHeight: '90dvh' }}
            >
                {/* Header */}
                <div className="px-5 pt-[18px] pb-4 flex justify-end shrink-0">
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-3 text-text-muted hover:text-text-primary transition-all active:scale-90">
                        <X size={16} />
                    </button>
                </div>

                <div className="px-5 pb-4 flex flex-col items-center shrink-0">
                    <div className="w-[76px] h-[76px] rounded-xl p-0.5 bg-gradient-to-br from-brand-primary to-brand-accent mb-3">
                        <div className="w-full h-full rounded-[22px] bg-surface-3 flex items-center justify-center text-text-primary text-2xl font-black">
                            {client.name.trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('')}
                        </div>
                    </div>
                    <h3 className="text-[19px] font-black text-text-primary text-center tracking-tight leading-tight">{client.name}</h3>
                    <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[11px] font-mono text-text-muted bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 px-2.5 py-1 rounded-full">{client.phone}</span>
                        {client.resellerId && (<span className="text-[9px] font-black text-status-warning-soft bg-status-warning/10 border border-status-warning/20 px-2 py-1 rounded-full flex items-center gap-1"><Briefcase size={9} /> Revendedor</span>)}
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-5 shrink-0">
                    <div className="flex bg-surface-3 p-[3px] rounded-xl mb-4">
                        <button onClick={() => setActiveTab('info')} className={`flex-1 py-2 rounded-sm text-[11px] font-bold transition-all ${activeTab === 'info' ? 'bg-surface-4 text-text-primary' : 'text-text-disabled hover:text-text-primary'}`}>Info</button>
                        <button onClick={() => setActiveTab('purchases')} className={`flex-1 py-2 rounded-sm text-[11px] font-bold transition-all ${activeTab === 'purchases' ? 'bg-surface-4 text-text-primary' : 'text-text-disabled hover:text-text-primary'}`}>Compras</button>
                        <button onClick={() => setActiveTab('history')} className={`flex-1 py-2 rounded-sm text-[11px] font-bold transition-all ${activeTab === 'history' ? 'bg-surface-4 text-text-primary' : 'text-text-disabled hover:text-text-primary'}`}>Eventos</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-4">
                    {activeTab === 'info' ? (
                        <div className="flex flex-col gap-3.5">
                            <div className="flex gap-2">
                                <button onClick={handlePortalAction} className={`flex-1 h-11 rounded-xl flex items-center justify-center gap-2 font-bold text-[12px] transition-all active:scale-[0.98] ${client.portalAlias ? 'bg-brand-primary/10 border border-brand-primary/20 text-brand-primary-hi hover:bg-brand-primary/20' : 'bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 text-text-primary hover:bg-surface-4'}`}>
                                    {client.portalAlias ? <Globe size={15} /> : <Zap size={15} />}
                                    {client.portalAlias ? 'Link Portal' : 'Activar Portal'}
                                </button>
                                {client.portalAlias && (
                                    <button onClick={handleRegenerate} className="w-11 h-11 shrink-0 bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary transition-colors active:scale-95" title="Regenerar Token"><RefreshCw size={15} /></button>
                                )}
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                               <button onClick={() => handleMessageClick('whatsapp')} className="flex flex-col items-center gap-1.5 group">
                                  <div className="w-full aspect-square rounded-xl bg-brand-whatsapp/10 text-brand-whatsapp flex items-center justify-center border border-brand-whatsapp/20 group-active:scale-90 transition-transform"><MessageCircle size={20} /></div>
                                  <span className="text-[9px] font-bold text-text-muted">WhatsApp</span>
                               </button>
                               <button onClick={() => handleMessageClick('telegram')} className={`flex flex-col items-center gap-1.5 group ${!client.telegram ? 'opacity-50' : ''}`}>
                                  <div className="w-full aspect-square rounded-xl bg-brand-telegram/10 text-brand-telegram flex items-center justify-center border border-brand-telegram/20 group-active:scale-90 transition-transform"><Send size={20} /></div>
                                  <span className="text-[9px] font-bold text-text-muted">Telegram</span>
                               </button>
                               <button onClick={() => { onEdit(client); }} className="flex flex-col items-center gap-1.5 group">
                                  <div className="w-full aspect-square rounded-xl bg-surface-3 text-text-primary flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 group-active:scale-90 transition-transform"><Edit2 size={20} /></div>
                                  <span className="text-[9px] font-bold text-text-muted">Editar</span>
                               </button>
                               <button onClick={() => { onDelete(client.id); onClose(); }} className="flex flex-col items-center gap-1.5 group">
                                  <div className="w-full aspect-square rounded-xl bg-status-danger/10 text-status-danger flex items-center justify-center border border-status-danger/20 group-active:scale-90 transition-transform"><Trash2 size={20} /></div>
                                  <span className="text-[9px] font-bold text-text-muted">Eliminar</span>
                               </button>
                            </div>

                            <div className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 rounded-xl">
                                <div className="flex items-center justify-between p-3 border-b border-[rgb(var(--fg-rgb))]/5">
                                    <div className="flex items-center gap-2.5 text-text-muted"><Layers size={15} /><span className="text-[12px] font-semibold">Servicios Activos</span></div>
                                    <span className="text-[12px] font-black text-text-primary bg-surface-sunken px-2.5 py-1 rounded-full">{client.activeServices}</span>
                                </div>
                                <div className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-2.5 text-text-muted"><Calendar size={15} /><span className="text-[12px] font-semibold">Registrado</span></div>
                                    <span className="text-[12px] font-semibold text-text-secondary">{formatDate(client.registrationDate)}</span>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'purchases' ? (
                        <ClientPurchaseHistory clientId={client.id} />
                    ) : (
                        <ClientHistory clientId={client.id} clientName={client.name ?? ''} />
                    )}
                </div>

                <div className="px-5 pb-[18px] pt-2 shrink-0">
                    <button onClick={onClose} className="w-full h-10 text-text-disabled text-[10px] font-bold uppercase tracking-[0.1em] active:text-text-primary transition-colors">Cerrar</button>
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
