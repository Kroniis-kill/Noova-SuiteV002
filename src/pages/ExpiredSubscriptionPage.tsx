
import React from 'react';
import { Lock, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ExpiredSubscriptionPage: React.FC = () => {
  const { logout } = useAuth();

  return (
    <div className="fixed inset-0 bg-transparent flex flex-col items-center justify-center p-6 text-center z-[200]">
       
       <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
          <Lock size={40} className="text-red-500" />
       </div>

       <h1 className="text-3xl font-bold text-white mb-2">Suscripción Expirada</h1>
       <p className="text-zinc-400 max-w-md leading-relaxed mb-8">
          Tu acceso a la plataforma ha vencido. Por favor, realiza el pago de tu renovación para continuar disfrutando del servicio.
       </p>

       <div className="flex flex-col gap-4 w-full max-w-xs">
          <button 
            onClick={() => window.open('https://wa.me/YOUR_NUMBER', '_blank')}
            className="w-full h-[52px] bg-brand-whatsapp hover:brightness-110 text-black font-bold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95"
          >
             <MessageCircle size={20} /> Contactar Soporte
          </button>
          
          <button 
            onClick={logout}
            className="w-full h-[52px] bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-bold rounded-lg transition-all border border-white/5"
          >
             Cerrar Sesión
          </button>
       </div>

    </div>
  );
};

export default ExpiredSubscriptionPage;
