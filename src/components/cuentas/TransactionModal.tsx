
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { FinancialAccount, Movement } from '../../types';
import { useData } from '../../context/DataContext';
import { TrendingUp, TrendingDown, ArrowRightLeft, ArrowRight, ChevronDown, Search, X, ChevronRight, Wallet, Check } from 'lucide-react';
import { generateUUID } from '../../utils/uuid';
import { useHaptic } from '../../hooks/useHaptic';

interface AccountSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: FinancialAccount[];
  onSelect: (account: FinancialAccount) => void;
  currentAccountId: string;
}

const AccountSearchModal: React.FC<AccountSearchModalProps> = ({ isOpen, onClose, accounts, onSelect, currentAccountId }) => {
  const [search, setSearch] = useState('');
  const haptic = useHaptic();
  
  const filtered = useMemo(() => {
    let list = accounts.filter(a => a.id !== currentAccountId); 
    if (!search) return list;
    return list.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
  }, [accounts, search, currentAccountId]);

  useEffect(() => { if (isOpen) setSearch(''); }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cuenta Destino">
      <div className="flex flex-col h-[60vh] md:h-[450px] pt-1">
        <div className="relative mb-4 shrink-0">
           <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-disabled" />
           <input 
             value={search} onChange={(e) => setSearch(e.target.value)}
             placeholder="Buscar cuenta..."
             className="w-full bg-surface-sunken rounded-md pl-11 pr-10 py-3.5 text-sm text-primary outline-none focus:ring-1 focus:ring-brand-primary/50 transition-all placeholder:text-faint font-medium"
             autoFocus
           />
           {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-disabled hover:text-primary p-1 active:scale-90 transition-transform"><X size={14} /></button>}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
           {filtered.map(acc => (
              <button key={acc.id} onClick={() => { haptic('nav'); onSelect(acc); onClose(); }} className="w-full flex items-center gap-3 p-3 rounded-md bg-surface-zinc/40 border border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-4 hover:border-brand-primary/30 transition-all group text-left active:scale-[0.98]">
                 <div className="w-10 h-10 rounded-sm bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-muted group-hover:text-primary border border-[rgb(var(--fg-rgb))]/5 shrink-0"><Wallet size={18} /></div>
                 <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-secondary group-hover:text-primary truncate">{acc.name}</p>
                    <p className="text-[10px] text-disabled">{acc.currency}</p>
                 </div>
                 <ChevronRight size={16} className="text-faint group-hover:text-brand-primary transition-colors" />
              </button>
           ))}
        </div>
      </div>
    </Modal>
  );
};

type TransactionMode = 'fund' | 'withdraw' | 'transfer';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: FinancialAccount | null;
  mode: TransactionMode;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, account, mode }) => {
  const { financialAccounts, settings, executeTransaction, executeTransfer } = useData();
  const haptic = useHaptic();
  
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [description, setSearchQuery] = useState('');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [isAccountSearchOpen, setIsAccountSearchOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setRate(settings.exchangeRate > 0 ? settings.exchangeRate.toString() : '');
      setPaymentMethod('');
      setSearchQuery('');
      setTargetAccountId('');
    }
  }, [isOpen, settings.exchangeRate]);

  if (!account) return null;

  const targetAccount = financialAccounts.find(a => a.id === targetAccountId);

  const getTitle = () => {
    switch(mode) {
      case 'fund': return 'Ingreso de Dinero';
      case 'withdraw': return 'Retiro de Dinero';
      case 'transfer': return 'Transferencia';
    }
  };

  const isUSDLike = ['USD', 'USDT', 'USDC'].includes(account.currency);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    const numRate = parseFloat(rate) || 1;

    if (!numAmount || numAmount <= 0) return;

    if (mode === 'transfer') {
       if (!targetAccountId) return;
       executeTransfer(account.id, targetAccountId, numAmount, numRate, description);
    } else {
       const movement: Movement = {
          id: generateUUID(),
          accountId: account.id,
          type: mode === 'fund' ? 'funding' : 'withdrawal',
          amount: numAmount,
          currency: account.currency,
          exchangeRate: isUSDLike ? 1 : numRate,
          usdEquivalent: isUSDLike ? numAmount : (numRate > 0 ? numAmount / numRate : 0),
          date: new Date().toISOString(),
          description: description,
          paymentMethod: paymentMethod || 'Manual'
       };
       executeTransaction(movement);
    }
    haptic('success');
    onClose();
  };

  const styles = {
    label: "text-[10px] font-semibold text-disabled uppercase tracking-wider mb-1 block ml-1",
    inputContainer: "relative flex items-center bg-surface-sunken rounded-sm h-[44px] transition-all focus-within:ring-1 focus-within:ring-status-info/60",
    input: "w-full bg-transparent text-[13px] text-primary placeholder:text-faint px-3 h-full outline-none font-medium rounded-sm",
    select: "w-full bg-transparent text-[13px] text-primary px-3 pl-3 h-full outline-none appearance-none cursor-pointer font-medium rounded-sm",
    iconRight: "absolute right-3 text-disabled pointer-events-none",
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
         <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            
            <div className="bg-surface-sunken rounded-xl p-5 text-center">
               <label className={styles.label} style={{ textAlign: 'center', marginLeft: 0 }}>Monto ({account.currency})</label>
               <div className="flex items-center justify-center gap-1 mt-2">
                  <span className="text-3xl text-disabled font-light">$</span>
                  <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="bg-transparent text-5xl font-bold text-primary outline-none w-48 text-center placeholder:text-faint" placeholder="0.00" autoFocus required inputMode="decimal" />
               </div>
            </div>

            {mode === 'transfer' && (
               <div>
                  <label className={styles.label}>Cuenta Destino</label>
                  <div className="flex items-center gap-3 bg-surface-sunken p-1.5 rounded-md">
                     <div className="flex-1 bg-surface-zinc rounded-sm py-2.5 text-[11px] text-muted text-center font-bold">{account.name}</div>
                     <ArrowRight size={14} className="text-status-info" />
                     <div className="flex-1 relative h-[36px]">
                        <button 
                           type="button"
                           onClick={() => { haptic('nav'); setIsAccountSearchOpen(true); }}
                           className="w-full h-full bg-surface-zinc rounded-sm flex items-center justify-between px-3 text-[11px] text-primary font-bold hover:bg-surface-4 transition-colors active:scale-95"
                        >
                           <span className={targetAccount ? "text-primary" : "text-disabled"}>{targetAccount ? targetAccount.name : "Seleccionar..."}</span>
                           <ChevronDown size={12} className="text-disabled" />
                        </button>
                     </div>
                  </div>
               </div>
            )}

            <div className="grid grid-cols-2 gap-3">
               {!isUSDLike && mode !== 'transfer' && (
                  <div>
                     <label className={styles.label}>Tasa Ref.</label>
                     <div className={styles.inputContainer}>
                        <input type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)} className={styles.input} placeholder="0.00" inputMode="decimal" />
                     </div>
                  </div>
               )}

               {mode !== 'transfer' && (
                  <div className={!isUSDLike ? "" : "col-span-2"}>
                     <label className={styles.label}>Método</label>
                     <div className={styles.inputContainer}>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={styles.select}>
                           <option value="">Seleccionar...</option>
                           {account.paymentMethods.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                           <option value="Efectivo">Efectivo</option>
                           <option value="Otro">Otro</option>
                        </select>
                        <ChevronDown size={14} className={styles.iconRight} />
                     </div>
                  </div>
               )}
            </div>

            <div>
               <label className={styles.label}>Nota</label>
               <div className={styles.inputContainer}>
                  <input value={description} onChange={e => setSearchQuery(e.target.value)} className={styles.input} placeholder="Concepto (Opcional)" />
               </div>
            </div>

            <div className="pt-2">
               <button type="submit" className="btn-primary w-full h-[52px] rounded-xl text-sm flex items-center justify-center gap-2">
                  <Check size={18} /> Confirmar Operación
               </button>
            </div>

         </form>
      </Modal>

      <AccountSearchModal 
         isOpen={isAccountSearchOpen}
         onClose={() => setIsAccountSearchOpen(false)}
         accounts={financialAccounts}
         currentAccountId={account.id}
         onSelect={(acc) => setTargetAccountId(acc.id)}
      />
    </>
  );
};

export default TransactionModal;
