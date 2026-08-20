import React, { useEffect, useState } from 'react';
import { useSubscription } from '../../../context/SubscriptionContext';
import { useAuth } from '../../../context/AuthContext';
import { PLAN_LABELS, Invoice, PlanType } from '../../../types/subscriptionTypes';
import { Calendar, ShieldCheck, Download, Zap, Star, Crown, Infinity, Users, AlertTriangle, CreditCard, HelpCircle, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../../supabaseClient';
import { useData } from '../../../context/DataContext';

import { withRetry } from '../../../utils/supabaseUtils';

const MyPlanDesktop: React.FC = () => {
  const { subscription, loadingSub, isAdmin, supportNumber } = useSubscription();
  const { user } = useAuth();
  const { clients } = useData();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (user) {
      const fetchInvoices = async () => {
        const { data } = await withRetry(() => 
          supabase
            .from('subscription_invoices')
            .select('id, plan_name, amount, status, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        );
        if (data) setInvoices(data as Invoice[]);
      };
      fetchInvoices();
    }
  }, [user]);

  if (loadingSub) return <div className="p-10 text-center text-zinc-500 animate-pulse">Cargando suscripción...</div>;

  const displaySub = subscription || (isAdmin ? {
      plan: 'lifetime', expires_at: new Date(2099, 0, 1).toISOString(), is_active: true, user_id: 'ADMIN', created_at: new Date().toISOString()
  } : { plan: 'free', expires_at: new Date().toISOString(), is_active: true, user_id: 'FREE', created_at: new Date().toISOString() });

  const isPro = displaySub.plan !== 'free' || isAdmin;
  const isLifetime = displaySub.plan === 'lifetime';
  const currentPlan = displaySub.plan as PlanType;
  const expiryDate = new Date(displaySub.expires_at);
  
  // Limits
  const limitClients = isPro ? 10000 : 5;
  const usageClients = clients.length;
  const pctClients = Math.min(100, (usageClients / limitClients) * 100);

  const handleSupport = (type: string) => {
      let message = "Hola equipo Noova, ";
      if (type === 'renew') message += "deseo renovar mi membresía de la plataforma.";
      else if (type === 'tech') message += "necesito soporte técnico con la app.";
      else if (type === 'tutorial') message += "quisiera ver tutoriales de uso.";
      
      window.open(`https://wa.me/${supportNumber || '573000000000'}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const SupportCard = ({ icon: Icon, title, desc, color, bg, onClick }: any) => (
      <button 
        onClick={onClick}
        className="flex flex-col items-start p-6 bg-surface-1 border border-white/[0.08] rounded-xl hover:border-white/10 hover:bg-surface-1 transition-all group text-left h-full w-full shadow-sm"
      >
          <div className={`w-12 h-12 rounded-md flex items-center justify-center mb-4 ${bg} ${color}`}>
              <Icon size={24} />
          </div>
          <h4 className="text-white font-bold text-base mb-1 group-hover:text-brand-primary transition-colors">{title}</h4>
          <p className="text-zinc-500 text-xs leading-relaxed">{desc}</p>
      </button>
  );

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-8 pb-12">
       
       <div className="flex justify-between items-end">
          <div>
             <h1 className="text-4xl font-bold text-white tracking-tight">Mi Membresía</h1>
             <p className="text-zinc-400 text-sm mt-2">Gestiona tu nivel de acceso y facturación.</p>
          </div>
       </div>

       <div className="grid grid-cols-12 gap-8">
          
          {/* COL 1: PLAN INFO */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
             <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="relative rounded-xl overflow-hidden shadow-2xl border border-white/[0.08] bg-surface-1 p-8"
             >
                <div className={`absolute top-0 right-0 w-[400px] h-[400px] blur-[80px] rounded-full pointer-events-none ${isLifetime ? 'bg-amber-500/10' : 'bg-brand-primary/10'}`} />
                
                <div className="flex flex-col gap-6 relative z-10">
                   <div className="flex items-center gap-5">
                      <div className={`w-20 h-20 rounded-xl flex items-center justify-center text-3xl shadow-lg border border-white/10 ${isLifetime ? 'bg-gradient-to-br from-amber-500 to-yellow-600 text-white' : isPro ? 'bg-gradient-to-br from-brand-primary to-brand-accent text-white' : 'bg-surface-4 text-zinc-400'}`}>
                         {isLifetime ? <Crown size={32} fill="currentColor" /> : isPro ? <Star size={32} fill="currentColor" /> : <Zap size={32} />}
                      </div>
                      <div>
                         <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-2xl font-bold text-white tracking-tight">{PLAN_LABELS[currentPlan]}</h2>
                            {isPro && <span className={`text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow-sm ${isLifetime ? 'bg-amber-500' : 'bg-brand-accent'}`}>{isLifetime ? 'VITALICIO' : 'PRO'}</span>}
                         </div>
                         <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
                            <span className={`w-2 h-2 rounded-full ${displaySub.is_active ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-red-400'}`} />
                            {displaySub.is_active ? 'Suscripción Activa' : 'Inactiva'} 
                            <span className="text-zinc-600">•</span>
                            {isLifetime ? (
                                <span className="flex items-center gap-1 text-amber-400 font-bold"><Infinity size={14} /> Sin Vencimiento</span>
                            ) : (
                                <span>Vence: {expiryDate.toLocaleDateString()}</span>
                            )}
                         </div>
                      </div>
                   </div>

                   {/* Progress Bar Section */}
                   <div className="bg-surface-sunken rounded-lg p-5 border border-white/5 flex flex-col gap-4">
                      <div className="flex justify-between items-end">
                         <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                            <Users size={16} className="text-brand-primary" />
                            <span>Clientes Registrados</span>
                         </div>
                         <span className="text-white font-bold text-sm">{usageClients} <span className="text-zinc-500 font-normal">/ {isPro ? '∞' : limitClients}</span></span>
                      </div>
                      <div className="w-full h-2.5 bg-surface-3 rounded-full overflow-hidden border border-white/5">
                          <div className={`h-full rounded-full transition-all duration-1000 ${isLifetime ? 'bg-gradient-to-r from-amber-500 to-yellow-500' : 'bg-gradient-to-r from-brand-primary to-brand-primary-hi'}`} style={{ width: `${pctClients}%` }} />
                      </div>
                   </div>
                </div>
             </motion.div>

             {/* Support Grid */}
             <div>
                 <h3 className="text-white font-bold text-sm mb-4">Centro de Ayuda</h3>
                 <div className="grid grid-cols-3 gap-4">
                     {!isLifetime && (
                         <SupportCard 
                            title="Renovar Plan" 
                            desc="Gestionar pagos" 
                            icon={CreditCard} 
                            color="text-emerald-400" 
                            bg="bg-emerald-500/10 border border-emerald-500/20"
                            onClick={() => handleSupport('renew')} 
                         />
                     )}
                     <SupportCard 
                        title="Soporte Técnico" 
                        desc="Reportar fallos" 
                        icon={HelpCircle} 
                        color="text-blue-400" 
                        bg="bg-blue-500/10 border border-blue-500/20"
                        onClick={() => handleSupport('tech')} 
                     />
                     <SupportCard 
                        title="Tutoriales" 
                        desc="Aprender uso" 
                        icon={BookOpen} 
                        color="text-brand-primary" 
                        bg="bg-brand-primary/10 border border-brand-primary/20"
                        onClick={() => handleSupport('tutorial')} 
                     />
                 </div>
             </div>
          </div>

          {/* COL 2: INVOICE HISTORY */}
          <div className="col-span-12 lg:col-span-5 bg-surface-1 border border-white/[0.08] rounded-2xl p-8 flex flex-col h-full shadow-lg">
             <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Calendar size={18} className="text-zinc-400" /> Historial de Pagos
             </h3>
             
             <div className="flex-1 overflow-auto custom-scrollbar">
                {invoices.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                       <CreditCard size={32} className="text-zinc-500 mb-3" />
                       <p className="text-zinc-500 text-sm">No hay facturas registradas.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                       {invoices.map((inv) => (
                          <div key={inv.id} className="flex justify-between items-center p-4 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors group">
                             <div>
                                <p className="text-sm font-bold text-white">{inv.plan_name}</p>
                                <p className="text-xs text-zinc-500 font-mono">{new Date(inv.created_at).toLocaleDateString()}</p>
                             </div>
                             <div className="text-right">
                                <p className="text-sm font-bold text-white">${inv.amount}</p>
                                <span className={`text-[10px] uppercase font-semibold ${inv.status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>{inv.status}</span>
                             </div>
                             <button className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                <Download size={14} />
                             </button>
                          </div>
                       ))}
                    </div>
                )}
             </div>
          </div>

       </div>
    </div>
  );
};

export default MyPlanDesktop;