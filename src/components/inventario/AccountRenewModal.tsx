import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Account, FinancialAccount } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Calendar, Wallet, RefreshCw, Check, ChevronDown, Search, X, ChevronRight } from 'lucide-react';
import { generateUUID } from '../../utils/uuid';
import { addTime, formatDate } from '../../utils/contactosUtils';

interface WalletSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: FinancialAccount[];
  onSelect: (account: FinancialAccount | null) => void;
}

const WalletSearchModal: React.FC<WalletSearchModalProps> = ({ isOpen, onClose, accounts, onSelect }) => {
  const [search, setSearch] = useState('');
  const filtered = accounts.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  // Usamos el componente Modal base con isTopMost para asegurar que salga al frente de todo
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Seleccionar Billetera" 
      isTopMost={true}
    >
      <div className="space-y-4 pt-1">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled" />
          <input 
            autoFocus 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Buscar billetera..." 
            className="w-full bg-surface-sunken rounded-md pl-11 pr-4 py-3.5 text-sm text-text-primary outline-none border border-[rgb(var(--fg-rgb))]/10 focus:border-brand-primary/50 transition-all placeholder:text-text-faint font-medium" 
          />
        </div>
        
        <div className="space-y-2 overflow-y-auto max-h-[350px] custom-scrollbar pr-1">
          <button 
            onClick={() => { onSelect(null); onClose(); }} 
            className="w-full text-left p-4 rounded-lg bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/5 flex items-center gap-3 transition-all active:scale-[0.98] group"
          >
            <div className="w-10 h-10 rounded-sm bg-zinc-800 flex items-center justify-center text-text-muted group-hover:text-text-primary transition-colors border border-[rgb(var(--fg-rgb))]/5 shrink-0">
              <X size={18} />
            </div>
            <span className="text-sm font-bold text-text-muted group-hover:text-text-primary">No registrar salida</span>
          </button>

          {filtered.map(acc => (
            <button 
              key={acc.id} 
              onClick={() => { onSelect(acc); onClose(); }} 
              className="w-full text-left p-4 rounded-lg bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 flex items-center gap-3 transition-all active:scale-[0.98] group hover:border-brand-primary/30"
            >
              <div className="w-10 h-10 rounded-sm bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 shrink-0">
                <Wallet size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors truncate">{acc.name}</p>
                <p className="text-[10px] text-text-disabled font-mono mt-0.5">{acc.balance} {acc.currency}</p>
              </div>
              <ChevronRight size={16} className="ml-auto text-text-faint group-hover:text-text-primary" />
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="py-8 text-center opacity-40">
              <p className="text-xs text-text-disabled">No se encontraron billeteras</p>
            </div>
          )}
        </div>

        <button 
          onClick={onClose} 
          className="w-full py-4 text-text-disabled text-xs font-semibold uppercase tracking-widest active:text-text-primary transition-colors"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
};

interface AccountRenewModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  serviceName: string;
}

const AccountRenewModal: React.FC<AccountRenewModalProps> = ({ isOpen, onClose, accounts, serviceName }) => {
  const { updateAccount, executeTransaction, addExpense, financialAccounts, settings } = useData();
  const { showToast } = useToast();
  const { user } = useAuth();
  
  const [months, setMonths] = useState('1');
  const [days, setDays] = useState('');
  const [cost, setCost] = useState('');
  const [walletId, setWalletId] = useState('');
  const [isWalletSearchOpen, setIsWalletSearchOpen] = useState(false);
  const [newDateStr, setNewDateStr] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMonths('1');
      setDays('');
      setCost('');
      const defaultWallet = financialAccounts.find(f => f.currency === settings.currency && f.isActive !== false) || financialAccounts[0];
      if (defaultWallet) setWalletId(defaultWallet.id);
    }
  }, [isOpen, financialAccounts, settings.currency]);

  useEffect(() => {
    if (accounts.length > 0) {
      const baseDate = accounts[0].endDate;
      const m = parseInt(months) || 0;
      const d = parseInt(days) || 0;
      setNewDateStr(addTime(baseDate, m, d));
    }
  }, [months, days, accounts]);

  const selectedWallet = financialAccounts.find(f => f.id === walletId);

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(cost);
    if (amount > 0 && !selectedWallet) {
        showToast('Debes seleccionar una billetera para registrar el costo', 'error');
        return;
    }

    try {
        for (const acc of accounts) {
           await updateAccount({
              ...acc,
              endDate: newDateStr,
              status: 'activa', 
              notes: (acc.notes || '') + `\n[RENOVACIÓN INVENTARIO: ${new Date().toLocaleDateString()}]`
           });
        }

        if (amount > 0 && selectedWallet) {
           await executeTransaction({
              id: generateUUID(),
              accountId: selectedWallet.id,
              type: 'withdrawal',
              amount: amount,
              currency: selectedWallet.currency,
              exchangeRate: 1,
              usdEquivalent: amount, 
              date: new Date().toISOString(),
              description: `Pago Proveedor: ${serviceName} (${accounts.length} cuentas)`,
              paymentMethod: 'Manual'
           });

           if (user) {
             await addExpense({
               id: generateUUID(),
               userId: user.id,
               date: new Date().toISOString().split('T')[0],
               amount: amount,
               exchangeRate: 1,
               category: 'operativo',
               description: `Renovación: ${serviceName} (${accounts.length} cuentas)`,
               paymentMethod: 'otro',
               financialAccountId: selectedWallet.id,
               createdAt: new Date().toISOString()
             });
           }
        }
        
        showToast(`${accounts.length === 1 ? 'Cuenta renovada' : 'Cuentas renovadas'} correctamente`, 'success');
        onClose();
    } catch (error: any) {
        console.error("Error renewing account:", error);
        showToast(error.message || 'Error al renovar la cuenta', 'error');
    }
  };

  const styles = {
    label: "text-[10px] font-semibold text-text-disabled uppercase tracking-wider mb-2 block ml-1",
    inputContainer: "relative flex items-center bg-surface-sunken rounded-md h-[52px] transition-all focus-within:ring-1 focus-within:ring-brand-primary/40 border border-[rgb(var(--fg-rgb))]/5",
    input: "w-full bg-transparent text-[14px] text-text-primary placeholder:text-text-faint px-4 h-full outline-none font-medium rounded-md",
    card: "bg-surface-zinc/60 border border-[rgb(var(--fg-rgb))]/5 rounded-xl p-5"
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Renovar Inventario" zIndex={10000}>
         <div className="space-y-5 pt-1">
            <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-lg p-4 flex items-center gap-3.5">
               <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center shrink-0 text-brand-primary">
                  <RefreshCw size={20} />
               </div>
               <div>
                  <h4 className="text-brand-primary font-bold text-sm">Renovando {accounts.length} {accounts.length === 1 ? 'cuenta' : 'cuentas'}</h4>
                  <p className="text-text-muted text-[11px] leading-tight mt-0.5 font-medium">
                     Servicio: <span className="text-text-primary font-bold">{serviceName}</span>
                  </p>
               </div>
            </div>

            <div className={styles.card}>
               <div className="flex items-center gap-2 mb-4">
                  <Calendar size={16} className="text-text-muted" />
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Extensión de Tiempo</span>
               </div>
               <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                     <label className={styles.label}>Meses</label>
                     <div className={styles.inputContainer}>
                        <div className="absolute left-1 top-1 bottom-1 w-10 bg-surface-zinc rounded-sm flex items-center justify-center text-[10px] font-semibold text-text-disabled border border-[rgb(var(--fg-rgb))]/5">
                           +M
                        </div>
                        <input type="number" min="0" value={months} onChange={e => setMonths(e.target.value)} className={`${styles.input} pl-12 text-center font-bold`} placeholder="0" inputMode="numeric" />
                     </div>
                  </div>
                  <div>
                     <label className={styles.label}>Días</label>
                     <div className={styles.inputContainer}>
                        <div className="absolute left-1 top-1 bottom-1 w-10 bg-surface-zinc rounded-sm flex items-center justify-center text-[10px] font-semibold text-text-disabled border border-[rgb(var(--fg-rgb))]/5">
                           +D
                        </div>
                        <input type="number" min="0" value={days} onChange={e => setDays(e.target.value)} className={`${styles.input} pl-12 text-center font-bold`} placeholder="0" inputMode="numeric" />
                     </div>
                  </div>
               </div>
               <div>
                  <label className={styles.label}>Nueva Fecha</label>
                  <div className={`${styles.inputContainer} border-status-success/20 bg-status-success/5`}>
                     <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-status-success" />
                     <input type="date" value={newDateStr} onChange={(e) => setNewDateStr(e.target.value)} className={`${styles.input} pl-12 text-text-primary font-bold tracking-wide`} />
                  </div>
               </div>
            </div>

            <div className={styles.card}>
               <div className="flex items-center gap-2 mb-4">
                  <Wallet size={16} className="text-text-muted" />
                  <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Costo de Renovación</span>
               </div>
               <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-3">
                     <label className={styles.label}>Billetera Salida</label>
                     <button onClick={() => setIsWalletSearchOpen(true)} className={`${styles.inputContainer} w-full px-4 justify-between hover:bg-surface-zinc transition-colors text-left`}>
                        <span className={`text-[13px] font-medium truncate ${selectedWallet ? 'text-text-primary' : 'text-text-disabled'}`}>{selectedWallet ? selectedWallet.name : 'No registrar'}</span>
                        <ChevronDown size={16} className="text-text-disabled shrink-0" />
                     </button>
                  </div>
                  <div className="col-span-2">
                     <label className={styles.label}>Costo ({settings.currency})</label>
                     <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" className={`${styles.input} text-center font-bold`} inputMode="decimal" />
                  </div>
               </div>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <button onClick={handleRenew} className="btn-primary w-full h-[52px] rounded-lg text-[13px] flex items-center justify-center gap-2">
                 <Check size={18} /> Confirmar Renovación
              </button>
              <button onClick={onClose} className="w-full h-[48px] bg-surface-zinc border border-[rgb(var(--fg-rgb))]/10 hover:bg-surface-4 text-text-muted rounded-lg font-bold text-[12px] transition-all active:scale-98">Cancelar Operación</button>
            </div>
         </div>
      </Modal>

      <WalletSearchModal 
        isOpen={isWalletSearchOpen} 
        onClose={() => setIsWalletSearchOpen(false)} 
        accounts={financialAccounts} 
        onSelect={(acc) => setWalletId(acc?.id || '')} 
      />
    </>
  );
};

export default AccountRenewModal;