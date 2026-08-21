
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Lock, Check, ShieldAlert } from 'lucide-react';

const ChangePasswordModal: React.FC = () => {
  const { user, updatePassword } = useAuth();
  const { showToast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is logged in AND hasn't changed password yet
    if (user && user.id !== 'offline-user-id') {
      const hasChanged = localStorage.getItem(`noova_pwd_changed_${user.id}`) === 'true';
      
      // Definir "Nuevo Usuario": Cuenta creada en los últimos 30 días
      let isNewUser = true;
      if (user.userData?.created_at) {
          const created = new Date(user.userData.created_at);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - created.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          isNewUser = diffDays <= 30;
      }

      // Solo mostrar si es nuevo usuario y NO ha cambiado la contraseña aún
      if (isNewUser && !hasChanged) {
        // Small delay for smooth UX entry
        setTimeout(() => setIsOpen(true), 1000);
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(newPassword);
      showToast('Contraseña actualizada correctamente', 'success');
      // Mark as changed PERMANENTLY only on success
      if(user) localStorage.setItem(`noova_pwd_changed_${user.id}`, 'true');
      setIsOpen(false);
    } catch (error) {
      showToast('Error al actualizar contraseña', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Skip logic: Just close, DO NOT persist skip (so it asks again next session)
  const handleSkip = () => {
    setIsOpen(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Seguridad de la Cuenta">
      <div className="space-y-5 pt-1">
        
        <div className="bg-status-warning/10 border border-status-warning/20 rounded-md p-4 flex gap-3 items-start">
           <div className="bg-status-warning/20 p-2 rounded-full shrink-0 text-status-warning">
              <ShieldAlert size={20} />
           </div>
           <div>
              <h4 className="text-status-warning font-bold text-[13px] mb-1">Actualización Requerida</h4>
              <p className="text-text-muted text-[11px] leading-relaxed">
                 Por seguridad, te recomendamos cambiar tu contraseña temporal asignada por el administrador.
              </p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
           <div className="space-y-3">
              <div className="relative group">
                 <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled group-focus-within:text-brand-primary transition-colors" />
                 <input 
                   type="password" 
                   placeholder="Nueva Contraseña"
                   value={newPassword}
                   onChange={(e) => setNewPassword(e.target.value)}
                   className="w-full bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 rounded-md px-4 pl-11 py-3 text-sm text-text-primary outline-none focus:border-brand-primary/50 transition-all placeholder:text-text-faint"
                   required
                 />
              </div>
              <div className="relative group">
                 <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled group-focus-within:text-brand-primary transition-colors" />
                 <input 
                   type="password" 
                   placeholder="Confirmar Contraseña"
                   value={confirmPassword}
                   onChange={(e) => setConfirmPassword(e.target.value)}
                   className="w-full bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 rounded-md px-4 pl-11 py-3 text-sm text-text-primary outline-none focus:border-brand-primary/50 transition-all placeholder:text-text-faint"
                   required
                 />
              </div>
           </div>

           <div className="pt-2 flex flex-col gap-3">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full h-[48px] bg-gradient-to-r from-brand-primary to-brand-accent hover:brightness-110 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(106,44,255,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[13px]"
              >
                 {loading ? 'Actualizando...' : <><Check size={16} /> Cambiar Contraseña</>}
              </button>
              
              <button 
                type="button" 
                onClick={handleSkip}
                className="text-text-disabled text-xs font-medium hover:text-text-primary transition-colors py-2"
              >
                 Hacerlo más tarde
              </button>
           </div>
        </form>

      </div>
    </Modal>
  );
};

export default ChangePasswordModal;
