
import React from 'react';
import { Calendar, Check, Trash2, Edit2, Tag } from 'lucide-react';

interface PayableCardProps {
  item: any;
  onPay: (item: any) => void;
  onDelete: (id: string) => void;
  onEdit: (item: any) => void;
}

const PayableCard: React.FC<PayableCardProps> = ({ item, onPay, onDelete, onEdit }) => {
  
  let urgencyColor = 'text-text-disabled';
  let urgencyBg = 'bg-zinc-500/5 border-zinc-500/10';
  let iconColor = 'text-status-info';
  let statusText = `${item.daysRemaining}d`;
  
  if (item.daysRemaining < 0) {
     urgencyColor = 'text-status-danger-soft';
     urgencyBg = 'bg-status-danger/5 border-status-danger/10';
     statusText = `Vencido`;
     iconColor = 'text-status-danger-soft';
  } else if (item.daysRemaining === 0) {
     urgencyColor = 'text-status-expiring-soft';
     urgencyBg = 'bg-status-expiring/5 border-status-expiring/10';
     statusText = 'Hoy';
     iconColor = 'text-status-expiring-soft';
  }

  return (
    <div className="bg-surface-1 border border-border-subtle rounded-xl p-4 lg:p-5 flex flex-col gap-3 group relative overflow-hidden shadow-elev-sm">
       <div className={`absolute top-0 bottom-0 left-0 w-1 ${urgencyBg.replace('border-', 'bg-')}`} />

       <div className="flex justify-between items-start pl-2">
          <div className="flex items-start gap-3 min-w-0">
             <div className={`w-9 h-9 rounded-sm flex items-center justify-center shrink-0 border border-[rgb(var(--fg-rgb))]/5 bg-[rgb(var(--fg-rgb))]/[0.02] ${iconColor}`}>
                {item.type === 'inventory' ? <Tag size={16} /> : <Calendar size={16} />}
             </div>
             <div className="min-w-0">
                <h4 className="text-[13px] font-bold text-text-primary truncate pr-2 leading-tight">{item.title}</h4>
                <div className="flex items-center gap-1.5 mt-1">
                   <span className={`px-1.5 py-0.5 rounded-xs text-[7px] font-black uppercase tracking-widest border ${urgencyBg} ${urgencyColor}`}>
                      {statusText}
                   </span>
                   <span className="text-[9px] text-text-faint font-mono tracking-tighter">{item.dueDate}</span>
                </div>
             </div>
          </div>
          
          <div className="flex flex-col items-end">
             <span className="text-[15px] font-bold text-text-primary tracking-tighter font-mono">
                {item.amount.toLocaleString()} 
             </span>
             <span className="text-[7px] font-black text-text-faint uppercase tracking-widest">{item.currency}</span>
          </div>
       </div>

       <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgb(var(--fg-rgb))]/[0.03] pl-2">
          <button onClick={() => onDelete(item.id)} className="w-7 h-7 rounded-full bg-[rgb(var(--fg-rgb))]/[0.01] text-text-faint hover:text-status-danger-soft flex items-center justify-center transition-colors">
             <Trash2 size={13} />
          </button>
          <button onClick={() => onEdit(item)} className="w-7 h-7 rounded-full bg-[rgb(var(--fg-rgb))]/[0.01] text-text-faint hover:text-text-primary flex items-center justify-center transition-colors">
             <Edit2 size={13} />
          </button>
          <button 
            onClick={() => onPay(item)}
            className="h-7 px-3 bg-status-success/5 hover:bg-status-success/10 border border-status-success/10 rounded-xs text-[9px] font-black uppercase tracking-widest text-status-success transition-all ml-auto"
          >
             Pagar
          </button>
       </div>
    </div>
  );
};

export default PayableCard;
