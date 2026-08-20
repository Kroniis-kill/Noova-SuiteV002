
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { PlanType, PLAN_LABELS, UserSubscription } from '../../types/subscriptionTypes';
import { Mail, Lock, Calendar, Check, Zap, Shield, Star, Clock, Infinity as InfinityIcon, Edit2, ShieldAlert } from 'lucide-react';
import { useSubscription } from '../../context/SubscriptionContext';
import { useToast } from '../../context/ToastContext';

interface AdminUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (email: string, password: string, plan: PlanType, expiryDate: string) => void;
  initialData?: UserSubscription | null;
}

const AdminUserModal: React.FC<AdminUserModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const { revokeUserPlan } = useSubscription();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plan, setPlan] = useState<PlanType>('monthly');
  const [expiryDate, setExpiryDate] = useState('');
  
  // State for confirmation modal
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);

  // Load data if editing, or reset if creating
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setEmail(initialData.user_email || '');
        setPassword('******'); // Placeholder
        setPlan(initialData.plan);
        // Formato YYYY-MM-DD para el input type date
        setExpiryDate(initialData.expires_at ? new Date(initialData.expires_at).toISOString().split('T')[0] : '');
      } else {
        setEmail('');
        setPassword('');
        setPlan('monthly');
        calculateExpiry('monthly'); // Set default expiry
      }
    }
  }, [isOpen, initialData]);

  const calculateExpiry = (selectedPlan: PlanType) => {
    const date = new Date();
    switch (selectedPlan) {
      case 'monthly': date.setMonth(date.getMonth() + 1); break;
      case 'quarterly': date.setMonth(date.getMonth() + 3); break;
      case 'semiannual': date.setMonth(date.getMonth() + 6); break;
      case 'annual': date.setFullYear(date.getFullYear() + 1); break;
      case 'lifetime': date.setFullYear(date.getFullYear() + 100); break;
    }
    setExpiryDate(date.toISOString().split('T')[0]);
  };

  const handlePlanChange = (newPlan: PlanType) => {
    setPlan(newPlan);
    calculateExpiry(newPlan);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateObj = new Date(expiryDate);
    dateObj.setHours(23, 59, 59, 999);
    onSubmit(email, password, plan, dateObj.toISOString());
  };

  const handleRevokeClick = () => {
      setIsRevokeModalOpen(true);
  };

  const confirmRevoke = async () => {
      if (!initialData) return;
      const success = await revokeUserPlan(initialData.user_id);
      if (success) {
          showToast('Plan revocado exitosamente', 'success');
          setIsRevokeModalOpen(false);
          onClose();
      } else {
          showToast('Error al revocar plan', 'error');
          setIsRevokeModalOpen(false);
      }
  };

  // UI Helpers
  const PlanCard = ({ type, label, icon: Icon, color }: any) => (
    <button
      type="button"
      onClick={() => handlePlanChange(type)}
      className={`relative flex flex-col items-center justify-center p-3 rounded-md border transition-all active:scale-95 ${
        plan === type 
          ? `bg-${color}-500/20 border-${color}-500 text-white shadow-lg` 
          : 'bg-surface-zinc border-white/10 text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
      }`}
    >
      {plan === type && (
        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-${color}-500 shadow-[0_0_8px_currentColor]`} />
      )}
      <Icon size={20} className={`mb-2 ${plan === type ? `text-${color}-400` : 'text-zinc-600'}`} />
      <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
    </button>
  );

  const styles = {
    label: "text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1 block ml-1",
    inputContainer: "relative flex items-center bg-surface-sunken border border-white/10 rounded-sm h-[48px] transition-all focus-within:border-brand-primary/60",
    input: "w-full bg-transparent text-[13px] text-white placeholder:text-zinc-600 px-3 h-full outline-none font-medium rounded-sm",
    iconLeft: "pl-10",
    iconElement: "absolute left-3.5 text-zinc-500 pointer-events-none",
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Gestionar Usuario" : "Nuevo Suscriptor"}>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          
          {/* User Info */}
          <div className="space-y-4">
             <div>
                <label className={styles.label}>Credenciales de Acceso</label>
                <div className="space-y-3">
                   <div className={styles.inputContainer}>
                      <Mail size={16} className={styles.iconElement} />
                      <input 
                        type="email" 
                        required
                        placeholder="Correo electrónico"
                        value={email}
                        disabled={!!initialData} // Email usually immutable as ID in simple setups
                        onChange={e => setEmail(e.target.value)}
                        className={`${styles.input} ${styles.iconLeft} ${initialData ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                   </div>
                   {!initialData && (
                     <div className={styles.inputContainer}>
                        <Lock size={16} className={styles.iconElement} />
                        <input 
                          type="text" 
                          required
                          placeholder="Contraseña temporal"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className={`${styles.input} ${styles.iconLeft}`}
                        />
                     </div>
                   )}
                </div>
             </div>
          </div>

          {/* Plan Selector */}
          <div>
             <label className={styles.label}>Seleccionar Plan</label>
             <div className="grid grid-cols-3 gap-2 mb-2">
                <PlanCard type="monthly" label="Mensual" icon={Zap} color="blue" />
                <PlanCard type="quarterly" label="Trimestral" icon={Star} color="indigo" />
                <PlanCard type="semiannual" label="Semestral" icon={Clock} color="purple" />
             </div>
             <div className="grid grid-cols-2 gap-2">
                <PlanCard type="annual" label="Anual" icon={Shield} color="emerald" />
                <PlanCard type="lifetime" label="Vitalicio" icon={InfinityIcon} color="amber" />
             </div>
          </div>

          {/* Expiry Date */}
          <div>
             <label className={styles.label}>Fecha de Vencimiento</label>
             <div className={styles.inputContainer}>
                <Calendar size={16} className={styles.iconElement} />
                <input 
                  type="date"
                  required
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  className={`${styles.input} ${styles.iconLeft}`}
                />
             </div>
          </div>

          {/* Submit */}
          <div className="pt-2 flex flex-col gap-3">
             <button 
               type="submit" 
               className="btn-primary w-full h-[52px] rounded-lg text-[13px] flex items-center justify-center gap-2"
             >
                {initialData ? <><Edit2 size={18} /> Actualizar Datos</> : <><Check size={18} /> Registrar Usuario</>}
             </button>
             
             {/* REVOKE BUTTON (Only if editing and not free) */}
             {initialData && initialData.plan !== 'free' && (
                 <button 
                    type="button"
                    onClick={handleRevokeClick}
                    className="w-full h-[48px] bg-status-danger/10 hover:bg-status-danger/20 border border-status-danger/20 text-status-danger-soft rounded-lg font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[12px]"
                 >
                    <ShieldAlert size={16} /> Quitar Plan (Downgrade a Free)
                 </button>
             )}
          </div>

        </form>
      </Modal>

      {/* CONFIRMATION MODAL */}
      <Modal isOpen={isRevokeModalOpen} onClose={() => setIsRevokeModalOpen(false)} title="Revocar Plan">
          <div className="space-y-4 pt-2">
              <div className="bg-status-danger/10 border border-status-danger/20 p-4 rounded-xl flex gap-4 items-start">
                  <div className="bg-status-danger/20 p-3 rounded-full shrink-0">
                      <ShieldAlert size={24} className="text-status-danger" />
                  </div>
                  <div>
                      <h4 className="text-white font-bold text-sm">¿Estás seguro?</h4>
                      <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                          El usuario perderá acceso inmediato a las funciones PRO y volverá al plan GRATUITO.
                          Esta acción registra una fecha de vencimiento inmediata.
                      </p>
                  </div>
              </div>
              <div className="flex gap-3">
                  <button onClick={() => setIsRevokeModalOpen(false)} className="flex-1 py-3 rounded-md bg-white/5 text-zinc-400 text-xs font-semibold hover:bg-white/10 transition-colors">
                      Cancelar
                  </button>
                  <button onClick={confirmRevoke} className="flex-1 py-3 rounded-md bg-status-danger text-white text-xs font-semibold hover:bg-red-600 shadow-glow transition-colors">
                      Sí, Revocar Plan
                  </button>
              </div>
          </div>
      </Modal>
    </>
  );
};

export default AdminUserModal;
