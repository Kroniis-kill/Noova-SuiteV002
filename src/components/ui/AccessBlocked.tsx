
import React from 'react';
import { motion } from 'framer-motion';
import { Lock, MessageCircle, AlertTriangle } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAuth } from '../../context/AuthContext';
import AnimatedLogo from './AnimatedLogo';

const AccessBlocked: React.FC = () => {
  const { supportNumber } = useSubscription();
  const { logout } = useAuth();

  const handleSupport = () => {
    const msg = "Hola, mi periodo de prueba/suscripción en Noova Suite ha finalizado. Deseo activar mi plan.";
    window.open(`https://wa.me/${supportNumber || '573000000000'}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-bg flex flex-col items-center justify-center p-6 text-center font-sans overflow-hidden">
        
        {/* Background Effects */}
        <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div 
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.5, type: 'spring' }}
           className="relative z-10 max-w-md w-full bg-surface-1/80 backdrop-blur-xl border border-[rgb(var(--fg-rgb))]/10 rounded-2xl p-8 shadow-2xl flex flex-col items-center"
        >
            <div className="mb-6 relative">
                 <div className="absolute inset-0 bg-status-danger/20 blur-[40px] rounded-full" />
                 <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-surface-3 to-black border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center shadow-2xl relative z-10">
                     <Lock size={40} className="text-status-danger" />
                 </div>
                 <div className="absolute -top-2 -right-2 w-10 h-10 bg-status-danger rounded-full flex items-center justify-center border-4 border-surface-1 z-20">
                     <AlertTriangle size={18} className="text-text-primary" />
                 </div>
            </div>

            <h1 className="text-2xl font-bold text-text-primary mb-2">Acceso Expirado</h1>
            <p className="text-text-muted text-sm leading-relaxed mb-8">
               Tu periodo de prueba de 3 días o tu suscripción ha finalizado. Para continuar gestionando tu negocio sin interrupciones, activa un plan PRO.
            </p>

            <div className="w-full space-y-3">
                <button 
                  onClick={handleSupport}
                  className="w-full h-[56px] rounded-lg bg-gradient-to-r from-status-danger to-status-expiring text-white font-bold text-sm shadow-[0_0_30px_-10px_rgba(239,68,68,0.5)] flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all"
                >
                    <MessageCircle size={18} /> Solicitar Activación
                </button>
                
                <button 
                  onClick={logout}
                  className="w-full h-[48px] rounded-lg bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/5 text-text-muted font-semibold text-xs hover:text-text-primary hover:bg-[rgb(var(--fg-rgb))]/10 transition-all"
                >
                    Cerrar Sesión
                </button>
            </div>

            <div className="mt-8 flex items-center gap-2 opacity-50">
               <AnimatedLogo size={24} showFill={false} />
               <span className="text-[10px] font-semibold text-text-disabled tracking-widest uppercase">Noova Suite</span>
            </div>
        </motion.div>
    </div>
  );
};

export default AccessBlocked;
