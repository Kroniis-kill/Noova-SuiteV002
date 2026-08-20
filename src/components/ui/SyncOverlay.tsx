import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, AlertCircle, UploadCloud } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { dbLocal } from '../../db/LocalDatabase';
import { useAuth } from '../../context/AuthContext';
import { useOfflineSync } from '../../hooks/useOfflineSync';

const SyncOverlay: React.FC = () => {
  const { isSyncing, syncError, setSyncError } = useUIStore();
  const { user } = useAuth();
  const { processSyncQueue, isOnline } = useOfflineSync(user?.id);
  const pendingCount = useLiveQuery(() => dbLocal.syncQueue.count(), [], 0) || 0;

  const showPending = pendingCount > 0 && !isSyncing && !syncError;
  if (!isSyncing && !syncError && !showPending) return null;

  const state: 'error' | 'syncing' | 'pending' = syncError ? 'error' : isSyncing ? 'syncing' : 'pending';

  const containerByState: Record<typeof state, string> = {
    error:   'bg-status-danger/10 border-status-danger/25 text-status-danger',
    syncing: 'bg-surface-2/90 border-border-subtle text-brand-lime',
    pending: 'bg-surface-2/90 border-border-subtle text-text-primary',
  };

  return (
    <AnimatePresence>
      <motion.div
        key={state}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 20, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          zIndex: 'var(--z-sync-overlay)',
          paddingTop: 'env(safe-area-inset-top)',
        }}
        className="fixed top-0 left-1/2 -translate-x-1/2 pointer-events-auto"
        role="status"
        aria-live="polite"
      >
        <div
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border backdrop-blur-md shadow-elev-lg ${containerByState[state]}`}
        >
          {state === 'error' && (
            <>
              <AlertCircle size={16} aria-hidden="true" />
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold tracking-premium">Error de sincronización</span>
                <span className="text-[9px] opacity-70 truncate max-w-[180px]">{syncError}</span>
              </div>
              <button
                type="button"
                onClick={() => { setSyncError(null); processSyncQueue(); }}
                className="ml-2 px-2.5 py-1 rounded-sm bg-status-danger/20 hover:bg-status-danger/30 transition-colors duration-150 ease-out-soft text-[10px] font-semibold uppercase tracking-eyebrow focus-visible:ring-2 focus-visible:ring-status-danger/50 outline-none"
              >
                Reintentar
              </button>
            </>
          )}

          {state === 'syncing' && (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                aria-hidden="true"
              >
                <RefreshCw size={16} />
              </motion.div>
              <span className="text-[12px] font-bold tracking-premium uppercase">Sincronizando…</span>
            </>
          )}

          {state === 'pending' && (
            <>
              <UploadCloud size={16} className="text-brand-primary" aria-hidden="true" />
              <span className="text-[11px] font-semibold tracking-premium uppercase">
                {pendingCount} {pendingCount === 1 ? 'cambio pendiente' : 'cambios pendientes'}
              </span>
              <button
                type="button"
                onClick={() => processSyncQueue()}
                disabled={!isOnline}
                aria-label="Subir cambios ahora"
                className="ml-1 px-2.5 py-1 rounded-sm bg-brand-primary hover:bg-brand-primary-hi disabled:opacity-40 transition-colors duration-150 ease-out-soft text-[10px] font-semibold uppercase tracking-eyebrow text-white focus-visible:ring-2 focus-visible:ring-brand-primary/60 outline-none"
              >
                Subir
              </button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SyncOverlay;
