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
}

const ExpiredCard: React.FC<ExpiredCardProps> = ({ sales, client, settings, onRenew, onClick, onMessageClick }) => {
  const firstSale = sales[0];
  const daysRemaining = getDaysRemaining(firstSale.expiryDate);
  
  let statusConfig = { label: `${daysRemaining}d`, color: 'text-zinc-400', border: 'border-white/10', bg: 'bg-white/5' };
  
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

  return (
    <div 
      onClick={onClick}
      className="relative bg-surface-1 border border-border-subtle rounded-xl overflow-hidden shadow-elev-sm transition-all duration-150 ease-out-soft hover:border-border-strong active:scale-[0.98] group cursor-pointer"
    >
       <div className={`absolute top-0 left-0 bottom-0 w-1 ${statusConfig.bg.replace('/10', '')}`} />

       <div className="flex items-center gap-3 p-3 pl-4">
          {/* Avatar más pequeño */}
          <div className="relative shrink-0">
             <Avatar name={client.name} size={40} className="rounded-sm shadow-sm border border-white/5" />
             {sales.length > 1 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-brand-primary rounded-full border-2 border-surface-1 flex items-center justify-center text-[8px] font-bold text-white">
                   {sales.length}
                </div>
             )}
          </div>
          
          {/* Info Central */}
          <div className="flex-1 min-w-0">
             <h4 className="text-[13px] font-bold text-white truncate leading-tight group-hover:text-white transition-colors">
                {client.name}
             </h4>
             <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-zinc-500 font-medium truncate max-w-[120px]">
                   {sales.map(s => s.serviceName).join(', ')}
                </span>
             </div>
          </div>

          {/* Acciones y Estado (Compacto a la derecha) */}
          <div className="flex items-center gap-2 shrink-0">
             <div className={`px-2 py-0.5 rounded-md ${statusConfig.bg} ${statusConfig.color} text-[9px] font-semibold uppercase tracking-wider`}>
                {statusConfig.label}
             </div>
             
             <div className="flex gap-1">
                <button 
                   onClick={handleWhatsApp}
                   className="w-8 h-8 rounded-sm bg-brand-whatsapp/10 text-brand-whatsapp flex items-center justify-center border border-brand-whatsapp/20 active:scale-90 transition-all"
                >
                   <MessageCircle size={14} />
                </button>
                <button 
                   onClick={handleRenewClick}
                   className="w-8 h-8 rounded-sm bg-brand-primary/10 text-brand-primary flex items-center justify-center border border-brand-primary/20 active:scale-90 transition-all"
                >
                   <RefreshCw size={14} />
                </button>
             </div>
             <ChevronRight size={14} className="text-zinc-700" />
          </div>
       </div>
    </div>
  );
};

export default React.memo(ExpiredCard);