import React from 'react';
import Modal from '../ui/Modal';
import { Account } from '../../types';
import { AlertTriangle, ClipboardList, Check, X } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface FailureAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onConfirm: (addToAgenda: boolean) => void;
}

const FailureAgendaModal: React.FC<FailureAgendaModalProps> = ({ isOpen, onClose, account, onConfirm }) => {
  const { sales, clients } = useData();

  if (!account) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const activeSales = sales.filter(s => s.accountId === account.id && s.expiryDate >= todayStr);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reportar Falla" zIndex={70000}>
      <div className="space-y-6 pt-2">
        <div className="bg-status-expiring/10 border border-status-expiring/20 p-5 rounded-xl flex gap-4 items-start shadow-sm">
          <div className="bg-status-expiring/20 p-3 rounded-full shrink-0 text-status-expiring">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h4 className="text-text-primary font-bold text-sm">Reporte de Falla</h4>
            <div className="text-text-muted text-xs mt-1 leading-relaxed space-y-3">
              <p>Estás reportando una falla en la cuenta <strong>{account.email}</strong>.</p>
              
              {activeSales.length > 0 ? (
                <div className="space-y-2">
                  <p>Se han encontrado <strong>{activeSales.length}</strong> clientes activos en esta cuenta:</p>
                  <div className="bg-surface-sunken rounded-xl p-3 border border-[rgb(var(--fg-rgb))]/5 max-h-[120px] overflow-y-auto space-y-1.5 custom-scrollbar">
                    {activeSales.map(sale => {
                      const client = clients.find(c => c.id === sale.clientId);
                      return (
                        <div key={sale.id} className="flex items-center gap-2 text-[10px] text-text-secondary font-medium">
                          <div className="w-1.5 h-1.5 rounded-full bg-status-expiring" />
                          <span className="truncate">{client?.name || 'Cliente'}</span>
                          <span className="text-text-faint ml-auto font-mono">{sale.expiryDate}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-text-disabled italic">¿Deseas agregarlos automáticamente a la <strong>Agenda de Fallas</strong>?</p>
                </div>
              ) : (
                <p className="text-text-disabled italic">No se encontraron clientes activos vinculados a esta cuenta.</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => onConfirm(true)} 
            className="w-full p-4 rounded-lg bg-brand-primary text-white font-bold text-sm flex justify-between items-center transition-all active:scale-95 shadow-glow-sm"
          >
            <div className="flex items-center gap-3">
              <ClipboardList size={18} />
              <span>Sí, agregar a la agenda</span>
            </div>
            <Check size={18} />
          </button>
          
          <button 
            onClick={() => onConfirm(false)} 
            className="w-full p-4 rounded-lg bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/10 hover:bg-[rgb(var(--fg-rgb))]/10 text-text-secondary font-bold text-sm flex justify-between items-center transition-all active:scale-95"
          >
            <div className="flex items-center gap-3">
              <X size={18} />
              <span>No, solo reportar falla</span>
            </div>
          </button>
        </div>
        
        <button onClick={onClose} className="w-full py-3 text-text-disabled text-xs font-semibold mt-1 active:text-text-primary">Cancelar</button>
      </div>
    </Modal>
  );
};

export default FailureAgendaModal;
