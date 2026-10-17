import React from 'react';
import { Clock, RotateCcw, Trash2 } from 'lucide-react';
import { Account, Service } from '../../types';
import Avatar from '../ui/Avatar';
import { formatDate } from '../../utils/contactosUtils';

interface TrashAccountCardProps {
  account: Account;
  service?: Service;
  /** Toque sobre la tarjeta: abre el detalle de la cuenta archivada. */
  onOpen: (account: Account) => void;
  onRestore: (account: Account) => void;
  onDeleteForever: (account: Account) => void;
}

/**
 * Fila de una cuenta archivada en la Papelera. Mismo lenguaje visual que las
 * tarjetas de Vencimientos y Stock (superficie, borde, radio, barra lateral),
 * pero apagada: logo en escala de grises y barra neutra, porque una cuenta en
 * papelera no cuenta como vencida ni ocupa stock.
 */
const TrashAccountCard: React.FC<TrashAccountCardProps> = ({ account, service, onOpen, onRestore, onDeleteForever }) => {
  const serviceName = service?.name || 'Servicio';

  return (
    <div
      onClick={() => onOpen(account)}
      className="relative bg-surface-1 border border-border-subtle hover:border-border-strong rounded-xl overflow-hidden shadow-elev-sm cursor-pointer transition-all duration-150 ease-out-soft active:scale-[0.98]"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-text-faint/60" />

      <div className="flex items-center gap-3 p-3 pl-4">
        <Avatar
          name={serviceName}
          image={service?.image_url}
          size={44}
          className="rounded-sm border border-hairline shrink-0 grayscale opacity-70"
        />

        <div className="flex-1 min-w-0">
          <h4 className="text-body-sm font-bold text-text-primary leading-tight truncate">{serviceName}</h4>
          <p className="text-tiny text-text-muted truncate mt-0.5">{account.email}</p>
          <div className="flex items-center gap-1 mt-1.5 text-micro font-bold uppercase tracking-wider text-text-disabled min-w-0">
            <Clock size={9} strokeWidth={3} className="shrink-0" />
            <span className="truncate">Vencía {formatDate(account.endDate)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label={`Restaurar ${serviceName}`}
            onClick={(e) => { e.stopPropagation(); onRestore(account); }}
            className="tap-44 w-9 h-9 rounded-full bg-status-success/10 text-status-success-soft border border-status-success/20 flex items-center justify-center transition-all active:scale-90"
          >
            <RotateCcw size={15} />
          </button>
          <button
            type="button"
            aria-label={`Eliminar ${serviceName} para siempre`}
            onClick={(e) => { e.stopPropagation(); onDeleteForever(account); }}
            className="tap-44 w-9 h-9 rounded-full bg-status-danger/10 text-status-danger-soft border border-status-danger/20 flex items-center justify-center transition-all active:scale-90"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(TrashAccountCard);
