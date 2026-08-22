import React from 'react';
import { Account } from '../../types';
import { getAccountStatus, calculateOccupancy, getDaysRemaining } from '../../utils/inventarioUtils';
import { ChevronRight, Calendar, Lock, Mail, Users, AlertTriangle, Truck } from 'lucide-react';
import { useData } from '../../context/DataContext';
import Card from '../ui/Card';

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

  let statusColor = 'bg-status-success/10 text-status-success-soft border-status-success/20';
  let statusText = 'Activa';
  let statusBorder = 'bg-status-success'; 

  if (isPaused) { 
      statusColor = 'bg-zinc-500/10 text-text-muted border-zinc-500/20'; 
      statusText = 'Pausada'; 
      statusBorder = 'bg-zinc-500';
  }
  else if (isFailing) {
      statusColor = 'bg-status-expiring/10 text-status-expiring-soft border-status-expiring/20';
      statusText = 'Falla';
      statusBorder = 'bg-status-expiring';
  }
  else if (isExpired) { 
      statusColor = 'bg-status-danger/10 text-status-danger-soft border-status-danger/20'; 
      statusText = 'Vencida'; 
      statusBorder = 'bg-status-danger';
  }
  else if (isToday) {
      statusColor = 'bg-status-danger/20 text-status-danger border-status-danger/40 animate-pulse';
      statusText = 'Vence Hoy';
      statusBorder = 'bg-red-600';
  }
  else if (isWarning) { 
      statusColor = 'bg-status-warning/10 text-status-warning-soft border-status-warning/20'; 
      statusText = 'Por Vencer'; 
      statusBorder = 'bg-status-warning';
  }

  const totalSlots = account.maxScreens || 1;
  const usedSlots = calculateOccupancy(account);
  const progress = Math.min(100, (usedSlots / totalSlots) * 100);
  
  let progressColor = 'bg-brand-primary';
  if (progress >= 100) progressColor = 'bg-status-danger';
  else if (progress > 80) progressColor = 'bg-status-warning';

  const cardBackground = isActive
     ? 'bg-brand-primary/10 border-brand-primary/50 shadow-glow-primary-sm'
     : (isExpired || isFailing)
        ? 'bg-surface-sunken border-border-subtle opacity-80'
        : 'bg-surface-1 border-border-subtle hover:bg-surface-2 hover:border-border-strong';

  return (
    <Card
      as="div"
      variant="bare"
      radius="xl"
      pad="md"
      onClick={() => onClick && onClick(account)}
      className={`
        relative w-full border shadow-elev-sm transition-all duration-150 ease-out-soft cursor-pointer group
        ${cardBackground}
      `}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusBorder}`} />

      <div className="flex flex-col gap-3 pl-3 transition-opacity duration-300">
         <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1 pr-2">
               <div className="flex items-center gap-2 mb-1">
                  {account.providerId && (
                     <div className={`bg-status-info/10 p-1 rounded-md border border-status-info/20 ${isFailing ? 'opacity-40' : ''}`} title="Cuenta de Proveedor">
                        <Truck size={10} className="text-status-info-soft" />
                     </div>
                  )}
                  <Mail size={12} className={`${isActive ? "text-brand-primary" : "text-text-disabled"} ${isFailing ? 'opacity-40' : ''}`} />
                  <h4 className={`text-[13px] font-bold truncate ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'} ${isFailing ? 'opacity-40' : ''}`}>
                     {account.email}
                  </h4>
                  {isFailing && <AlertTriangle size={14} className="text-status-expiring animate-pulse shrink-0" />}
               </div>
               <div className={`flex items-center gap-2 ${isFailing ? 'opacity-40' : ''}`}>
                   <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-sunken border border-[rgb(var(--fg-rgb))]/[0.08]">
                      <Lock size={10} className="text-text-faint" />
                      <span className="text-[10px] font-mono text-text-muted truncate max-w-[100px]">{account.password}</span>
                   </div>
               </div>
            </div>
         </div>

         <div className={`flex items-end justify-between pt-1 ${isFailing ? 'opacity-40' : ''}`}>
             <div className={`flex flex-col gap-1 ${isFailing ? 'lg:hidden' : ''}`}>
                <span className="text-[9px] font-bold text-text-disabled uppercase tracking-wider">Vencimiento</span>
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-text-secondary">
                   <Calendar size={12} className={isExpired || isWarning || isToday ? "text-status-danger-soft" : "text-text-disabled"} />
                   <span>{account.endDate}</span>
                   <span className="text-[10px] text-text-faint font-sans ml-1 opacity-70">
                      ({daysLeft} días)
                   </span>
                </div>
             </div>

             <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 text-[10px] text-text-muted">
                   <Users size={10} />
                   <span>{usedSlots}/{totalSlots}</span>
                </div>
                <div className="w-16 h-1.5 bg-surface-sunken rounded-full overflow-hidden border border-[rgb(var(--fg-rgb))]/[0.08]">
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
         <ChevronRight size={16} className="text-text-disabled" />
      </div>
    </Card>
  );
});

export default CuentaCard;