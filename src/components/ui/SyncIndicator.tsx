import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Cloud, CloudOff, UploadCloud, AlertCircle, X } from 'lucide-react';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useUIStore } from '../../store/uiStore';
import { useSaveStatus } from '../../store/saveStatusStore';

type View =
  | { key: 'saving' }
  | { key: 'saved' }
  | { key: 'synced'; count: number }
  | { key: 'queued'; pending: number }
  | { key: 'offline'; pending: number }
  | { key: 'retrying'; pending: number }
  | { key: 'error'; message: string; canRetry: boolean };

// Mensaje que usa la cola cuando perdió conexión a mitad de la subida (no es un fallo real).
const RETRYING_MESSAGE = 'Reintentando conexión...';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Indicador de estado de guardado (tipo "isla" en la parte superior).
 *
 * Solo muestra lo que realmente pasó:
 *  - Guardando…        hay una mutación en curso
 *  - Guardado          el servidor confirmó el cambio
 *  - En el dispositivo el cambio está guardado localmente y falta subirlo
 *  - Sincronizado      se subieron los cambios pendientes
 *  - No se guardó      algo falló (con el motivo y la opción de reintentar)
 * Las lecturas de datos en segundo plano ya NO disparan "Guardado".
 */
const SyncIndicator: React.FC = () => {
  const { isOnline, pendingCount, processSyncQueue } = useOfflineSync();
  const { syncError, setSyncError } = useUIStore();
  const saving = useSaveStatus((s) => s.saving);
  const toast = useSaveStatus((s) => s.toast);
  const dismiss = useSaveStatus((s) => s.dismiss);

  // En el dashboard, el estado persistente (pendientes / sin conexión) ya lo muestra el
  // icono de sincronización del encabezado. Aquí solo se deja el aviso momentáneo de
  // "Guardado en este dispositivo" unos segundos, para no repetir lo mismo en dos sitios.
  const onDashboard = useUIStore((s) => s.currentView) === 'dashboard';
  const [queuedFlash, setQueuedFlash] = useState(false);
  useEffect(() => {
    if (toast?.kind !== 'queued') { setQueuedFlash(false); return; }
    setQueuedFlash(true);
    const t = setTimeout(() => setQueuedFlash(false), 3000);
    return () => clearTimeout(t);
  }, [toast?.id, toast?.kind]);

  let view: View | null = null;

  if (toast?.kind === 'error') {
    view = { key: 'error', message: toast.message || 'No se pudo guardar el cambio', canRetry: false };
  } else if (syncError && syncError !== RETRYING_MESSAGE) {
    view = { key: 'error', message: syncError, canRetry: true };
  } else if (!isOnline) {
    if (!onDashboard) view = { key: 'offline', pending: pendingCount };
  } else if (saving > 0) {
    view = { key: 'saving' };
  } else if (syncError === RETRYING_MESSAGE && pendingCount > 0) {
    if (!onDashboard) view = { key: 'retrying', pending: pendingCount };
  } else if (pendingCount > 0 || toast?.kind === 'queued') {
    if (!onDashboard || queuedFlash) view = { key: 'queued', pending: pendingCount };
  } else if (toast?.kind === 'synced') {
    view = { key: 'synced', count: toast.count || 0 };
  } else if (toast?.kind === 'saved') {
    view = { key: 'saved' };
  }

  // Avisa a los toasts si la cápsula está visible, para que se acomoden debajo y no se encimen.
  const hasView = !!view;
  useEffect(() => {
    useSaveStatus.getState().setPillVisible(hasView);
    return () => useSaveStatus.getState().setPillVisible(false);
  }, [hasView]);

  const retry = () => { setSyncError(null); dismiss(); processSyncQueue(); };
  const close = () => { setSyncError(null); dismiss(); };

  const bubble = 'w-7 h-7 rounded-full flex items-center justify-center shrink-0';
  const title = 'text-label font-semibold leading-tight text-text-primary';
  const sub = 'text-tiny leading-tight text-text-primary/55';

  return (
    <div
      className="pointer-events-none fixed left-1/2 -translate-x-1/2 flex justify-center w-full px-4"
      style={{
        top: 'calc(env(safe-area-inset-top) + 10px)',
        zIndex: 'var(--z-sync-overlay, 10050)' as any,
      }}
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {view && (
          <motion.div
            key={view.key}
            layout
            initial={{ opacity: 0, y: -14, scale: 0.9, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, scale: 0.92, filter: 'blur(4px)' }}
            transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
            className="pointer-events-auto flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full border border-[rgb(var(--fg-rgb))]/[0.08] backdrop-blur-xl shadow-[0_12px_32px_-14px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.06)] max-w-[92vw]"
            style={{ background: 'linear-gradient(180deg, rgba(24,24,28,0.88) 0%, rgba(12,12,14,0.9) 100%)' }}
          >
            {view.key === 'saving' && (
              <>
                <span className={`${bubble} bg-brand-primary/15`}>
                  <span className="relative w-3.5 h-3.5">
                    <span className="absolute inset-0 rounded-full border-2 border-[rgb(var(--fg-rgb))]/10" />
                    <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-lime animate-spin" />
                  </span>
                </span>
                <span className={title}>Guardando…</span>
              </>
            )}

            {view.key === 'saved' && (
              <>
                <span className={`${bubble} bg-status-success/20 ring-1 ring-status-success/40`}>
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.05 }}>
                    <Check size={14} className="text-status-success" strokeWidth={3.5} />
                  </motion.span>
                </span>
                <div className="flex flex-col">
                  <span className={title}>Guardado</span>
                  <span className={sub}>Cambio confirmado en la nube</span>
                </div>
              </>
            )}

            {view.key === 'synced' && (
              <>
                <span className={`${bubble} bg-status-success/20 ring-1 ring-status-success/40`}>
                  <Cloud size={14} className="text-status-success" />
                </span>
                <div className="flex flex-col">
                  <span className={title}>Todo sincronizado</span>
                  {view.count > 0 && <span className={sub}>{plural(view.count, 'cambio subido', 'cambios subidos')}</span>}
                </div>
              </>
            )}

            {view.key === 'queued' && (
              <>
                <span className={`${bubble} bg-status-warning/15 ring-1 ring-status-warning/30`}>
                  <UploadCloud size={14} className="text-status-warning" />
                </span>
                <div className="flex flex-col">
                  <span className={title}>Guardado en este dispositivo</span>
                  <span className={sub}>
                    {view.pending > 0 ? `${plural(view.pending, 'cambio por subir', 'cambios por subir')} a la nube` : 'Se subirá a la nube en breve'}
                  </span>
                </div>
                {view.pending > 0 && (
                  <button type="button" onClick={() => processSyncQueue()} className="ml-1 px-2.5 py-1 rounded-full bg-brand-primary text-white text-tiny font-bold hover:brightness-110 active:scale-95 transition">
                    Subir
                  </button>
                )}
              </>
            )}

            {view.key === 'retrying' && (
              <>
                <span className={`${bubble} bg-status-warning/15 ring-1 ring-status-warning/30`}>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-transparent border-t-status-warning animate-spin" />
                </span>
                <div className="flex flex-col">
                  <span className={title}>Reintentando conexión</span>
                  <span className={sub}>{plural(view.pending, 'cambio pendiente', 'cambios pendientes')}</span>
                </div>
              </>
            )}

            {view.key === 'offline' && (
              <>
                <span className={`${bubble} bg-status-warning/15 ring-1 ring-status-warning/30`}>
                  <CloudOff size={14} className="text-status-warning" />
                </span>
                <div className="flex flex-col">
                  <span className={title}>Sin conexión</span>
                  <span className={sub}>
                    {view.pending > 0 ? `${plural(view.pending, 'cambio guardado', 'cambios guardados')} en el dispositivo` : 'Tus cambios se guardarán en el dispositivo'}
                  </span>
                </div>
              </>
            )}

            {view.key === 'error' && (
              <>
                <span className={`${bubble} bg-status-danger/20 ring-1 ring-status-danger/40`}>
                  <AlertCircle size={14} className="text-status-danger" />
                </span>
                <div className="flex flex-col min-w-0">
                  <span className={title}>No se guardó</span>
                  <span className={`${sub} truncate max-w-[200px]`}>{view.message}</span>
                </div>
                {view.canRetry && (
                  <button type="button" onClick={retry} className="ml-1 px-2.5 py-1 rounded-full bg-status-danger/20 hover:bg-status-danger/30 text-status-danger text-tiny font-bold active:scale-95 transition">
                    Reintentar
                  </button>
                )}
                <button type="button" onClick={close} aria-label="Cerrar" className="w-5 h-5 rounded-full hover:bg-[rgb(var(--fg-rgb))]/10 text-text-primary/50 flex items-center justify-center transition shrink-0">
                  <X size={11} />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SyncIndicator;
