
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ChevronRight, Crown } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useUIStore } from '../../store/uiStore';

const SubscriptionAlert: React.FC = () => {
  const { accessStatus, daysRemaining } = useSubscription();
  const { setView } = useUIStore();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible || (accessStatus !== 'warning_trial' && accessStatus !== 'warning_plan')) {
      return null;
  }

  const isTrial = accessStatus === 'warning_trial';
  
  const title = isTrial ? 'Periodo de Prueba' : 'Renovación Pendiente';
  const message = isTrial 
      ? `Te quedan ${daysRemaining} días de prueba gratuita.` 
      : `Tu plan vence en ${daysRemaining} días. Evita el bloqueo.`;
  
  const gradient = isTrial 
      ? 'from-status-warning/10 to-status-expiring/10 border-status-warning/20' 
      : 'from-status-danger/10 to-pink-500/10 border-status-danger/20';
      
  const iconColor = isTrial ? 'text-status-warning-soft' : 'text-status-danger-soft';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={`relative w-full rounded-md bg-gradient-to-r ${gradient} border backdrop-blur-md p-4 mb-6 flex items-start justify-between gap-4 overflow-hidden`}
      >
        <div className="flex items-start gap-3">
           <div className={`mt-0.5 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center shrink-0 ${iconColor}`}>
              {isTrial ? <Crown size={16} /> : <AlertTriangle size={16} />}
           </div>
           <div>
              <h4 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${iconColor}`}>
                  {title}
              </h4>
              <p className="text-zinc-200 text-xs font-medium leading-snug">
                  {message}
              </p>
              
              <button 
                onClick={() => setView('my_plan')}
                className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-white bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors w-fit"
              >
                 Ver Membresía <ChevronRight size={10} />
              </button>
           </div>
        </div>

        <button 
          onClick={() => setIsVisible(false)} 
          className="p-1.5 rounded-full bg-black/10 hover:bg-black/20 text-zinc-400 hover:text-white transition-colors"
        >
           <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default SubscriptionAlert;
