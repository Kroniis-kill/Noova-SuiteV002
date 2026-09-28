import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { Sale, Account, Service } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  ShieldCheck, ChevronDown, ChevronRight, Search, RefreshCw, Check, Monitor, 
  ArrowRightLeft, ArrowRight, Info, ShoppingCart, Layers, Mail, User, Hash,
  Minus, Plus, Loader2
} from 'lucide-react';
import { parseLocalISO, getLocalDateISO } from '../../utils/contactosUtils';
import { calculateOccupancy } from '../../utils/inventarioUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { getDaysRemaining } from '../../utils/expiredUtils';

// --- CONSTANTES Y HELPERS ---

// index.css aplica a TODOS los inputs fondo, borde, radio de 16px, anillo de foco y
// font-size: 16px !important. Esta clase los neutraliza para inputs que viven dentro
// de un contenedor con su propio estilo (el contenedor dibuja el borde y el foco).
// El tamaño de fuente NO se toca aquí: los inputs pequeños conservan los 16px globales
// (evita el auto-zoom de iOS) y los grandes lo sobrescriben con !text-*.
const CLEAN_INPUT = "w-full min-w-0 !bg-transparent !border-0 !ring-0 focus:!ring-0 !rounded-none !p-0 !m-0 outline-none appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0";

// Contenedor estándar de un campo de texto (el borde y el foco los dibuja este contenedor).
const FIELD_BOX = "flex items-center gap-3 h-[50px] px-4 bg-surface-sunken rounded-md border border-[rgb(var(--fg-rgb))]/10 focus-within:border-brand-primary/40 transition-colors";

const SECTION_LABEL = "text-[10px] font-bold text-text-disabled uppercase tracking-widest ml-1 block";

const DAY_CHIPS = [0, 3, 7, 15];

// [valor que se guarda, texto del chip]
const REASONS: Array<[string, string]> = [
  ['Bloqueo de hogar', 'Bloqueo de hogar'],
  ['Caída de cuenta', 'Caída de cuenta'],
  ['Error en perfil', 'Error en perfil'],
  ['Compensación', 'Compensación por fallas'],
];

const formatLongDate = (dateStr?: string | null): string => {
  if (!dateStr) return '---';
  const d = parseLocalISO(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const getStatusBadge = (isFailing: boolean, days: number) => {
  if (isFailing) return { label: 'Con falla', cls: 'bg-status-warning/10 text-status-warning-soft border-status-warning/20' };
  if (days < 0) return { label: 'Vencido', cls: 'bg-status-danger/10 text-status-danger-soft border-status-danger/20' };
  if (days === 0) return { label: 'Vence hoy', cls: 'bg-status-warning/10 text-status-warning-soft border-status-warning/20' };
  if (days <= 5) return { label: `Vence en ${days} d`, cls: 'bg-status-warning/10 text-status-warning-soft border-status-warning/20' };
  return { label: `Vence en ${days} d`, cls: 'bg-status-success/10 text-status-success-soft border-status-success/20' };
};

// --- SUB-COMPONENTES ---

interface StepperControlProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
}

// Fuera del modal para no remontarse en cada render (si no, el input pierde el foco al escribir)
const StepperControl: React.FC<StepperControlProps> = ({ value, onChange, label }) => (
  <div className="bg-surface-sunken rounded-md border border-[rgb(var(--fg-rgb))]/10 p-1 flex items-center justify-between h-[52px] w-full focus-within:border-[rgb(var(--fg-rgb))]/20 transition-colors">
    <button type="button" aria-label="Menos días" onClick={() => onChange(value - 1)} className="w-10 h-full shrink-0 rounded-sm bg-[rgb(var(--fg-rgb))]/5 text-text-muted hover:text-text-primary flex items-center justify-center active:scale-90 transition-all"><Minus size={16} /></button>
    <div className="flex-1 min-w-0 flex flex-col items-center justify-center h-full gap-0.5">
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className={`${CLEAN_INPUT} h-6 text-center !text-lg font-bold leading-none text-text-primary`}
      />
      <span className="text-[9px] font-bold text-text-faint uppercase tracking-wide leading-none">{label}</span>
    </div>
    <button type="button" aria-label="Más días" onClick={() => onChange(value + 1)} className="w-10 h-full shrink-0 rounded-sm bg-[rgb(var(--fg-rgb))]/5 text-text-muted hover:text-text-primary flex items-center justify-center active:scale-90 transition-all"><Plus size={16} /></button>
  </div>
);

interface PickerRowProps {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  subtitle: string;
  selected?: boolean;
}

// Fila que se ve dentro de las listas de búsqueda (cuenta, plataforma, servicio destino)
const PickerRow: React.FC<PickerRowProps> = ({ icon, iconClass, title, subtitle, selected }) => (
  <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selected ? 'bg-brand-primary/10 border-brand-primary/30' : 'bg-surface-zinc border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-4'}`}>
    <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${iconClass}`}>{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-text-primary truncate">{title}</p>
      <p className="text-[11px] text-text-disabled mt-0.5">{subtitle}</p>
    </div>
    {selected ? <Check size={16} className="text-brand-primary shrink-0" strokeWidth={3} /> : <ChevronRight size={16} className="text-text-faint shrink-0" />}
  </div>
);

interface SearchListModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  onSelect: (item: any) => void;
  title: string;
  placeholder?: string;
  renderItem: (item: any) => React.ReactNode;
  zIndex?: number;
}

const SearchListModal: React.FC<SearchListModalProps> = ({ isOpen, onClose, items, onSelect, title, placeholder, renderItem, zIndex }) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search) return items;
    return items.filter(item => 
        JSON.stringify(item).toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  useEffect(() => { if (isOpen) setSearch(''); }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} zIndex={zIndex}>
      <div className="flex flex-col h-[60vh] md:h-[450px] pt-1">
        <div className={`${FIELD_BOX} mb-4 shrink-0`}>
           <Search size={16} className="text-text-faint shrink-0" />
           <input 
             value={search} onChange={(e) => setSearch(e.target.value)}
             placeholder={placeholder || "Buscar..."}
             className={`${CLEAN_INPUT} h-full text-text-primary placeholder:text-text-faint`}
             autoFocus
           />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
           {filtered.map((item, idx) => (
              <button 
                key={idx} 
                type="button"
                onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(item); 
                    onClose(); 
                }} 
                className="w-full text-left outline-none"
              >
                 {renderItem(item)}
              </button>
           ))}
           {filtered.length === 0 && (
               <div className="py-20 text-center opacity-40">
                   <p className="text-sm">No se encontraron resultados.</p>
               </div>
           )}
        </div>
      </div>
    </Modal>
  );
};

// --- MAIN COMPONENT ---

interface WarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  zIndex?: number;
}

const WarrantyModal: React.FC<WarrantyModalProps> = ({ isOpen, onClose, sale, zIndex = 10000 }) => {
  const { sales, accounts, updateSale, updateAccount, clients, settings, addProfileHistory, services } = useData();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  
  // -- ESTADOS DE MODO Y SELECCIÓN --
  const [warrantyMode, setWarrantyMode] = useState<'replace' | 'credit'>('replace');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [targetSaleId, setTargetSaleId] = useState(''); // Para modo abono
  const [daysToAdd, setDaysToAdd] = useState(0);
  const [prorataAdjustment, setProrataAdjustment] = useState(0);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profilePin, setProfilePin] = useState('');
  const [reason, setReason] = useState('');
  
  const [modalSearch, setModalSearch] = useState<'account' | 'service' | 'target_sale' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicialización de datos al abrir
  useEffect(() => {
    if (isOpen && sale) {
      setSelectedAccountId(sale.accountId);
      const svc = services.find(s => s.name === sale.serviceName);
      setSelectedServiceId(svc?.id || '');
      setTargetSaleId('');
      setDaysToAdd(0);
      setProrataAdjustment(0);
      setNewExpiryDate(sale.expiryDate);
      setWarrantyMode('replace');
      setReason('');
      
      if (sale.assignedProfiles && sale.assignedProfiles.length > 0) {
        setProfileName(sale.assignedProfiles[0].name);
        setProfilePin(sale.assignedProfiles[0].pin);
      } else {
        setProfileName(''); setProfilePin('');
      }
    }
  }, [isOpen, sale, services]);

  // -- LÓGICA DE CÁLCULO DE PRORRATA / ABONO --
  const currentAccount = useMemo(() => accounts.find(a => a.id === sale?.accountId), [sale, accounts]);
  const targetSale = useMemo(() => sales.find(s => s.id === targetSaleId), [targetSaleId, sales]);
  const client = useMemo(() => clients.find(c => c.id === sale?.clientId), [sale, clients]);
  
  const clientOtherActiveSales = useMemo(() => {
      if (!sale) return [];
      return sales.filter(s => s.clientId === sale.clientId && s.id !== sale.id && getDaysRemaining(s.expiryDate) > 0);
  }, [sale, sales]);

  useEffect(() => {
      if (!sale) return;

      if (warrantyMode === 'replace') {
          const originalSvc = services.find(s => s.name === sale.serviceName);
          const newSvc = services.find(s => s.id === selectedServiceId);
          if (!newSvc || !originalSvc || originalSvc.id === newSvc.id) {
              setProrataAdjustment(0); return;
          }
          const currentRemainingDays = getDaysRemaining(sale.expiryDate, currentAccount);
          if (currentRemainingDays <= 0) { setProrataAdjustment(0); return; }
          const dailyOriginal = (originalSvc.publicPrice || 1) / 30;
          const creditValue = dailyOriginal * currentRemainingDays;
          const dailyNew = (newSvc.publicPrice || 1) / 30;
          const extraDays = dailyNew > 0 ? (creditValue / dailyNew) : currentRemainingDays;
          setProrataAdjustment(Math.round(extraDays - currentRemainingDays));
      } else {
          // LÓGICA DE ABONO: De un servicio fallido a otro activo
          if (!targetSale) { setProrataAdjustment(0); return; }
          const sourceSvc = services.find(s => s.name === sale.serviceName);
          const destSvc = services.find(s => s.name === targetSale.serviceName);
          if (!sourceSvc || !destSvc) { setProrataAdjustment(0); return; }

          const sourceRemainingDays = getDaysRemaining(sale.expiryDate, currentAccount);
          if (sourceRemainingDays <= 0) { setProrataAdjustment(0); return; }

          const isReseller = !!client?.resellerId;
          const priceSource = isReseller ? (sourceSvc.resellerPrice || 0) : (sourceSvc.publicPrice || 0);
          const creditValue = (priceSource / 30) * sourceRemainingDays;
          const priceDest = isReseller ? (destSvc.resellerPrice || 0) : (destSvc.publicPrice || 0);
          const dailyDest = priceDest / 30;
          
          const extraDays = dailyDest > 0 ? Math.round(creditValue / dailyDest) : 0;
          setProrataAdjustment(extraDays);
      }
  }, [warrantyMode, selectedServiceId, targetSaleId, sale, services, currentAccount, client]);

  // Actualizar fecha final
  useEffect(() => {
    if (!sale || warrantyMode !== 'replace') return;
    const current = parseLocalISO(sale.expiryDate);
    current.setDate(current.getDate() + daysToAdd + prorataAdjustment);
    setNewExpiryDate(current.toISOString().split('T')[0]);
  }, [daysToAdd, prorataAdjustment, sale, warrantyMode]);

  if (!sale) return null;

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const logPrefix = `\n[GARANTÍA ${new Date().toLocaleDateString()}]: `;

    try {
        if (warrantyMode === 'credit') {
            if (!targetSale) throw new Error("Debes seleccionar un servicio destino");
            
            // 1. Extender destino
            const targetOldExpiry = parseLocalISO(targetSale.expiryDate);
            targetOldExpiry.setDate(targetOldExpiry.getDate() + prorataAdjustment);
            const targetNewExpiry = targetOldExpiry.toISOString().split('T')[0];

            await updateSale({
                ...targetSale,
                expiryDate: targetNewExpiry,
                notes: (targetSale.notes || '') + logPrefix + `Abono de ${prorataAdjustment} días recibido desde ${sale.serviceName} por falla.`
            });

            // 2. Finalizar origen
            await updateSale({
                ...sale,
                expiryDate: getLocalDateISO(),
                notes: (sale.notes || '') + logPrefix + `Tiempo transferido a ${targetSale.serviceName}. Servicio cerrado.`
            });
            
            showToast('Saldo transferido exitosamente', 'success');

        } else {
            // MODO REEMPLAZO / REPOSICIÓN
            if (!selectedAccountId || !reason) throw new Error("Datos incompletos");

            let updatedSale = { ...sale };
            let logNote = logPrefix + reason + ".";

            // Cambio de servicio si aplica
            const selectedService = services.find(s => s.id === selectedServiceId);
            if (selectedService && selectedService.name !== sale.serviceName) {
                updatedSale.serviceName = selectedService.name;
                const isReseller = !!client?.resellerId;
                const newPriceUnit = isReseller ? (selectedService.resellerPrice || 0) : (selectedService.publicPrice || 0);
                updatedSale.amount = selectedService.type === 'cuenta_completa' ? newPriceUnit : newPriceUnit * (sale.screensCount || 1);
                logNote += ` Cambio de tarifa: ${sale.serviceName} -> ${selectedService.name}.`;
            }

            // Cambio de cuenta si aplica
            if (selectedAccountId !== sale.accountId) {
                const oldAccount = accounts.find(a => a.id === sale.accountId);
                const newAccount = accounts.find(a => a.id === selectedAccountId);
                if (oldAccount) {
                    const oldUsed = Math.max(0, (oldAccount.usedScreens || 0) - (sale.screensCount || 1));
                    updateAccount({ ...oldAccount, usedScreens: oldUsed });
                }
                if (newAccount) {
                    const newUsed = (newAccount.usedScreens || 0) + (sale.screensCount || 1);
                    updateAccount({ ...newAccount, usedScreens: newUsed });
                }
                updatedSale.accountId = selectedAccountId;
                logNote += ` Nueva cuenta: ${newAccount?.email}.`;
            }

            // Ajuste de tiempo
            const totalAdj = daysToAdd + prorataAdjustment;
            if (totalAdj !== 0) {
                updatedSale.expiryDate = newExpiryDate;
                logNote += ` Compensación: ${totalAdj} días.`;
            }

            if (updatedSale.assignedProfiles && updatedSale.assignedProfiles.length > 0) {
                updatedSale.assignedProfiles[0] = { name: profileName, pin: profilePin };
            }

            updatedSale.notes = (updatedSale.notes || '') + logNote;
            await updateSale(updatedSale);
            
            showToast('Garantía procesada', 'success');
        }
        onClose();
    } catch (e: any) {
        showToast(e.message || 'Error al procesar', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- DERIVADOS PARA LA UI ---
  const destService = services.find(s => s.id === selectedServiceId);
  const serviceChanged = !!destService && destService.name !== sale.serviceName;
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const totalAdj = daysToAdd + prorataAdjustment;
  const statusBadge = getStatusBadge(currentAccount?.status === 'fallando', getDaysRemaining(sale.expiryDate, currentAccount));
  // Solo tiene sentido editar el perfil si la venta tiene perfiles asignados (handleSave ignora el resto)
  const hasProfiles = !!sale.assignedProfiles && sale.assignedProfiles.length > 0;
  const targetNewDate = targetSale
    ? (() => {
        const d = parseLocalISO(targetSale.expiryDate);
        d.setDate(d.getDate() + prorataAdjustment);
        return d.toISOString().split('T')[0];
      })()
    : '';
  const isConfirmDisabled = isSubmitting || (warrantyMode === 'replace' && (!reason || !selectedAccountId)) || (warrantyMode === 'credit' && !targetSaleId);

  const subModalZIndex = (zIndex || 10000) + 100;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Gestión de garantía" zIndex={zIndex}>
         <div className="flex flex-col animate-fade-in pt-1">

            <p className="text-[11px] text-text-disabled font-medium mb-4 truncate">{client?.name}</p>

            <div className="flex flex-col gap-5">

                {/* 1. RESUMEN DEL SERVICIO CON FALLA */}
                <div className="bg-surface-zinc rounded-xl p-4 border border-[rgb(var(--fg-rgb))]/5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-brand-primary/15 flex items-center justify-center shrink-0 text-brand-primary-hi border border-brand-primary/20"><ShieldCheck size={18} /></div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">{sale.serviceName}</p>
                        <p className="text-[11px] text-text-muted font-medium mt-0.5 truncate">Vence el {formatLongDate(sale.expiryDate)}{currentAccount ? ` · ${currentAccount.email}` : ''}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${statusBadge.cls}`}>{statusBadge.label}</span>
                </div>

                {/* 2. MODO */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setWarrantyMode('replace')}
                        className={`h-11 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${warrantyMode === 'replace' ? 'bg-brand-primary/20 text-text-primary' : 'text-text-disabled hover:text-text-primary'}`}
                    >
                        <RefreshCw size={16} /> Reponer / cambiar
                    </button>
                    <button
                        type="button"
                        onClick={() => setWarrantyMode('credit')}
                        className={`h-11 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] ${warrantyMode === 'credit' ? 'bg-brand-primary/20 text-text-primary' : 'text-text-disabled hover:text-text-primary'}`}
                    >
                        <ArrowRightLeft size={16} /> Abonar a otro
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {warrantyMode === 'replace' ? (
                        <motion.div key="replace" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col gap-5">

                            {/* 3A. ORIGEN: PLATAFORMA Y CUENTA */}
                            <div className="space-y-3">
                                <label className={SECTION_LABEL}>Origen</label>
                                <div className="bg-surface-zinc rounded-xl border border-[rgb(var(--fg-rgb))]/5 overflow-hidden">
                                    <button type="button" onClick={() => setModalSearch('service')} className="w-full h-[60px] px-3 flex items-center gap-3 text-left border-b border-[rgb(var(--fg-rgb))]/5 active:bg-[rgb(var(--fg-rgb))]/[0.03] transition-colors group">
                                        <div className="w-9 h-9 rounded-md bg-surface-sunken flex items-center justify-center text-brand-primary shrink-0"><Monitor size={18} /></div>
                                        <div className="flex-1 min-w-0">
                                            <span className="block text-[10px] font-semibold text-text-disabled uppercase">Plataforma destino</span>
                                            <span className="block text-sm font-bold text-text-primary truncate">{destService?.name || sale.serviceName}</span>
                                        </div>
                                        {serviceChanged && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-status-warning/10 text-status-warning-soft border border-status-warning/20 shrink-0">Cambio</span>}
                                        <ChevronDown size={16} className="text-text-faint group-hover:text-text-primary shrink-0" />
                                    </button>
                                    <button type="button" onClick={() => setModalSearch('account')} className="w-full h-[60px] px-3 flex items-center gap-3 text-left active:bg-[rgb(var(--fg-rgb))]/[0.03] transition-colors group">
                                        <div className="w-9 h-9 rounded-md bg-surface-sunken flex items-center justify-center text-status-success shrink-0"><Mail size={18} /></div>
                                        <div className="flex-1 min-w-0">
                                            <span className="block text-[10px] font-semibold text-text-disabled uppercase">Cuenta de reemplazo</span>
                                            <span className={`block text-[13px] font-bold truncate ${selectedAccount ? 'text-text-primary' : 'text-text-faint'}`}>{selectedAccount?.email || 'Seleccionar cuenta...'}</span>
                                        </div>
                                        <ChevronDown size={16} className="text-text-faint group-hover:text-text-primary shrink-0" />
                                    </button>
                                </div>
                            </div>

                            {/* 3B. COMPENSACIÓN DE TIEMPO */}
                            <div className="space-y-3">
                                <label className={SECTION_LABEL}>Compensación de tiempo</label>
                                <div className="flex flex-wrap gap-2">
                                    {DAY_CHIPS.map(n => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setDaysToAdd(n)}
                                            className={`h-9 px-4 rounded-full border text-[13px] font-semibold transition-all active:scale-95 ${daysToAdd === n ? 'bg-brand-primary/20 border-brand-primary text-text-primary' : 'bg-surface-sunken border-[rgb(var(--fg-rgb))]/10 text-text-muted hover:text-text-primary'}`}
                                        >
                                            {n === 0 ? 'Sin días' : `+${n} días`}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <StepperControl value={daysToAdd} onChange={setDaysToAdd} label="DÍAS MANUALES" />
                                    <div className="bg-surface-zinc rounded-md border border-[rgb(var(--fg-rgb))]/5 h-[52px] px-4 flex flex-col justify-center min-w-0">
                                        <span className="text-[9px] font-bold text-text-faint uppercase tracking-wide leading-none">Nuevo vencimiento</span>
                                        <span className={`text-[15px] font-bold leading-tight mt-1 ${totalAdj > 0 ? 'text-status-success-soft' : 'text-text-primary'}`}>{formatLongDate(newExpiryDate)}</span>
                                    </div>
                                </div>
                                {prorataAdjustment !== 0 && (
                                    <div className="p-3 bg-status-info/10 border border-status-info/20 rounded-xl flex items-center justify-between gap-3">
                                        <span className="text-xs text-status-info-soft font-medium">Equivalencia por cambio de precio</span>
                                        <span className={`text-[13px] font-bold shrink-0 ${prorataAdjustment > 0 ? 'text-status-success-soft' : 'text-status-danger-soft'}`}>{prorataAdjustment > 0 ? `+${prorataAdjustment}` : prorataAdjustment} d</span>
                                    </div>
                                )}
                            </div>

                            {/* 3C. CREDENCIALES DE PERFIL */}
                            {hasProfiles && (
                                <div className="space-y-3">
                                    <label className={SECTION_LABEL}>Credenciales de perfil</label>
                                    <div className="flex gap-2">
                                        <div className={`${FIELD_BOX} flex-1 min-w-0`}>
                                            <User size={16} className="text-text-faint shrink-0" />
                                            <input
                                                value={profileName}
                                                onChange={(e) => setProfileName(e.target.value)}
                                                placeholder="Nombre del perfil"
                                                className={`${CLEAN_INPUT} h-full font-bold text-text-primary placeholder:text-text-faint`}
                                            />
                                        </div>
                                        <div className={`${FIELD_BOX} w-[104px] shrink-0 !gap-2 !px-3`}>
                                            <Hash size={14} className="text-text-faint shrink-0" />
                                            <input
                                                value={profilePin}
                                                onChange={(e) => setProfilePin(e.target.value)}
                                                placeholder="PIN"
                                                inputMode="numeric"
                                                className={`${CLEAN_INPUT} h-full text-center font-mono font-bold text-text-primary placeholder:text-text-faint`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3D. MOTIVO (obligatorio) */}
                            <div className="space-y-3">
                                <label className={SECTION_LABEL}>Motivo <span className="text-status-danger-soft">*</span></label>
                                <div className="flex flex-wrap gap-2">
                                    {REASONS.map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setReason(value)}
                                            className={`h-9 px-4 rounded-full border text-[13px] font-semibold transition-all active:scale-95 ${reason === value ? 'bg-brand-primary/20 border-brand-primary text-text-primary' : 'bg-surface-sunken border-[rgb(var(--fg-rgb))]/10 text-text-muted hover:text-text-primary'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="credit" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col gap-5">

                            {/* 4A. AVISO */}
                            <div className="p-3.5 bg-status-info/10 border border-status-info/20 rounded-xl flex gap-3 items-start">
                                <Info size={18} className="text-status-info-soft shrink-0 mt-0.5" />
                                <p className="text-xs text-status-info-soft leading-relaxed">Suma el tiempo restante de este servicio con falla a otro servicio activo del cliente.</p>
                            </div>

                            {/* 4B. SERVICIO DESTINO */}
                            <div className="space-y-3">
                                <label className={SECTION_LABEL}>Servicio destino</label>
                                <button type="button" onClick={() => setModalSearch('target_sale')} className="w-full h-[60px] px-3 bg-surface-zinc rounded-xl border border-[rgb(var(--fg-rgb))]/5 flex items-center gap-3 text-left active:scale-[0.99] transition-all group">
                                    <div className="w-9 h-9 rounded-md bg-surface-sunken flex items-center justify-center text-brand-primary shrink-0"><ShoppingCart size={18} /></div>
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-[10px] font-semibold text-text-disabled uppercase">Servicio activo</span>
                                        <span className={`block text-[13px] font-bold truncate ${targetSale ? 'text-text-primary' : 'text-text-faint'}`}>
                                            {targetSale ? `${targetSale.serviceName} · vence ${formatLongDate(targetSale.expiryDate)}` : 'Elegir servicio...'}
                                        </span>
                                    </div>
                                    <ChevronDown size={16} className="text-text-faint group-hover:text-text-primary shrink-0" />
                                </button>
                            </div>

                            {/* 4C. RESULTADO DEL ABONO */}
                            {targetSale && (
                                <div className="bg-surface-zinc rounded-xl border border-[rgb(var(--fg-rgb))]/5 p-4">
                                    <div className="flex items-center justify-center gap-5">
                                        <div className="flex flex-col items-center min-w-0">
                                            <div className="w-11 h-11 rounded-full bg-status-danger/10 flex items-center justify-center text-status-danger-soft mb-1.5 border border-status-danger/20"><Layers size={20} /></div>
                                            <span className="text-[10px] font-semibold text-text-disabled uppercase">Origen</span>
                                            <span className="text-xs font-bold text-text-primary truncate max-w-[110px]">{sale.serviceName}</span>
                                        </div>
                                        <ArrowRight size={20} className="text-text-faint shrink-0" />
                                        <div className="flex flex-col items-center min-w-0">
                                            <div className="w-11 h-11 rounded-full bg-status-success/10 flex items-center justify-center text-status-success-soft mb-1.5 border border-status-success/20"><RefreshCw size={20} /></div>
                                            <span className="text-[10px] font-semibold text-text-disabled uppercase">Destino</span>
                                            <span className="text-xs font-bold text-text-primary truncate max-w-[110px]">{targetSale.serviceName}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-[rgb(var(--fg-rgb))]/5 text-center">
                                        <p className="text-[10px] font-bold text-text-disabled uppercase tracking-widest">Equivalencia a abonar</p>
                                        <p className="text-4xl font-black text-status-success-soft leading-tight mt-1">+{prorataAdjustment} días</p>
                                        <p className="text-xs text-text-muted mt-2">Nueva fecha del destino: <span className="text-text-primary font-bold">{formatLongDate(targetNewDate)}</span></p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* 5. ACCIONES (quedan pegadas abajo al hacer scroll) */}
            <div className="sticky bottom-0 z-10 -mx-3 lg:-mx-6 px-3 lg:px-6 mt-5 py-3 bg-surface-1 border-t border-[rgb(var(--fg-rgb))]/5 flex gap-3">
                <button
                    onClick={onClose}
                    className="flex-1 h-[52px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-4 text-text-secondary hover:text-text-primary rounded-md font-semibold text-sm transition-all active:scale-[0.98]"
                >
                    Cerrar
                </button>
                <button
                    onClick={() => handleSave()}
                    disabled={isConfirmDisabled}
                    className="btn-primary flex-[2] h-[52px] rounded-md text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
                >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                    {warrantyMode === 'replace' ? 'Confirmar reposición' : 'Confirmar abono'}
                </button>
            </div>
         </div>
      </Modal>

      {/* SUB-MODALES DE BÚSQUEDA */}
      <SearchListModal 
         isOpen={modalSearch === 'account'} 
         onClose={() => setModalSearch(null)} 
         title="Seleccionar cuenta"
         zIndex={subModalZIndex}
         items={accounts.filter(a => a.serviceId === selectedServiceId && a.status === 'activa' && (a.id === currentAccount?.id || (a.maxScreens - calculateOccupancy(a) >= (sale.screensCount || 1))))}
         onSelect={(acc) => setSelectedAccountId(acc.id)}
         renderItem={(acc: Account) => {
            const free = acc.maxScreens - calculateOccupancy(acc);
            return (
              <PickerRow
                icon={<Mail size={18} />}
                iconClass="bg-status-success/10 text-status-success-soft"
                title={acc.email}
                subtitle={`${free} ${free === 1 ? 'cupo libre' : 'cupos libres'}`}
                selected={selectedAccountId === acc.id}
              />
            );
         }}
      />

      <SearchListModal 
        isOpen={modalSearch === 'service'} 
        onClose={() => setModalSearch(null)} 
        title="Cambiar servicio"
        zIndex={subModalZIndex}
        items={services} 
        onSelect={(svc) => { setSelectedServiceId(svc.id); if (svc.id !== currentAccount?.serviceId) setSelectedAccountId(''); }}
        renderItem={(s: Service) => (
          <PickerRow
            icon={<Monitor size={18} />}
            iconClass="bg-brand-primary/15 text-brand-primary-hi"
            title={s.name}
            subtitle={`$${s.publicPrice} / mes`}
            selected={selectedServiceId === s.id}
          />
        )}
      />

      <SearchListModal 
        isOpen={modalSearch === 'target_sale'} 
        onClose={() => setModalSearch(null)} 
        title="Elegir servicio destino"
        zIndex={subModalZIndex}
        items={clientOtherActiveSales} 
        onSelect={(s: Sale) => setTargetSaleId(s.id)}
        renderItem={(s: Sale) => (
          <PickerRow
            icon={<Layers size={18} />}
            iconClass="bg-brand-primary/15 text-brand-primary-hi"
            title={s.serviceName}
            subtitle={`Vence ${formatLongDate(s.expiryDate)}`}
            selected={targetSaleId === s.id}
          />
        )}
      />
    </>
  );
};

export default WarrantyModal;
