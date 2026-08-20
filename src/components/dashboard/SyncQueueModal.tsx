import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, AlertTriangle, ArrowRight, Activity, Clock } from 'lucide-react';
import { SyncItem } from '../../db/LocalDatabase';

interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingItems: SyncItem[];
  isOnline: boolean;
}

const SyncQueueModal: React.FC<SyncQueueModalProps> = ({ isOpen, onClose, pendingItems, isOnline }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
           <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-surface-1 w-full max-w-sm rounded-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
           >
              <div className="p-5 flex justify-between items-center border-b border-white/5 bg-surface-zinc">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-status-warning/10 flex items-center justify-center">
                       <UploadCloud size={20} className="text-status-warning" />
                    </div>
                    <div>
                       <h2 className="text-sm font-bold text-white">Datos Pendientes</h2>
                       <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest leading-none mt-1">Sincronización Local</p>
                    </div>
                 </div>
                 <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                    <X size={16} />
                 </button>
              </div>

              <div className="p-5 bg-status-warning/5 border-b border-status-warning/10">
                 <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                    Tienes <span className="font-bold text-status-warning">{pendingItems.length} cambios</span> locales. 
                    No te preocupes, están seguros. Se subirán automáticamente a la base de datos tan pronto detectemos una conexión a internet estable.
                 </p>
                 {!isOnline && (
                    <div className="mt-3 flex items-center gap-2 text-status-danger-soft bg-status-danger-soft/10 p-2.5 rounded-sm border border-status-danger-soft/20">
                       <AlertTriangle size={14} />
                       <span className="text-[10px] font-semibold uppercase tracking-widest">Actualmente sin conexión</span>
                    </div>
                 )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                 {pendingItems.map((item) => (
                    <div key={item.id} className="p-3 bg-black/40 border border-white/5 rounded-md flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400">
                             <Activity size={14} />
                          </div>
                          <div>
                             <p className="text-[11px] font-bold text-white uppercase">{item.entity}</p>
                             <p className="text-[9px] text-status-warning font-semibold uppercase tracking-widest mt-0.5">{item.action}</p>
                          </div>
                       </div>
                       <div className="flex flex-col items-end gap-1">
                          <Clock size={12} className="text-zinc-500" />
                          <span className="text-[9px] text-zinc-500 font-mono">
                             {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                       </div>
                    </div>
                 ))}
                 {pendingItems.length === 0 && (
                    <div className="text-center py-8">
                       <UploadCloud size={24} className="mx-auto text-status-success mb-3" />
                       <p className="text-xs font-semibold text-zinc-500">Todo está sincronizado</p>
                    </div>
                 )}
              </div>

              <div className="p-4 bg-surface-zinc border-t border-white/5">
                 <button onClick={onClose} className="w-full bg-white/10 hover:bg-white/15 text-white font-semibold text-xs py-3 rounded-md transition-colors">
                    Entendido
                 </button>
              </div>
           </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SyncQueueModal;
