
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineSync } from '../../hooks/useOfflineSync';

const OfflineIndicator: React.FC = () => {
  const { isOnline, isSyncing } = useOfflineSync();

  if (isOnline && !isSyncing) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: -20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: -20 }}
        transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
        className="fixed top-[calc(env(safe-area-inset-top,16px)+12px)] right-16 z-[99999] flex items-center shadow-2xl"
      >
        {isSyncing ? (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 rounded-full">
            <RefreshCw size={15} className="text-brand-primary animate-spin" />
            <span className="text-xs font-bold text-text-primary">Sincronizando...</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-surface-zinc border border-[rgb(var(--fg-rgb))]/5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
            <WifiOff size={16} strokeWidth={2.5} className="text-status-warning" />
            <span className="text-[13px] font-bold text-text-primary tracking-wide">Sin Conexión</span>
            <div className="w-1.5 h-1.5 rounded-full bg-status-warning ml-1 shadow-[0_0_8px_rgba(245,166,35,0.8)]" />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default OfflineIndicator;
