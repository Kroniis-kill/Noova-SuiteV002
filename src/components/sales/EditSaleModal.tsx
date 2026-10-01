import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Sale, ScreenProfile, Client } from '../../types';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useHaptic } from '../../hooks/useHaptic';
import {
  Check, X, Mail, Lock, DollarSign, User, Hash, Layers,
  ChevronDown, Search, ArrowRight, Loader2, ArrowLeftRight, RotateCcw, Ban, ChevronRight
} from 'lucide-react';
import { getLocalDateISO, addTime, parseLocalISO } from '../../utils/contactosUtils';
import { calculateOccupancy } from '../../utils/inventarioUtils';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { SALE_TYPE_LABELS } from './ItemConfigForm';
import SearchListModal from './SearchListModal';

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

const dateOnly = (value?: string | null): string => (value ? value.split('T')[0] : '');

const formatLongDate = (value?: string | null): string => {
  const clean = dateOnly(value);
  if (!clean) return '---';
  const d = parseLocalISO(clean);
  if (isNaN(d.getTime())) return clean;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const DAY_MS = 1000 * 3600 * 24;

const getDaysUntil = (value?: string | null): number => {
  const clean = dateOnly(value);
  if (!clean) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseLocalISO(clean).getTime() - today.getTime()) / DAY_MS);
};

const getExpiryBadge = (days: number) => {
  if (days < 0) return { label: 'Vencido', cls: 'bg-status-danger/10 text-status-danger-soft border-status-danger/20' };
  if (days === 0) return { label: 'Vence hoy', cls: 'bg-status-warning/10 text-status-warning-soft border-status-warning/20' };
  if (days <= 5) return { label: `Vence en ${days} d`, cls: 'bg-status-warning/10 text-status-warning-soft border-status-warning/20' };
  return { label: `Vence en ${days} d`, cls: 'bg-status-success/10 text-status-success-soft border-status-success/20' };
};

// Atajos para extender el vencimiento actual: [etiqueta, meses, días]
const EXTEND_OPTIONS: Array<[string, number, number]> = [
  ['+7 días', 0, 7],
  ['+1 mes', 1, 0],
  ['+3 meses', 3, 0],
];

export interface ClientChangeInfo {
  fromClientId: string;
  toClientId: string;
  /** false = el cliente anterior se quedó sin ventas (la pantalla de detalle de ese cliente quedaría vacía). */
  fromClientHasOtherSales: boolean;
}

interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  zIndex?: number;
  /** Se llama después de guardar una venta que cambió de cliente. Opcional: sin esto todo funciona igual que antes. */
  onClientChanged?: (info: ClientChangeInfo) => void;
}

const EditSaleModal: React.FC<EditSaleModalProps> = ({ isOpen, onClose, sale, zIndex, onClientChanged }) => {
  const { accounts, services, updateSale, clients, settings, sales, updateClient, logAction } = useData();
  const { showToast } = useToast();
  const haptic = useHaptic();

  const [formData, setFormData] = useState<Partial<Sale>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccountSearchOpen, setIsAccountSearchOpen] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);

  useEffect(() => {
    if (isOpen && sale) {
      setFormData({ ...sale });
    }
  }, [isOpen, sale]);

  if (!isOpen || !sale) return null;

  const client = clients.find(c => c.id === sale.clientId);
  // Cliente elegido en el formulario (igual al original mientras no se cambie).
  const selectedClient = clients.find(c => c.id === formData.clientId);
  const clientChanged = !!formData.clientId && formData.clientId !== sale.clientId;
  const currentAccount = accounts.find(a => a.id === formData.accountId);
  const service = services.find(s => s.name === sale.serviceName);

  const filteredAccounts = accounts.filter(a => 
    a.serviceId === service?.id && 
    (a.email.toLowerCase().includes(accountSearch.toLowerCase()) || a.status.toLowerCase().includes(accountSearch.toLowerCase()))
  );

  const handleSave = async () => {
    if (!formData.accountId) {
      showToast('Debe seleccionar una cuenta', 'error');
      return;
    }
    if (clientChanged && !selectedClient) {
      showToast('El cliente seleccionado ya no existe', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateSale(formData as Sale);
      haptic('success');

      if (clientChanged && selectedClient) {
        const today = getLocalDateISO();
        const fromId = sale.clientId;
        const toId = selectedClient.id;
        const fromOtherSales = sales.filter(s => s.clientId === fromId && s.id !== sale.id);

        // Mantener al día el contador de servicios activos de los dos clientes
        // (mismo criterio que el botón de sincronizar de Clientes). Si falla, la venta
        // ya quedó bien guardada: ese botón lo corrige después.
        try {
          const fromActive = fromOtherSales.filter(s => s.expiryDate >= today).length;
          const toActive = sales.filter(s => s.clientId === toId && s.expiryDate >= today).length
            + ((formData.expiryDate || '') >= today ? 1 : 0);
          if (client && client.activeServices !== fromActive) await updateClient({ ...client, activeServices: fromActive });
          if (selectedClient.activeServices !== toActive) await updateClient({ ...selectedClient, activeServices: toActive });
        } catch (counterError) {
          console.warn('No se pudo actualizar el contador de servicios activos:', counterError);
        }

        logAction('UPDATE', 'SALE', `Venta ${sale.serviceName} movida de ${client?.name || 'cliente'} a ${selectedClient.name}`);
        showToast(`Venta movida a ${selectedClient.name}`, 'success');
        onClientChanged?.({ fromClientId: fromId, toClientId: toId, fromClientHasOtherSales: fromOtherSales.length > 0 });
      } else {
        showToast('Venta actualizada correctamente', 'success');
      }
      onClose();
    } catch (error) {
      showToast('Error al actualizar la venta', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickClient = (c: Client) => {
    if (c.isBlocked) { haptic('error'); showToast('Cliente Bloqueado', 'error'); return; }
    // Igual que al crear una venta: la venta toma el revendedor del cliente elegido.
    setFormData({ ...formData, clientId: c.id, resellerId: c.resellerId });
  };

  const revertClient = () => {
    haptic('nav');
    setFormData({ ...formData, clientId: sale.clientId, resellerId: sale.resellerId });
  };

  const handleProfileChange = (idx: number, field: keyof ScreenProfile, value: string) => {
    const profiles = [...(formData.assignedProfiles || [])];
    if (!profiles[idx]) profiles[idx] = { name: '', pin: '' };
    profiles[idx] = { ...profiles[idx], [field]: value };
    setFormData({ ...formData, assignedProfiles: profiles });
  };

  // --- DERIVADOS Y HANDLERS DE LA UI ---

  const startDate = dateOnly(formData.date);
  const endDate = dateOnly(formData.expiryDate);
  const expiryBadge = getExpiryBadge(getDaysUntil(formData.expiryDate));
  const durationDays = startDate && endDate
    ? Math.round((parseLocalISO(endDate).getTime() - parseLocalISO(startDate).getTime()) / DAY_MS)
    : null;
  const hasProfiles = sale.saleType === 'por_pantalla' && !!formData.assignedProfiles;
  const hasCredentials = sale.saleType === 'usuario_unico' || sale.saleType === 'cuenta_completa';

  // Extiende el vencimiento actual (o desde hoy si la venta no tiene fecha)
  const extendExpiry = (months: number, days: number) => {
    haptic('nav');
    const base = endDate || getLocalDateISO();
    setFormData({ ...formData, expiryDate: addTime(base, months, days) });
  };

  const closeAccountSearch = () => { setIsAccountSearchOpen(false); setAccountSearch(''); };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar servicio" zIndex={zIndex || 60000}>
      <div className="flex flex-col animate-fade-in pt-1">

        <p className="text-[11px] text-text-disabled font-medium mb-4 truncate">
          {[client?.name, SALE_TYPE_LABELS[sale.saleType] || sale.saleType].filter(Boolean).join(' · ')}
        </p>

        <div className="flex flex-col gap-5">

          {/* 1. RESUMEN (solo lectura) */}
          <div className="bg-surface-zinc rounded-xl p-4 border border-[rgb(var(--fg-rgb))]/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-brand-primary/15 flex items-center justify-center shrink-0 text-brand-primary-hi border border-brand-primary/20">
              <Layers size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-primary truncate">{sale.serviceName}</p>
              <p className="text-[11px] text-text-muted font-medium mt-0.5">Vence el {formatLongDate(formData.expiryDate)}</p>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${expiryBadge.cls}`}>{expiryBadge.label}</span>
          </div>

          {/* 1B. CLIENTE (permite pasar la venta a otro cliente sin borrarla) */}
          <div className="space-y-3">
            <label className={SECTION_LABEL}>Cliente</label>
            <button
              type="button"
              onClick={() => { haptic('nav'); setIsClientSearchOpen(true); }}
              className={`w-full h-[60px] px-3 bg-surface-zinc rounded-xl border flex items-center gap-3 text-left active:scale-[0.99] transition-all group ${clientChanged ? 'border-brand-primary/40' : 'border-[rgb(var(--fg-rgb))]/5'}`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white text-[11px] font-bold shrink-0 border border-[rgb(var(--fg-rgb))]/10">
                {(selectedClient?.name || '?').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] font-semibold text-text-disabled uppercase">Cliente de la venta</span>
                <span className="block text-[13px] font-bold truncate text-text-primary">{selectedClient?.name || 'Seleccionar cliente...'}</span>
              </div>
              <ChevronDown size={16} className="text-text-faint group-hover:text-text-primary shrink-0" />
            </button>
            {clientChanged && (
              <div className="flex items-start justify-between gap-3 px-1">
                <p className="text-xs text-brand-primary-hi flex items-start gap-1.5 min-w-0">
                  <ArrowLeftRight size={13} className="mt-0.5 shrink-0" />
                  <span>Pasará de {client?.name || 'otro cliente'} a {selectedClient?.name} al guardar.</span>
                </p>
                <button type="button" onClick={revertClient} className="text-xs font-semibold text-text-muted hover:text-text-primary flex items-center gap-1 shrink-0">
                  <RotateCcw size={12} /> Deshacer
                </button>
              </div>
            )}
          </div>

          {/* 2. CUENTA */}
          <div className="space-y-3">
            <label className={SECTION_LABEL}>Cuenta</label>
            <button
              type="button"
              onClick={() => { haptic('nav'); setIsAccountSearchOpen(true); }}
              className="w-full h-[60px] px-3 bg-surface-zinc rounded-xl border border-[rgb(var(--fg-rgb))]/5 flex items-center gap-3 text-left active:scale-[0.99] transition-all group"
            >
              <div className="w-9 h-9 rounded-md bg-surface-sunken flex items-center justify-center text-status-success shrink-0"><Mail size={18} /></div>
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] font-semibold text-text-disabled uppercase">Cuenta asignada</span>
                <span className={`block text-[13px] font-bold truncate ${currentAccount ? 'text-text-primary' : 'text-text-faint'}`}>
                  {currentAccount?.email || 'Seleccionar cuenta...'}
                </span>
              </div>
              <ChevronDown size={16} className="text-text-faint group-hover:text-text-primary shrink-0" />
            </button>
          </div>

          {/* 3. VIGENCIA */}
          <div className="space-y-3">
            <label className={SECTION_LABEL}>Vigencia</label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-text-disabled mr-0.5">Extender</span>
              {EXTEND_OPTIONS.map(([label, months, days]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => extendExpiry(months, days)}
                  className="h-9 px-4 rounded-full border text-[13px] font-semibold bg-surface-sunken border-[rgb(var(--fg-rgb))]/10 text-text-muted hover:text-text-primary transition-all active:scale-95 active:bg-brand-primary/20 active:border-brand-primary"
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="bg-surface-zinc rounded-xl border border-[rgb(var(--fg-rgb))]/5 p-4 flex items-center justify-between gap-3 focus-within:border-brand-primary/40 transition-colors">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-text-disabled uppercase tracking-widest block">Inicio</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    if (!e.target.value) return;
                    setFormData({ ...formData, date: new Date(e.target.value).toISOString() });
                  }}
                  className={`${CLEAN_INPUT} h-8 mt-1 text-left !text-[15px] font-bold text-text-primary [&::-webkit-date-and-time-value]:text-left`}
                />
              </div>
              <ArrowRight size={18} className="text-text-faint shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-text-disabled uppercase tracking-widest block text-right">Vence</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                  className={`${CLEAN_INPUT} h-8 mt-1 text-right !text-[15px] font-bold text-brand-primary-hi [&::-webkit-date-and-time-value]:text-right`}
                />
              </div>
            </div>

            {durationDays !== null && (
              <p className={`text-xs ml-1 ${durationDays >= 0 ? 'text-text-disabled' : 'text-status-danger-soft'}`}>
                {durationDays >= 0
                  ? `Duración total: ${durationDays} ${durationDays === 1 ? 'día' : 'días'}`
                  : 'El vencimiento no puede ser anterior al inicio'}
              </p>
            )}
          </div>

          {/* 4. MONTO */}
          <div className="space-y-3">
            <label className={SECTION_LABEL}>Monto de venta</label>
            <div className="h-[60px] bg-surface-zinc rounded-xl border border-[rgb(var(--fg-rgb))]/5 flex items-center px-5 focus-within:border-brand-primary/50 focus-within:ring-1 focus-within:ring-brand-primary/20 transition-all">
              <DollarSign size={24} className="text-status-success mr-2 shrink-0" />
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={formData.amount || ''}
                onChange={e => {
                  const value = parseFloat(e.target.value);
                  setFormData({ ...formData, amount: isNaN(value) ? 0 : value });
                }}
                className={`${CLEAN_INPUT} h-full !text-2xl font-black text-text-primary placeholder:text-text-faint`}
                placeholder="0.00"
              />
              <span className="text-xs font-semibold text-text-disabled shrink-0 ml-3">{settings.currency}</span>
            </div>
          </div>

          {/* 5A. PERFILES (por pantalla) */}
          {hasProfiles && (
            <div className="space-y-3">
              <label className={SECTION_LABEL}>Perfiles ({formData.assignedProfiles!.length})</label>
              <div className="space-y-2">
                {formData.assignedProfiles!.map((profile, idx) => (
                  <div key={idx} className="flex gap-2">
                    <div className={`${FIELD_BOX} flex-1 min-w-0`}>
                      <User size={16} className="text-text-faint shrink-0" />
                      <input
                        value={profile.name}
                        onChange={e => handleProfileChange(idx, 'name', e.target.value)}
                        placeholder="Nombre del perfil"
                        className={`${CLEAN_INPUT} h-full font-bold text-text-primary placeholder:text-text-faint`}
                      />
                    </div>
                    <div className={`${FIELD_BOX} w-[104px] shrink-0 !gap-2 !px-3`}>
                      <Hash size={14} className="text-text-faint shrink-0" />
                      <input
                        value={profile.pin}
                        onChange={e => handleProfileChange(idx, 'pin', e.target.value)}
                        placeholder="PIN"
                        inputMode="numeric"
                        className={`${CLEAN_INPUT} h-full text-center font-mono font-bold text-text-primary placeholder:text-text-faint`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5B. CREDENCIALES (usuario único / cuenta completa) */}
          {hasCredentials && (
            <div className="space-y-3">
              <label className={SECTION_LABEL}>Credenciales de acceso</label>
              <div className="bg-surface-zinc rounded-xl border border-[rgb(var(--fg-rgb))]/5 p-3 space-y-2">
                <div className={FIELD_BOX}>
                  <Mail size={16} className="text-text-disabled shrink-0" />
                  <input
                    value={formData.invitedEmail || ''}
                    onChange={e => setFormData({ ...formData, invitedEmail: e.target.value })}
                    placeholder="Correo del cliente"
                    className={`${CLEAN_INPUT} h-full font-medium text-text-primary placeholder:text-text-faint`}
                  />
                </div>
                <div className={FIELD_BOX}>
                  <Lock size={16} className="text-text-disabled shrink-0" />
                  <input
                    value={formData.invitedPassword || ''}
                    onChange={e => setFormData({ ...formData, invitedPassword: e.target.value })}
                    placeholder="Contraseña asignada"
                    className={`${CLEAN_INPUT} h-full font-mono font-medium text-text-primary placeholder:text-text-faint`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 6. ACCIONES (quedan pegadas abajo al hacer scroll) */}
        <div className="sticky bottom-0 z-10 -mx-3 lg:-mx-6 px-3 lg:px-6 mt-5 py-3 bg-surface-1 border-t border-[rgb(var(--fg-rgb))]/5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 h-[52px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-4 text-text-secondary hover:text-text-primary rounded-md font-semibold text-sm transition-all active:scale-[0.98]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="btn-primary flex-[2] h-[52px] rounded-md text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
            Guardar cambios
          </button>
        </div>
      </div>

      {/* SELECTOR DE CLIENTE */}
      <SearchListModal
        isOpen={isClientSearchOpen}
        onClose={() => setIsClientSearchOpen(false)}
        items={clients}
        onSelect={handlePickClient}
        title="Cambiar cliente"
        filterFn={(c: Client, q: string) => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)}
        zIndex={(zIndex || 60000) + 10000}
        renderItem={(c: Client) => {
          const isCurrent = c.id === formData.clientId;
          return (
            <div className={`p-4 rounded-xl border mb-2 flex items-center justify-between transition-all ${c.isBlocked ? 'bg-status-danger/10 border-status-danger/20 opacity-50' : isCurrent ? 'bg-brand-primary/10 border-brand-primary/30' : 'bg-surface-1 border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-zinc active:scale-[0.98]'}`}>
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white text-sm font-bold shadow-lg border border-[rgb(var(--fg-rgb))]/10 shrink-0">
                  {c.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-primary leading-tight truncate">{c.name}</p>
                  <p className="text-[11px] text-text-disabled font-mono mt-0.5">{c.phone}</p>
                </div>
              </div>
              {c.isBlocked
                ? <Ban size={18} className="text-status-danger shrink-0" />
                : isCurrent
                  ? <Check size={16} className="text-brand-primary shrink-0" strokeWidth={3} />
                  : <ChevronRight size={18} className="text-text-faint shrink-0" />}
            </div>
          );
        }}
      />

      {/* SELECTOR DE CUENTA */}
      {isAccountSearchOpen && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center p-4 z-[70000]" onClick={closeAccountSearch}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            className="bg-surface-1 w-full max-w-md rounded-xl border border-border-subtle shadow-modal overflow-hidden flex flex-col max-h-[70vh]" 
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-3 space-y-3 shrink-0">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-text-primary leading-tight">Cambiar cuenta</h3>
                <button onClick={closeAccountSearch} aria-label="Cerrar" className="w-9 h-9 rounded-full bg-surface-3 hover:bg-surface-4 flex items-center justify-center text-text-muted hover:text-text-primary transition-all active:scale-90"><X size={18} /></button>
              </div>
              <div className={FIELD_BOX}>
                <Search size={16} className="text-text-faint shrink-0" />
                <input
                  autoFocus
                  value={accountSearch}
                  onChange={e => setAccountSearch(e.target.value)}
                  placeholder="Buscar cuenta..."
                  className={`${CLEAN_INPUT} h-full text-text-primary placeholder:text-text-faint`}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 custom-scrollbar">
              {filteredAccounts.map(acc => {
                const isSelected = formData.accountId === acc.id;
                const isActive = acc.status === 'activa';
                const freeSlots = Math.max(0, acc.maxScreens - calculateOccupancy(acc));
                return (
                  <button 
                    key={acc.id} 
                    onClick={() => {
                      haptic('nav');
                      setFormData({ ...formData, accountId: acc.id });
                      closeAccountSearch();
                    }}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 border transition-all ${isSelected ? 'bg-brand-primary/10 border-brand-primary/30' : 'border-transparent hover:bg-[rgb(var(--fg-rgb))]/5'}`}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-status-success' : 'bg-status-danger'}`} />
                    <div className="text-left min-w-0 flex-1">
                      <p className="text-sm font-bold text-text-primary truncate">{acc.email}</p>
                      <p className="text-[11px] text-text-disabled mt-0.5">
                        {isActive ? `${freeSlots} ${freeSlots === 1 ? 'cupo libre' : 'cupos libres'}` : acc.status.charAt(0).toUpperCase() + acc.status.slice(1)}
                      </p>
                    </div>
                    {isSelected && <Check size={16} className="text-brand-primary shrink-0" strokeWidth={3} />}
                  </button>
                );
              })}
              {filteredAccounts.length === 0 && <p className="text-center text-text-disabled text-sm py-8">No se encontraron cuentas.</p>}
            </div>
          </motion.div>
        </div>, document.body
      )}
    </Modal>
  );
};

export default EditSaleModal;
