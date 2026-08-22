import React from 'react';
import { Reseller } from '../../types';
import { Send, Users, ShoppingCart, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Avatar from '../ui/Avatar';
import { cardClass } from '../ui/Card';

interface ResellerStats {
  clients: number;
  salesCount: number;
  totalRevenue: number;
}

interface ResellerCardProps {
  reseller: Reseller;
  stats: ResellerStats;
  onClick: (r: Reseller) => void;
  onEdit: (r: Reseller) => void;
  onDelete?: (r: Reseller) => void;
}

const ResellerCard: React.FC<ResellerCardProps> = ({ reseller, stats, onClick }) => {
  
  const handleTelegram = (e: React.MouseEvent) => {
    e.stopPropagation();
    const user = reseller.telegram?.replace('@', '') || '';
    if (user) {
        window.open(`https://t.me/${user}`, '_blank');
    }
  };

  return (
    <motion.div 
      layout
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(reseller)}
      className={cardClass({
        variant: 'bare',
        radius: 'xl',
        pad: 'md',
        className: 'group relative bg-surface-1 border border-border-subtle shadow-elev-sm hover:border-border-strong hover:bg-surface-2 transition-all duration-150 ease-out-soft cursor-pointer',
      })}
    >
       {/* Decorative Background */}

       {/* Header */}
       <div className="flex justify-between items-start mb-4 relative z-10">
          <div className="flex items-center gap-4">
             <Avatar name={reseller.name} size={48} className="rounded-md shadow-lg border border-[rgb(var(--fg-rgb))]/10" />
             
             <div>
                <h3 className="text-base font-bold text-text-primary leading-tight">{reseller.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[10px] bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/5 px-2 py-0.5 rounded-md text-text-muted font-mono">
                      {reseller.code}
                   </span>
                   {reseller.whatsapp && (
                      <span className="text-[10px] text-text-disabled font-mono">
                         {reseller.whatsapp}
                      </span>
                   )}
                </div>
             </div>
          </div>
          
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgb(var(--fg-rgb))]/5 text-text-disabled group-hover:bg-[rgb(var(--fg-rgb))]/10 group-hover:text-text-primary transition-colors">
             <ChevronRight size={16} />
          </div>
       </div>

       {/* Stats Grid */}
       <div className="grid grid-cols-3 gap-2 relative z-10">
          <div className="bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 rounded-md p-2 flex flex-col items-center justify-center min-h-[60px]">
             <span className="text-[10px] text-text-disabled font-bold uppercase mb-0.5 flex items-center gap-1">
                <Users size={10} /> Clientes
             </span>
             <span className="text-sm font-bold text-text-primary">{stats.clients}</span>
          </div>
          <div className="bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 rounded-md p-2 flex flex-col items-center justify-center min-h-[60px]">
             <span className="text-[10px] text-text-disabled font-bold uppercase mb-0.5 flex items-center gap-1">
                <ShoppingCart size={10} /> Ventas
             </span>
             <span className="text-sm font-bold text-text-primary">{stats.salesCount}</span>
          </div>
          <div className="bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 rounded-md p-2 flex flex-col items-center justify-center min-h-[60px]">
             <span className="text-[10px] text-text-disabled font-bold uppercase mb-0.5">Generado</span>
             <span className="text-sm font-bold text-status-success-soft">${stats.totalRevenue.toLocaleString()}</span>
          </div>
       </div>

       {/* Telegram Quick Action */}
       {reseller.telegram && (
          <button 
             onClick={handleTelegram}
             className="absolute top-4 right-14 w-8 h-8 flex items-center justify-center rounded-full bg-brand-telegram/10 text-brand-telegram hover:bg-brand-telegram/20 transition-colors z-20"
          >
             <Send size={14} />
          </button>
       )}
    </motion.div>
  );
};

export default ResellerCard;