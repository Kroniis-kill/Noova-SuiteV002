
import React from 'react';
import Modal from '../ui/Modal';
import { UserSubscription, PLAN_LABELS } from '../../types/subscriptionTypes';
import { 
  Mail, Calendar, Zap, Shield, Star, Clock, 
  Infinity as InfinityIcon, Edit2, ShieldAlert, Ban, 
  CheckCircle2, XCircle, User, History
} from 'lucide-react';

interface AdminUserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserSubscription | null;
  onEdit: (user: UserSubscription) => void;
  onExtend: (user: UserSubscription) => void;
  onBlock: (user: UserSubscription) => void;
  onDelete: (user: UserSubscription) => void;
}

const AdminUserDetailModal: React.FC<AdminUserDetailModalProps> = ({ 
  isOpen, onClose, user, onEdit, onExtend, onBlock, onDelete 
}) => {
  if (!user) return null;

  const isExpired = new Date(user.expires_at) < new Date();
  const isBanned = user.status === 'banned';

  const DetailItem = ({ label, value, icon: Icon }: any) => (
    <div className="flex items-center gap-3 p-3 rounded-md bg-white/5 border border-white/5">
      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
        <p className="text-xs font-semibold text-white">{value}</p>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle de Usuario">
      <div className="space-y-6 pt-2">
        {/* Header Profile */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white text-2xl font-black shadow-lg">
            {user.user_email?.substring(0, 2).toUpperCase() || 'U'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{user.full_name || 'Usuario'}</h3>
            <p className="text-xs text-zinc-500">{user.user_email}</p>
          </div>
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest border ${isExpired ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
              {isExpired ? 'Expirado' : 'Vigente'}
            </span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest border ${user.is_active ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}`}>
              {user.is_active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-3">
          <DetailItem label="Plan Actual" value={PLAN_LABELS[user.plan]} icon={Zap} />
          <DetailItem label="Vencimiento" value={new Date(user.expires_at).toLocaleDateString()} icon={Calendar} />
          <DetailItem label="ID de Usuario" value={user.user_id} icon={Shield} />
          <DetailItem label="Estado de Cuenta" value={user.status || 'active'} icon={isBanned ? Ban : CheckCircle2} />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button 
            onClick={() => onEdit(user)}
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition-all active:scale-95"
          >
            <Edit2 size={20} className="mb-2 text-blue-400" />
            <span className="text-[10px] font-semibold uppercase">Editar</span>
          </button>
          <button 
            onClick={() => onExtend(user)}
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition-all active:scale-95"
          >
            <History size={20} className="mb-2 text-emerald-400" />
            <span className="text-[10px] font-semibold uppercase">Extender</span>
          </button>
          <button 
            onClick={() => onBlock(user)}
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition-all active:scale-95"
          >
            {isBanned ? <CheckCircle2 size={20} className="mb-2 text-emerald-400" /> : <Ban size={20} className="mb-2 text-amber-400" />}
            <span className="text-[10px] font-semibold uppercase">{isBanned ? 'Desbloquear' : 'Bloquear'}</span>
          </button>
          <button 
            onClick={() => onDelete(user)}
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 transition-all active:scale-95"
          >
            <ShieldAlert size={20} className="mb-2 text-red-400" />
            <span className="text-[10px] font-semibold uppercase">Eliminar</span>
          </button>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-4 text-zinc-500 text-[10px] font-semibold uppercase tracking-widest hover:text-white transition-colors"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
};

export default AdminUserDetailModal;
