import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Expense, SupplyPurchase, Movement } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Tag, DollarSign, Calendar, FileText, ShoppingBag, Briefcase, Check, ChevronDown, CreditCard, RefreshCw, Wallet, Box, User, Settings2 } from 'lucide-react';
import { generateUUID } from '../../utils/uuid';
import { useUIStore } from '../../store/uiStore';
import { getLocalDateISO } from '../../utils/contactosUtils';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'expense' | 'supply';
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({ isOpen, onClose, initialTab = 'expense' }) => {
  const { addExpense, addSupply, settings, financialAccounts, executeTransaction, expenseCategories } = useData();
  const { user } = useAuth();
  const { setView } = useUIStore();
  const [tab, setTab] = useState<'expense' | 'supply'>('expense');

  useEffect(() => {
    if (isOpen) setTab(initialTab);
  }, [isOpen, initialTab]);

  const [amount, setAmount] = useState('');
  const [amountSec, setAmountSec] = useState(''); 
  const [category, setCategory] = useState(''); 
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(getLocalDateISO());
  const [method, setMethod] = useState('efectivo');
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const [provider, setProvider] = useState('');
  const [label, setLabel] = useState('');
  const [qty, setQty] = useState('1');
  const [unitCost, setUnitCost] = useState('');
  const [unitCostSec, setUnitCostSec] = useState('');

  const mainCurrency = settings.currency || 'USD';
  const subCurrency = settings.subCurrency || 'SEC';
  const rate = settings.exchangeRate || 1;

  useEffect(() => {
    if (isOpen) {
        if(financialAccounts.length > 0 && !selectedAccountId) {
            const defaultAcc = financialAccounts.find(f => f.isActive !== false);
            if (defaultAcc) setSelectedAccountId(defaultAcc.id);
        }
        if (!category) setCategory('operativo');
    }
  }, [isOpen, financialAccounts, selectedAccountId, category]);

  const handleExpenseMainChange = (val: string) => {
    setAmount(val);
    if (val && !isNaN(parseFloat(val)) && rate > 0) setAmountSec((parseFloat(val) * rate).toFixed(2));
    else setAmountSec('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (selectedAccountId) {
          const acc = financialAccounts.find(a => a.id === selectedAccountId);
          if (acc) {
              let deductAmount = 0;
              const expenseMainAmount = tab === 'expense' ? (parseFloat(amount) || 0) : ((parseFloat(unitCost) || 0) * (parseInt(qty) || 1));
              const expenseSecAmount = tab === 'expense' ? (parseFloat(amountSec) || 0) : ((parseFloat(unitCostSec) || 0) * (parseInt(qty) || 1));
              if (acc.currency === subCurrency && expenseSecAmount > 0) deductAmount = expenseSecAmount;
              else if (acc.currency === mainCurrency) deductAmount = expenseMainAmount;
              else {
                  const strongCurrencies = ['USD', 'USDT', 'USDC', 'EUR'];
                  if (strongCurrencies.includes(acc.currency) && !strongCurrencies.includes(mainCurrency) && rate > 0) deductAmount = expenseMainAmount / rate;
                  else if (!strongCurrencies.includes(acc.currency) && strongCurrencies.includes(mainCurrency)) deductAmount = expenseMainAmount * rate;
                  else deductAmount = expenseMainAmount; 
              }
              await executeTransaction({ id: generateUUID(), accountId: acc.id, type: 'withdrawal', amount: parseFloat(deductAmount.toFixed(2)), currency: acc.currency, exchangeRate: rate, usdEquivalent: expenseMainAmount, date: date, description: tab === 'expense' ? `Gasto: ${desc}` : `Compra: ${label}`, paymentMethod: method });
          }
      }

      if (tab === 'expense') {
         const catObj = expenseCategories.find(c => c.id === category);
         const validCategories = ['operativo', 'personal', 'servicio'];
         let dbCategory = category;
         
         if (catObj) {
             dbCategory = validCategories.includes(catObj.name.toLowerCase()) ? catObj.name.toLowerCase() : 'operativo';
         } else if (!validCategories.includes(category.toLowerCase())) {
             dbCategory = 'operativo';
         }

         await addExpense({ id: generateUUID(), userId: user.id, date, amount: parseFloat(amount) || 0, exchangeRate: rate, category: dbCategory as any, categoryId: catObj ? catObj.id : undefined, description: desc, paymentMethod: method as any, financialAccountId: selectedAccountId || undefined, createdAt: new Date().toISOString() });
      } else {
         const uCost = parseFloat(unitCost) || 0;
         const quantity = parseInt(qty) || 1;
         await addSupply({ id: generateUUID(), userId: user.id, providerName: provider, itemType: 'pin', label, quantity, unitCost: uCost, totalCost: uCost * quantity, exchangeRate: rate, date, paymentMethod: method as any, financialAccountId: selectedAccountId || undefined, createdAt: new Date().toISOString() });
      }
      onClose();
    } catch (error: any) {
      console.error("Error saving:", error);
      alert("Error saving: " + error.message);
    }
  };

  const styles = {
    label: "text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5 block ml-1",
    inputContainer: "relative flex items-center bg-surface-sunken border border-white/10 rounded-md h-10 lg:h-11 transition-all focus-within:border-brand-primary/80 focus-within:ring-1 focus-within:ring-brand-primary/10",
    input: "w-full h-full bg-transparent text-xs text-white placeholder:text-zinc-700 px-4 outline-none font-medium",
    iconElement: "absolute left-4 text-zinc-500 pointer-events-none group-focus-within:text-brand-primary",
    tabsContainer: "grid grid-cols-2 gap-2 mb-6 bg-surface-sunken p-1 rounded-md border border-white/10 max-w-sm mx-auto shadow-inner",
    tabButton: "flex items-center justify-center py-2.5 rounded-sm transition-all active:scale-[0.98] text-[10px] font-semibold uppercase tracking-widest",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registro de Movimiento">
       <div className="pt-2">
          <div className={styles.tabsContainer}>
             <button type="button" onClick={() => setTab('expense')} className={`${styles.tabButton} ${tab === 'expense' ? 'bg-surface-4 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}>Gastos</button>
             <button type="button" onClick={() => setTab('supply')} className={`${styles.tabButton} ${tab === 'supply' ? 'bg-surface-4 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400'}`}>Insumos</button>
          </div>
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
             {tab === 'expense' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                   <div className="lg:col-span-3"><label className={styles.label}>Concepto</label><div className={styles.inputContainer}><FileText size={16} className={styles.iconElement} /><input className={`${styles.input} pl-11`} value={desc} onChange={e => setDesc(e.target.value)} placeholder="¿En qué se usó el dinero?" required autoFocus /></div></div>
                   <div><label className={styles.label}>Monto ({mainCurrency})</label><div className={styles.inputContainer}><DollarSign size={16} className={styles.iconElement} /><input type="number" step="0.01" className={`${styles.input} pl-11 font-black`} value={amount} onChange={e => handleExpenseMainChange(e.target.value)} required /></div></div>
                   <div><label className={styles.label}>Categoría</label><div className={styles.inputContainer}><Tag size={16} className={styles.iconElement} /><select className="w-full bg-transparent text-xs text-white px-11 outline-none appearance-none cursor-pointer" value={category} onChange={e => setCategory(e.target.value)}><option value="operativo">Operativo</option><option value="personal">Personal</option><option value="servicio">Servicio</option>{expenseCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select><ChevronDown size={14} className="absolute right-4 text-zinc-500" /></div></div>
                   <div><label className={styles.label}>Billetera Origen</label><div className={styles.inputContainer}><Wallet size={16} className={styles.iconElement} /><select className="w-full bg-transparent text-xs text-white px-11 outline-none appearance-none cursor-pointer" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}><option value="">Solo registro</option>{financialAccounts.filter(f => f.isActive !== false).map(acc => (<option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>))}</select><ChevronDown size={14} className="absolute right-4 text-zinc-500" /></div></div>
                </div>
             ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
                   <div className="lg:col-span-2"><label className={styles.label}>¿Qué compras?</label><div className={styles.inputContainer}><Box size={16} className={styles.iconElement} /><input className={`${styles.input} pl-11`} value={label} onChange={e => setLabel(e.target.value)} required /></div></div>
                   <div><label className={styles.label}>Proveedor</label><div className={styles.inputContainer}><Briefcase size={16} className={styles.iconElement} /><input className={`${styles.input} pl-11`} value={provider} onChange={e => setProvider(e.target.value)} /></div></div>
                   <div><label className={styles.label}>Cant.</label><div className={styles.inputContainer}><input type="number" className={`${styles.input} text-center font-black`} value={qty} onChange={e => setQty(e.target.value)} required /></div></div>
                   <div className="lg:col-span-2"><label className={styles.label}>Costo Unit. ({mainCurrency})</label><div className={styles.inputContainer}><input type="number" step="0.01" className={`${styles.input} text-center font-black`} value={unitCost} onChange={e => setUnitCost(e.target.value)} required /></div></div>
                   <div className="lg:col-span-2"><label className={styles.label}>Pagar con Billetera</label><div className={styles.inputContainer}><Wallet size={16} className={styles.iconElement} /><select className="w-full bg-transparent text-xs text-white px-11 outline-none appearance-none cursor-pointer" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}><option value="">No descontar</option>{financialAccounts.filter(f => f.isActive !== false).map(acc => (<option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>))}</select><ChevronDown size={14} className="absolute right-4 text-zinc-500" /></div></div>
                </div>
             )}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-white/5 pt-6">
                <div><label className={styles.label}>Fecha Operación</label><div className={styles.inputContainer}><Calendar size={16} className={styles.iconElement} /><input type="date" className={`${styles.input} pl-11 font-mono`} value={date} onChange={e => setDate(e.target.value)} required /></div></div>
                <div><label className={styles.label}>Medio de Pago</label><div className={styles.inputContainer}><CreditCard size={16} className={styles.iconElement} /><select className="w-full bg-transparent text-xs text-white px-11 outline-none appearance-none cursor-pointer" value={method} onChange={e => setMethod(e.target.value)}><option value="efectivo">Efectivo</option><option value="transferencia">Banco</option><option value="binance">Cripto</option><option value="zelle">Zelle</option></select><ChevronDown size={14} className="absolute right-4 text-zinc-500" /></div></div>
             </div>
             <div className="pt-4 flex justify-end">
                <button type="submit" className="btn-primary min-w-[200px] h-11 lg:h-12 rounded-md text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2">
                   <Check size={18} strokeWidth={3} /> Finalizar Registro
                </button>
             </div>
          </form>
       </div>
    </Modal>
  );
};

export default ExpenseModal;