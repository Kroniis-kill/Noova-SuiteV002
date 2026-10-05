import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, X, Copy, BellRing, Loader2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  /** Línea secundaria opcional, más tenue (ej. el detalle de un error). */
  description?: string;
  /** Acción opcional como texto (ej. "Deshacer"). */
  actionLabel?: string;
  onAction?: () => void;
  /** Duración en ms; se usa para la línea de tiempo al pie. */
  duration?: number;
  onClose: (id: string) => void;
  onClick?: () => void;
}

const STYLES: Record<ToastType, { icon: string; accent: string }> = {
  success: { icon: 'text-status-success', accent: 'bg-status-success' },
  error: { icon: 'text-status-danger', accent: 'bg-status-danger' },
  warning: { icon: 'text-status-warning', accent: 'bg-status-warning' },
  loading: { icon: 'text-brand-primary', accent: 'bg-brand-primary' },
  info: { icon: 'text-brand-primary', accent: 'bg-brand-primary' },
};

/**
 * Aviso general de la app. Estilo "tarjeta fina": franja de color a la izquierda,
 * icono suelto, mensaje en una línea (más una línea de detalle opcional) y una
 * línea de tiempo muy fina al pie que muestra cuánto falta para que se cierre.
 * Sin títulos en mayúsculas: el icono y el color ya indican el tipo.
 */
const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ id, message, type, description, actionLabel, onAction, duration = 3000, onClose, onClick }, ref) => {
    const style = STYLES[type];
    const isCopy = message.toLowerCase().includes('copia') || message.toLowerCase().includes('copy');

    const isLoading = type === 'loading';
    const Icon = isCopy
      ? Copy
      : type === 'success' ? CheckCircle2
      : type === 'error' ? XCircle
      : type === 'warning' ? AlertTriangle
      : isLoading ? Loader2
      : BellRing;
    const iconClass = isCopy ? 'text-brand-primary' : style.icon;

    const handleClick = () => {
      if (onClick) {
        onClick();
        onClose(id);
      }
    };

    return (
      <motion.div
        ref={ref}
        layout
        initial={{ opacity: 0, y: -14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.2 } }}
        transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
        onClick={handleClick}
        role={type === 'error' || type === 'warning' ? 'alert' : 'status'}
        className={`
          pointer-events-auto relative overflow-hidden w-full max-w-[350px]
          flex items-center gap-3 pl-[18px] pr-3 py-3
          bg-surface-3/95 backdrop-blur-xl
          border border-[rgb(var(--fg-rgb))]/[0.08]
          rounded-xl shadow-elev-md
          
          ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}
        `}
      >
        {/* Franja de color */}
        <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${style.accent}`} />

        <Icon size={20} className={`${iconClass} shrink-0 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />

        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-body-sm font-semibold text-text-primary leading-tight">{message}</span>
          {description && (
            <span className="text-label text-text-muted leading-snug mt-0.5">{description}</span>
          )}
        </div>

        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAction(); onClose(id); }}
            className="text-label font-semibold text-brand-primary-hi hover:brightness-110 px-1 shrink-0"
          >
            {actionLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose(id); }}
            aria-label="Cerrar aviso"
            className="w-7 h-7 -mr-1 flex items-center justify-center rounded-full text-text-faint hover:text-text-primary hover:bg-[rgb(var(--fg-rgb))]/5 transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        )}

        {/* Línea de tiempo (no aplica a avisos "cargando", que no se cierran solos) */}
        {duration > 0 && Number.isFinite(duration) && (
        <motion.span
          className={`absolute left-0 bottom-0 h-[2px] ${style.accent} opacity-55`}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
        />
        )}
      </motion.div>
    );
  }
);

Toast.displayName = 'Toast';

export default Toast;
