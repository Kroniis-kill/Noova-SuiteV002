import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Check, Loader2, User, Phone } from 'lucide-react';
import { generateUUID } from '../../utils/uuid';
import { useHaptic } from '../../hooks/useHaptic';

interface NewClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (clientId: string) => void;
  zIndex?: number;
}

const NewClientFormModal: React.FC<NewClientFormModalProps> = ({ isOpen, onClose, onSuccess, zIndex }) => {
  const { addClient } = useData();
  const { showToast } = useToast();
  const haptic = useHaptic();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('El nombre es obligatorio', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const newId = generateUUID();
      await addClient({
        id: newId,
        name: name.trim(),
        phone: phone.trim(),
        registrationDate: new Date().toISOString(),
        activeServices: 0
      });

      haptic('success');
      showToast('Cliente registrado', 'success');
      onSuccess(newId);
      onClose();
    } catch (error) {
      showToast('Error al registrar cliente', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Cliente" zIndex={zIndex || 60000}>
      <form onSubmit={handleSubmit} className="pt-2 pb-4 space-y-5">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-semibold text-text-disabled uppercase tracking-widest ml-1 mb-2 block">Nombre Completo</label>
            <div className="relative flex items-center bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 rounded-md h-[52px] transition-all focus-within:border-brand-primary/50 focus-within:ring-1 focus-within:ring-brand-primary/20">
              <User size={18} className="absolute left-4 text-text-disabled" />
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full h-full bg-transparent text-sm text-text-primary placeholder:text-text-faint pl-12 pr-4 outline-none font-medium rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-text-disabled uppercase tracking-widest ml-1 mb-2 block">WhatsApp (Opcional)</label>
            <div className="relative flex items-center bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 rounded-md h-[52px] transition-all focus-within:border-brand-primary/50 focus-within:ring-1 focus-within:ring-brand-primary/20">
              <Phone size={18} className="absolute left-4 text-text-disabled" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Ej. 57300..."
                className="w-full h-full bg-transparent text-sm text-text-primary placeholder:text-text-faint pl-12 pr-4 outline-none font-medium rounded-md"
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[56px] bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-bold text-sm shadow-glow flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} strokeWidth={3} />}
            {isSubmitting ? 'Guardando...' : 'Registrar y Seleccionar'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default NewClientFormModal;
