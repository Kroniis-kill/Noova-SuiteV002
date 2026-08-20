import React, { useState } from 'react';
import { Service } from '../../types';
import { MonitorPlay, LayoutTemplate, User, AlertTriangle } from 'lucide-react';

interface ServiceStats {
  total: number;
  activa: number;
  por_vencer: number; 
  vencida: number;
  fallando: number;
  totalScreens: number;
}

interface ServiceCardProps {
  service: Service;
  stats: ServiceStats;
  onClick: () => void;
  isActive?: boolean;
}

const ServiceCard: React.FC<ServiceCardProps> = React.memo(({ service, stats, onClick, isActive }) => {
  const [imgError, setImgError] = useState(false);
  
  const initials = service.name.substring(0, 2).toUpperCase();

  const getTypeIcon = () => {
    switch(service.type) {
        case 'cuenta_completa': return <LayoutTemplate size={18} />;
        case 'usuario_unico': return <User size={18} />;
        default: return <MonitorPlay size={18} />;
    }
  };

  const hasExpired = stats.vencida > 0;
  const hasWarning = stats.por_vencer > 0;
  const hasFailure = (stats.fallando || 0) > 0;

  // Mobile / Grid View
  if (isActive === undefined) {
      return (
        <button 
          onClick={onClick}
          className={`w-full bg-surface-1 border border-border-subtle p-4 lg:p-5 rounded-xl relative overflow-hidden group active:scale-[0.98] transition-all duration-150 ease-out-soft shadow-elev-sm flex flex-col justify-between min-h-[130px] text-left hover:border-border-strong hover:bg-surface-2 ${(stats.activa + stats.por_vencer + stats.fallando) === 0 ? 'opacity-50 grayscale' : ''}`}
        >
          <div className="relative z-10 w-full">
             <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded-md bg-surface-4 border border-white/5 flex items-center justify-center text-zinc-300 shadow-inner overflow-hidden">
                   {service.image_url && !imgError ? (
                     <img 
                       src={service.image_url} 
                       className="w-full h-full object-cover rounded-md" 
                       referrerPolicy="no-referrer" 
                       loading="lazy"
                       onError={() => setImgError(true)}
                       alt={service.name}
                     />
                   ) : (
                     <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-white/5 to-white/10 text-[11px] font-bold text-white rounded-md">
                        {initials}
                     </div>
                   )}
                </div>
                <div className="text-right">
                   <span className="text-lg font-bold text-white leading-none block">{stats.total}</span>
                   <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-wide">Cuentas</span>
                </div>
             </div>

             <h3 className="text-[13px] font-bold text-white leading-tight truncate mb-0.5 pr-2">{service.name}</h3>
             <p className="text-[10px] text-zinc-500 font-medium">{stats.totalScreens} cupos totales</p>
          </div>
          
          <div className="relative z-10 w-full mt-3 flex flex-wrap gap-1.5">
             {hasFailure && (
                 <div className="flex-1 bg-orange-500/20 border border-orange-500/30 rounded-xs py-1 px-2 flex items-center justify-center gap-1">
                    <AlertTriangle size={10} className="text-orange-500" />
                    <span className="text-[9px] font-bold text-orange-400">{stats.fallando}</span>
                 </div>
             )}
             {(hasExpired || hasWarning) && (
                 <div className={`flex-1 ${hasExpired ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'} rounded-xs py-1 flex items-center justify-center`}>
                    <span className={`text-[9px] font-bold ${hasExpired ? 'text-red-400' : 'text-amber-400'}`}>
                      {hasExpired ? `${stats.vencida} Venc.` : `${stats.por_vencer} Aler.`}
                    </span>
                 </div>
             )}
             {!hasExpired && !hasWarning && !hasFailure && (
                 <div className="w-full bg-emerald-500/5 border border-emerald-500/10 rounded-xs py-1 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-emerald-500">Estado Óptimo</span>
                 </div>
             )}
          </div>
        </button>
      );
  }

  // Desktop Sidebar List Item View
  return (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-md transition-all text-left group border relative overflow-hidden ${
            isActive 
            ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20' 
            : 'bg-transparent border-transparent text-zinc-400 hover:bg-white/5 hover:text-white'
        } ${(stats.activa + stats.por_vencer + stats.fallando) === 0 ? 'opacity-50 grayscale' : ''}`}
    >
        <div className="flex items-center gap-3 relative z-10">
            <div className={`p-1 rounded-xl w-8 h-8 flex items-center justify-center overflow-hidden ${isActive ? 'bg-white/20' : 'bg-white/5'}`}>
                {service.image_url && !imgError ? (
                    <img 
                      src={service.image_url} 
                      className="w-full h-full object-cover rounded-md" 
                      loading="lazy"
                      onError={() => setImgError(true)}
                    />
                ) : (
                    <span className="text-[9px] font-black">{initials}</span>
                )}
            </div>
            <span className={`text-xs font-semibold truncate max-w-[120px] ${isActive ? 'text-white' : 'text-zinc-300'}`}>{service.name}</span>
        </div>
        
        <div className="flex items-center gap-2 relative z-10">
            {hasFailure && <AlertTriangle size={12} className="text-orange-400 animate-pulse" />}
            {(hasExpired || hasWarning) && !hasFailure && (
                <div className={`w-2 h-2 rounded-full ${hasExpired ? 'bg-red-400' : 'bg-amber-400'} animate-pulse`} />
            )}
            <span className={`text-[10px] font-mono ${isActive ? 'text-white/80' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                {stats.total}
            </span>
        </div>
    </button>
  );
});

export default ServiceCard;