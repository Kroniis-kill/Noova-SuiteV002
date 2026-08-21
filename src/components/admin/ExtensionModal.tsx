
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { UserSubscription } from '../../types/subscriptionTypes';
import { useSubscription } from '../../context/SubscriptionContext';
import { useToast } from '../../context/ToastContext';
import { Calendar, Plus, Check } from 'lucide-react';

interface ExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSubscription | null;
}

const ExtensionModal: React.FC<ExtensionModalProps> = ({ isOpen, onClose, user }) => {
  const { extendDays } = useSubscription();
  const { showToast } = useToast();
  const [days, setDays] = useState(3); // Default 3 days extension

  if (!user) return null;

  const handleExtend = async () => {
      const success = await extendDays(user.user_id, days);
      if (success) {
          showToast(`Se agregaron ${days} días a ${user.user_email}`, 'success');
          onClose();
      } else {
          showToast('Error al extender días', 'error');
      }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Extender Periodo">
        <div className="space-y-6 pt-2">
            <div className="bg-surface-zinc border border-[rgb(var(--fg-rgb))]/10 rounded-md p-4">
                <p className="text-text-muted text-xs uppercase font-semibold mb-1">Usuario</p>
                <p className="text-text-primary font-bold text-sm">{user.user_email}</p>
                <p className="text-text-disabled text-[10px] mt-1">Plan Actual: <span className="text-status-success-soft uppercase">{user.plan}</span></p>
            </div>

            <div>
                <label className="text-xs font-semibold text-text-disabled uppercase mb-2 block">Días a agregar</label>
                <div className="flex items-center gap-3">
                    <button onClick={() => setDays(Math.max(1, days - 1))} className="w-10 h-10 rounded-sm bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 text-text-primary font-bold border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center">-</button>
                    <div className="flex-1 h-10 bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 rounded-sm flex items-center justify-center text-text-primary font-bold text-lg">
                        {days}
                    </div>
                    <button onClick={() => setDays(days + 1)} className="w-10 h-10 rounded-sm bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 text-text-primary font-bold border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center">+</button>
                </div>
            </div>
            
            <div className="flex gap-2 justify-center py-2">
                {[1, 3, 7, 15, 30].map(d => (
                    <button 
                        key={d}
                        onClick={() => setDays(d)}
                        className={`px-3 py-1.5 rounded-sm text-[10px] font-semibold border transition-all ${days === d ? 'bg-brand-primary border-brand-primary text-white' : 'bg-[rgb(var(--fg-rgb))]/5 border-[rgb(var(--fg-rgb))]/5 text-text-muted hover:text-text-primary'}`}
                    >
                        +{d}d
                    </button>
                ))}
            </div>

            <button 
                onClick={handleExtend}
                className="w-full h-[52px] bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-md font-bold shadow-glow flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
                <Plus size={18} /> Confirmar Extensión
            </button>
        </div>
    </Modal>
  );
};

export default ExtensionModal;
