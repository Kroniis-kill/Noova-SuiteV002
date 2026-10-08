import React from 'react';
import { Sale, Client, AppSettings } from '../../types';
import { getDaysRemaining } from '../../utils/expiredUtils';
import { MessageCircle, RefreshCw, Clock, ChevronRight, Layers } from 'lucide-react';
import Avatar from '../ui/Avatar';

interface ExpiredCardProps {
  sales: Sale[];
  client: Client;
  settings: AppSettings;
  onRenew: (sales: Sale[]) => void;
  onClick?: () => void;
  onMessageClick?: (sales: Sale[], client: Client) => void;
  /** 'row' = fila horizontal (dashboard). 'grid' = tarjeta vertical compacta para grillas de 3 columnas. */
  variant?: 'row' | 'grid';
}

const ExpiredCard: React.FC<ExpiredCardProps> = ({ sales, client, settings, onRenew, onClick, onMessageClick, variant = 'row' }) => {
  const firstSale = sales[0];
  const daysRemaining = getDaysRemaining(firstSale.expiryDate);
  
  let statusConfig = { label: `${daysRemaining}d`, color: 'text-text-muted', border: 'border-border-subtle', bg: 'bg-[rgb(var(--fg-rgb))]/5' };
  
  if (daysRemaining < 0) {
     statusConfig = { label: 'Vencido', color: 'text-status-danger-soft', border: 'border-status-danger/30', bg: 'bg-status-danger/10' };
  } else if (daysRemaining === 0) {
     statusConfig = { label: 'HOY', color: 'text-status-expiring-soft', border: 'border-status-expiring/30', bg: 'bg-status-expiring/10' };
  } else if (daysRemaining === 1) {
     statusConfig = { label: 'Mañana', color: 'text-status-warning-soft', border: 'border-status-warning/30', bg: 'bg-status-warning/10' };
  }

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMessageClick) onMessageClick(sales, client);
  };

  const handleRenewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRenew(sales);
  };

  if (variant === 'grid') {
    const serviceNames = sales.map(s => s.serviceName).join(', ');
    return (
      <div
        onClick={onClick}
        className="relative bg-surface-1 border border-border-subtle rounded-xl overflow-hidden shadow-elev-sm transition-all duration-150 ease-out-soft hover:border-border-strong active:scale-[0.98] group cursor-pointer h-full"
      >
        <div className={`absolute top-0 left-0 right-0 h-0.5 ${statusConfig.bg.replace('/10', '')}`} />
        <div className="flex flex-col items-center text-center gap-2 px-2 pt-3.5 pb-2.5 h-full">
          <div className="relative shrink-0">
            <Avatar name={client.name} size={44} className="rounded-md shadow-sm border border-hairline" />
            {sales.length > 1 && (
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-primary rounded-full border-2 border-surface-1 flex items-center justify-center text-nano font-bold text-white">
                {sales.length}
              </div>
            )}
          </div>
          <div className="w-full min-w-0">
            <h4 className="text-caption font-bold text-text-primary truncate leading-tight">{client.name}</h4>
            <p className="text-micro text-text-disabled font-medium truncate mt-0.5" title={serviceNames}>{serviceNames}</p>
          </div>
          <div className={`px-2 py-0.5 rounded-md ${statusConfig.bg} ${statusConfig.color} text-micro font-semibold uppercase tracking-wider`}>
            {statusConfig.label}
          </div>
          <div className="flex gap-1.5 mt-auto pt-0.5">
            <button aria-label="Enviar por WhatsApp" onClick={handleWhatsApp} className="tap-44 w-8 h-8 rounded-sm bg-brand-whatsapp/10 text-brand-whatsapp flex items-center justify-center border border-brand-whatsapp/20 active:scale-90 transition-all">
              <MessageCircle size={14} />
            </button>
            <button aria-label="Renovar" onClick={handleRenewClick} className="tap-44 w-8 h-8 rounded-sm bg-brand-primary/10 text-brand-primary flex items-center justify-center border border-brand-primary/20 active:scale-90 transition-all">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className="relative bg-surface-1 border border-border-subtle rounded-xl overflow-hidden shadow-elev-sm transition-all duration-150 ease-out-soft hover:border-border-strong active:scale-[0.98] group cursor-pointer"
    >
       <div className={`absolute top-0 left-0 bottom-0 w-1 ${statusConfig.bg.replace('/10', '')}`} />

       <div className="flex items-center gap-3 p-3 pl-4">
          {/* Avatar más pequeño */}
          <div className="relative shrink-0">
             <Avatar name={client.name} size={40} className="rounded-sm shadow-sm border border-hairline" />
             {sales.length > 1 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-primary rounded-full border-2 border-surface-1 flex items-center justify-center text-nano font-bold text-white">
                   {sales.length}
                </div>
             )}
          </div>
          
          {/* Info Central */}
          <div className="flex-1 min-w-0">
             <h4 className="text-body-sm font-bold text-text-primary truncate leading-tight group-hover:text-text-primary transition-colors">
                {client.name}
             </h4>
             <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-tiny text-text-disabled font-medium truncate max-w-[120px]">
                   {sales.map(s => s.serviceName).join(', ')}
                </span>
             </div>
          </div>

          {/* Acciones y Estado (Compacto a la derecha) */}
          <div className="flex items-center gap-2 shrink-0">
             <div className={`px-2 py-0.5 rounded-md ${statusConfig.bg} ${statusConfig.color} text-micro font-semibold uppercase tracking-wider`}>
                {statusConfig.label}
             </div>
             
             <div className="flex gap-1">
                <button aria-label="Enviar por WhatsApp" 
                   onClick={handleWhatsApp}
                   className="tap-44 w-8 h-8 rounded-sm bg-brand-whatsapp/10 text-brand-whatsapp flex items-center justify-center border border-brand-whatsapp/20 active:scale-90 transition-all"
                >
                   <MessageCircle size={14} />
                </button>
                <button aria-label="Actualizar" 
                   onClick={handleRenewClick}
                   className="tap-44 w-8 h-8 rounded-sm bg-brand-primary/10 text-brand-primary flex items-center justify-center border border-brand-primary/20 active:scale-90 transition-all"
                >
                   <RefreshCw size={14} />
                </button>
             </div>
             <ChevronRight size={14} className="text-text-faint" />
          </div>
       </div>
    </div>
  );
};

export default React.memo(ExpiredCard);