import React from 'react';
import Modal from '../ui/Modal';
import { ServiceFailure } from '../../types';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useHaptic } from '../../hooks/useHaptic';
import { Tv, User, Mail, Lock, Copy, Clock, Megaphone, CheckCircle2 } from 'lucide-react';
import { SALE_TYPE_LABELS } from './ItemConfigForm';

// --- HELPERS Y SUB-COMPONENTES ---

const SECTION_LABEL = "text-[10px] font-bold text-text-disabled uppercase tracking-widest ml-1 block";

const ROW_DIVIDER = "w-full h-px bg-[rgb(var(--fg-rgb))]/5";

const DAY_MS = 1000 * 3600 * 24;

// Lucide no trae el logo de WhatsApp: ícono propio con el mismo trazo que los demás
const WhatsAppIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
  </svg>
);

// "2026-09-18T10:20:00Z" -> "18/09/2026"
const formatLongDate = (value?: string | null): string => {
  if (!value) return '---';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '---';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const formatTimeAgo = (value?: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  const days = Math.floor((Date.now() - d.getTime()) / DAY_MS);
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
};

interface CopyRowProps {
  icon: React.ReactNode;
  iconClass?: string;
  label: string;
  labelClass?: string;
  value: string;
  mono?: boolean;
  onCopy: () => void;
}

// Fila de credencial: al tocarla copia el valor
const CopyRow: React.FC<CopyRowProps> = ({ icon, iconClass = 'bg-[rgb(var(--fg-rgb))]/5 text-text-disabled', label, labelClass = 'text-text-faint', value, mono, onCopy }) => (
  <button type="button" onClick={onCopy} className="w-full flex items-center gap-3 px-3 py-2.5 text-left group active:bg-[rgb(var(--fg-rgb))]/[0.03] transition-colors">
    <div className={`w-[30px] h-[30px] rounded-md flex items-center justify-center shrink-0 ${iconClass}`}>{icon}</div>
    <div className="flex-1 min-w-0 flex flex-col">
      <span className={`text-[10px] font-semibold ${labelClass}`}>{label}</span>
      <span className={`truncate text-[13px] font-semibold text-text-secondary ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
    <Copy size={15} className="text-text-faint group-hover:text-text-primary shrink-0" />
  </button>
);

// --- MODAL ---

interface FailureManageModalProps {
  failure: ServiceFailure | null;
  onClose: () => void;
  onNotify: (failure: ServiceFailure) => void;
  onSolve: (failure: ServiceFailure, notify: boolean) => void;
  zIndex?: number;
}

const FailureManageModal: React.FC<FailureManageModalProps> = ({ failure, onClose, onNotify, onSolve, zIndex }) => {
  const { sales, clients, accounts, services } = useData();
  const { showToast } = useToast();
  const haptic = useHaptic();

  const sale = failure ? sales.find(s => s.id === failure.saleId) : undefined;
  const client = clients.find(c => c.id === sale?.clientId);
  const account = accounts.find(a => a.id === sale?.accountId);
  const service = services.find(s => s.name === sale?.serviceName);
  const isUnique = sale?.saleType === 'usuario_unico';

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    haptic('nav');
    navigator.clipboard.writeText(text);
    showToast(`${label} copiado`, 'success');
  };

  return (
    <Modal isOpen={!!failure} onClose={onClose} title="Gestionar incidencia" zIndex={zIndex}>
      {failure && (
        <div className="flex flex-col animate-fade-in pt-1">
          <div className="flex flex-col gap-5">

            {/* 1. RESUMEN */}
            <div className="bg-surface-zinc rounded-xl p-4 border border-[rgb(var(--fg-rgb))]/5 flex items-center gap-3">
              <div className="w-11 h-11 rounded-md bg-brand-primary/15 flex items-center justify-center shrink-0 text-brand-primary-hi border border-brand-primary/20 overflow-hidden">
                {service?.image_url ? <img src={service.image_url} alt="" className="w-full h-full object-cover" /> : <Tv size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-text-primary truncate">{sale?.serviceName}</p>
                <p className="text-xs text-text-muted font-medium mt-0.5 flex items-center gap-1.5 min-w-0">
                  <User size={13} className="shrink-0" />
                  <span className="truncate">{client?.name}</span>
                  {sale && <span className="text-text-faint shrink-0">· {SALE_TYPE_LABELS[sale.saleType] || sale.saleType}</span>}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 bg-status-danger/10 text-status-danger-soft border-status-danger/20">En falla</span>
            </div>

            {/* 2. MOTIVO REPORTADO */}
            <div className="space-y-3">
              <label className={SECTION_LABEL}>Motivo reportado</label>
              <div className="bg-surface-zinc rounded-xl border border-[rgb(var(--fg-rgb))]/5 p-4 flex gap-3">
                <div className="w-[3px] rounded-full bg-status-warning shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-text-secondary leading-relaxed font-medium">{failure.notes || 'Sin descripción detallada.'}</p>
                  <p className="mt-2.5 text-xs text-text-disabled flex items-center gap-1.5">
                    <Clock size={14} className="shrink-0" />
                    Reportada el {formatLongDate(failure.createdAt)}{formatTimeAgo(failure.createdAt) && ` · ${formatTimeAgo(failure.createdAt)}`}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. CUENTA DEL CLIENTE (solo usuario único) */}
            {isUnique && (
              <div className="space-y-3">
                <label className={SECTION_LABEL}>Cuenta del cliente</label>
                <div className="bg-surface-zinc rounded-xl border border-[rgb(var(--fg-rgb))]/5 overflow-hidden">
                  <CopyRow
                    icon={<Mail size={15} />}
                    iconClass="bg-status-info/10 text-status-info-soft"
                    label="Correo"
                    labelClass="text-status-info-soft"
                    value={sale?.invitedEmail || '---'}
                    onCopy={() => handleCopy(sale?.invitedEmail || '', 'Correo')}
                  />
                  <div className={ROW_DIVIDER} />
                  <CopyRow
                    icon={<Lock size={15} />}
                    iconClass="bg-status-info/10 text-status-info-soft"
                    label="Contraseña"
                    labelClass="text-status-info-soft"
                    value={sale?.invitedPassword || '---'}
                    mono
                    onCopy={() => handleCopy(sale?.invitedPassword || '', 'Contraseña')}
                  />
                </div>
              </div>
            )}

            {/* 4. CUENTA MAESTRA */}
            <div className="space-y-3">
              <label className={SECTION_LABEL}>Cuenta maestra</label>
              <div className="bg-surface-zinc rounded-xl border border-[rgb(var(--fg-rgb))]/5 overflow-hidden">
                <CopyRow
                  icon={<Mail size={15} />}
                  label="Correo"
                  value={account?.email || '---'}
                  onCopy={() => handleCopy(account?.email || '', 'Correo')}
                />
                <div className={ROW_DIVIDER} />
                <CopyRow
                  icon={<Lock size={15} />}
                  label="Contraseña"
                  value={account?.password || '---'}
                  mono
                  onCopy={() => handleCopy(account?.password || '', 'Contraseña')}
                />
              </div>
            </div>
          </div>

          {/* 5. ACCIONES (quedan pegadas abajo al hacer scroll) */}
          <div className="sticky bottom-0 z-10 -mx-3 lg:-mx-6 px-3 lg:px-6 mt-5 py-3 bg-surface-1 border-t border-[rgb(var(--fg-rgb))]/5 flex flex-col gap-2.5">
            <button
              onClick={() => onSolve(failure, true)}
              className="btn-primary w-full h-[52px] rounded-md text-sm flex items-center justify-center gap-2"
            >
              <WhatsAppIcon size={19} /> Resolver y notificar
            </button>
            <div className="flex gap-2.5">
              <button
                onClick={() => onNotify(failure)}
                className="flex-1 h-[52px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-4 text-text-secondary hover:text-text-primary rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Megaphone size={18} className="text-status-warning-soft" /> Avisar falla
              </button>
              <button
                onClick={() => onSolve(failure, false)}
                className="flex-1 h-[52px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-4 text-text-secondary hover:text-text-primary rounded-md font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <CheckCircle2 size={18} className="text-status-success-soft" /> Solo resolver
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default FailureManageModal;
