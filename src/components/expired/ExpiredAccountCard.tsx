import React from 'react';
import { Account, Service } from '../../types';
import { getDaysRemaining } from '../../utils/expiredUtils';
import { Clock, RefreshCw, Trash2 } from 'lucide-react';
import Avatar from '../ui/Avatar';

interface ExpiredAccountCardProps {
  account: Account;
  service?: Service;
  onClick: (account: Account) => void;
  onRenew: (account: Account) => void;
  onDelete: (account: Account) => void;
}

const ExpiredAccountCard: React.FC<ExpiredAccountCardProps> = ({ account, service, onClick, onRenew, onDelete }) => {
  const days = getDaysRemaining(account.endDate);
  const serviceName = service?.name || 'Servicio';

  const status =
    days < 0
      ? { text: `${Math.abs(days)}D(V)`, color: 'text-status-danger-soft', indicator: 'bg-status-danger' }
      : days === 0
        ? { text: 'HOY', color: 'text-status-expiring', indicator: 'bg-status-expiring' }
        : { text: `${days}D`, color: 'text-status-warning-soft', indicator: 'bg-status-warning-soft' };

  return (
    <div
      onClick={() => onClick(account)}
      className="relative border border-border-subtle hover:border-border-strong bg-transparent rounded-xl p-2.5 min-h-[132px] cursor-pointer flex flex-col justify-between h-full overflow-hidden transition-colors duration-150 ease-out-soft active:scale-95"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${status.indicator}`} />

      <div className="flex-1 flex flex-col items-center justify-center gap-1 mt-1">
        <Avatar
          name={serviceName}
          image={service?.image_url}
          size={40}
          className="rounded-full shadow-md border border-hairline"
        />
        <div className="text-center w-full space-y-0.5">
          <h4 className="text-tiny font-semibold text-text-primary leading-tight tracking-tight line-clamp-2 px-1">
            {serviceName}
          </h4>
          <div className={`flex items-center justify-center gap-1 text-nano font-black uppercase tracking-widest ${status.color}`}>
            <Clock size={8} strokeWidth={3} />
            <span>{status.text}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-2 w-full shrink-0">
        <button
          aria-label="Eliminar"
          onClick={(e) => { e.stopPropagation(); onDelete(account); }}
          className="tap-44 w-8 h-8 rounded-full bg-[rgb(var(--fg-rgb))]/5 text-text-faint border border-hairline flex items-center justify-center hover:text-status-danger-soft transition-all active:scale-90"
        >
          <Trash2 size={12} />
        </button>
        <button
          aria-label="Renovar"
          onClick={(e) => { e.stopPropagation(); onRenew(account); }}
          className="tap-44 w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 flex items-center justify-center transition-all active:scale-90"
        >
          <RefreshCw size={12} />
        </button>
      </div>
    </div>
  );
};

export default React.memo(ExpiredAccountCard);
