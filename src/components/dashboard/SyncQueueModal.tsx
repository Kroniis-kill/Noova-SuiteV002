import React from 'react';
import { UploadCloud, AlertTriangle, Activity, Clock } from 'lucide-react';
import Modal from '../ui/Modal';
import { SyncItem } from '../../db/LocalDatabase';

interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingItems: SyncItem[];
  isOnline: boolean;
}

const SyncQueueModal: React.FC<SyncQueueModalProps> = ({ isOpen, onClose, pendingItems, isOnline }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Datos Pendientes" size="sm">
      <div className="-m-[var(--mobile-side-pad)] lg:-m-6 mb-4">
        <div className="p-4 bg-status-warning/5 border-b border-status-warning/10">
          <p className="text-xs text-text-secondary font-medium leading-relaxed">
            Tienes <span className="font-bold text-status-warning">{pendingItems.length} cambios</span> locales.
            No te preocupes, están seguros. Se subirán automáticamente a la base de datos tan pronto detectemos una conexión a internet estable.
          </p>
          {!isOnline && (
            <div className="mt-3 flex items-center gap-2 text-status-danger-soft bg-status-danger-soft/10 p-2.5 rounded-sm border border-status-danger-soft/20">
              <AlertTriangle size={14} />
              <span className="text-[10px] font-semibold uppercase tracking-widest">Actualmente sin conexión</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {pendingItems.map((item) => (
          <div key={item.id} className="p-3 bg-surface-sunken border border-hairline rounded-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-muted">
                <Activity size={14} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-text-primary uppercase">{item.entity}</p>
                <p className="text-[9px] text-status-warning font-semibold uppercase tracking-widest mt-0.5">{item.action}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Clock size={12} className="text-text-disabled" />
              <span className="text-[9px] text-text-disabled font-mono">
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {pendingItems.length === 0 && (
          <div className="text-center py-8">
            <UploadCloud size={24} className="mx-auto text-status-success mb-3" />
            <p className="text-xs font-semibold text-text-disabled">Todo está sincronizado</p>
          </div>
        )}
      </div>

      <button onClick={onClose} className="w-full mt-4 bg-[rgb(var(--fg-rgb))]/10 hover:bg-[rgb(var(--fg-rgb))]/15 text-text-primary font-semibold text-xs py-3 rounded-md transition-colors">
        Entendido
      </button>
    </Modal>
  );
};

export default SyncQueueModal;
