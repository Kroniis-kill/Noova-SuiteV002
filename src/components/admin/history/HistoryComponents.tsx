
import React from 'react';
import { SubscriptionHistory } from '../../../types/adminTypes';
import { Clock, RefreshCcw, UserPlus, UserMinus, ShieldAlert, Edit } from 'lucide-react';

interface HistoryItemProps {
  item: SubscriptionHistory;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ item }) => {
  const getActionConfig = () => {
    switch (item.action) {
      case 'CREATED': return { icon: UserPlus, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      case 'UPDATED': return { icon: Edit, color: 'text-blue-400', bg: 'bg-blue-500/10' };
      case 'RENEWED': return { icon: RefreshCcw, color: 'text-indigo-400', bg: 'bg-indigo-500/10' };
      case 'SUSPENDED': return { icon: ShieldAlert, color: 'text-orange-400', bg: 'bg-orange-500/10' };
      case 'REACTIVATED': return { icon: Clock, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      case 'DELETED': return { icon: UserMinus, color: 'text-red-400', bg: 'bg-red-500/10' };
      default: return { icon: Clock, color: 'text-zinc-400', bg: 'bg-zinc-500/10' };
    }
  };

  const { icon: Icon, color, bg } = getActionConfig();
  const date = new Date(item.timestamp).toLocaleString();

  return (
    <div className="bg-surface-zinc/60 border border-white/5 rounded-lg p-4 flex gap-4 items-start hover:bg-surface-zinc transition-colors">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg} ${color} shrink-0`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
           <h4 className="text-sm font-bold text-white uppercase tracking-wide">{item.action}</h4>
           <span className="text-[10px] text-zinc-500 font-mono">{date}</span>
        </div>
        <p className="text-xs text-zinc-300 mt-1 truncate">
           Usuario: <span className="font-bold">{item.user_email || item.user_id}</span>
        </p>
        
        {(item.old_plan || item.new_plan) && (
           <div className="mt-2 text-[11px] bg-white/5 p-2 rounded-lg border border-white/5">
              {item.old_plan && <span className="text-zinc-500">{item.old_plan}</span>}
              {item.old_plan && item.new_plan && <span className="mx-2 text-zinc-600">→</span>}
              {item.new_plan && <span className="text-emerald-400 font-bold">{item.new_plan}</span>}
           </div>
        )}
      </div>
    </div>
  );
};
