
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { FinancialAccount, PaymentMethod } from '../../types';
import { Save, Plus, Trash2, CreditCard, Globe, ChevronRight, Wallet, ChevronDown } from 'lucide-react';
import { generateUUID } from '../../utils/uuid';

interface AccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FinancialAccount) => void;
  initialData?: FinancialAccount | null;
}

const AccountFormModal: React.FC<AccountFormModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [customCurrency, setCustomCurrency] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [balance, setBalance] = useState('');
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodDesc, setNewMethodDesc] = useState('');

  const STANDARD_CURRENCIES = ['USD', 'USDT', 'USDC', 'VES', 'COP', 'EUR', 'MXN', 'ARS', 'BRL'];

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setBalance(initialData.balance.toString());
        setMethods(initialData.paymentMethods || []);
        if (STANDARD_CURRENCIES.includes(initialData.currency)) {
          setCurrency(initialData.currency);
          setIsCustom(false);
          setCustomCurrency('');
        } else {
          setCurrency('OTHER');
          setIsCustom(true);
          setCustomCurrency(initialData.currency);
        }
      } else {
        setName('');
        setCurrency('USD');
        setCustomCurrency('');
        setIsCustom(false);
        setBalance('');
        setMethods([]);
      }
      setNewMethodName('');
      setNewMethodDesc('');
    }
  }, [isOpen, initialData]);

  const handleCurrencyChange = (val: string) => {
    if (val === 'OTHER') {
      setIsCustom(true);
      setCurrency('OTHER');
    } else {
      setIsCustom(false);
      setCurrency(val);
    }
  };

  const handleAddMethod = () => {
    if (!newMethodName.trim()) return;
    const method: PaymentMethod = {
      id: generateUUID(),
      name: newMethodName,
      description: newMethodDesc
    };
    setMethods([...methods, method]);
    setNewMethodName('');
    setNewMethodDesc('');
  };

  const handleRemoveMethod = (id: string) => {
    setMethods(methods.filter(m => m.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCurrency = isCustom ? customCurrency.toUpperCase().trim() : currency;
    if (!finalCurrency) return;

    onSubmit({
      id: initialData ? initialData.id : generateUUID(),
      name,
      currency: finalCurrency,
      balance: parseFloat(balance) || 0,
      paymentMethods: methods
    });
    onClose();
  };

  const styles = {
    label: "text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block ml-1",
    inputContainer: "relative flex items-center bg-surface-sunken border border-white/10 rounded-md h-[52px] transition-all focus-within:border-brand-primary/60 focus-within:ring-1 focus-within:ring-brand-primary/30",
    input: "w-full h-full bg-transparent text-sm text-white placeholder:text-zinc-600 px-4 outline-none font-medium rounded-md",
    select: "w-full h-full bg-transparent text-sm text-white px-4 outline-none appearance-none cursor-pointer font-medium rounded-md",
    iconLeft: "pl-12",
    iconElement: "absolute left-4 text-zinc-500 pointer-events-none",
    iconRight: "absolute right-4 text-zinc-500 pointer-events-none",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Cuenta' : 'Nueva Cuenta'}>
      <div className="space-y-5 pt-1">
        
        <div>
           <label className={styles.label}>Nombre</label>
           <div className={styles.inputContainer}>
              <Wallet size={18} className={styles.iconElement} />
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${styles.input} ${styles.iconLeft}`}
                placeholder="Ej. Banco Nacional"
                required
              />
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div>
              <label className={styles.label}>Moneda</label>
              <div className={styles.inputContainer}>
                 <select 
                   value={currency}
                   onChange={(e) => handleCurrencyChange(e.target.value)}
                   className={styles.select}
                 >
                    {STANDARD_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="OTHER">Otra</option>
                 </select>
                 <ChevronDown size={16} className={styles.iconRight} />
              </div>
              {isCustom && (
                <div className={`${styles.inputContainer} mt-2`}>
                  <input 
                    value={customCurrency}
                    onChange={(e) => setCustomCurrency(e.target.value)}
                    placeholder="CÓDIGO"
                    className={`${styles.input} uppercase`}
                  />
                </div>
              )}
           </div>

           <div>
              <label className={styles.label}>Saldo Inicial</label>
              <div className={styles.inputContainer}>
                 <input 
                   type="number"
                   step="0.01"
                   value={balance}
                   onChange={(e) => setBalance(e.target.value)}
                   className={styles.input}
                   placeholder="0.00"
                 />
              </div>
           </div>
        </div>

        <div className="bg-surface-sunken border border-white/10 rounded-lg p-4">
           <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Métodos de Pago</span>
           </div>
           
           <div className="flex gap-2 mb-3">
              <input 
                value={newMethodName}
                onChange={(e) => setNewMethodName(e.target.value)}
                className="w-full bg-surface-zinc rounded-md border border-white/5 px-4 h-[48px] text-sm text-white outline-none focus:border-brand-primary/50 transition-all"
                placeholder="Nombre (Ej. Pago Móvil)"
              />
              <button 
                type="button"
                onClick={handleAddMethod}
                className="bg-white/5 hover:bg-white/10 text-white w-[48px] h-[48px] rounded-md transition-colors border border-white/5 flex items-center justify-center shrink-0"
              >
                 <Plus size={18} />
              </button>
           </div>

           <div className="space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
              {methods.map(m => (
                 <div key={m.id} className="flex justify-between items-center bg-surface-zinc px-4 py-3 rounded-md border border-white/5">
                    <span className="text-sm text-zinc-300 font-semibold">{m.name}</span>
                    <button type="button" onClick={() => handleRemoveMethod(m.id)} className="text-zinc-500 hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                 </div>
              ))}
           </div>
        </div>

        <div className="flex gap-3 pt-4">
           <button type="button" onClick={onClose} className="flex-1 h-[52px] bg-white/5 rounded-lg text-sm font-bold text-zinc-400 transition-colors border border-white/5">Cancelar</button>
           <button onClick={handleSubmit} className="btn-primary flex-1 h-[52px] rounded-lg text-sm">
             {initialData ? 'Guardar' : 'Crear'}
           </button>
        </div>

      </div>
    </Modal>
  );
};

export default AccountFormModal;
