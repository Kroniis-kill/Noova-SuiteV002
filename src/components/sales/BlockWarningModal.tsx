import React from 'react';
import Modal from '../ui/Modal';
import { AlertTriangle } from 'lucide-react';

interface BlockWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  accountEmail?: string;
}

const BlockWarningModal: React.FC<BlockWarningModalProps> = ({ isOpen, onClose, onConfirm, accountEmail }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Advertencia de Bloqueo" zIndex={60000}>
      <div className="pt-2 pb-2 space-y-4">
        <div className="bg-status-warning/10 border border-status-warning/20 p-4 rounded-lg flex gap-4 items-start">
          <div className="bg-status-warning/20 p-3 rounded-full shrink-0 text-status-warning">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h4 className="text-status-warning font-bold text-sm mb-1">¡Cuidado!</h4>
            <p className="text-text-secondary text-xs leading-relaxed">
              Este cliente ya reportó <strong>Bloqueo de Hogar</strong> en la cuenta <strong>{accountEmail}</strong> anteriormente.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-[rgb(var(--fg-rgb))]/5 rounded-md text-text-muted text-xs font-semibold active:scale-95 transition-all">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-status-warning rounded-md text-black text-xs font-semibold shadow-glow active:scale-95 transition-all">Asignar igual</button>
        </div>
      </div>
    </Modal>
  );
};

export default BlockWarningModal;
