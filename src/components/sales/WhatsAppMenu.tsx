import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Sale, Account } from '../../types';
import { useData } from '../../context/DataContext';
import { getCombinedWhatsAppTemplate, WhatsAppTemplateType } from '../../utils/salesUtils';
import { sendWhatsAppMessage } from '../../utils/contactosUtils';
import { getDaysInFailure } from '../../utils/expiredUtils';
import { 
  MessageSquare, Key, RotateCw, ShieldCheck, FileText, Check, 
  Send, DollarSign, RefreshCw, ImagePlus, Timer, ChevronRight, 
  AlertTriangle, Monitor, Zap, User, ArrowLeft 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../ui/Avatar';

interface WhatsAppMenuProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  clientName: string;
  clientPhone: string;
  clientTelegram?: string;
  platform?: 'whatsapp' | 'telegram';
  zIndex?: number;
}

const WhatsAppMenu: React.FC<WhatsAppMenuProps> = ({ isOpen, onClose, sales, clientName, clientPhone, clientTelegram, platform = 'whatsapp', zIndex }) => {
  const { accounts, settings } = useData();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Step Logic: 'select' (choose items/template) -> 'config' (currency/receipt) -> SEND
  const [step, setStep] = useState<'select' | 'config'>('select');
  const [selectedType, setSelectedType] = useState<WhatsAppTemplateType | null>(null);
  
  // Config State
  const [useSecondaryCurrency, setUseSecondaryCurrency] = useState(false);
  const [includeReceipt, setIncludeReceipt] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(sales.map(s => s.id));
      setStep('select');
      setSelectedType(null);
      setUseSecondaryCurrency(false);
      setIncludeReceipt(false);
    }
  }, [isOpen, sales]);

  const toggleSale = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleTemplateClick = (type: WhatsAppTemplateType) => {
      setSelectedType(type);
      setStep('config');
  };

  const executeSend = (type: WhatsAppTemplateType, useSecondary: boolean, withReceipt: boolean) => {
    const filteredSales = sales.filter(s => selectedIds.includes(s.id));
    if (filteredSales.length === 0) return;

    const message = getCombinedWhatsAppTemplate(
      type, 
      filteredSales, 
      clientName, 
      accounts, 
      settings, 
      platform as 'whatsapp' | 'telegram',
      useSecondary,
      withReceipt 
    );
    
    if (platform === 'whatsapp') {
      sendWhatsAppMessage(clientPhone, message);
    } else {
      const user = clientTelegram?.replace('@', '') || '';
      if (user) {
        const url = `https://t.me/${user}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
      } else {
        alert('El cliente no tiene un usuario de Telegram configurado.');
      }
    }
    onClose();
  };

  const compensatedDays = (() => {
      let maxDays = 0;
      const filteredSales = sales.filter(s => selectedIds.includes(s.id));
      filteredSales.forEach(s => {
          const acc = accounts.find(a => a.id === s.accountId);
          if (acc && acc.status === 'fallando' && acc.failure_started_at) {
              const days = getDaysInFailure(acc.failure_started_at);
              if (days > maxDays) maxDays = days;
          }
      });
      return maxDays;
  })();

  const templateOptions = [
    { id: 'data', label: 'Datos Acceso', icon: FileText, color: 'text-status-info-soft', bg: 'bg-status-info/10' },
    { id: 'renewal_success', label: 'Renovación', icon: RotateCw, color: 'text-status-success-soft', bg: 'bg-status-success/10' },
    { id: 'password', label: 'Nueva Clave', icon: Key, color: 'text-status-warning-soft', bg: 'bg-status-warning/10' },
    { id: 'replacement', label: 'Garantía', icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { id: 'warrantyExtension', label: 'Extensión', icon: Timer, color: 'text-brand-primary', bg: 'bg-brand-primary/10', badge: compensatedDays > 0 ? `+${compensatedDays}d` : null },
  ];

  const PlatformIcon = platform === 'telegram' ? Send : MessageSquare;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={step === 'select' ? "Enviar por WhatsApp" : "Configurar Mensaje"} zIndex={zIndex}>
      <div className="space-y-6 pt-1 pb-4">
        
        {step === 'select' ? (
            <div className="space-y-6 animate-fade-in">
                {/* CLIENT PROFILE HEADER - Removed Active Tag */}
                <div className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-full p-[1.5px] bg-gradient-to-tr from-brand-primary to-brand-accent">
                        <Avatar name={clientName} size="100%" className="rounded-full border-2 border-surface-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-[15px] font-bold text-text-primary truncate">{clientName}</h4>
                        <p className="text-[10px] text-text-disabled font-mono tracking-tight">{clientPhone}</p>
                    </div>
                </div>

                {/* SERVICE SELECTION LIST - Removed Borders from items */}
                <div className="space-y-3">
                   <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-bold text-text-disabled uppercase tracking-[0.2em]">Servicios del Mensaje</span>
                      <span className="text-[10px] font-semibold text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full border border-brand-primary/20">{selectedIds.length} ítems</span>
                   </div>
                   
                   <div className="max-h-[160px] overflow-y-auto custom-scrollbar pr-1 space-y-2">
                      {sales.map(sale => {
                         const isSelected = selectedIds.includes(sale.id);
                         const acc = accounts.find(a => a.id === sale.accountId);
                         const isFailing = acc?.status === 'fallando';
                         
                         return (
                            <div 
                              key={sale.id}
                              onClick={() => toggleSale(sale.id)}
                              className={`flex items-center justify-between p-3.5 rounded-lg cursor-pointer transition-all duration-300 ${
                                 isSelected 
                                   ? 'bg-surface-zinc shadow-glow-sm' 
                                   : 'bg-surface-sunken opacity-50'
                              }`}
                            >
                               <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-9 h-9 rounded-sm flex items-center justify-center shrink-0 ${isSelected ? 'bg-brand-primary/10 text-brand-primary' : 'bg-zinc-800 text-text-faint'}`}>
                                      <Monitor size={18} />
                                  </div>
                                  <div className="min-w-0">
                                      <p className={`text-[13px] font-bold truncate ${isSelected ? 'text-text-primary' : 'text-text-faint'}`}>{sale.serviceName}</p>
                                      <div className="flex items-center gap-2">
                                          <span className="text-[9px] text-text-disabled font-bold uppercase">Corte: {sale.expiryDate}</span>
                                          {isFailing && <Zap size={10} className="text-status-warning fill-status-warning animate-pulse" />}
                                      </div>
                                  </div>
                               </div>
                               <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                                  isSelected ? 'bg-brand-primary border-brand-primary text-white shadow-glow-sm' : 'border-zinc-800 bg-black/20'
                               }`}>
                                  {isSelected && <Check size={12} strokeWidth={3} />}
                               </div>
                            </div>
                         );
                      })}
                   </div>
                </div>

                <div className="w-full h-px bg-[rgb(var(--fg-rgb))]/5" />

                {/* TEMPLATE GRID - Reconfigured to horizontal buttons */}
                <div className="space-y-3">
                    <span className="text-[10px] font-bold text-text-disabled uppercase tracking-[0.2em] ml-1">Elegir Plantilla</span>
                    <div className="grid grid-cols-1 gap-2.5">
                      {templateOptions.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => handleTemplateClick(opt.id as WhatsAppTemplateType)}
                          disabled={selectedIds.length === 0}
                          className="flex items-center gap-4 p-3.5 rounded-lg bg-surface-1 border border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-3 hover:border-[rgb(var(--fg-rgb))]/10 active:scale-[0.98] transition-all group overflow-hidden relative disabled:opacity-20"
                        >
                            <div className={`w-9 h-9 rounded-sm flex items-center justify-center shrink-0 ${opt.bg} ${opt.color}`}>
                               <opt.icon size={18} />
                            </div>
                            <div className="flex-1 text-left">
                                <span className="block text-[13px] font-bold text-text-primary group-hover:text-text-primary transition-colors">{opt.label}</span>
                                <span className="block text-[8px] font-bold text-text-faint uppercase tracking-[0.2em] mt-0.5">Plantilla del Sistema</span>
                            </div>
                            {opt.badge && (
                              <div className="px-2 py-0.5 bg-brand-primary text-white rounded-full text-[8px] font-black shadow-lg animate-pulse mr-2">
                                  {opt.badge}
                              </div>
                            )}
                            <ChevronRight size={16} className="text-text-faint opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                      
                      <button
                        onClick={() => handleTemplateClick('failure')}
                        disabled={selectedIds.length === 0}
                        className="flex items-center gap-4 p-3.5 rounded-lg bg-status-warning/5 border border-status-warning/10 text-status-warning hover:bg-status-warning/10 transition-all disabled:opacity-20 active:scale-[0.98]"
                      >
                         <div className="w-9 h-9 rounded-sm bg-status-warning/10 flex items-center justify-center border border-status-warning/20">
                            <AlertTriangle size={18} />
                         </div>
                         <div className="text-left flex-1 min-w-0">
                            <span className="block text-[13px] font-semibold uppercase tracking-wider text-text-primary">Reporte de Falla</span>
                            <p className="text-[9px] text-status-warning/80 truncate">Informa problemas técnicos masivos</p>
                         </div>
                         <ChevronRight size={18} className="opacity-40" />
                      </button>
                    </div>
                </div>
            </div>
        ) : (
            <div className="space-y-8 animate-fade-in">
                {/* SELECTOR DE MONEDA - Estilo Segmentado Premium */}
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-text-disabled uppercase tracking-[0.2em] ml-1">Formato de Precios</label>
                    <div className="flex bg-surface-1 p-1.5 rounded-lg border border-[rgb(var(--fg-rgb))]/[0.08] w-full shadow-lg">
                        <button 
                            onClick={() => setUseSecondaryCurrency(false)}
                            className={`flex-1 flex items-center justify-center gap-2.5 py-4 rounded-lg text-[11px] font-semibold uppercase tracking-widest transition-all ${!useSecondaryCurrency ? 'bg-white text-black shadow-[0_4px_15px_rgba(255,255,255,0.2)]' : 'text-text-disabled hover:text-text-secondary'}`}
                        >
                            <DollarSign size={16} strokeWidth={3} />
                            {settings.currency || 'USD'}
                        </button>
                        <button 
                            onClick={() => setUseSecondaryCurrency(true)}
                            className={`flex-1 flex items-center justify-center gap-2.5 py-4 rounded-lg text-[11px] font-semibold uppercase tracking-widest transition-all ${useSecondaryCurrency ? 'bg-white text-black shadow-[0_4px_15px_rgba(255,255,255,0.2)]' : 'text-text-disabled hover:text-text-secondary'}`}
                        >
                            <RefreshCw size={16} strokeWidth={3} />
                            {settings.subCurrency || 'SEC'}
                        </button>
                    </div>
                </div>

                {/* COMPROBANTE - Estilo Fila Studio */}
                <div className="space-y-3">
                    <label className="text-[10px] font-bold text-text-disabled uppercase tracking-[0.2em] ml-1">Opciones Adicionales</label>
                    <button 
                        onClick={() => setIncludeReceipt(!includeReceipt)}
                        className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${includeReceipt ? 'bg-brand-primary/10 border-brand-primary shadow-glow-sm' : 'bg-surface-1 border-[rgb(var(--fg-rgb))]/5 hover:border-[rgb(var(--fg-rgb))]/10'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${includeReceipt ? 'bg-brand-primary text-white shadow-glow' : 'bg-surface-sunken text-text-faint'}`}>
                                <ImagePlus size={22} />
                            </div>
                            <div className="text-left">
                                <span className={`block text-sm font-bold ${includeReceipt ? 'text-text-primary' : 'text-text-secondary'}`}>Comprobante Digital</span>
                                <span className="block text-[9px] text-text-disabled font-semibold uppercase tracking-widest">Incluye link al portal</span>
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${includeReceipt ? 'bg-status-success border-status-success text-black' : 'border-zinc-800 bg-black/20'}`}>
                            {includeReceipt && <Check size={14} strokeWidth={4} />}
                        </div>
                    </button>
                </div>
                
                {/* ACTION BUTTONS */}
                <div className="pt-4 space-y-3">
                    <button 
                        onClick={() => selectedType && executeSend(selectedType, useSecondaryCurrency, includeReceipt)}
                        className="w-full h-[68px] bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-xl font-bold text-sm uppercase tracking-widest shadow-glow flex items-center justify-center gap-3 active:scale-[0.98] hover:brightness-110"
                    >
                        <PlatformIcon size={22} fill="currentColor" /> Enviar por {platform === 'telegram' ? 'Telegram' : 'WhatsApp'}
                    </button>
                    
                    <button 
                        onClick={() => setStep('select')} 
                        className="w-full h-14 flex items-center justify-center gap-2 text-text-faint hover:text-text-primary text-[10px] font-semibold uppercase tracking-[0.3em] transition-all active:scale-95"
                    >
                        <ArrowLeft size={14} /> Volver al Menú
                    </button>
                </div>
            </div>
        )}

      </div>
    </Modal>
  );
};

export default WhatsAppMenu;