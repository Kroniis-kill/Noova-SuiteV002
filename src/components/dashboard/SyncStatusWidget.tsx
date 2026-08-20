
import React, { useState, useEffect } from 'react';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { dbLocal } from '../../db/LocalDatabase';
import { RefreshCw, Wifi, WifiOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const SyncStatusWidget: React.FC = () => {
  const { user } = useAuth();
  const { isOnline, isSyncing, processSyncQueue } = useOfflineSync(user?.id);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateCount = async () => {
      const count = await dbLocal.syncQueue.count();
      setPendingCount(count);
    };

    updateCount();
    // Update every 5 seconds or when sync state changes
    const interval = setInterval(updateCount, 5000);
    return () => clearInterval(interval);
  }, [isSyncing]);

  if (pendingCount === 0 && isOnline) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`mb-6 p-5 rounded-xl border flex items-center justify-between shadow-2xl transition-all duration-500 overflow-hidden relative group overflow-hidden ${
        !isOnline 
          ? 'bg-status-danger/10 border-status-danger/20 text-status-danger-soft' 
          : 'bg-surface-1/80 backdrop-blur-xl border-white/[0.08] text-zinc-100 shadow-glow-sm'
      }`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand-primary/10 to-transparent blur-3xl rounded-full" />
      
      <div className="flex items-center gap-4 relative z-10">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
          !isOnline ? 'bg-status-danger/20 text-status-danger-soft shadow-lg' : 'bg-brand-primary/10 text-brand-primary shadow-inner'
        }`}>
          {!isOnline ? <WifiOff size={22} /> : <Wifi size={22} className={isSyncing ? 'animate-pulse' : ''} />}
        </div>
        <div className="space-y-0.5">
          <h4 className="text-[14px] font-black tracking-tight uppercase">
            {!isOnline ? 'Modo Sin Conexión' : 'Sync en curso'}
          </h4>
          <p className="text-[11px] opacity-60 font-bold tracking-tight">
            {pendingCount > 0 
              ? `${pendingCount} cambios por subir` 
              : 'Protección de datos activa'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 relative z-10">
        {pendingCount > 0 && isOnline && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => processSyncQueue()}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary hover:bg-brand-primary-hi text-white rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all shadow-glow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Subiendo' : 'Subir Ahora'}
          </motion.button>
        )}
        {!isOnline && (
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider bg-status-danger/20 border border-status-danger/20 px-3 py-1.5 rounded-full">
            <AlertCircle size={12} strokeWidth={3} />
            Offline
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SyncStatusWidget;
