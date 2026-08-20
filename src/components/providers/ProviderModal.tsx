
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Provider } from '../../types';
import { User, Send, Phone, Check, Palette, Star } from 'lucide-react';
import { generateUUID } from '../../utils/uuid';
import { getLocalDateISO } from '../../utils/contactosUtils';

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Provider) => void;
  initialData?: Provider | null;
}

const ProviderModal: React.FC<ProviderModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [telegram, setTelegram] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [qualityScore, setQualityScore] = useState(5);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setWhatsapp(initialData.whatsapp);
        setTelegram(initialData.telegram || '');
        setColor(initialData.color);
        setQualityScore(initialData.qualityScore || 5);
      } else {
        setName('');
        setWhatsapp('');
        setTelegram('');
        setColor('#6366f1');
        setQualityScore(5);
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: initialData ? initialData.id : generateUUID(),
      name,
      whatsapp,
      telegram: telegram || undefined,
      color,
      registrationDate: initialData ? initialData.registrationDate : getLocalDateISO(),
      qualityScore
    });
    onClose();
  };

  const styles = {
    label: "text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block ml-1",
    inputContainer: "relative flex items-center bg-surface-sunken border border-white/10 rounded-md h-[52px] transition-all focus-within:border-brand-primary/60 focus-within:ring-1 focus-within:ring-brand-primary/30",
    input: "w-full h-full bg-transparent text-[14px] text-white placeholder:text-zinc-600 px-4 outline-none font-medium rounded-md",
    iconLeft: "pl-12",
    iconElement: "absolute left-4 text-zinc-500 pointer-events-none",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Proveedor' : 'Nuevo Proveedor'}>
       <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          
          {/* Name */}
          <div>
             <label className={styles.label}>Nombre</label>
             <div className={styles.inputContainer}>
                <User size={18} className={styles.iconElement} />
                <input 
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="Nombre del Proveedor"
                  className={`${styles.input} ${styles.iconLeft}`}
                  required
                  autoFocus
                />
             </div>
          </div>

          {/* Whatsapp */}
          <div>
             <label className={styles.label}>WhatsApp</label>
             <div className={styles.inputContainer}>
                <Phone size={18} className={styles.iconElement} />
                <input 
                  value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                  placeholder="Número de contacto"
                  className={`${styles.input} ${styles.iconLeft}`}
                  required
                />
             </div>
          </div>

          {/* Telegram */}
          <div>
             <label className={styles.label}>Telegram (Opcional)</label>
             <div className={styles.inputContainer}>
                <Send size={18} className={styles.iconElement} />
                <input 
                  value={telegram} onChange={e => setTelegram(e.target.value)}
                  placeholder="Usuario (Ej. @proveedor)"
                  className={`${styles.input} ${styles.iconLeft}`}
                />
             </div>
          </div>

          {/* Quality Score */}
          <div>
             <label className={styles.label}>Calificación / Calidad</label>
             <div className="flex items-center gap-2 bg-surface-sunken p-3 rounded-md border border-white/10 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                   <button
                     key={star}
                     type="button"
                     onClick={() => setQualityScore(star)}
                     className={`p-1 transition-transform active:scale-125 ${qualityScore >= star ? 'text-status-warning-soft' : 'text-zinc-600'}`}
                   >
                      <Star size={24} fill={qualityScore >= star ? "currentColor" : "none"} />
                   </button>
                ))}
             </div>
          </div>

          {/* Color */}
          <div>
             <label className={styles.label}><Palette size={12} className="inline mr-1 mb-0.5"/> Color Identificador</label>
             <div className="bg-surface-sunken rounded-lg p-4 flex gap-4 overflow-x-auto no-scrollbar border border-white/10">
                {['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#f43f5e', '#06b6d4'].map(c => (
                   <button
                     key={c}
                     type="button"
                     onClick={() => setColor(c)}
                     className={`w-10 h-10 rounded-full border-2 transition-all shrink-0 ${color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                     style={{ backgroundColor: c }}
                   />
                ))}
             </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              className="btn-primary w-full h-[52px] rounded-lg text-sm flex items-center justify-center gap-2"
            >
               <Check size={18} /> {initialData ? 'Guardar Cambios' : 'Guardar Proveedor'}
            </button>
          </div>
       </form>
    </Modal>
  );
};

export default ProviderModal;
