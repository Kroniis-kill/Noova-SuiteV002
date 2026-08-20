
import React from 'react';
import { useData } from '../../context/DataContext';
import { ShoppingBag, FileText, Trash2, Calendar, CreditCard, ArrowDownRight } from 'lucide-react';
import { motion } from 'framer-motion';

const ExpenseList: React.FC = () => {
  const { expenses, supplies, deleteExpense, deleteSupply, settings, expenseCategories } = useData();

  const combinedItems = [
    ...expenses.map(e => {
      const catObj = expenseCategories.find(c => c.id === e.categoryId);
      const displayCategory = catObj ? catObj.name : e.category;
      return { ...e, type: 'expense', label: e.description, displayCategory };
    }),
    ...supplies.map(s => ({ ...s, type: 'supply', amount: s.totalCost, label: s.label, displayCategory: 'Insumo' }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatMoney = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-2.5">
       {combinedItems.map((item: any, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
            key={`${item.type}_${item.id}`} 
            className="bg-surface-1 border border-white/[0.04] rounded-lg p-3.5 flex items-center justify-between group active:scale-[0.99] transition-all"
          >
             <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-9 h-9 rounded-sm flex items-center justify-center border shrink-0 ${item.type === 'expense' ? 'bg-status-danger/5 text-status-danger-soft border-status-danger/10' : 'bg-status-expiring/5 text-status-expiring-soft border-status-expiring/10'}`}>
                   {item.type === 'expense' ? <FileText size={16} /> : <ShoppingBag size={16} />}
                </div>
                <div className="min-w-0">
                   <h4 className="text-[12px] font-bold text-zinc-100 truncate pr-2">
                      {item.label || 'Concepto'}
                   </h4>
                   <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded border ${item.type === 'expense' ? 'text-status-danger-soft/70 border-status-danger/10' : 'text-status-expiring-soft/70 border-status-expiring/10'}`}>
                        {item.displayCategory}
                      </span>
                      <span className="text-[8px] text-zinc-600 flex items-center gap-1 font-mono tracking-tighter">
                        <Calendar size={10} /> {item.date}
                      </span>
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-3 pl-3 shrink-0">
                <div className="text-right">
                   <span className="block text-[13px] font-bold text-white font-mono tracking-tighter">
                      -{settings.currency}{formatMoney(item.amount)}
                   </span>
                   <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">
                      {item.paymentMethod}
                   </span>
                </div>
                
                <button 
                  onClick={() => item.type === 'expense' ? deleteExpense(item.id) : deleteSupply(item.id)}
                  className="w-7 h-7 rounded-full bg-white/[0.02] text-zinc-700 hover:text-status-danger-soft transition-colors"
                >
                   <Trash2 size={14} />
                </button>
             </div>
          </motion.div>
       ))}
       
       {combinedItems.length === 0 && (
          <div className="py-20 text-center opacity-20">
             <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Sin Salidas</p>
          </div>
       )}
    </div>
  );
};

export default ExpenseList;
