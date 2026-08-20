
import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, ArrowRight, X, Trophy, Layers, UserPlus, ShoppingCart, MonitorPlay, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { ViewState } from '../../types';
import { useUIStore } from '../../store/uiStore';

const OnboardingWidget: React.FC<{ onNavigate?: (view: ViewState) => void }> = ({ onNavigate }) => {
  const { services, accounts, clients, sales, financialAccounts, isLoading } = useData();
  const { user } = useAuth();
  const { setView: setStoreView } = useUIStore();
  const [isVisible, setIsVisible] = useState(true);

  const handleNavigation = (view: ViewState) => {
      sessionStorage.setItem('highlight_add_action', view);
      if (onNavigate) {
          onNavigate(view);
      } else {
          setStoreView(view); 
      }
  };

  useEffect(() => {
    if (user) {
      const dismissed = localStorage.getItem(`noova_onboarding_dismissed_${user.id}`);
      const globalDismissed = localStorage.getItem('noova_onboarding_dismissed');
      
      if (dismissed === 'true') {
        setIsVisible(false);
      } else if (!dismissed && globalDismissed === 'true' && sales.length > 5) {
        localStorage.setItem(`noova_onboarding_dismissed_${user.id}`, 'true');
        setIsVisible(false);
      }
    }
  }, [user, sales.length]);

  if (isLoading || !user) return null;

  const steps = [
    { 
      id: 'service', 
      label: 'Crea tu primer Servicio', 
      sub: 'Define qué vendes (Netflix, etc.)',
      icon: MonitorPlay,
      done: services.length > 0, 
      action: () => handleNavigation('services'),
      cta: 'Ir a Servicios'
    },
    { 
      id: 'account', 
      label: 'Carga una Cuenta', 
      sub: 'Agrega stock a tu inventario',
      icon: Layers,
      done: accounts.length > 0, 
      action: () => handleNavigation('inventory'),
      cta: 'Ir a Inventario'
    },
    { 
      id: 'client', 
      label: 'Registra un Cliente', 
      sub: 'Crea tu primer contacto',
      icon: UserPlus,
      done: clients.length > 0, 
      action: () => handleNavigation('contacts'),
      cta: 'Ir a Clientes'
    },
    {
      id: 'wallet',
      label: 'Agrega una Billetera',
      sub: 'Configura métodos de pago',
      icon: Wallet,
      done: financialAccounts.length > 0,
      action: () => handleNavigation('accounts'),
      cta: 'Ir a Finanzas'
    },
    { 
      id: 'sale', 
      label: 'Realiza tu primera Venta', 
      sub: 'Asigna un servicio',
      icon: ShoppingCart,
      done: sales.length > 0, 
      action: () => handleNavigation('sales'),
      cta: 'Ir a Ventas'
    }
  ];

  const completedCount = steps.filter(s => s.done).length;
  const progress = (completedCount / steps.length) * 100;
  const allDone = completedCount === steps.length;

  if (!isVisible) return null;
  
  if (sales.length > 10 && localStorage.getItem(`noova_onboarding_dismissed_${user.id}`) !== 'true') {
      localStorage.setItem(`noova_onboarding_dismissed_${user.id}`, 'true');
      return null;
  }

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(`noova_onboarding_dismissed_${user.id}`, 'true');
  };

  if (allDone) {
     return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-brand-primary to-brand-accent rounded-lg p-6 text-white relative overflow-hidden shadow-glow mb-6"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-[50px] rounded-full pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm shadow-lg">
                        <Trophy size={24} className="text-yellow-300 drop-shadow-sm" fill="currentColor" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">¡Imperio Iniciado!</h3>
                        <p className="text-white/90 text-xs font-medium">Has completado los pasos esenciales.</p>
                    </div>
                </div>
                <button 
                    onClick={handleDismiss} 
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-md text-xs font-semibold transition-colors backdrop-blur-md"
                >
                    Continuar
                </button>
            </div>
        </motion.div>
     );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-1 border border-white/[0.08] rounded-lg overflow-hidden shadow-sm mb-6 relative"
    >
       <div className="p-5 pb-2">
           <div className="flex justify-between items-start mb-3">
               <div>
                   <h3 className="text-white font-bold text-base flex items-center gap-2">
                       🚀 Comienza tu Imperio
                   </h3>
                   <p className="text-zinc-400 text-xs mt-1">Completa estos pasos para configurar tu negocio.</p>
               </div>
               <div className="flex items-center gap-3">
                   <div className="text-right">
                       <span className="text-xs font-semibold text-brand-primary">{completedCount}/{steps.length}</span>
                   </div>
                   <button onClick={handleDismiss} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                       <X size={16} />
                   </button>
               </div>
           </div>
           
           <div className="w-full h-1.5 bg-surface-sunken rounded-full overflow-hidden">
               <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-brand-primary to-brand-accent"
               />
           </div>
       </div>

       <div className="p-2">
           {steps.map((step, idx) => {
               return (
                   <div 
                     key={step.id} 
                     className={`flex items-center justify-between p-3 rounded-md transition-all ${step.done ? 'opacity-50' : 'hover:bg-white/5'}`}
                   >
                       <div className="flex items-center gap-3.5">
                           <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${step.done ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                               {step.done ? <CheckCircle2 size={14} /> : <span className="text-[10px] font-semibold">{idx + 1}</span>}
                           </div>
                           <div>
                               <p className={`text-sm font-medium ${step.done ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                                   {step.label}
                               </p>
                               {!step.done && <p className="text-[10px] text-zinc-500">{step.sub}</p>}
                           </div>
                       </div>

                       {!step.done && (
                           <button 
                             onClick={step.action}
                             className="bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 border border-brand-primary/20 px-3 py-1.5 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-colors whitespace-nowrap"
                           >
                               {step.cta} <ArrowRight size={10} />
                           </button>
                       )}
                   </div>
               );
           })}
       </div>
    </motion.div>
  );
};

export default OnboardingWidget;
