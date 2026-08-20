import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useSubscription } from '../../../context/SubscriptionContext';
import { Zap, Crown, Shield, Clock, MessageCircle, Star, CheckCircle2, TrendingUp, AlertTriangle, Users, ChevronRight, HelpCircle, BookOpen, CreditCard, Infinity } from 'lucide-react';
import { PLAN_LABELS, PlanType } from '../../../types/subscriptionTypes';
import { useData } from '../../../context/DataContext';
import { motion } from 'framer-motion';

const MyPlanMobile: React.FC = () => {
  const { user } = useAuth();
  const { supportNumber, subscription, isTrial, daysRemaining, accessStatus } = useSubscription();
  const { clients, sales } = useData();
  
  const currentPlan = subscription?.plan || 'free';
  const isLifetime = currentPlan === 'lifetime';
  const isPro = currentPlan !== 'free';
  const planLabel = isTrial ? 'Prueba Gratuita' : PLAN_LABELS[currentPlan as PlanType];
  const isBlocked = accessStatus === 'blocked';

  const handleSupport = (type: string) => {
      let message = "Hola equipo Noova, ";
      if (type === 'renew') message += "deseo renovar mi membresía de la plataforma.";
      else if (type === 'tech') message += "necesito soporte técnico con la app.";
      else if (type === 'tutorial') message += "quisiera ver tutoriales de uso.";
      
      window.open(`https://wa.me/${supportNumber || '573000000000'}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleUpgrade = () => {
      const message = "Hola, deseo actualizar mi plan en Noova Suite para desbloquear más funciones.";
      window.open(`https://wa.me/${supportNumber || '573000000000'}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
  };

  // Determine card style based on plan
  const getCardGradient = () => {
      if (isBlocked) return 'from-red-900/40 to-black';
      if (isLifetime) return 'from-amber-600/40 to-black'; // Gold for Lifetime
      if (isPro) return 'from-brand-primary/40 to-black'; // Purple for Pro
      return 'from-surface-3 to-black'; // Grey for Trial/Free
  };

  const getPlanTypeLabel = () => {
      switch (currentPlan) {
          case 'free': return 'FREE';
          case 'monthly': return 'MENSUAL';
          case 'quarterly': return 'TRIMESTRAL';
          case 'semiannual': return 'SEMESTRAL';
          case 'annual': return 'ANUAL';
          case 'lifetime': return 'VITALICIO';
          default: return (currentPlan as string).toUpperCase();
      }
  };

  return (
    <div className="px-5 pt-safe mt-6 pb-24 font-sans min-h-screen relative overflow-hidden bg-bg">
       
       {/* Ambient Light */}
       <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-brand-primary/10 via-transparent to-transparent pointer-events-none blur-[100px]" />

       <div className="relative z-10 mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">Mi Membresía</h1>
          <p className="text-zinc-400 text-sm mt-1">Estado de tu cuenta y recursos.</p>
       </div>

       {/* --- STATUS CARD --- */}
       <motion.div 
         initial="hidden" animate="visible" variants={cardVariants}
         className="relative w-full aspect-[2.2] rounded-2xl overflow-hidden shadow-2xl border border-white/10 group mb-6"
       >
          <div className={`absolute inset-0 bg-gradient-to-br ${getCardGradient()}`} />
          
          {/* Shine Effect for Lifetime */}
          {isLifetime && (
             <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-30 animate-pulse" />
          )}
          
          <div className="absolute inset-0 p-5 flex flex-col justify-between z-10">
              <div className="flex justify-between items-start">
                  <div>
                      <div className="flex items-center gap-2 mb-1">
                         {isTrial ? (
                             <Clock size={16} className="text-zinc-400" />
                         ) : isLifetime ? (
                             <Crown size={16} className="text-amber-400" />
                         ) : (
                             <Star size={16} className="text-brand-accent" />
                         )}
                         
                         <span className={`text-[10px] font-semibold uppercase tracking-widest ${isTrial ? 'text-zinc-400' : isLifetime ? 'text-amber-400' : 'text-brand-accent'}`}>
                             {isTrial ? 'MODO TRIAL' : isLifetime ? 'SOCIO VITALICIO' : 'MIEMBRO PRO'}
                         </span>
                      </div>
                      <h2 className="text-2xl font-extrabold text-white tracking-tight">{planLabel}</h2>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border backdrop-blur-md ${isBlocked ? 'bg-red-500/20 border-red-500/30' : 'bg-white/10 border-white/10'}`}>
                      {isBlocked ? <AlertTriangle size={18} className="text-red-500" /> : <Shield size={18} className="text-white" />}
                  </div>
              </div>

              <div>
                  <div className="flex items-end justify-between">
                      <div className="flex flex-col">
                          <span className="text-[11px] text-zinc-300 font-bold mb-0.5 uppercase tracking-wide">
                              {getPlanTypeLabel()}
                          </span>
                          
                          <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${isBlocked ? 'bg-red-500 animate-pulse' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'}`} />
                             <span className="text-xs font-semibold text-zinc-400">
                                 {isBlocked ? 'Bloqueada' : 'Cuenta Activa'}
                             </span>
                          </div>
                      </div>
                      <div className="text-right">
                          <span className="text-[9px] text-zinc-500 uppercase font-semibold block mb-0.5">
                              {isLifetime ? 'Acceso Total' : 'Vencimiento'}
                          </span>
                          
                          {isLifetime ? (
                              <div className="flex items-center justify-end gap-1 text-white">
                                  <Infinity size={24} strokeWidth={2.5} />
                                  <span className="text-xs font-semibold text-zinc-400">Sin límite</span>
                              </div>
                          ) : (
                              <span className={`text-xl font-bold ${daysRemaining <= 2 ? 'text-red-400' : 'text-white'}`}>
                                  {daysRemaining} <span className="text-xs font-normal text-zinc-500">días</span>
                              </span>
                          )}
                      </div>
                  </div>
              </div>
          </div>
       </motion.div>

       {/* --- UPGRADE CTA --- */}
       {((isTrial || (daysRemaining < 5 && !isLifetime)) && !isBlocked) && (
           <motion.button 
             whileTap={{ scale: 0.98 }}
             onClick={handleUpgrade}
             className="w-full h-[60px] bg-gradient-to-r from-brand-primary to-brand-accent rounded-xl flex items-center justify-between px-6 shadow-glow relative overflow-hidden group mb-8"
           >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center">
                      <Star size={20} className="text-white fill-white" />
                  </div>
                  <div className="text-left">
                      <span className="block text-white font-bold text-sm">{isTrial ? 'Activar Plan PRO' : 'Renovar Plan'}</span>
                      <span className="block text-white/80 text-[10px]">Desbloquea todo el poder</span>
                  </div>
              </div>
              <ChevronRight size={20} className="text-white relative z-10" />
           </motion.button>
       )}

       {/* --- RESOURCES STATS --- */}
       <div className="space-y-4 mb-8">
          <h3 className="text-sm font-bold text-white px-1">Tus Recursos</h3>
          
          <div className="grid grid-cols-2 gap-4">
             {/* Clientes Card */}
             <div className="bg-surface-1 p-5 rounded-xl border border-white/[0.08] shadow-sm flex flex-col justify-between h-[120px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-xl -mr-6 -mt-6 group-hover:bg-blue-500/20 transition-all" />
                
                <div className="w-10 h-10 rounded-md bg-surface-sunken flex items-center justify-center text-blue-400 border border-white/5 shadow-sm relative z-10">
                    <Users size={20} />
                </div>
                
                <div className="relative z-10">
                    <span className="text-3xl font-extrabold text-white block tracking-tight">{clients.length}</span>
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Clientes</span>
                </div>
             </div>

             {/* Ventas Card */}
             <div className="bg-surface-1 p-5 rounded-xl border border-white/[0.08] shadow-sm flex flex-col justify-between h-[120px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-xl -mr-6 -mt-6 group-hover:bg-purple-500/20 transition-all" />
                
                <div className="w-10 h-10 rounded-md bg-surface-sunken flex items-center justify-center text-purple-400 border border-white/5 shadow-sm relative z-10">
                    <TrendingUp size={20} />
                </div>
                
                <div className="relative z-10">
                    <span className="text-3xl font-extrabold text-white block tracking-tight">{sales.length}</span>
                    <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Ventas</span>
                </div>
             </div>
          </div>
       </div>

       {/* --- NEW SUPPORT HUB --- */}
       <div className="space-y-4">
          <h3 className="text-sm font-bold text-white px-1">Centro de Ayuda</h3>
          
          <div className="bg-surface-1 border border-white/[0.08] rounded-xl overflow-hidden shadow-sm">
             
             {!isLifetime && (
                 <button 
                    onClick={() => handleSupport('renew')} 
                    className="w-full p-5 flex items-center justify-between border-b border-white/5 active:bg-white/5 transition-colors group"
                 >
                     <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                             <CreditCard size={22} />
                         </div>
                         <div className="text-left">
                             <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Renovar Membresía</h4>
                             <p className="text-[11px] text-zinc-500">Gestionar pagos de Noova</p>
                         </div>
                     </div>
                     <ChevronRight size={18} className="text-zinc-600 group-hover:text-white" />
                 </button>
             )}

             <button 
                onClick={() => handleSupport('tech')} 
                className="w-full p-5 flex items-center justify-between border-b border-white/5 active:bg-white/5 transition-colors group"
             >
                 <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                         <HelpCircle size={22} />
                     </div>
                     <div className="text-left">
                         <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Soporte Técnico</h4>
                         <p className="text-[11px] text-zinc-500">Reportar fallas de la app</p>
                     </div>
                 </div>
                 <ChevronRight size={18} className="text-zinc-600 group-hover:text-white" />
             </button>

             <button 
                onClick={() => handleSupport('tutorial')} 
                className="w-full p-5 flex items-center justify-between active:bg-white/5 transition-colors group"
             >
                 <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-md bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20">
                         <BookOpen size={22} />
                     </div>
                     <div className="text-left">
                         <h4 className="text-sm font-bold text-white group-hover:text-brand-primary transition-colors">Tutoriales</h4>
                         <p className="text-[11px] text-zinc-500">Aprende a usar Noova Suite</p>
                     </div>
                 </div>
                 <ChevronRight size={18} className="text-zinc-600 group-hover:text-white" />
             </button>

          </div>
       </div>

       <div className="mt-8 text-center opacity-40">
          <p className="text-[10px] text-zinc-600">Noova Suite • Build 1.4.0</p>
       </div>
    </div>
  );
};

export default MyPlanMobile;