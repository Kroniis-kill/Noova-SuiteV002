
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { FinancialAccount, Movement } from '../../types';
import { useData } from '../../context/DataContext';
import { TrendingUp, TrendingDown, ArrowRightLeft, Calendar, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface MovementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: FinancialAccount | null;
}

const MovementsModal: React.FC<MovementsModalProps> = ({ isOpen, onClose, account }) => {
  const { movements, deleteMovement, recalculateBalance } = useData();
  const { showToast } = useToast();
  
  // Estado para controlar qué movimiento se va a eliminar
  const [movementIdToDelete, setMovementIdToDelete] = useState<string | null>(null);

  if (!account) return null;

  const accountMovements = movements.filter(m => m.accountId === account.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getIcon = (type: string) => {
     switch(type) {
        case 'funding': 
        case 'transfer_in': return <TrendingUp size={16} />;
        case 'withdrawal': 
        case 'transfer_out': return <TrendingDown size={16} />;
        default: return <ArrowRightLeft size={16} />;
     }
  };

  const getStyle = (type: string) => {
    switch(type) {
        case 'funding': 
        case 'transfer_in': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        case 'withdrawal': 
        case 'transfer_out': return 'text-red-400 bg-red-500/10 border-red-500/20';
        default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
     }
  };

  // Abre el modal de confirmación en lugar de usar window.confirm
  const handleDeleteClick = (id: string) => {
    setMovementIdToDelete(id);
  };

  // Ejecuta la eliminación real
  const confirmDelete = () => {
    if (movementIdToDelete) {
        deleteMovement(movementIdToDelete);
        showToast('Movimiento eliminado y saldo revertido', 'success');
        setMovementIdToDelete(null);
    }
  };

  const handleRecalculate = () => {
    recalculateBalance(account.id);
    showToast('Saldo recalculado basado en historial', 'success');
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Historial">
         <div className="space-y-2 pt-1 min-h-[200px] flex flex-col">
            
            <div className="flex justify-end mb-2">
               <button 
                  onClick={handleRecalculate}
                  className="flex items-center gap-2 text-[10px] font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
               >
                  <RefreshCw size={12} /> Recalcular Saldo
               </button>
            </div>

            {accountMovements.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-12 text-zinc-500 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                     <Calendar size={20} />
                  </div>
                  <p className="text-xs">No hay movimientos registrados.</p>
               </div>
            ) : (
               <div className="space-y-2 flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar pr-1">
                  {accountMovements.map(mov => (
                     <div key={mov.id} className="bg-surface-3 border border-white/5 p-3 rounded-2xl flex items-center justify-between active:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getStyle(mov.type)}`}>
                              {getIcon(mov.type)}
                           </div>
                           <div className="min-w-0">
                              <p className="text-white font-semibold text-[13px] truncate max-w-[140px]">
                                 {mov.description || (mov.type === 'funding' ? 'Ingreso' : 'Retiro')}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                                 <span>{new Date(mov.date).toLocaleDateString()}</span>
                                 {mov.paymentMethod && (
                                    <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{mov.paymentMethod}</span>
                                 )}
                              </div>
                           </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                           <div className="text-right">
                              <p className={`font-bold text-sm ${mov.type.includes('out') || mov.type === 'withdrawal' ? 'text-red-400' : 'text-emerald-400'}`}>
                                  {mov.type.includes('out') || mov.type === 'withdrawal' ? '-' : '+'}
                                  {mov.amount.toLocaleString()} <span className="text-[10px] font-normal">{mov.currency}</span>
                              </p>
                              {mov.currency !== 'USD' && (
                                  <p className="text-[10px] text-zinc-600">≈ ${(mov.usdEquivalent || 0).toFixed(2)}</p>
                              )}
                           </div>
                           <button 
                             onClick={() => handleDeleteClick(mov.id)}
                             className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-lg transition-colors"
                           >
                              <Trash2 size={14} />
                           </button>
                        </div>
                     </div>
                  ))}
               </div>
            )}
            
            <button onClick={onClose} className="w-full py-3 mt-4 text-zinc-500 text-xs font-medium hover:text-white transition-colors">
               Cerrar Historial
            </button>
         </div>
      </Modal>

      {/* Modal de Confirmación de Eliminación */}
      <Modal isOpen={!!movementIdToDelete} onClose={() => setMovementIdToDelete(null)} title="Eliminar Movimiento">
         <div className="space-y-4 pt-2">
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex gap-4 items-start">
                <div className="bg-red-500/20 p-3 rounded-full shrink-0">
                    <AlertTriangle size={24} className="text-red-500" />
                </div>
                <div>
                    <h4 className="text-white font-bold text-sm">¿Estás seguro?</h4>
                    <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                        Se eliminará este registro del historial y <strong>el monto será revertido</strong> automáticamente al saldo de la cuenta.
                    </p>
                </div>
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={() => setMovementIdToDelete(null)} 
                    className="flex-1 py-3 rounded-md bg-white/5 text-zinc-400 text-xs font-semibold hover:bg-white/10 transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    onClick={confirmDelete} 
                    className="flex-1 py-3 rounded-md bg-red-500 text-white text-xs font-semibold hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-colors"
                >
                    Sí, Eliminar
                </button>
            </div>
         </div>
      </Modal>
    </>
  );
};

export default MovementsModal;
