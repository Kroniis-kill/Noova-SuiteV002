import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, CloudOff, AlertCircle, Check, RefreshCw, Loader2 } from 'lucide-react';
import { useSyncState } from '../../hooks/useSyncState';
import { useSaveStatus } from '../../store/saveStatusStore';
import { useHaptic } from '../../hooks/useHaptic';

const ENTITY_LABEL: Record<string, string> = {
  SALE: 'Venta', CLIENT: 'Cliente', INVENTORY: 'Inventario', ACCOUNT: 'Cuenta', FINANCE: 'Billetera',
  SERVICE: 'Servicio', EXPENSE: 'Gasto', SUPPLY: 'Suministro', PROVIDER: 'Proveedor', RESELLER: 'Revendedor',
  PAYABLE: 'Pago pendiente', CATEGORY: 'Categoría', MOVEMENT: 'Movimiento', SETTINGS: 'Ajustes',
};
const ACTION_LABEL: Record<string, string> = { CREATE: 'Nuevo', UPDATE: 'Edición', DELETE: 'Eliminación' };

const MAX_ITEMS = 4;

type View = 'saving' | 'saved' | 'synced' | 'pending' | 'sync' | 'offline' | 'error';

/**
 * Icono de estado de guardado y sincronización, junto a la campana (dashboard y
 * encabezado de todas las pantallas). Solo se ve cuando hay algo que decir:
 *   guardando  →  guardado (check)  →  desaparece
 *   sin red / pendientes / error     →  se queda hasta resolverse
 * Al tocarlo abre un panel con el detalle y la acción (Subir ahora / Reintentar).
 */
const SyncIconButton: React.FC = () => {
  const { state, pendingCount, pendingItems, processSyncQueue, syncError, clearError } = useSyncState();
  const saving = useSaveStatus((s) => s.saving);
  const toast = useSaveStatus((s) => s.toast);
  const dismissToast = useSaveStatus((s) => s.dismiss);
  const haptic = useHaptic();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Qué mostrar, por prioridad: lo que necesita atención primero, lo momentáneo después.
  let view: View | null = null;
  if (state === 'error' || toast?.kind === 'error') view = 'error';
  else if (state === 'offline') view = 'offline';
  else if (saving > 0) view = 'saving';
  else if (state === 'sync') view = 'sync';
  else if (state === 'pending') view = 'pending';
  else if (toast?.kind === 'saved') view = 'saved';
  else if (toast?.kind === 'synced') view = 'synced';

  // Cerrar el panel al tocar fuera, con Escape, o cuando el icono desaparece.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => { if (!view && open) setOpen(false); }, [view, open]);

  if (!view) return null;

  const isDone = view === 'saved' || view === 'synced';
  const iconColor =
    view === 'pending' || view === 'offline' ? 'text-status-warning-soft'
    : view === 'error' ? 'text-status-danger-soft'
    : isDone ? 'text-status-success-soft'
    : 'text-brand-primary';

  const Icon =
    view === 'saving' ? Loader2
    : view === 'sync' ? RefreshCw
    : view === 'offline' ? CloudOff
    : view === 'error' ? AlertCircle
    : isDone ? Check
    : UploadCloud;
  const spinning = view === 'saving' || view === 'sync';

  const errorText = syncError || toast?.message || 'No se pudo guardar el cambio';

  const title =
    view === 'saving' ? 'Guardando'
    : view === 'saved' ? 'Guardado'
    : view === 'synced' ? 'Sincronizado'
    : view === 'pending' ? `${pendingCount} ${pendingCount === 1 ? 'cambio por subir' : 'cambios por subir'}`
    : view === 'sync' ? 'Subiendo cambios'
    : view === 'offline' ? 'Sin conexión'
    : 'No se guardó';

  const subtitle =
    view === 'saving' ? 'Subiendo el cambio'
    : view === 'saved' ? 'Cambio confirmado en la nube'
    : view === 'synced' ? (toast?.count ? `${toast.count} ${toast.count === 1 ? 'cambio subido' : 'cambios subidos'}` : 'Tus datos están al día')
    : view === 'pending' ? 'Guardados en este dispositivo'
    : view === 'sync' ? `${pendingCount} ${pendingCount === 1 ? 'restante' : 'restantes'}`
    : view === 'offline' ? (pendingCount > 0 ? 'Se subirán al recuperar la conexión' : 'Tus cambios se guardan en el dispositivo')
    : errorText;

  // "Reintentar" solo tiene sentido si el fallo es de la cola de sincronización.
  const canAct = view === 'pending' || (view === 'error' && state === 'error');
  const handleAction = () => {
    haptic('nav');
    if (view === 'error') { clearError(); dismissToast(); }
    processSyncQueue();
  };

  const showList = (view === 'pending' || view === 'sync' || view === 'offline') && pendingItems.length > 0;
  const shown = pendingItems.slice(0, MAX_ITEMS);
  const extra = pendingItems.length - shown.length;

  return (
    <div ref={wrapRef} className="relative">
      <motion.button
        key={view}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 500, damping: 26 }}
        onClick={() => { haptic('nav'); setOpen(o => !o); }}
        aria-label={`Estado de guardado: ${title}`}
        className="relative w-8 h-8 rounded-full bg-[rgb(var(--fg-rgb))]/[0.06] border border-border-subtle flex items-center justify-center transition-colors hover:bg-[rgb(var(--fg-rgb))]/10"
      >
        <Icon size={16} className={`${iconColor} ${spinning ? 'animate-spin' : ''}`} strokeWidth={2.2} />

        {view === 'pending' && pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-status-warning text-black text-micro font-extrabold leading-none flex items-center justify-center border-2 border-bg">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
        {(view === 'error' || view === 'offline') && (
          <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-bg ${view === 'error' ? 'bg-status-danger' : 'bg-status-warning'}`} />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 top-[calc(100%+8px)] z-dropdown w-[272px] origin-top-right rounded-xl bg-surface-3 border border-border-subtle shadow-modal p-4"
          >
            <div className="flex items-center gap-3">
              <Icon size={18} className={`${iconColor} shrink-0 ${spinning ? 'animate-spin' : ''}`} />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-text-primary leading-tight">{title}</p>
                <p className="text-caption text-text-muted leading-snug">{subtitle}</p>
              </div>
            </div>

            {showList && (
              <div className="mt-3 pt-2 border-t border-border-subtle">
                {shown.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 py-1.5 text-label">
                    <span className="text-text-secondary truncate">
                      {ENTITY_LABEL[item.entity] || item.entity}
                      <span className="text-text-disabled"> · {ACTION_LABEL[item.action] || item.action}</span>
                    </span>
                    <span className="text-tiny text-text-disabled font-mono shrink-0">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
                {extra > 0 && <p className="text-caption text-text-disabled pt-1">y {extra} más…</p>}
              </div>
            )}

            {canAct && (
              <button
                onClick={handleAction}
                className="mt-3 w-full h-10 rounded-md bg-brand-primary hover:bg-brand-primary-hi text-white text-body-sm font-semibold active:scale-[0.98] transition"
              >
                {view === 'error' ? 'Reintentar' : 'Subir ahora'}
              </button>
            )}
            {view === 'sync' && (
              <p className="mt-3 text-caption text-text-muted text-center">No cierres la app mientras sube.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SyncIconButton;
