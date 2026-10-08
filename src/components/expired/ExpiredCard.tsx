import React from 'react';
import { Sale, Client, AppSettings } from '../../types';
import { getDaysRemaining } from '../../utils/expiredUtils';
import { MessageCircle, RefreshCw, Clock, ChevronRight, Layers, BellRing, Check } from 'lucide-react';
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
  /** Tarjeta de renovación de cuenta (planes prepagados): cuenta los días hasta `renewalDate` y muestra "Ya renové" en vez de cobrar. */
  renewalMode?: boolean;
  onMarkRenewed?: (sales: Sale[]) => void;
}

const ExpiredCard: React.FC<ExpiredCardProps> = ({ sales, client, settings, onRenew, onClick, onMessageClick, variant = 'row', renewalMode = false, onMarkRenewed }) => {
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
    const minDays = Math.min(...sales.map(s => getDaysRemaining(renewalMode ? (s.renewalDate || s.expiryDate) : s.expiryDate)));
    const gridStatus =
      minDays < 0
        ? { text: `${Math.abs(minDays)}D(V)`, color: 'text-status-danger-soft', indicator: 'bg-status-danger' }
        : minDays === 0
          ? { text: 'HOY', color: renewalMode ? 'text-status-success-soft' : 'text-status-expiring', indicator: renewalMode ? 'bg-status-success' : 'bg-status-expiring' }
          : { text: `${minDays}D`, color: renewalMode ? 'text-status-success-soft' : 'text-status-warning-soft', indicator: renewalMode ? 'bg-status-success' : 'bg-status-warning-soft' };

    return (
      <div
        onClick={onClick}
        className="relative border border-border-subtle hover:border-border-strong bg-transparent rounded-xl p-2.5 min-h-[132px] cursor-pointer flex flex-col justify-between h-full overflow-hidden transition-colors duration-150 ease-out-soft active:scale-95"
      >
        <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${gridStatus.indicator}`} />

        <div className="flex justify-between items-center w-full px-0.5">
          <div className="flex items-center gap-1 text-micro text-text-disabled font-medium bg-[rgb(var(--fg-rgb))]/[0.03] px-1.5 py-0.5 rounded-md">
            <Layers size={10} strokeWidth={3} />
            <span>{sales.length}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-1 mt-1">
          <Avatar name={client.name} size={36} className="rounded-full shadow-md border border-hairline" />
          <div className="text-center w-full space-y-0.5">
            <h4 className="text-tiny font-semibold text-text-primary leading-tight tracking-tight line-clamp-2 px-1">{client.name}</h4>
            <div className={`flex items-center justify-center gap-1 text-nano font-black uppercase tracking-widest ${gridStatus.color}`}>
              <Clock size={8} strokeWidth={3} />
              <span>{gridStatus.text}</span>
            </div>
          </div>
        </div>

        {renewalMode ? (
          <div className="mt-2 w-full shrink-0">
            <button
              aria-label="Ya renové la cuenta"
              onClick={(e) => { e.stopPropagation(); onMarkRenewed?.(sales); }}
              className="tap-44 w-full h-8 rounded-full bg-status-success/15 text-status-success-soft border border-status-success/30 flex items-center justify-center gap-1 text-micro font-bold transition-all active:scale-95"
            >
              <Check size={12} strokeWidth={3} />
              Ya renové
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 mt-2 w-full shrink-0">
            <button
              aria-label="Enviar recordatorio por WhatsApp"
              onClick={handleWhatsApp}
              className="tap-44 w-8 h-8 rounded-full border bg-brand-whatsapp border-brand-whatsapp text-black shadow-glow-sm flex items-center justify-center transition-all active:scale-90"
            >
              <BellRing size={12} fill="currentColor" />
            </button>
            <button
              aria-label="Renovar"
              onClick={handleRenewClick}
              className="tap-44 w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 flex items-center justify-center transition-all active:scale-90"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        )}
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
