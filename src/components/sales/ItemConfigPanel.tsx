import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  Check, ChevronRight, Minus, Plus, ChevronDown,
  X, Wand2, Calendar, User, Lock, Mail, Info,
  Monitor, Hash, DollarSign
} from 'lucide-react';
import { useHaptic } from '../../hooks/useHaptic';
import { ItemConfigPanelProps } from './saleModal.types';

const StepperControl = ({ value, onChange, label, min = 0 }: any) => (
  <div className="bg-surface-sunken rounded-md border border-white/10 p-1 flex items-center justify-between h-[52px] w-full">
    <button onClick={() => onChange(Math.max(min, value - 1))} className="w-10 h-full rounded-sm bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center active:scale-90 transition-all"><Minus size={16} /></button>
    <div className="flex flex-col items-center leading-none">
      <span className="text-lg font-bold text-white">{value}</span>
      <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-wide">{label}</span>
    </div>
    <button onClick={() => onChange(value + 1)} className="w-10 h-full rounded-sm bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center active:scale-90 transition-all"><Plus size={16} /></button>
  </div>
);

const ItemConfigPanel: React.FC<ItemConfigPanelProps> = (props) => {
  if (!props.isOpen || typeof document === 'undefined' || !document.body) return null;
  const isFullAccount = props.tempType === 'cuenta_completa';
  const isUniqueUser = props.tempType === 'usuario_unico';
  const isScreen = props.tempType === 'por_pantalla';
  const haptic = useHaptic();

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" style={{ zIndex: (props.zIndex || 10020) - 1 }} onClick={props.onClose} />
      <div className="fixed inset-0 flex items-end lg:items-center justify-center p-0 lg:p-4 pointer-events-none" style={{ zIndex: props.zIndex || 10020 }}>
        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 32, mass: 0.8 }} className="pointer-events-auto w-full lg:max-w-lg bg-surface-1 rounded-t-xl lg:rounded-lg border-t border-border-subtle lg:border shadow-modal flex flex-col h-[90dvh] lg:h-auto lg:max-h-[85vh] overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 bg-surface-1">
            <div>
              <h3 className="text-lg font-black text-white leading-tight">{props.isEditing ? 'Editar Servicio' : 'Configurar Servicio'}</h3>
              <p className="text-[11px] text-zinc-500 font-medium">Define los detalles de la venta</p>
            </div>
            <button onClick={() => { haptic('nav'); props.onClose(); }} className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors active:scale-90"><X size={18} /></button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

            {/* 1. SELECCIÓN DE SERVICIO Y CUENTA */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Origen del Servicio</label>

              <button onClick={() => { haptic('nav'); props.openServiceSearch(); }} className="w-full bg-surface-zinc border border-white/5 rounded-lg p-4 flex items-center justify-between active:scale-[0.98] transition-all hover:bg-surface-3 group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-md bg-surface-sunken border border-white/5 flex items-center justify-center text-brand-primary">
                    <Monitor size={22} />
                  </div>
                  <div className="text-left">
                    <span className="block text-[10px] font-semibold text-zinc-500 uppercase">Plataforma</span>
                    <span className={`block text-sm font-bold truncate ${props.tempServiceId ? 'text-white' : 'text-zinc-600'}`}>
                      {props.services.find(s => s.id === props.tempServiceId)?.name || 'Seleccionar...'}
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-zinc-600 group-hover:text-white" />
              </button>

              <div className="flex gap-2">
                <button onClick={() => { haptic('nav'); props.openAccountSearch(); }} disabled={!props.tempServiceId} className={`flex-1 bg-surface-zinc border border-white/5 rounded-lg p-4 flex items-center justify-between active:scale-[0.98] transition-all hover:bg-surface-3 group ${!props.tempServiceId ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-md bg-surface-sunken border border-white/5 flex items-center justify-center text-status-success shrink-0">
                      <Mail size={22} />
                    </div>
                    <div className="text-left min-w-0">
                      <span className="block text-[10px] font-semibold text-zinc-500 uppercase">Cuenta / Stock</span>
                      <span className={`block text-sm font-bold truncate ${props.tempAccountId ? 'text-white' : 'text-zinc-600'}`}>
                        {props.accounts.find(a => a.id === props.tempAccountId)?.email || 'Asignar cuenta...'}
                      </span>
                    </div>
                  </div>
                  <ChevronDown size={18} className="text-zinc-600 group-hover:text-white shrink-0" />
                </button>

                {!props.isEditing && (
                  <button onClick={() => { haptic('nav'); props.onAutoAssign(); }} disabled={!props.tempServiceId} className="w-[72px] bg-surface-zinc border border-white/5 rounded-lg flex flex-col items-center justify-center gap-1 active:scale-95 transition-all hover:bg-surface-3 hover:border-brand-primary/30 disabled:opacity-30">
                    <Wand2 size={20} className="text-brand-primary" />
                    <span className="text-[8px] font-bold text-zinc-500 uppercase">Auto</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. TIEMPO Y DURACIÓN */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Vigencia y Tiempo</label>
              <div className="bg-surface-zinc rounded-xl p-4 border border-white/5 space-y-4">
                <div className="flex items-center bg-surface-sunken rounded-md px-4 h-[52px] border border-white/10">
                  <Calendar size={18} className="text-zinc-500 mr-3" />
                  <input type="date" value={props.tempStartDate} onChange={e => props.setTempStartDate(e.target.value)} className="bg-transparent text-sm text-white font-bold w-full outline-none uppercase tracking-wider" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1"><StepperControl value={props.tempMonths} onChange={props.setTempMonths} label="MESES" /></div>
                  <div className="flex-1"><StepperControl value={props.tempDays} onChange={props.setTempDays} label="DÍAS" /></div>
                </div>
              </div>
            </div>

            {/* 3. PRECIO Y PERFILES */}
            <div className="grid grid-cols-1 gap-6">
              <div>
                <div className="flex justify-between items-center mb-3 px-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Precio de Venta</label>
                  {props.isResellerClient && <span className="text-[9px] bg-status-warning/10 text-status-warning px-2 py-0.5 rounded border border-status-warning/20 font-bold uppercase">Tarifa Socio</span>}
                </div>
                <div className="relative h-[60px] bg-surface-zinc rounded-lg border border-white/5 flex items-center px-5 focus-within:border-brand-primary/50 focus-within:ring-1 focus-within:ring-brand-primary/20 transition-all">
                  <DollarSign size={24} className="text-status-success mr-2" />
                  <input type="number" value={props.tempAmount} onChange={e => props.setTempAmount(e.target.value)} className="w-full bg-transparent text-2xl font-black text-white outline-none placeholder:text-zinc-700" placeholder="0.00" inputMode="decimal" />
                </div>
              </div>

              {/* PERFILES CONFIG */}
              {isScreen && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Perfiles ({props.tempScreens})</label>
                    <div className="flex gap-1">
                      <button onClick={() => props.setTempScreens(Math.max(1, props.tempScreens - 1))} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white"><Minus size={14} /></button>
                      <button onClick={() => props.setTempScreens(props.tempScreens + 1)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white"><Plus size={14} /></button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {props.tempProfiles.map((p, idx) => (
                      <div key={idx} className="flex gap-2">
                        <div className="flex-1 bg-surface-zinc rounded-md border border-white/5 h-[50px] flex items-center px-4 focus-within:border-brand-primary/40 transition-colors">
                          <User size={16} className="text-zinc-600 mr-3" />
                          <input value={p.name} onChange={e => props.handleProfileChange(idx, 'name', e.target.value)} placeholder={`Perfil ${idx + 1}`} className="bg-transparent w-full text-sm text-white font-bold outline-none placeholder:text-zinc-700" />
                        </div>
                        <div className="w-24 bg-surface-zinc rounded-md border border-white/5 h-[50px] flex items-center px-3 focus-within:border-brand-primary/40 transition-colors">
                          <Hash size={14} className="text-zinc-600 mr-2" />
                          <input value={p.pin} onChange={e => props.handleProfileChange(idx, 'pin', e.target.value)} placeholder="PIN" className="bg-transparent w-full text-sm text-white font-mono font-bold outline-none text-center placeholder:text-zinc-700" inputMode="numeric" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CREDENCIALES EXTRA */}
              {(isUniqueUser || isFullAccount) && (
                <div className="p-4 bg-status-info/5 border border-status-info/10 rounded-lg space-y-4">
                  <div className="flex items-center gap-2 text-status-info-soft mb-1">
                    <Info size={16} />
                    <span className="text-xs font-semibold uppercase">Credenciales de Acceso</span>
                  </div>

                  {isUniqueUser && (
                    <>
                      <div className="flex items-center bg-surface-sunken rounded-md h-[48px] px-4 border border-white/5">
                        <Mail size={16} className="text-zinc-500 mr-3" />
                        <input value={props.tempInvitedEmail} onChange={e => props.setTempInvitedEmail(e.target.value)} placeholder="Correo del cliente" className="bg-transparent w-full text-sm text-white outline-none font-medium" />
                      </div>
                      <div className="flex items-center bg-surface-sunken rounded-md h-[48px] px-4 border border-white/5">
                        <Lock size={16} className="text-zinc-500 mr-3" />
                        <input value={props.tempInvitedPassword} onChange={e => props.setTempInvitedPassword(e.target.value)} placeholder="Contraseña asignada" className="bg-transparent w-full text-sm text-white outline-none font-mono font-medium" />
                      </div>
                    </>
                  )}

                  {isFullAccount && (
                    <div className="flex items-center bg-surface-sunken rounded-md h-[48px] px-4 border border-white/5">
                      <User size={16} className="text-zinc-500 mr-3" />
                      <input value={props.tempProfiles[0]?.name || ''} onChange={e => props.handleProfileChange(0, 'name', e.target.value)} placeholder="Nombre referencial" className="bg-transparent w-full text-sm text-white outline-none font-medium" />
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-surface-1 border-t border-white/5 shrink-0 flex gap-3">
            <button onClick={props.onClose} className="h-[56px] px-6 rounded-lg bg-white/5 text-zinc-400 font-semibold text-xs uppercase tracking-wider hover:bg-white/10 transition-colors">
              Cancelar
            </button>
            <button onClick={() => { haptic('nav'); props.handleAddItem(); }} className="flex-1 h-[56px] bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-glow flex items-center justify-center gap-2 active:scale-95 transition-all hover:brightness-110">
              <Check size={18} strokeWidth={3} />
              {props.isEditing ? 'Guardar Cambios' : 'Agregar al Carrito'}
            </button>
          </div>
        </motion.div>
      </div>
    </>, document.body
  );
};

export default ItemConfigPanel;
