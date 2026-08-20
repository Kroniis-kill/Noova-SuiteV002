
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { PayableExpense } from '../../types';
import { Calendar, DollarSign, Repeat, Check, Tag, ChevronDown, Plus, Minus } from 'lucide-react';
import { generateUUID } from '../../utils/uuid';
import { getLocalDateISO } from '../../utils/contactosUtils';

interface PayableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PayableExpense) => void;
  initialData?: PayableExpense | null;
}

const PayableModal: React.FC<PayableModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [recurrence, setRecurrence] = useState('');
  const [currency, setCurrency] = useState('USD');
  
  const [months, setMonths] = useState('');
  const [days, setDays] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setAmount(initialData.amount.toString());
        setDueDate(initialData.dueDate);
        setRecurrence(initialData.recurrence || '');
        setCurrency(initialData.currency);
        setMonths(''); setDays(''); 
      } else {
        setName('');
        setAmount('');
        setDueDate(getLocalDateISO());
        setRecurrence('');
        setCurrency('USD');
        setMonths('1'); setDays('');
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const m = parseInt(months) || 0;
    const d = parseInt(days) || 0;
    if (initialData && m === 0 && d === 0) return;
    
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + m);
    targetDate.setDate(targetDate.getDate() + d);
    setDueDate(targetDate.toISOString().split('T')[0]);
  }, [months, days, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: initialData ? initialData.id : generateUUID(),
      name,
      amount: Number(amount),
      currency,
      dueDate,
      recurrence: recurrence || undefined
    });
    onClose();
  };

  const styles = {
    label: "text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block ml-1",
    inputContainer: "relative flex items-center bg-surface-sunken border border-white/10 rounded-md h-[52px] transition-all focus-within:border-brand-primary/60 focus-within:ring-1 focus-within:ring-brand-primary/30",
    input: "w-full h-full bg-transparent text-[14px] text-white placeholder:text-zinc-600 px-4 outline-none font-medium rounded-md",
    select: "w-full h-full bg-transparent text-[14px] text-white px-4 outline-none appearance-none cursor-pointer font-medium rounded-md",
    iconLeft: "pl-12",
    iconElement: "absolute left-4 text-zinc-500 pointer-events-none",
    iconRight: "absolute right-4 text-zinc-500 pointer-events-none",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Gasto' : 'Nuevo Gasto'}>
      <form onSubmit={handleSubmit} className="space-y-5 pt-1">
        
        {/* Concept */}
        <div>
           <label className={styles.label}>Concepto</label>
           <div className={styles.inputContainer}>
              <Tag size={18} className={styles.iconElement} />
              <input 
                value={name} onChange={e => setName(e.target.value)}
                className={`${styles.input} ${styles.iconLeft}`}
                placeholder="Ej. Pago Proveedor"
                required
              />
           </div>
        </div>

        {/* Amount & Currency */}
        <div className="grid grid-cols-2 gap-4">
           <div>
              <label className={styles.label}>Monto</label>
              <div className={styles.inputContainer}>
                 <DollarSign size={18} className={styles.iconElement} />
                 <input 
                   type="number" value={amount} onChange={e => setAmount(e.target.value)}
                   className={`${styles.input} ${styles.iconLeft}`}
                   placeholder="0.00"
                   required
                   inputMode="decimal"
                 />
              </div>
           </div>
           
           <div>
              <label className={styles.label}>Moneda</label>
              <div className={styles.inputContainer}>
                 <select 
                    value={currency} onChange={e => setCurrency(e.target.value)}
                    className={styles.select}
                 >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="COP">COP</option>
                    <option value="VES">VES</option>
                    <option value="USDT">USDT</option>
                 </select>
                 <ChevronDown size={16} className={styles.iconRight} />
              </div>
           </div>
        </div>

        {/* Duration */}
        <div>
           <label className={styles.label}>Vencimiento (Tiempo)</label>
           <div className="grid grid-cols-2 gap-4 mb-4">
              <div className={styles.inputContainer}>
                 <div className="absolute left-1 w-10 h-[44px] bg-surface-zinc rounded-sm flex items-center justify-center top-[3px] border border-white/5">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">MES</span>
                 </div>
                 <input 
                   type="number" min="0"
                   value={months} 
                   onChange={e => setMonths(e.target.value)} 
                   className="w-full bg-transparent text-center text-white font-bold outline-none text-[14px] pl-12"
                   placeholder="0"
                   inputMode="numeric"
                   pattern="[0-9]*"
                 />
              </div>
              
              <div className={styles.inputContainer}>
                 <div className="absolute left-1 w-10 h-[44px] bg-surface-zinc rounded-sm flex items-center justify-center top-[3px] border border-white/5">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase">DIA</span>
                 </div>
                 <input 
                   type="number" min="0"
                   value={days} 
                   onChange={e => setDays(e.target.value)} 
                   className="w-full bg-transparent text-center text-white font-bold outline-none text-[14px] pl-12"
                   placeholder="0"
                   inputMode="numeric"
                   pattern="[0-9]*"
                 />
              </div>
           </div>

           <div className="bg-surface-sunken border border-white/10 rounded-md px-4 h-[52px] flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                 <Calendar size={16} className="text-zinc-500" />
                 <span className="text-zinc-500 text-[10px] font-semibold uppercase tracking-wide">Fecha Límite:</span>
              </div>
              <input 
                type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="bg-transparent text-right text-white font-mono text-[14px] font-bold outline-none cursor-pointer"
                required
              />
           </div>
        </div>

        {/* Recurrence */}
        <div>
           <label className={styles.label}>Frecuencia (Opcional)</label>
           <div className={styles.inputContainer}>
              <Repeat size={18} className={styles.iconElement} />
              <select 
                 value={recurrence} onChange={e => setRecurrence(e.target.value)}
                 className={`${styles.select} pl-12`}
              >
                 <option value="">Una vez</option>
                 <option value="Mensual">Mensual</option>
                 <option value="Trimestral">Trimestral</option>
                 <option value="Anual">Anual</option>
              </select>
              <ChevronDown size={16} className={styles.iconRight} />
           </div>
        </div>

        <div className="pt-4">
           <button 
             type="submit" 
             className="btn-primary w-full h-[52px] rounded-lg text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(106,44,255,0.4)]"
           >
              <Check size={18} /> {initialData ? 'Actualizar Gasto' : 'Guardar Gasto'}
           </button>
        </div>
      </form>
    </Modal>
  );
};

export default PayableModal;
