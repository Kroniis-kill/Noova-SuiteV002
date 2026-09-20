import React from 'react';
import {
  ChevronRight, ChevronDown, Minus, Plus, Wand2, Mail, Lock, User,
  Monitor, Hash, DollarSign, ArrowRight, Calendar
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useHaptic } from '../../hooks/useHaptic';
import { addTime, parseLocalISO } from '../../utils/contactosUtils';
import { calculateOccupancy } from '../../utils/inventarioUtils';
import { ItemConfigPanelProps } from './saleModal.types';

// --- CONSTANTES Y HELPERS ---

export const SALE_TYPE_LABELS: Record<string, string> = {
  por_pantalla: 'Por pantalla',
  usuario_unico: 'Usuario único',
  cuenta_completa: 'Cuenta completa',
};

const QUICK_MONTHS = [1, 2, 3, 6];

// index.css aplica a TODOS los inputs fondo, borde, radio de 16px, anillo de foco y
// font-size: 16px !important. Esta clase los neutraliza para inputs que viven dentro
// de un contenedor con su propio estilo (el contenedor dibuja el borde y el foco).
// El tamaño de fuente NO se toca aquí: los inputs pequeños conservan los 16px globales
// (evita el auto-zoom de iOS) y los grandes lo sobrescriben con !text-*.
const CLEAN_INPUT = "w-full min-w-0 !bg-transparent !border-0 !ring-0 focus:!ring-0 !rounded-none !p-0 !m-0 outline-none appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0";

// Contenedor estándar de un campo de texto (el borde y el foco los dibuja este contenedor).
const FIELD_BOX = "flex items-center gap-3 h-[50px] px-4 bg-surface-sunken rounded-md border border-[rgb(var(--fg-rgb))]/10 focus-within:border-brand-primary/40 transition-colors";

const SECTION_LABEL = "text-[10px] font-bold text-text-disabled uppercase tracking-widest ml-1 block";

const formatLongDate = (dateStr?: string | null): string => {
  if (!dateStr) return '---';
  const d = parseLocalISO(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// --- SUB-COMPONENTE: STEPPER (fuera del formulario para no remontarse en cada render) ---

interface StepperControlProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
}

const StepperControl: React.FC<StepperControlProps> = ({ value, onChange, label, min = 0 }) => (
  <div className="bg-surface-sunken rounded-md border border-[rgb(var(--fg-rgb))]/10 p-1 flex items-center justify-between h-[52px] w-full focus-within:border-[rgb(var(--fg-rgb))]/20 transition-colors">
    <button type="button" aria-label={`Menos ${label}`} onClick={() => onChange(Math.max(min, value - 1))} className="w-10 h-full shrink-0 rounded-sm bg-[rgb(var(--fg-rgb))]/5 text-text-muted hover:text-text-primary flex items-center justify-center active:scale-90 transition-all"><Minus size={16} /></button>
    <div className="flex-1 min-w-0 flex flex-col items-center justify-center h-full gap-0.5">
      <input
        type="number"
        inputMode="numeric"
        min={min}
        value={value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const val = parseInt(e.target.value);
          onChange(isNaN(val) ? 0 : Math.max(min, val));
        }}
        className={`${CLEAN_INPUT} h-6 text-center !text-lg font-bold leading-none text-text-primary`}
      />
      <span className="text-[9px] font-bold text-text-faint uppercase tracking-wide leading-none">{label}</span>
    </div>
    <button type="button" aria-label={`Más ${label}`} onClick={() => onChange(value + 1)} className="w-10 h-full shrink-0 rounded-sm bg-[rgb(var(--fg-rgb))]/5 text-text-muted hover:text-text-primary flex items-center justify-center active:scale-90 transition-all"><Plus size={16} /></button>
  </div>
);

// --- FORMULARIO COMPARTIDO ---
// Lo usan ItemConfigPanel (configurar servicio al agregar al carrito) y el modo
// "Editar servicio" de SaleModal. Solo pinta los campos: cabecera y botones los
// pone quien lo usa.

export type ItemConfigFormProps = Omit<ItemConfigPanelProps, 'isOpen' | 'onClose' | 'zIndex' | 'handleAddItem'> & {
  /** Vencimiento actual de la venta (solo en modo edición). */
  currentExpiry?: string;
};

const ItemConfigForm: React.FC<ItemConfigFormProps> = (props) => {
  const { settings } = useData();
  const haptic = useHaptic();

  const isFullAccount = props.tempType === 'cuenta_completa';
  const isUniqueUser = props.tempType === 'usuario_unico';
  const isScreen = props.tempType === 'por_pantalla';

  const selectedService = props.services.find(s => s.id === props.tempServiceId);
  const selectedAccount = props.accounts.find(a => a.id === props.tempAccountId);
  const freeSlots = selectedAccount ? selectedAccount.maxScreens - calculateOccupancy(selectedAccount) : null;

  // En edición la vigencia se EXTIENDE desde el vencimiento actual; al crear, arranca en la fecha de inicio.
  const baseDate = props.isEditing ? props.currentExpiry : props.tempStartDate;
  const endDate = baseDate ? addTime(baseDate, props.tempMonths, props.tempDays) : '';

  return (
    <div className="flex flex-col gap-5">

      {/* 1. ORIGEN: PLATAFORMA Y CUENTA */}
      <div className="space-y-3">
        <label className={SECTION_LABEL}>Origen</label>
        <div className="bg-surface-zinc rounded-xl border border-[rgb(var(--fg-rgb))]/5 overflow-hidden">
          <button
            type="button"
            onClick={() => { haptic('nav'); props.openServiceSearch(); }}
            className="w-full h-[60px] px-3 flex items-center gap-3 text-left border-b border-[rgb(var(--fg-rgb))]/5 active:bg-[rgb(var(--fg-rgb))]/[0.03] transition-colors group"
          >
            <div className="w-9 h-9 rounded-md bg-surface-sunken flex items-center justify-center text-brand-primary shrink-0"><Monitor size={18} /></div>
            <div className="flex-1 min-w-0">
              <span className="block text-[10px] font-semibold text-text-disabled uppercase">Plataforma</span>
              <span className={`block text-sm font-bold truncate ${selectedService ? 'text-text-primary' : 'text-text-faint'}`}>
                {selectedService?.name || 'Seleccionar...'}
              </span>
            </div>
            {selectedService && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgb(var(--fg-rgb))]/5 text-text-muted shrink-0">
                {SALE_TYPE_LABELS[props.tempType] || props.tempType}
              </span>
            )}
            <ChevronRight size={16} className="text-text-faint group-hover:text-text-primary shrink-0" />
          </button>

          <div className="flex items-center gap-2 pr-3">
            <button
              type="button"
              onClick={() => { haptic('nav'); props.openAccountSearch(); }}
              disabled={!props.tempServiceId}
              className={`flex-1 min-w-0 h-[60px] px-3 flex items-center gap-3 text-left transition-colors group ${!props.tempServiceId ? 'opacity-50 grayscale cursor-not-allowed' : 'active:bg-[rgb(var(--fg-rgb))]/[0.03]'}`}
            >
              <div className="w-9 h-9 rounded-md bg-surface-sunken flex items-center justify-center text-status-success shrink-0"><Mail size={18} /></div>
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] font-semibold text-text-disabled uppercase">
                  Cuenta de stock
                  {!props.isEditing && freeSlots !== null && <span className="text-status-success-soft normal-case"> · {freeSlots} {freeSlots === 1 ? 'libre' : 'libres'}</span>}
                </span>
                <span className={`block text-[13px] font-bold truncate ${selectedAccount ? 'text-text-primary' : 'text-text-faint'}`}>
                  {selectedAccount?.email || 'Asignar cuenta...'}
                </span>
              </div>
              <ChevronDown size={16} className="text-text-faint group-hover:text-text-primary shrink-0" />
            </button>

            {!props.isEditing && (
              <button
                type="button"
                onClick={() => { haptic('nav'); props.onAutoAssign(); }}
                disabled={!props.tempServiceId}
                className="h-9 px-3 rounded-full bg-brand-primary/15 text-brand-primary-hi text-xs font-bold flex items-center gap-1.5 shrink-0 active:scale-95 transition-all disabled:opacity-30"
              >
                <Wand2 size={14} /> Auto
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. DURACIÓN */}
      <div className="space-y-3">
        <label className={SECTION_LABEL}>{props.isEditing ? 'Extender vigencia' : 'Duración'}</label>
        <div className="flex flex-wrap gap-2">
          {QUICK_MONTHS.map(m => {
            const active = props.tempDays === 0 && props.tempMonths === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => { haptic('nav'); props.setTempMonths(m); props.setTempDays(0); }}
                className={`h-9 px-4 rounded-full border text-[13px] font-semibold transition-all active:scale-95 ${active ? 'bg-brand-primary/20 border-brand-primary text-text-primary' : 'bg-surface-sunken border-[rgb(var(--fg-rgb))]/10 text-text-muted hover:text-text-primary'}`}
              >
                {m} {m === 1 ? 'mes' : 'meses'}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StepperControl value={props.tempMonths} onChange={props.setTempMonths} label="MESES" />
          <StepperControl value={props.tempDays} onChange={props.setTempDays} label="DÍAS" />
        </div>

        <div className="bg-surface-zinc rounded-xl border border-[rgb(var(--fg-rgb))]/5 p-4 flex items-center justify-between gap-3 focus-within:border-brand-primary/40 transition-colors">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-text-disabled uppercase tracking-widest flex items-center gap-1.5">
              <Calendar size={12} /> {props.isEditing ? 'Vence actualmente' : 'Inicio'}
            </span>
            {props.isEditing ? (
              <p className="h-8 mt-1 flex items-center text-[15px] font-bold text-text-primary">{formatLongDate(props.currentExpiry)}</p>
            ) : (
              <input
                type="date"
                value={props.tempStartDate}
                onChange={e => props.setTempStartDate(e.target.value)}
                className={`${CLEAN_INPUT} h-8 mt-1 text-left !text-[15px] font-bold text-text-primary [&::-webkit-date-and-time-value]:text-left`}
              />
            )}
          </div>
          <ArrowRight size={18} className="text-text-faint shrink-0" />
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold text-text-disabled uppercase tracking-widest block">{props.isEditing ? 'Nuevo' : 'Vence'}</span>
            <p className="h-8 mt-1 flex items-center justify-end text-[15px] font-bold text-brand-primary-hi">{formatLongDate(endDate)}</p>
          </div>
        </div>
      </div>

      {/* 3. PRECIO */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <label className="text-[10px] font-bold text-text-disabled uppercase tracking-widest">Precio de venta</label>
          {props.isResellerClient && <span className="text-[9px] bg-status-warning/10 text-status-warning px-2 py-0.5 rounded border border-status-warning/20 font-bold uppercase">Tarifa socio</span>}
        </div>
        <div className="h-[60px] bg-surface-zinc rounded-xl border border-[rgb(var(--fg-rgb))]/5 flex items-center px-5 focus-within:border-brand-primary/50 focus-within:ring-1 focus-within:ring-brand-primary/20 transition-all">
          <DollarSign size={24} className="text-status-success mr-2 shrink-0" />
          <input
            type="number"
            step="0.01"
            value={props.tempAmount}
            onChange={e => props.setTempAmount(e.target.value)}
            className={`${CLEAN_INPUT} h-full !text-2xl font-black text-text-primary placeholder:text-text-faint`}
            placeholder="0.00"
            inputMode="decimal"
          />
          <span className="text-xs font-semibold text-text-disabled shrink-0 ml-3">{settings.currency}</span>
        </div>
      </div>

      {/* 4A. PERFILES (por pantalla) */}
      {isScreen && (
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-bold text-text-disabled uppercase tracking-widest">Perfiles ({props.tempScreens})</label>
            <div className="flex gap-1.5">
              <button type="button" aria-label="Quitar perfil" onClick={() => props.setTempScreens(Math.max(1, props.tempScreens - 1))} className="w-8 h-8 rounded-lg bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90 transition-all"><Minus size={14} /></button>
              <button type="button" aria-label="Agregar perfil" onClick={() => props.setTempScreens(props.tempScreens + 1)} className="w-8 h-8 rounded-lg bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90 transition-all"><Plus size={14} /></button>
            </div>
          </div>
          <div className="space-y-2">
            {props.tempProfiles.map((p, idx) => (
              <div key={idx} className="flex gap-2">
                <div className={`${FIELD_BOX} flex-1 min-w-0`}>
                  <User size={16} className="text-text-faint shrink-0" />
                  <input
                    value={p.name}
                    onChange={e => props.handleProfileChange(idx, 'name', e.target.value)}
                    placeholder={`Perfil ${idx + 1}`}
                    className={`${CLEAN_INPUT} h-full font-bold text-text-primary placeholder:text-text-faint`}
                  />
                </div>
                <div className={`${FIELD_BOX} w-[104px] shrink-0 !gap-2 !px-3`}>
                  <Hash size={14} className="text-text-faint shrink-0" />
                  <input
                    value={p.pin}
                    onChange={e => props.handleProfileChange(idx, 'pin', e.target.value)}
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

      {/* 4B. CREDENCIALES (usuario único / cuenta completa) */}
      {(isUniqueUser || isFullAccount) && (
        <div className="space-y-3">
          <label className={SECTION_LABEL}>Credenciales de acceso</label>
          <div className="bg-surface-zinc rounded-xl border border-[rgb(var(--fg-rgb))]/5 p-3 space-y-2">
            {isUniqueUser && (
              <>
                <div className={FIELD_BOX}>
                  <Mail size={16} className="text-text-disabled shrink-0" />
                  <input
                    value={props.tempInvitedEmail}
                    onChange={e => props.setTempInvitedEmail(e.target.value)}
                    placeholder="Correo del cliente"
                    className={`${CLEAN_INPUT} h-full font-medium text-text-primary placeholder:text-text-faint`}
                  />
                </div>
                <div className={FIELD_BOX}>
                  <Lock size={16} className="text-text-disabled shrink-0" />
                  <input
                    value={props.tempInvitedPassword}
                    onChange={e => props.setTempInvitedPassword(e.target.value)}
                    placeholder="Contraseña asignada"
                    className={`${CLEAN_INPUT} h-full font-mono font-medium text-text-primary placeholder:text-text-faint`}
                  />
                </div>
              </>
            )}
            {isFullAccount && (
              <div className={FIELD_BOX}>
                <User size={16} className="text-text-disabled shrink-0" />
                <input
                  value={props.tempProfiles[0]?.name || ''}
                  onChange={e => props.handleProfileChange(0, 'name', e.target.value)}
                  placeholder="Nombre referencial"
                  className={`${CLEAN_INPUT} h-full font-medium text-text-primary placeholder:text-text-faint`}
                />
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default ItemConfigForm;
