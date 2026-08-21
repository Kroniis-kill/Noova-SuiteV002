
import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { FileText, ShoppingBag, Calendar, Plus, Trash2 } from 'lucide-react';
import ExpenseModal from '../../../components/accounting/ExpenseModal';
import Modal from '../../../components/ui/Modal';
import { useToast } from '../../../context/ToastContext';

const ExpensesDesktop: React.FC = () => {
  const { expenses, supplies, settings, deleteExpense, deleteSupply } = useData();
  const { showToast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'expense' | 'supply', name: string } | null>(null);

  const allItems = [
    ...expenses.map(e => ({ ...e, type: 'expense', label: e.description })),
    ...supplies.map(s => ({ ...s, type: 'supply', amount: s.totalCost }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const confirmDelete = () => {
    if (itemToDelete) {
        if (itemToDelete.type === 'expense') deleteExpense(itemToDelete.id);
        else deleteSupply(itemToDelete.id);
        
        showToast('Registro eliminado', 'success');
        setItemToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
       
       <div className="flex justify-end">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-gradient-to-r from-brand-primary to-brand-accent text-white px-6 py-3 rounded-md font-bold text-sm shadow-glow hover:brightness-110 transition-all flex items-center gap-2 active:scale-95"
          >
             <Plus size={18} /> Registrar Movimiento
          </button>
       </div>

       <div className="bg-surface-3 backdrop-blur-xl border border-[rgb(var(--fg-rgb))]/10 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[rgb(var(--fg-rgb))]/5 flex justify-between items-center">
             <h2 className="text-lg font-bold text-text-primary">Gastos y Compras</h2>
          </div>
          <table className="w-full text-left">
             <thead>
                <tr className="bg-[rgb(var(--fg-rgb))]/[0.02] border-b border-[rgb(var(--fg-rgb))]/5 text-xs font-semibold text-text-disabled uppercase tracking-wider">
                   <th className="p-6 pl-8">Tipo</th>
                   <th className="p-6">Descripción</th>
                   <th className="p-6">Fecha</th>
                   <th className="p-6">Método</th>
                   <th className="p-6">Total</th>
                   <th className="p-6 text-right pr-8">Acciones</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-[rgb(var(--fg-rgb))]/5">
                {allItems.map((item: any, idx) => (
                   <tr key={idx} className="hover:bg-[rgb(var(--fg-rgb))]/[0.02] transition-colors group">
                      <td className="p-6 pl-8">
                         <span className={`flex items-center gap-2 px-3 py-1 rounded-xs w-fit text-[11px] font-semibold uppercase border ${item.type === 'expense' ? 'bg-status-danger/10 text-status-danger-soft border-status-danger/20' : 'bg-status-expiring/10 text-status-expiring-soft border-status-expiring/20'}`}>
                            {item.type === 'expense' ? <FileText size={12} /> : <ShoppingBag size={12} />}
                            {item.type === 'expense' ? 'Operativo' : 'Insumo'}
                         </span>
                      </td>
                      <td className="p-6 font-medium text-text-primary">{item.label}</td>
                      <td className="p-6 text-text-disabled flex items-center gap-2">
                         <Calendar size={14} /> {item.date}
                      </td>
                      <td className="p-6 text-text-muted capitalize">{item.paymentMethod}</td>
                      <td className="p-6 font-bold text-text-primary">
                         {settings.currency} {item.amount.toLocaleString()}
                      </td>
                      <td className="p-6 text-right pr-8">
                         <button 
                           onClick={() => setItemToDelete({ id: item.id, type: item.type, name: item.label })}
                           className="w-8 h-8 rounded-lg bg-status-danger/10 flex items-center justify-center text-status-danger-soft hover:bg-status-danger/20 transition-colors opacity-0 group-hover:opacity-100 ml-auto"
                         >
                            <Trash2 size={14} />
                         </button>
                      </td>
                   </tr>
                ))}
                {allItems.length === 0 && (
                    <tr><td colSpan={6} className="p-12 text-center text-text-disabled">No hay registros.</td></tr>
                )}
             </tbody>
          </table>
       </div>

       <ExpenseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

       <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title="Eliminar Registro">
         <div className="space-y-4 pt-2">
            <div className="bg-status-danger/10 border border-status-danger/20 p-4 rounded-xl flex gap-4 items-start">
                <div className="bg-status-danger/20 p-3 rounded-full shrink-0">
                    <Trash2 size={24} className="text-status-danger" />
                </div>
                <div>
                    <h4 className="text-text-primary font-bold text-sm">¿Estás seguro?</h4>
                    <p className="text-text-muted text-xs mt-1 leading-relaxed">
                        Se eliminará <strong>{itemToDelete?.name}</strong>. 
                        <br/><span className="text-red-300 font-medium">El dinero se devolverá a la billetera si corresponde.</span>
                    </p>
                </div>
            </div>
            <div className="flex gap-3">
                <button onClick={() => setItemToDelete(null)} className="flex-1 py-3 rounded-md bg-[rgb(var(--fg-rgb))]/5 text-text-muted text-xs font-semibold hover:bg-[rgb(var(--fg-rgb))]/10 transition-colors">
                    Cancelar
                </button>
                <button onClick={confirmDelete} className="flex-1 py-3 rounded-md bg-status-danger text-white text-xs font-semibold hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-colors">
                    Sí, Eliminar
                </button>
            </div>
         </div>
      </Modal>

    </div>
  );
};

export default ExpensesDesktop;
