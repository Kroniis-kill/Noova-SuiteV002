import React from 'react';
import Modal from '../ui/Modal';
import { UserSubscription, PLAN_LABELS } from '../../types/subscriptionTypes';
import { 
  User, Mail, Calendar, Crown, Shield, Clock, 
  Ban, CheckCircle2, Edit2, Trash2, PlusCircle, CreditCard, Infinity
} from 'lucide-react';
import { formatDate } from '../../utils/contactosUtils';

interface AdminUserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSubscription | null;
  onEdit: (u: UserSubscription) => void;
  onExtend: (u: UserSubscription) => void;
  onBlock: (u: UserSubscription) => void;
  onDelete: (u: UserSubscription) => void;
}

const AdminUserDetailModal: React.FC<AdminUserDetailModalProps> = ({ 
  isOpen, onClose, user, onEdit, onExtend, onBlock, onDelete 
}) => {
  if (!user) return null;

  const isPro = user.plan !== 'free';
  const isLifetime = user.plan === 'lifetime';
  const isBanned = user.status === 'banned';
  const isExpired = !isLifetime && new Date(user.expires_at) < new Date();
  
  const getPlanColor = () => {
      switch(user.plan) {
          case 'free': return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
          case 'monthly': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
          case 'lifetime': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
          default: return 'text-brand-primary bg-brand-primary/10 border-brand-primary/20';
      }
  };

  const handleAction = (action: (u: UserSubscription) => void) => {
      onClose();
      action(user);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle de Usuario">
      <div className="pt-2 pb-4 space-y-6">
        
        {/* Header Profile */}
        <div className="bg-surface-1 rounded-xl border border-white/[0.08] p-6 flex flex-col items-center text-center relative overflow-hidden shadow-sm">
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${isPro ? 'from-brand-primary to-brand-accent' : 'from-zinc-700 to-zinc-600'}`} />
            
            <div className={`w-20 h-20 rounded-lg flex items-center justify-center text-2xl font-bold text-white shadow-xl mb-3 ${isPro ? 'bg-gradient-to-br from-brand-primary to-brand-accent' : 'bg-gradient-to-br from-zinc-700 to-zinc-600'}`}>
                {(user.full_name || user.user_email || 'U').substring(0, 2).toUpperCase()}
            </div>
            
            <h2 className="text-lg font-bold text-white mb-1">
                {user.full_name || 'Sin nombre registrado'}
            </h2>
            <div className="flex items-center gap-2 text-zinc-400 text-xs">
                <Mail size={12} /> {user.user_email}
            </div>

            <div className="mt-4 flex gap-2 justify-center">
                 <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border uppercase ${getPlanColor()}`}>
                    {PLAN_LABELS[user.plan]}
                 </span>
                 {isBanned ? (
                     <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-red-500/10 text-red-400 border-red-500/20 flex items-center gap-1">
                        <Ban size={10} /> BLOQUEADO
                     </span>
                 ) : (
                     <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 size={10} /> ACTIVO
                     </span>
                 )}
            </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface-1 rounded-lg p-4 border border-white/[0.08] shadow-sm">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                    <Calendar size={14} /> <span className="text-[10px] font-semibold uppercase">Vencimiento</span>
                </div>
                <p className={`text-sm font-bold font-mono ${isExpired ? 'text-red-400' : 'text-white'}`}>
                    {isLifetime ? (
                        <span className="flex items-center gap-2 text-amber-400"><Infinity size={16} /> Vitalicio</span>
                    ) : (
                        formatDate(user.expires_at)
                    )}
                </p>
                {isExpired && !isLifetime && <span className="text-[9px] text-red-500 block mt-1">Expirado</span>}
            </div>
            
            <div className="bg-surface-1 rounded-lg p-4 border border-white/[0.08] shadow-sm">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                    <Clock size={14} /> <span className="text-[10px] font-semibold uppercase">Registro</span>
                </div>
                <p className="text-sm font-bold text-white font-mono">
                    {formatDate(user.created_at || new Date().toISOString())}
                </p>
            </div>
        </div>

        {/* Actions List */}
        <div className="space-y-2">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase ml-1">Acciones Administrativas</p>
            
            {!isLifetime && (
                <button onClick={() => handleAction(onExtend)} className="w-full flex items-center justify-between p-4 rounded-md bg-surface-1 border border-white/[0.08] hover:bg-surface-1 transition-all group">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                            <PlusCircle size={16} />
                        </div>
                        <span className="text-sm font-medium text-zinc-200 group-hover:text-white">Extender Días</span>
                    </div>
                    <CreditCard size={16} className="text-zinc-600 group-hover:text-emerald-400" />
                </button>
            )}

            <button onClick={() => handleAction(onEdit)} className="w-full flex items-center justify-between p-4 rounded-md bg-surface-1 border border-white/[0.08] hover:bg-surface-1 transition-all group">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                        <Edit2 size={16} />
                    </div>
                    <span className="text-sm font-medium text-zinc-200 group-hover:text-white">Editar Plan</span>
                </div>
                <Shield size={16} className="text-zinc-600 group-hover:text-blue-400" />
            </button>

            <button onClick={() => handleAction(onBlock)} className="w-full flex items-center justify-between p-4 rounded-md bg-surface-1 border border-white/[0.08] hover:bg-surface-1 transition-all group">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isBanned ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-700 text-zinc-400'}`}>
                        <Ban size={16} />
                    </div>
                    <span className="text-sm font-medium text-zinc-200 group-hover:text-white">
                        {isBanned ? 'Desbloquear Acceso' : 'Bloquear Acceso'}
                    </span>
                </div>
            </button>

            <button onClick={() => handleAction(onDelete)} className="w-full flex items-center justify-between p-4 rounded-md bg-surface-1 border border-white/[0.08] hover:bg-red-500/10 transition-all group border-b-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
                        <Trash2 size={16} />
                    </div>
                    <span className="text-sm font-medium text-zinc-200 group-hover:text-red-300">Eliminar Usuario</span>
                </div>
            </button>
        </div>

      </div>
    </Modal>
  );
};

export default AdminUserDetailModal;