import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast, { ToastType } from '../components/ui/Toast';
import { useSaveStatus } from '../store/saveStatusStore';

interface ToastOptions {
  /** ms visibles. Los avisos "loading" no se cierran solos (usar dismissToast / updateToast). */
  duration?: number;
  onClick?: () => void;
  /** Línea secundaria más tenue. */
  description?: string;
  /** Acción como texto, ej. "Deshacer". */
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  onClick?: () => void;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextType {
  /** Muestra un aviso y devuelve su id. Un aviso idéntico ya visible se reemplaza (sin duplicados). */
  showToast: (message: string, type?: ToastType, options?: ToastOptions) => string;
  /** Cierra un aviso (útil para el estado "loading"). */
  dismissToast: (id: string) => void;
  /** Convierte un aviso existente (p. ej. "loading") en su resultado final. */
  updateToast: (id: string, message: string, type: ToastType, options?: ToastOptions) => void;
  /** Aviso con acción "Deshacer" (6 s por defecto). */
  showUndo: (message: string, onUndo: () => void, options?: Omit<ToastOptions, 'actionLabel' | 'onAction'>) => string;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DEFAULT_DURATION = 3000;
const ACTION_DURATION = 6000;
const MAX_VISIBLE = 3;

function resolveDuration(type: ToastType, options?: ToastOptions): number {
  if (options?.duration !== undefined) return options.duration;
  if (type === 'loading') return 0; // 0 = permanece hasta que se cierre o actualice
  return options?.actionLabel ? ACTION_DURATION : DEFAULT_DURATION;
}

// Puente imperativo: permite mostrar un toast desde código que vive fuera
// del árbol de React (como el manejador global de errores de react-query
// en queryClient.ts). No reemplaza al hook useToast() — sigue siendo la
// forma normal de usar toasts dentro de componentes.
let toastBridge: ToastContextType['showToast'] | null = null;
export const showGlobalToast = (...args: Parameters<ToastContextType['showToast']>): string | undefined =>
  toastBridge?.(...args);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timers = useRef<Map<string, number>>(new Map());
  // Si la cápsula de sincronización está visible arriba, los avisos se colocan debajo para no taparla.
  const pillVisible = useSaveStatus((s) => s.pillVisible);

  const clearTimer = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t !== undefined) {
      window.clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    clearTimer(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, [clearTimer]);

  const schedule = useCallback((id: string, duration: number) => {
    clearTimer(id);
    if (duration > 0 && Number.isFinite(duration)) {
      timers.current.set(id, window.setTimeout(() => removeToast(id), duration));
    }
  }, [clearTimer, removeToast]);

  const showToast = useCallback<ToastContextType['showToast']>((message, type = 'info', options) => {
    const id = Date.now().toString() + Math.random().toString();
    const duration = resolveDuration(type, options);
    const next: ToastMessage = {
      id, message, type, duration,
      onClick: options?.onClick,
      description: options?.description,
      actionLabel: options?.actionLabel,
      onAction: options?.onAction,
    };

    setToasts((prev) => {
      // Sin duplicados: un aviso igual (mismo texto, tipo y detalle) se reemplaza por el nuevo.
      const duplicates = prev.filter(
        (t) => t.message === message && t.type === type && t.description === options?.description,
      );
      duplicates.forEach((t) => clearTimer(t.id));
      const rest = prev.filter((t) => !duplicates.includes(t));
      const kept = rest.slice(-(MAX_VISIBLE - 1));
      rest.filter((t) => !kept.includes(t)).forEach((t) => clearTimer(t.id));
      return [...kept, next];
    });

    schedule(id, duration);
    return id;
  }, [clearTimer, schedule]);

  const updateToast = useCallback<ToastContextType['updateToast']>((id, message, type, options) => {
    const duration = resolveDuration(type, options);
    setToasts((prev) => prev.map((t) => (t.id === id
      ? {
          ...t, message, type, duration,
          onClick: options?.onClick,
          description: options?.description,
          actionLabel: options?.actionLabel,
          onAction: options?.onAction,
        }
      : t)));
    schedule(id, duration);
  }, [schedule]);

  const showUndo = useCallback<ToastContextType['showUndo']>((message, onUndo, options) => (
    showToast(message, 'success', { ...options, actionLabel: 'Deshacer', onAction: onUndo })
  ), [showToast]);

  // Mantiene el puente apuntando siempre a la instancia viva más reciente.
  useEffect(() => {
    toastBridge = showToast;
    return () => { if (toastBridge === showToast) toastBridge = null; };
  }, [showToast]);

  // Limpia temporizadores pendientes al desmontar.
  useEffect(() => {
    const map = timers.current;
    return () => { map.forEach((t) => window.clearTimeout(t)); map.clear(); };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast: removeToast, updateToast, showUndo }}>
      {children}

      {/* Contenedor superior; z-toast queda por encima de modales y hojas, y por debajo de las alertas. */}
      <div className={`fixed top-0 left-0 right-0 z-toast flex flex-col items-center pointer-events-none px-4 pt-safe space-y-2 transition-[margin] duration-200 ${pillVisible ? 'mt-[60px]' : 'mt-4'}`}>
        <AnimatePresence mode='popLayout'>
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              id={toast.id}
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
              description={toast.description}
              actionLabel={toast.actionLabel}
              onAction={toast.onAction}
              onClick={toast.onClick}
              onClose={removeToast}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
