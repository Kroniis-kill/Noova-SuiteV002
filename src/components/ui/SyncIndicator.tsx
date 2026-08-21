import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CloudOff, AlertCircle, UploadCloud, X } from 'lucide-react';
import { useIsMutating, useIsFetching } from '@tanstack/react-query';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useUIStore } from '../../store/uiStore';

type Status = 'idle' | 'syncing' | 'saved' | 'offline' | 'pending' | 'error';

/**
 * Indicador minimalista premium tipo "Dynamic Island".
 * Píldora pequeña centrada en la parte superior.
 */
const SyncIndicator: React.FC = () => {
  const isMutating = useIsMutating();
  const isFetching = useIsFetching();
  const { isOnline, isSyncing, pendingCount, processSyncQueue } = useOfflineSync();
  const { syncError, setSyncError } = useUIStore();

  const [status, setStatus] = useState<Status>('idle');
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasBusyRef = useRef(false);

  const busy = isMutating > 0 || isSyncing || isFetching > 0;

  useEffect(() => {
    if (syncError) { setStatus('error'); wasBusyRef.current = false; return; }
    if (!isOnline) { setStatus('offline'); wasBusyRef.current = false; return; }
    if (busy) {
      if (savedTimerRef.current) { clearTimeout(savedTimerRef.current); savedTimerRef.current = null; }
      setStatus('syncing');
      wasBusyRef.current = true;
      return;
    }
    if (pendingCount > 0) { setStatus('pending'); return; }
    if (wasBusyRef.current) {
      wasBusyRef.current = false;
      setStatus('saved');
      savedTimerRef.current = setTimeout(() => { setStatus('idle'); savedTimerRef.current = null; }, 1400);
      return;
    }
    setStatus('idle');
  }, [busy, isOnline, pendingCount, syncError]);

  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); }, []);

  if (status === 'idle') return null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 -translate-x-1/2 flex justify-center"
      style={{
        top: 'calc(env(safe-area-inset-top) + 8px)',
        zIndex: 'var(--z-sync-overlay, 10050)' as any,
      }}
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, y: -8, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          className="pointer-events-auto relative flex items-center gap-1.5 pl-2 pr-2.5 py-[5px] rounded-full border border-[rgb(var(--fg-rgb))]/[0.08] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl"
          style={{
            background: 'linear-gradient(180deg, rgba(22,22,26,0.92) 0%, rgba(10,10,12,0.92) 100%)',
          }}
        >
          {status === 'syncing' && (
            <>
              <span className="relative flex items-center justify-center w-3 h-3">
                <span className="absolute inset-0 rounded-full border-[1.5px] border-[rgb(var(--fg-rgb))]/10" />
                <span className="absolute inset-0 rounded-full border-[1.5px] border-transparent border-t-brand-lime animate-spin" />
              </span>
              <span className="text-[10px] font-semibold tracking-[0.02em] text-text-primary/95">Guardando</span>
            </>
          )}

          {status === 'saved' && (
            <>
              <span className="w-3 h-3 rounded-full bg-status-success/25 flex items-center justify-center ring-1 ring-status-success/40">
                <Check size={8} className="text-status-success" strokeWidth={4} />
              </span>
              <span className="text-[10px] font-semibold tracking-[0.02em] text-text-primary/95">Guardado</span>
            </>
          )}

          {status === 'offline' && (
            <>
              <CloudOff size={10} className="text-status-warning" />
              <span className="text-[10px] font-semibold tracking-[0.02em] text-text-primary/95">
                Sin conexión{pendingCount > 0 ? ` · ${pendingCount}` : ''}
              </span>
            </>
          )}

          {status === 'pending' && (
            <>
              <UploadCloud size={10} className="text-brand-primary" />
              <span className="text-[10px] font-semibold tracking-[0.02em] text-text-primary/95">
                {pendingCount} pendiente{pendingCount === 1 ? '' : 's'}
              </span>
              {isOnline && (
                <button
                  type="button"
                  onClick={() => processSyncQueue()}
                  className="ml-0.5 px-1.5 py-[2px] rounded-full bg-brand-primary text-white text-[9px] font-bold tracking-wide hover:brightness-110 transition"
                >
                  Subir
                </button>
              )}
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle size={10} className="text-status-danger" />
              <span className="text-[10px] font-semibold tracking-[0.02em] text-text-primary/95 max-w-[140px] truncate">
                Error al sincronizar
              </span>
              <button
                type="button"
                onClick={() => { setSyncError(null); processSyncQueue(); }}
                className="px-1.5 py-[2px] rounded-full bg-status-danger/20 hover:bg-status-danger/30 text-status-danger text-[9px] font-bold tracking-wide transition"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={() => setSyncError(null)}
                aria-label="Cerrar"
                className="ml-0.5 w-3.5 h-3.5 rounded-full hover:bg-[rgb(var(--fg-rgb))]/10 text-text-primary/50 flex items-center justify-center transition"
              >
                <X size={8} />
              </button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SyncIndicator;
