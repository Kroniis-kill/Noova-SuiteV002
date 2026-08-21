
import React from 'react';
import Modal from './Modal';
import { Lock, Zap, Crown, Rocket } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitType: 'clients' | 'accounts' | 'sales' | 'providers' | 'resellers' | 'wallets';
  currentLimit: number;
}

const LimitReachedModal: React.FC<LimitReachedModalProps> = ({ isOpen, onClose, limitType, currentLimit }) => {
  const { supportNumber } = useSubscription();

  const config = {
    clients: { 
        title: 'Cartera Llena', 
        subtitle: 'Límite de Clientes',
        desc: '¡Tu negocio está creciendo! El plan gratuito permite gestionar hasta 5 clientes. Para seguir expandiéndote, pásate a PRO.' 
    },
    accounts: { 
        title: 'Inventario al Máximo', 
        subtitle: 'Límite de Cuentas',
        desc: 'Has ocupado tus 3 espacios de inventario. Desbloquea almacenamiento ilimitado para todos tus servicios con el plan PRO.' 
    },
    sales: { 
        title: 'Ventas Limitadas', 
        subtitle: 'Límite de Ventas',
        desc: 'Has alcanzado las 5 ventas activas permitidas. Automatiza y registra sin límites actualizando tu cuenta.' 
    },
    providers: { 
        title: 'Agenda de Proveedores', 
        subtitle: 'Límite de Proveedores',
        desc: 'Solo puedes guardar 5 proveedores en el plan básico. Centraliza toda tu cadena de suministro sin restricciones en PRO.' 
    },
    resellers: { 
        title: 'Red de Socios', 
        subtitle: 'Límite de Revendedores',
        desc: 'La gestión de socios está limitada a 5. Escala tu red de distribución con herramientas avanzadas.' 
    },
    wallets: { 
        title: 'Gestión Financiera', 
        subtitle: 'Límite de Billeteras',
        desc: 'El plan gratuito incluye 1 billetera principal. Gestiona múltiples divisas y cajas con Noova PRO.' 
    }
  };

  const info = config[limitType];

  const handleUpgrade = () => {
    const message = `Hola, quiero eliminar los límites de mi cuenta y pasar al Plan PRO de Noova Suite. (Límite alcanzado: ${limitType})`;
    window.open(`https://wa.me/${supportNumber}?text=${encodeURIComponent(message)}`, '_blank');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" zIndex={20000}>
       <div className="flex flex-col items-center text-center px-2 pb-4 pt-2">
          
          {/* Icon Animation Wrapper */}
          <div className="relative mb-6 mt-2">
             <div className="absolute inset-0 bg-brand-accent/30 blur-[50px] rounded-full animate-pulse" />
             <div className="relative w-24 h-24 bg-gradient-to-br from-surface-3 to-bg rounded-2xl border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center shadow-[0_10px_40px_-10px_rgba(255,20,147,0.5)]">
                <Lock size={36} className="text-brand-accent" />
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-brand-accent rounded-full flex items-center justify-center border-[4px] border-surface-zinc text-white font-semibold text-xs shadow-lg">
                   MAX
                </div>
             </div>
          </div>

          <span className="text-[10px] font-semibold text-brand-accent uppercase tracking-widest mb-2 bg-brand-accent/10 px-3 py-1 rounded-full border border-brand-accent/20">
             {info.subtitle}
          </span>

          <h3 className="text-2xl font-bold text-primary mb-3 tracking-tight">{info.title}</h3>
          
          <p className="text-muted text-sm leading-relaxed max-w-[280px] mb-8">
             {info.desc}
          </p>

          <div className="w-full space-y-3">
             <button 
               onClick={handleUpgrade}
               className="group w-full h-[56px] bg-gradient-to-r from-brand-primary to-brand-accent rounded-lg text-white font-bold text-sm shadow-[0_0_30px_-5px_rgba(106,44,255,0.5)] flex items-center justify-center gap-3 relative overflow-hidden transition-transform active:scale-[0.98]"
             >
                <div className="absolute inset-0 bg-[rgb(var(--fg-rgb))]/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <Crown size={18} className="fill-white" />
                <span>Desbloquear Plan PRO</span>
             </button>
             
             <button 
               onClick={onClose}
               className="w-full h-[48px] text-disabled font-medium text-xs hover:text-primary transition-colors flex items-center justify-center gap-2"
             >
                Entendido, borraré datos antiguos
             </button>
          </div>

       </div>
    </Modal>
  );
};

export default LimitReachedModal;
