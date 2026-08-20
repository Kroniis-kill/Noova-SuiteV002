
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { PayableExpense, FinancialAccount } from '../../types';
import { useData } from '../../context/DataContext';
import { Wallet, Tag, ChevronDown, DollarSign, Check, AlertCircle, Search, X, ChevronRight } from 'lucide-react';

// --- SUB-COMPONENT: ACCOUNT SEARCH MODAL ---
interface AccountSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: FinancialAccount[];
  onSelect: (account: FinancialAccount) => void;
}

const AccountSearchModal: React.FC<AccountSearchModalProps> = ({ isOpen, onClose, accounts, onSelect }) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search) return accounts;
    return accounts.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
  }, [accounts, search]);

  useEffect(() => { if (isOpen) setSearch(''); }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Seleccionar Billetera">
      <div className="flex flex-col h-[60vh] md:h-[450px] pt-1">
        <div className="relative mb-4 shrink-0">
           <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
           <input 
             value={search} onChange={(e) => setSearch(e.target.value)}
             placeholder="Buscar cuenta..."
             className="w-full bg-surface-sunken rounded-md pl-11 pr-10 py-3.5 text-sm text-white outline-none focus:ring-1 focus:ring-brand-primary/50 transition-all placeholder:text-zinc-600 font-medium"
             autoFocus
           />
           {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"><X size={14} /></button>}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
           {filtered.map(acc => (
              <button key={acc.id} onClick={() => { onSelect(acc); onClose(); }} className="w-full flex items-center gap-3 p-3 rounded-md bg-surface-zinc/40 border border-white/5 hover:bg-surface-4 hover:border-brand-primary/30 transition-all group text-left">
                 <div className="w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white border border-white/5 shrink-0"><Wallet size={18} /></div>
                 <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-200 group-hover:text-white truncate">{acc.name}</p>
                    <p className="text-[10px] text-zinc-500">Saldo: {acc.balance} {acc.currency}</p>
                 </div>
                 <ChevronRight size={16} className="text-zinc-600 group-hover:text-brand-primary transition-colors" />
              </button>
           ))}
           {filtered.length === 0 && <p className="text-center text-zinc-500 text-sm py-8">No hay cuentas disponibles.</p>}
        </div>
      </div>
    </Modal>
  );
};

// --- MAIN COMPONENT ---

interface PayPayableModalProps {
  isOpen: boolean;
  onClose: () => void;
  payable: PayableExpense | null;
  onConfirm: (
    payable: PayableExpense, 
    accountId: string, 
    category: string, 
    amountPaid: number,
    currencyPaid: string,
    exchangeRate: number
  ) => void;
}

const PayPayableModal: React.FC<PayPayableModalProps> = ({ isOpen, onClose, payable, onConfirm }) => {
  const { financialAccounts, settings } = useData();
  
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [category, setCategory] = useState('operativo');
  const [amount, setAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(settings.exchangeRate || 1);
  const [conversionInfo, setConversionInfo] = useState('');
  const [isAccountSearchOpen, setIsAccountSearchOpen] = useState(false);

  useEffect(() => {
    if (isOpen && payable) {
      const match = financialAccounts.find(f => f.currency === payable.currency && f.isActive !== false);
      const fallback = financialAccounts.find(f => f.isActive !== false);
      const acc = match || fallback;
      setSelectedAccountId(acc ? acc.id : '');
      setAmount(payable.amount.toString());
      setExchangeRate(settings.exchangeRate || 1);
      setCategory('operativo');
    }
  }, [isOpen, payable, financialAccounts]);

  useEffect(() => {
    if (!selectedAccountId || !payable) { setConversionInfo(''); return; }
    const acc = financialAccounts.find(a => a.id === selectedAccountId);
    if (!acc) return;
    const numAmount = parseFloat(amount) || 0;
    if (acc.currency !== payable.currency) {
        if (acc.currency === 'USD' || ['USDT','USDC','EUR'].includes(acc.currency)) {
            const equiv = exchangeRate > 0 ? numAmount / exchangeRate : 0;
            setConversionInfo(`Se descontarán ≈ ${equiv.toFixed(2)} ${acc.currency} de tu cuenta.`);
        } else {
            const equiv = numAmount * exchangeRate;
            setConversionInfo(`Se descontarán ≈ ${equiv.toFixed(2)} ${acc.currency} de tu cuenta.`);
        }
    } else { setConversionInfo(''); }
  }, [selectedAccountId, amount, exchangeRate, payable, financialAccounts]);

  if (!payable) return null;

  const selectedAccount = financialAccounts.find(a => a.id === selectedAccountId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return;
    
    const validCategories = ['operativo', 'personal', 'servicio'];
    const dbCategory = validCategories.includes(category) ? category : 'operativo';
    
    onConfirm(payable, selectedAccountId, dbCategory, parseFloat(amount), selectedAccount?.currency || payable.currency, exchangeRate);
    onClose();
  };

  const styles = {
    label: "text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1 block ml-1",
    inputContainer: "relative flex items-center bg-surface-sunken rounded-sm h-[44px] transition-all focus-within:ring-1 focus-within:ring-status-info/60",
    input: "w-full bg-transparent text-[13px] text-white placeholder:text-zinc-600 px-3 h-full outline-none font-medium rounded-sm",
    select: "w-full bg-transparent text-[13px] text-white px-3 pl-9 h-full outline-none appearance-none cursor-pointer font-medium rounded-sm",
    iconLeft: "pl-9",
    iconElement: "absolute left-3 text-zinc-500 pointer-events-none",
    iconRight: "absolute right-3 text-zinc-500 pointer-events-none",
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Procesar Pago">
         <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            
            <div className="bg-surface-zinc p-3 rounded-md border border-white/5 mb-2">
               <div className="flex justify-between items-center mb-1">
                  <span className="text-zinc-400 text-[11px] font-medium">Concepto:</span>
                  <span className="text-white text-sm font-bold">{payable.name}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-[11px] font-medium">Monto Original:</span>
                  <span className="text-white text-sm font-mono">{payable.amount} {payable.currency}</span>
               </div>
            </div>

            <div>
               <label className={styles.label}>Pagar desde cuenta</label>
               <div 
                 onClick={() => setIsAccountSearchOpen(true)}
                 className={`${styles.inputContainer} cursor-pointer hover:ring-1 hover:ring-brand-primary/40 active:scale-[0.99]`}
               >
                  <Wallet size={14} className={styles.iconElement} />
                  <div className={`${styles.input} ${styles.iconLeft} flex items-center`}>
                     <span className={selectedAccount ? "text-white" : "text-zinc-500"}>
                        {selectedAccount ? `${selectedAccount.name} (${selectedAccount.currency})` : "Seleccionar cuenta..."}
                     </span>
                  </div>
                  <ChevronDown size={14} className={styles.iconRight} />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div>
                  <label className={styles.label}>Monto a Pagar</label>
                  <div className={styles.inputContainer}>
                     <DollarSign size={14} className={styles.iconElement} />
                     <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={`${styles.input} ${styles.iconLeft}`} required />
                  </div>
               </div>
               
               <div>
                  <label className={styles.label}>Tasa de Cambio</label>
                  <div className={styles.inputContainer}>
                     <input type="number" step="0.01" value={exchangeRate} onChange={e => setExchangeRate(parseFloat(e.target.value))} className={`${styles.input}`} disabled={selectedAccount?.currency === payable.currency} />
                  </div>
               </div>
            </div>

            {conversionInfo && (
               <div className="flex gap-2 items-start bg-amber-500/10 p-2.5 rounded-sm border border-amber-500/20">
                  <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-200/80 leading-snug">{conversionInfo}</p>
               </div>
            )}

            <div>
               <label className={styles.label}>Categoría del Gasto</label>
               <div className={styles.inputContainer}>
                  <Tag size={14} className={styles.iconElement} />
                  <select value={category} onChange={e => setCategory(e.target.value)} className={styles.select}>
                     <option value="operativo">Gasto Operativo</option>
                     <option value="personal">Gasto Personal</option>
                     <option value="servicio">Servicio / Suscripción</option>
                     <option value="impuesto">Impuestos</option>
                     <option value="otro">Otro</option>
                  </select>
                  <ChevronDown size={14} className={styles.iconRight} />
               </div>
            </div>

            <div className="pt-2">
               <button type="submit" disabled={!selectedAccountId} className="w-full h-[48px] bg-gradient-to-r from-brand-primary to-brand-accent hover:brightness-110 text-white rounded-xl font-bold shadow-[0_0_15px_rgba(106,44,255,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[13px] disabled:opacity-50 disabled:cursor-not-allowed">
                  <Check size={16} /> Confirmar Pago
               </button>
            </div>

         </form>
      </Modal>

      <AccountSearchModal 
         isOpen={isAccountSearchOpen}
         onClose={() => setIsAccountSearchOpen(false)}
         accounts={financialAccounts.filter(f => f.isActive !== false)}
         onSelect={(acc) => setSelectedAccountId(acc.id)}
      />
    </>
  );
};

export default PayPayableModal;
