
import React from 'react';
import { FinancialAccount, AppSettings } from '../../types';
import { 
  TrendingUp, TrendingDown, ArrowRightLeft, History, 
  CreditCard, Eye, EyeOff
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useUIStore } from '../../store/uiStore';

interface AccountCardProps {
  account: FinancialAccount;
  settings: AppSettings;
  onFund: (acc: FinancialAccount) => void;
  onWithdraw: (acc: FinancialAccount) => void;
  onTransfer: (acc: FinancialAccount) => void;
  onHistory: (acc: FinancialAccount) => void;
  onEdit: (acc: FinancialAccount) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (acc: FinancialAccount) => void;
  compact?: boolean;
}

const AccountCard: React.FC<AccountCardProps> = ({ 
  account, settings, onFund, onWithdraw, onTransfer, onHistory, compact 
}) => {
  const showBalance = useUIStore(state => state.showBalance);
  const setShowBalance = useUIStore(state => state.setShowBalance);
  const isActive = account.isActive !== false;
  const isNotMain = account.currency !== settings.currency;
  const rate = settings.exchangeRate || 1;
  
  // Calculate equivalent in main currency if it's not main
  const convertToMain = (amount: number, fromCurrency: string) => {
    if (!amount || isNaN(amount)) return 0;
    if (fromCurrency === settings.currency) return amount;
    const strongCurrencies = ['USD', 'USDT', 'USDC', 'EUR'];
    const isMainStrong = strongCurrencies.includes(settings.currency);
    const isFromStrong = strongCurrencies.includes(fromCurrency);
    if (isMainStrong && !isFromStrong) return rate > 0 ? amount / rate : amount;
    if (!isMainStrong && isFromStrong) return amount * rate;
    return amount;
  };

  const equivalent = convertToMain(account.balance, account.currency);

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (compact) {
    return (
      <div className={`p-2.5 rounded-xl bg-surface-1 border border-border-subtle shadow-elev-sm flex items-center justify-between transition-colors duration-150 ease-out-soft hover:border-border-strong ${!isActive && 'opacity-50 grayscale'}`}>
         <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-disabled">
               <CreditCard size={12} />
            </div>
            <div>
               <p className="text-text-primary font-semibold text-[11px] leading-tight">{account.name}</p>
               <p className="text-[7px] text-text-faint font-mono tracking-tighter uppercase">{account.currency}</p>
            </div>
         </div>
         <p className="text-[11px] font-semibold text-text-primary font-mono">{showBalance ? formatCurrency(account.balance) : '••••'}</p>
      </div>
    );
  }

  return (
    <motion.div 
      layout
      className={`relative overflow-hidden rounded-xl border p-3.5 h-[162.224px] flex flex-col justify-between transition-colors duration-150 ease-out-soft ${
        isActive 
          ? 'bg-surface-1 border-border-subtle shadow-elev-md hover:border-border-strong' 
          : 'bg-bg border-border-subtle/40 opacity-60 grayscale'
      }`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-[rgb(var(--fg-rgb))]/[0.01] rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none" />

      <div className="relative z-10 flex justify-between items-start">
         <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xs bg-[rgb(var(--fg-rgb))]/[0.03] border border-[rgb(var(--fg-rgb))]/[0.06] flex items-center justify-center text-text-muted">
               <CreditCard size={14} strokeWidth={1.5} />
            </div>
            <div>
               <h3 className="text-[11px] font-semibold text-text-primary tracking-tight leading-none">{account.name}</h3>
               <span className="text-[6px] font-black text-text-faint uppercase tracking-[0.2em] font-mono block leading-none mt-1">{account.currency}</span>
            </div>
         </div>

         <button 
           onClick={() => setShowBalance(!showBalance)}
           className="w-6 h-6 rounded-full bg-[rgb(var(--fg-rgb))]/[0.03] hover:bg-[rgb(var(--fg-rgb))]/[0.08] flex items-center justify-center text-text-disabled transition-all active:scale-90"
         >
            {showBalance ? <Eye size={12} /> : <EyeOff size={12} />}
         </button>
      </div>

      <div className="relative z-10 py-0.5">
         <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
               <span className="text-[9px] font-bold text-text-disabled">{account.currency}</span>
               <h2 className="text-xl font-black text-text-primary tracking-tighter font-mono leading-none">
                  {showBalance ? formatCurrency(account.balance) : '••••'}
               </h2>
            </div>
            {isNotMain && showBalance && (
               <p className="text-[7px] text-text-faint font-bold mt-0.5 opacity-50">
                  ≈ {formatCurrency(equivalent)} {settings.currency}
               </p>
            )}
         </div>
         <p className="text-[6px] text-text-faint font-black uppercase tracking-[0.2em] mt-1">Saldo Neto Disponible</p>
      </div>

      <div className="relative z-10 grid grid-cols-4 gap-1 pt-2.5 border-t border-[rgb(var(--fg-rgb))]/[0.03]">
         <button onClick={() => onFund(account)} className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-sm bg-status-success/[0.02] text-status-success border border-status-success/10 active:scale-95 transition-all">
            <TrendingUp size={10} />
            <span className="text-[5px] font-black uppercase tracking-widest">Entrada</span>
         </button>
         <button onClick={() => onWithdraw(account)} className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-sm bg-status-danger/[0.02] text-status-danger border border-status-danger/10 active:scale-95 transition-all">
            <TrendingDown size={10} />
            <span className="text-[5px] font-black uppercase tracking-widest">Salida</span>
         </button>
         <button onClick={() => onTransfer(account)} className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-sm bg-brand-primary/[0.02] text-brand-primary border border-brand-primary/10 active:scale-95 transition-all">
            <ArrowRightLeft size={10} />
            <span className="text-[5px] font-black uppercase tracking-widest">Mover</span>
         </button>
         <button onClick={() => onHistory(account)} className="flex flex-col items-center justify-center gap-1 py-1.5 rounded-sm bg-[rgb(var(--fg-rgb))]/[0.01] text-text-disabled border border-[rgb(var(--fg-rgb))]/[0.05] active:scale-95 transition-all">
            <History size={10} />
            <span className="text-[5px] font-black uppercase tracking-widest">Logs</span>
         </button>
      </div>
    </motion.div>
  );
};

export default React.memo(AccountCard);
