import React from 'react';
import { Account } from '../../types';
import { getAccountStatus, calculateOccupancy, getDaysRemaining } from '../../utils/inventarioUtils';
import { ChevronRight, Calendar, Lock, Mail, Users, AlertTriangle, Truck } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface CuentaCardProps {
  account: Account;
  onClick?: (acc: Account) => void; 
  isActive?: boolean;
}

const CuentaCard: React.FC<CuentaCardProps> = React.memo(({ account, onClick, isActive }) => {
  const { settings } = useData();
  const warningThreshold = settings.salesPreferences?.warningDays || 5;
  
  const status = getAccountStatus(account, warningThreshold);
  const isExpired = status === 'vencida';
  const isWarning = status === 'por_vencer';
  const isPaused = status === 'inactiva';
  const isFailing = status === 'fallando';
  
  const daysLeft = getDaysRemaining(account.endDate);
  const isToday = daysLeft === 0;

  let statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  let statusText = 'Activa';
  let statusBorder = 'bg-emerald-500'; 

  if (isPaused) { 
      statusColor = 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'; 
      statusText = 'Pausada'; 
      statusBorder = 'bg-zinc-500';
  }
  else if (isFailing) {
      statusColor = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      statusText = 'Falla';
      statusBorder = 'bg-orange-500';
  }
  else if (isExpired) { 
      statusColor = 'bg-red-500/10 text-red-400 border-red-500/20'; 
      statusText = 'Vencida'; 
      statusBorder = 'bg-red-500';
  }
  else if (isToday) {
      statusColor = 'bg-red-500/20 text-red-500 border-red-500/40 animate-pulse';
      statusText = 'Vence Hoy';
      statusBorder = 'bg-red-600';
  }
  else if (isWarning) { 
      statusColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20'; 
      statusText = 'Por Vencer'; 
      statusBorder = 'bg-amber-500';
  }

  const totalSlots = account.maxScreens || 1;
  const usedSlots = calculateOccupancy(account);
  const progress = Math.min(100, (usedSlots / totalSlots) * 100);
  
  let progressColor = 'bg-brand-primary';
  if (progress >= 100) progressColor = 'bg-red-500';
  else if (progress > 80) progressColor = 'bg-amber-500';

  const cardBackground = isActive
     ? 'bg-brand-primary/10 border-brand-primary/50 shadow-glow-primary-sm'
     : (isExpired || isFailing)
        ? 'bg-surface-sunken border-border-subtle opacity-80'
        : 'bg-surface-1 border-border-subtle hover:bg-surface-2 hover:border-border-strong';

  return (
    <div 
      onClick={() => onClick && onClick(account)}
      className={`
        relative w-full p-4 lg:p-5 rounded-xl border shadow-elev-sm transition-all duration-150 ease-out-soft cursor-pointer group overflow-hidden
        ${cardBackground}
      `}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusBorder}`} />

      <div className="flex flex-col gap-3 pl-3 transition-opacity duration-300">
         <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1 pr-2">
               <div className="flex items-center gap-2 mb-1">
                  {account.providerId && (
                     <div className={`bg-blue-500/10 p-1 rounded-md border border-blue-500/20 ${isFailing ? 'opacity-40' : ''}`} title="Cuenta de Proveedor">
                        <Truck size={10} className="text-blue-400" />
                     </div>
                  )}
                  <Mail size={12} className={`${isActive ? "text-brand-primary" : "text-zinc-500"} ${isFailing ? 'opacity-40' : ''}`} />
                  <h4 className={`text-[13px] font-bold truncate ${isActive ? 'text-white' : 'text-zinc-200 group-hover:text-white'} ${isFailing ? 'opacity-40' : ''}`}>
                     {account.email}
                  </h4>
                  {isFailing && <AlertTriangle size={14} className="text-orange-500 animate-pulse shrink-0" />}
               </div>
               <div className={`flex items-center gap-2 ${isFailing ? 'opacity-40' : ''}`}>
                   <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-sunken border border-white/[0.08]">
                      <Lock size={10} className="text-zinc-600" />
                      <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[100px]">{account.password}</span>
                   </div>
               </div>
            </div>
         </div>

         <div className={`flex items-end justify-between pt-1 ${isFailing ? 'opacity-40' : ''}`}>
             <div className={`flex flex-col gap-1 ${isFailing ? 'lg:hidden' : ''}`}>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Vencimiento</span>
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-zinc-300">
                   <Calendar size={12} className={isExpired || isWarning || isToday ? "text-red-400" : "text-zinc-500"} />
                   <span>{account.endDate}</span>
                   <span className="text-[10px] text-zinc-600 font-sans ml-1 opacity-70">
                      ({daysLeft} días)
                   </span>
                </div>
             </div>

             <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                   <Users size={10} />
                   <span>{usedSlots}/{totalSlots}</span>
                </div>
                <div className="w-16 h-1.5 bg-surface-sunken rounded-full overflow-hidden border border-white/[0.08]">
                   <div 
                     className={`h-full rounded-full transition-all duration-500 ${progressColor}`} 
                     style={{ width: `${progress}%` }} 
                   />
                </div>
             </div>
         </div>
      </div>

      <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
          <span className={`px-2 py-0.5 rounded-xs text-[9px] font-semibold uppercase tracking-wide border ${statusColor} !opacity-100 shadow-sm`}>
             {statusText}
          </span>
      </div>
      
      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block">
         <ChevronRight size={16} className="text-zinc-500" />
      </div>
    </div>
  );
});

export default CuentaCard;