
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Reseller } from '../../types';
import { getRandomColor } from '../../utils/revendedoresUtils';
import { User, Hash, Phone, Check, Send } from 'lucide-react';
import { generateUUID } from '../../utils/uuid';
import { useToast } from '../../context/ToastContext';
import { getLocalDateISO } from '../../utils/contactosUtils';

interface ResellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Reseller) => void;
  initialData?: Reseller | null;
}

const ResellerModal: React.FC<ResellerModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [telegram, setTelegram] = useState('');
  const [color, setColor] = useState(getRandomColor());

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setCode(initialData.code);
        setWhatsapp(initialData.whatsapp);
        setTelegram(initialData.telegram || '');
        setColor(initialData.color);
      } else {
        setName('');
        setCode('');
        setWhatsapp('');
        setTelegram('');
        setColor(getRandomColor());
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsapp.trim() && !telegram.trim()) {
        showToast('Debes registrar al menos un método de contacto', 'error');
        return;
    }
    onSubmit({
      id: initialData ? initialData.id : generateUUID(),
      name,
      code,
      whatsapp,
      telegram,
      color,
      registrationDate: initialData ? initialData.registrationDate : getLocalDateISO()
    });
    onClose();
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!initialData && val.length >= 2 && !code) {
      setCode(val.substring(0, 2).toUpperCase() + '-');
    }
  };

  const styles = {
    label: "text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block ml-1",
    inputContainer: "relative flex items-center bg-surface-sunken border border-white/10 rounded-md h-[52px] transition-all focus-within:border-brand-primary/60 focus-within:ring-1 focus-within:ring-brand-primary/30",
    input: "w-full h-full bg-transparent text-sm text-white placeholder:text-zinc-600 px-4 outline-none font-medium rounded-md",
    iconLeft: "pl-12",
    iconElement: "absolute left-4 text-zinc-500 pointer-events-none",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Revendedor' : 'Nuevo Revendedor'}>
       <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          <div>
             <label className={styles.label}>Nombre</label>
             <div className={styles.inputContainer}>
                <User size={18} className={styles.iconElement} />
                <input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Nombre Completo" className={`${styles.input} ${styles.iconLeft}`} required />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className={styles.label}>Código</label>
                <div className={styles.inputContainer}><Hash size={18} className={styles.iconElement} /><input value={code} onChange={e => setCode(e.target.value)} placeholder="Ej. AL-" className={`${styles.input} ${styles.iconLeft} uppercase`} required /></div>
             </div>
             <div>
                <label className={styles.label}>WhatsApp</label>
                <div className={styles.inputContainer}><Phone size={18} className={styles.iconElement} /><input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Número" className={`${styles.input} ${styles.iconLeft}`} /></div>
             </div>
          </div>

          <div>
             <label className={styles.label}>Telegram (Opcional)</label>
             <div className={styles.inputContainer}><Send size={18} className={styles.iconElement} /><input value={telegram} onChange={e => setTelegram(e.target.value)} placeholder="Usuario (Ej. @usuario)" className={`${styles.input} ${styles.iconLeft}`} /></div>
          </div>

          <div className="pt-4">
            <button type="submit" className="btn-primary w-full h-[52px] rounded-lg text-sm flex items-center justify-center gap-2">
               <Check size={18} /> {initialData ? 'Guardar Cambios' : 'Crear Revendedor'}
            </button>
          </div>
       </form>
    </Modal>
  );
};

export default ResellerModal;
