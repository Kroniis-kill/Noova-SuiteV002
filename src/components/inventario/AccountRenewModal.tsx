import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
            className="w-full bg-surface-sunken rounded-md pl-11 pr-4 h-11 text-sm text-text-primary outline-none border border-[rgb(var(--fg-rgb))]/5 focus:border-brand-primary/50 transition-all placeholder:text-text-faint font-medium" 
          />
        </div>
        
        <div className="space-y-2 overflow-y-auto max-h-[350px] custom-scrollbar pr-1">
          <button 
            onClick={() => { onSelect(null); onClose(); }} 
            className="w-full text-left p-4 rounded-xl bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/5 flex items-center gap-3 transition-all active:scale-[0.98] group"
          >
            <div className="w-10 h-10 rounded-md bg-surface-sunken flex items-center justify-center text-text-muted group-hover:text-text-primary transition-colors border border-[rgb(var(--fg-rgb))]/5 shrink-0">
              <X size={18} />
            </div>
            <span className="text-sm font-bold text-text-muted group-hover:text-text-primary">No registrar salida</span>
          </button>

          {filtered.map(acc => (
            <button 
              key={acc.id} 
              onClick={() => { onSelect(acc); onClose(); }} 
              className="w-full text-left p-4 rounded-xl bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 flex items-center gap-3 transition-all active:scale-[0.98] group hover:border-brand-primary/30"
            >
              <div className="w-10 h-10 rounded-md bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 shrink-0">
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

  const mainCurrency = settings.currency || 'USD';
  const subCurrency = settings.subCurrency || 'SEC';
  const rate = settings.exchangeRate || 1;

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // El costo siempre se ingresa en la moneda principal de la app (USD)
    const costInMainCurrency = parseFloat(cost) || 0;
    if (costInMainCurrency > 0 && !selectedWallet) {
        showToast('Debes seleccionar una billetera para registrar el costo', 'error');
        return;
    }

    // Convertimos el costo (USD) a la moneda real de la billetera seleccionada,
    // igual que en ExpenseModal.tsx, para descontar el monto correcto del balance.
    let deductAmount = costInMainCurrency;
    if (selectedWallet) {
        if (selectedWallet.currency === mainCurrency) {
            deductAmount = costInMainCurrency;
        } else if (selectedWallet.currency === subCurrency) {
            deductAmount = costInMainCurrency * rate;
        } else {
            const strongCurrencies = ['USD', 'USDT', 'USDC', 'EUR'];
            if (strongCurrencies.includes(selectedWallet.currency) && !strongCurrencies.includes(mainCurrency) && rate > 0) {
                deductAmount = costInMainCurrency / rate;
            } else if (!strongCurrencies.includes(selectedWallet.currency) && strongCurrencies.includes(mainCurrency)) {
                deductAmount = costInMainCurrency * rate;
            } else {
                deductAmount = costInMainCurrency;
            }
        }
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

        if (costInMainCurrency > 0 && selectedWallet) {
           await executeTransaction({
              id: generateUUID(),
              accountId: selectedWallet.id,
              type: 'withdrawal',
              amount: parseFloat(deductAmount.toFixed(2)),
              currency: selectedWallet.currency,
              exchangeRate: rate,
              usdEquivalent: costInMainCurrency, 
              date: new Date().toISOString(),
              description: `Pago Proveedor: ${serviceName} (${accounts.length} cuentas)`,
              paymentMethod: 'Manual'
           });

           if (user) {
             await addExpense({
               id: generateUUID(),
               userId: user.id,
               date: new Date().toISOString().split('T')[0],
               amount: costInMainCurrency,
               exchangeRate: rate,
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
    label: "text-[9px] font-bold text-text-faint uppercase tracking-[0.1em]",
    inputContainer: "relative flex items-center bg-surface-sunken rounded-md h-[46px] transition-all",
    input: "w-full bg-transparent text-[14px] text-text-primary placeholder:text-text-faint px-3 h-full outline-none border-none appearance-none font-bold [color-scheme:dark] [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0",
  };

  const modalVariants = {
    hidden: { y: "100%", opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300 } },
    exit: { y: "100%", opacity: 0, transition: { duration: 0.2 } }
  };

  if (typeof document === 'undefined') return null;

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" />
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed bottom-0 left-0 right-0 bg-surface-1 rounded-t-xl z-[9999] flex flex-col max-h-[90dvh] max-w-[400px] mx-auto md:bottom-6 md:rounded-xl border border-[rgb(var(--fg-rgb))]/5 overflow-hidden"
              >
                {/* Header */}
                <div className="px-5 pt-[18px] pb-[14px] flex items-center justify-between border-b border-[rgb(var(--fg-rgb))]/5 shrink-0">
                  <div className="min-w-0">
                    <h3 className="text-[17px] font-bold text-text-primary leading-tight">Renovar inventario</h3>
                    <p className="text-[9px] text-text-faint font-bold uppercase tracking-[0.15em] mt-1 truncate">{serviceName} · {accounts.length} {accounts.length === 1 ? 'cuenta' : 'cuentas'}</p>
                  </div>
                  <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 text-text-muted hover:text-text-primary transition-all active:scale-90 shrink-0">
                    <X size={16} />
                  </button>
                </div>

                <div className="overflow-y-auto px-5 pt-4 pb-[18px] flex flex-col gap-[14px]">

                  {/* Hero: vence actualmente */}
                  <div className="rounded-xl p-4 border border-brand-primary/25 bg-gradient-to-br from-brand-primary/[0.14] to-brand-accent/10 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-md bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 flex items-center justify-center shrink-0 text-brand-primary-hi">
                      <Calendar size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-text-muted">Vence actualmente</p>
                      <h4 className="text-text-primary font-bold text-[15px] mt-[1px]">{formatDate(accounts[0]?.endDate)}</h4>
                    </div>
                  </div>

                  {/* Extender por */}
                  <div>
                    <div className="text-[9px] font-bold text-text-faint uppercase tracking-[0.1em] mb-2 pl-[2px] flex items-center gap-[6px]">
                      <Calendar size={12} /> Extender por
                    </div>
                    <div className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 rounded-xl p-[14px] flex flex-col gap-[10px]">
                      <div className="grid grid-cols-2 gap-2">
                        <div className={styles.inputContainer}>
                          <span className="pl-3 text-[12px] font-bold text-text-faint shrink-0">+M</span>
                          <input type="number" min="0" value={months} onChange={e => setMonths(e.target.value)} className={`${styles.input} text-right`} placeholder="0" inputMode="numeric" />
                        </div>
                        <div className={styles.inputContainer}>
                          <span className="pl-3 text-[12px] font-bold text-text-faint shrink-0">+D</span>
                          <input type="number" min="0" value={days} onChange={e => setDays(e.target.value)} className={`${styles.input} text-right`} placeholder="0" inputMode="numeric" />
                        </div>
                      </div>
                      <div className="h-px bg-[rgb(var(--fg-rgb))]/5" />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-text-faint font-bold uppercase">Nueva fecha</span>
                        <input type="date" value={newDateStr} onChange={(e) => setNewDateStr(e.target.value)} className="bg-transparent text-[14px] text-status-success-soft font-bold outline-none border-none appearance-none [color-scheme:dark] text-right" />
                      </div>
                    </div>
                  </div>

                  {/* Costo de renovación */}
                  <div>
                    <div className="text-[9px] font-bold text-text-faint uppercase tracking-[0.1em] mb-2 pl-[2px] flex items-center gap-[6px]">
                      <Wallet size={12} /> Costo de renovación
                    </div>
                    <div className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 rounded-xl p-[14px] flex flex-col gap-[10px]">
                      <button onClick={() => setIsWalletSearchOpen(true)} className="w-full bg-surface-sunken rounded-md py-[10px] px-3 flex items-center justify-between text-left">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-brand-primary/15 text-brand-primary-hi flex items-center justify-center shrink-0">
                            <Wallet size={13} />
                          </div>
                          <span className={`text-[12px] font-semibold truncate ${selectedWallet ? 'text-text-primary' : 'text-text-faint'}`}>{selectedWallet ? selectedWallet.name : 'No registrar'}</span>
                        </div>
                        <ChevronDown size={15} className="text-text-faint shrink-0" />
                      </button>
                      <div className="bg-surface-sunken rounded-md p-3 flex items-center gap-2">
                        <span className="text-[18px] text-status-success-soft font-bold">$</span>
                        <input type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" className="flex-1 min-w-0 bg-transparent text-[20px] text-text-primary font-bold outline-none border-none appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" inputMode="decimal" />
                        <span className="text-[10px] text-text-faint font-bold shrink-0">{settings.currency}</span>
                      </div>
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex flex-col gap-2 pt-[2px]">
                    <button onClick={handleRenew} className="w-full h-[46px] rounded-md bg-gradient-to-r from-brand-primary to-brand-accent text-text-primary font-bold text-[13px] flex items-center justify-center gap-[6px] active:scale-95 transition-all hover:brightness-110">
                      <Check size={16} /> Confirmar renovación
                    </button>
                    <button onClick={onClose} className="w-full h-11 rounded-md bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 text-text-muted font-bold text-[12px] active:scale-95 transition-all">
                      Cancelar operación
                    </button>
                  </div>

                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

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
