import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Sale } from '../../types';
import { useData } from '../../context/DataContext';
import { getCombinedWhatsAppTemplate, WhatsAppTemplateType } from '../../utils/salesUtils';
import { sendWhatsAppMessage, parseLocalISO } from '../../utils/contactosUtils';
import { getDaysInFailure } from '../../utils/expiredUtils';
import { 
  MessageCircle, Key, RotateCw, ShieldCheck, FileText, Check, 
  Send, DollarSign, RefreshCw, ImagePlus, Timer, ChevronRight, ChevronLeft,
  AlertTriangle, Layers, Zap
} from 'lucide-react';

// --- HELPERS ---

const formatLongDate = (dateStr?: string | null): string => {
  if (!dateStr) return '---';
  const d = parseLocalISO(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const SECTION_LABEL = "text-[10px] font-bold text-text-disabled uppercase tracking-widest ml-1 block";

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

  // --- PLANTILLAS ---
  const templateOptions = [
    { id: 'data', label: 'Datos de acceso', desc: 'Correo, clave y perfil', icon: FileText, color: 'text-status-info-soft', bg: 'bg-status-info/10' },
    { id: 'renewal_success', label: 'Renovación', desc: 'Confirma el nuevo vencimiento', icon: RotateCw, color: 'text-status-success-soft', bg: 'bg-status-success/10' },
    { id: 'password', label: 'Nueva clave', desc: 'Avisa el cambio de contraseña', icon: Key, color: 'text-status-warning-soft', bg: 'bg-status-warning/10' },
    { id: 'replacement', label: 'Garantía', desc: 'Informa la reposición del servicio', icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { id: 'warrantyExtension', label: 'Extensión', desc: 'Compensa días por falla', icon: Timer, color: 'text-brand-primary-hi', bg: 'bg-brand-primary/15', badge: compensatedDays > 0 ? `+${compensatedDays}d` : null },
  ];

  const failureOption = { id: 'failure', label: 'Reporte de falla', desc: 'Informa problemas técnicos', icon: AlertTriangle, color: 'text-status-warning-soft', bg: 'bg-status-warning/10' };

  // --- DERIVADOS PARA LA UI ---
  const isTelegram = platform === 'telegram';
  const platformName = isTelegram ? 'Telegram' : 'WhatsApp';
  const PlatformIcon = isTelegram ? Send : MessageCircle;
  const contactLabel = isTelegram ? (clientTelegram || 'Sin usuario de Telegram') : clientPhone;
  const noneSelected = selectedIds.length === 0;
  const chosenOption = selectedType === 'failure' ? failureOption : templateOptions.find(o => o.id === selectedType);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={step === 'select' ? `Enviar por ${platformName}` : 'Configurar mensaje'} zIndex={zIndex}>
      <div className="flex flex-col animate-fade-in pt-1">

        {/* Progreso (+ volver en el paso 2) */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2 min-h-[30px]">
            <p className="text-[11px] text-text-disabled font-medium">{step === 'select' ? 'Paso 1 de 2 · Plantilla' : 'Paso 2 de 2 · Envío'}</p>
            {step === 'config' && (
              <button onClick={() => setStep('select')} className="h-[30px] pl-2 pr-3 rounded-full bg-surface-3 hover:bg-surface-4 text-xs font-semibold text-text-muted hover:text-text-primary flex items-center gap-0.5 transition-colors active:scale-95">
                <ChevronLeft size={15} /> Volver
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            <div className="flex-1 h-[3px] rounded-full bg-brand-primary" />
            <div className={`flex-1 h-[3px] rounded-full transition-colors ${step === 'config' ? 'bg-brand-primary' : 'bg-[rgb(var(--fg-rgb))]/10'}`} />
          </div>
        </div>

        {step === 'select' ? (
          <div className="flex flex-col gap-5">

            {/* 1. CLIENTE */}
            <div className="flex items-center gap-3 bg-surface-3 p-3 rounded-xl border border-[rgb(var(--fg-rgb))]/5">
              <div className="w-11 h-11 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                {clientName.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">{clientName}</p>
                <p className="text-[11px] text-text-disabled font-mono mt-0.5 truncate">{contactLabel}</p>
              </div>
            </div>

            {/* 2. SERVICIOS DEL MENSAJE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-text-disabled uppercase tracking-widest">Servicios del mensaje</span>
                <span className="text-[11px] text-text-disabled">{selectedIds.length} de {sales.length}</span>
              </div>
              <div className="max-h-[232px] overflow-y-auto custom-scrollbar space-y-2">
                {sales.map(sale => {
                  const isSelected = selectedIds.includes(sale.id);
                  const acc = accounts.find(a => a.id === sale.accountId);
                  const isFailing = acc?.status === 'fallando';
                  return (
                    <button
                      key={sale.id}
                      type="button"
                      onClick={() => toggleSale(sale.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 text-left active:scale-[0.98] transition-all ${isSelected ? '' : 'opacity-55'}`}
                    >
                      <div className="w-10 h-10 rounded-md bg-brand-primary/15 text-brand-primary-hi flex items-center justify-center shrink-0"><Layers size={18} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">{sale.serviceName}</p>
                        <p className="text-[11px] text-text-disabled mt-0.5 flex items-center gap-1.5">
                          Vence {formatLongDate(sale.expiryDate)}
                          {isFailing && <span className="text-status-warning-soft flex items-center gap-0.5"><Zap size={10} className="fill-current" /> con falla</span>}
                        </p>
                      </div>
                      <div className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-brand-primary border-brand-primary text-white' : 'border-[rgb(var(--fg-rgb))]/20'}`}>
                        {isSelected && <Check size={13} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. PLANTILLAS */}
            <div className="space-y-3">
              <label className={SECTION_LABEL}>Elegir plantilla</label>
              <div className="space-y-2">
                {templateOptions.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleTemplateClick(opt.id as WhatsAppTemplateType)}
                    disabled={noneSelected}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 text-left hover:border-[rgb(var(--fg-rgb))]/10 active:scale-[0.98] transition-all disabled:opacity-40 group"
                  >
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${opt.bg} ${opt.color}`}><opt.icon size={18} /></div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-text-primary">{opt.label}</span>
                      <span className="block text-[11px] text-text-disabled mt-0.5 truncate">{opt.desc}</span>
                    </div>
                    {opt.badge && <span className="px-2 py-0.5 bg-brand-primary text-white rounded-full text-[11px] font-bold shrink-0">{opt.badge}</span>}
                    <ChevronRight size={16} className="text-text-faint group-hover:text-text-primary shrink-0" />
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleTemplateClick('failure')}
                  disabled={noneSelected}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-status-warning/5 border border-status-warning/15 text-left hover:bg-status-warning/10 active:scale-[0.98] transition-all disabled:opacity-40"
                >
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${failureOption.bg} ${failureOption.color}`}><failureOption.icon size={18} /></div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-text-primary">{failureOption.label}</span>
                    <span className="block text-[11px] text-status-warning-soft/80 mt-0.5 truncate">{failureOption.desc}</span>
                  </div>
                  <ChevronRight size={16} className="text-status-warning-soft/50 shrink-0" />
                </button>
              </div>
              {noneSelected && <p className="text-xs text-status-danger-soft ml-1">Elige al menos un servicio.</p>}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">

            {/* 1. RESUMEN */}
            {chosenOption && (
              <div className="bg-surface-zinc rounded-xl p-4 border border-[rgb(var(--fg-rgb))]/5 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${chosenOption.bg} ${chosenOption.color}`}><chosenOption.icon size={18} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">{chosenOption.label}</p>
                  <p className="text-[11px] text-text-muted font-medium mt-0.5 truncate">{selectedIds.length} {selectedIds.length === 1 ? 'servicio' : 'servicios'} · {clientName}</p>
                </div>
              </div>
            )}

            {/* 2. FORMATO DE PRECIOS */}
            <div className="space-y-3">
              <label className={SECTION_LABEL}>Formato de precios</label>
              <div className="grid grid-cols-2 gap-1 p-1 bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 rounded-xl">
                <button
                  type="button"
                  onClick={() => setUseSecondaryCurrency(false)}
                  className={`h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${!useSecondaryCurrency ? 'bg-brand-primary/20 text-text-primary' : 'text-text-disabled hover:text-text-primary'}`}
                >
                  <DollarSign size={17} /> {settings.currency || 'USD'}
                </button>
                <button
                  type="button"
                  onClick={() => setUseSecondaryCurrency(true)}
                  className={`h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${useSecondaryCurrency ? 'bg-brand-primary/20 text-text-primary' : 'text-text-disabled hover:text-text-primary'}`}
                >
                  <RefreshCw size={16} /> {settings.subCurrency || 'SEC'}
                </button>
              </div>
            </div>

            {/* 3. OPCIONES ADICIONALES */}
            <div className="space-y-3">
              <label className={SECTION_LABEL}>Opciones adicionales</label>
              <button
                type="button"
                role="switch"
                aria-checked={includeReceipt}
                onClick={() => setIncludeReceipt(!includeReceipt)}
                className={`w-full p-3 rounded-xl bg-surface-zinc border flex items-center gap-3 text-left transition-all active:scale-[0.99] ${includeReceipt ? 'border-brand-primary/50' : 'border-[rgb(var(--fg-rgb))]/5'}`}
              >
                <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 transition-colors ${includeReceipt ? 'bg-brand-primary/20 text-brand-primary-hi' : 'bg-surface-sunken text-text-faint'}`}><ImagePlus size={19} /></div>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-text-primary">Comprobante digital</span>
                  <span className="block text-[11px] text-text-disabled mt-0.5">Incluye el link al portal del cliente</span>
                </div>
                <div className={`w-11 h-[26px] rounded-full relative shrink-0 transition-colors ${includeReceipt ? 'bg-brand-primary' : 'bg-surface-4'}`}>
                  <div className={`absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all ${includeReceipt ? 'left-[21px]' : 'left-[3px]'}`} />
                </div>
              </button>
            </div>

            {/* 4. ENVIAR (queda pegado abajo al hacer scroll) */}
            <div className="sticky bottom-0 z-10 -mx-3 lg:-mx-6 px-3 lg:px-6 pt-3 pb-3 bg-surface-1 border-t border-[rgb(var(--fg-rgb))]/5">
              <button
                onClick={() => selectedType && executeSend(selectedType, useSecondaryCurrency, includeReceipt)}
                className="btn-primary w-full h-[52px] rounded-md text-sm flex items-center justify-center gap-2"
              >
                <PlatformIcon size={19} /> Enviar por {platformName}
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};

export default WhatsAppMenu;
