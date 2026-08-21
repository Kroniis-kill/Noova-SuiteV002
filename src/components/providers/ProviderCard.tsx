import React from 'react';
import { Provider } from '../../types';
import { MessageCircle, Send, Edit2, Layers, ChevronRight, Truck, Star } from 'lucide-react';
import { sendWhatsAppMessage } from '../../utils/contactosUtils';
import { motion } from 'framer-motion';
import Avatar from '../ui/Avatar';

interface ProviderCardProps {
  provider: Provider;
  accountCount: number;
  onClick: (p: Provider) => void;
  onEdit: (p: Provider) => void;
  isActive?: boolean;
}

const ProviderCard: React.FC<ProviderCardProps> = ({ provider, accountCount, onClick, onEdit, isActive }) => {
  
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendWhatsAppMessage(provider.whatsapp, '');
  };

  const handleTelegram = (e: React.MouseEvent) => {
    e.stopPropagation();
    const user = provider.telegram?.replace('@', '') || '';
    if (user) {
        window.open(`https://t.me/${user}`, '_blank');
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(provider);
  };

  const score = provider.qualityScore || 5;

  return (
    <motion.div 
      layout
      onClick={() => onClick(provider)}
      className={`
        group relative p-4 lg:p-5 rounded-xl border bg-surface-1 shadow-elev-sm transition-all duration-150 ease-out-soft cursor-pointer overflow-hidden
        ${isActive
          ? 'border-brand-primary/50 shadow-glow-primary-sm'
          : 'border-border-subtle hover:border-border-strong hover:bg-surface-2'
        }
      `}
    >
       {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary" />}
       <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-white/[0.03] to-transparent rounded-bl-full pointer-events-none transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />

       <div className="flex justify-between items-start mb-3 relative z-10">
          <div className="flex items-center gap-3">
             <div className="relative">
                <Avatar name={provider.name} size={48} className="rounded-md shadow-lg border border-[rgb(var(--fg-rgb))]/10" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-surface-1 rounded-full flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5">
                   <Truck size={10} className="text-text-muted" />
                </div>
             </div>
             
             <div className="min-w-0">
                <h3 className={`text-[15px] font-bold truncate leading-tight ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>{provider.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-text-disabled font-mono bg-[rgb(var(--fg-rgb))]/5 px-1.5 rounded border border-[rgb(var(--fg-rgb))]/5 truncate">{provider.whatsapp}</span>
                    <div className="flex items-center gap-0.5 ml-1"><Star size={10} className="fill-amber-400 text-status-warning-soft" /><span className="text-[10px] font-semibold text-status-warning-soft">{score.toFixed(1)}</span></div>
                </div>
             </div>
          </div>
          <div className="flex gap-1"><button onClick={handleEditClick} className="w-8 h-8 rounded-full bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors border border-[rgb(var(--fg-rgb))]/5"><Edit2 size={14} /></button></div>
       </div>

       <div className="flex items-center justify-between pt-3 border-t border-[rgb(var(--fg-rgb))]/5 relative z-10">
          <div className="flex items-center gap-2"><div className="flex items-center justify-center w-6 h-6 rounded-full bg-status-info/10 text-status-info-soft border border-status-info/20"><Layers size={12} /></div><span className="text-[11px] font-medium text-text-muted"><strong className="text-text-secondary">{accountCount}</strong> Items</span></div>
          <div className="flex gap-2">
             <button onClick={handleWhatsApp} className="w-8 h-8 rounded-sm bg-brand-whatsapp/10 text-brand-whatsapp border border-brand-whatsapp/20 flex items-center justify-center hover:bg-brand-whatsapp/20 transition-colors active:scale-95" title="WhatsApp"><MessageCircle size={14} /></button>
             {provider.telegram && (<button onClick={handleTelegram} className="w-8 h-8 rounded-sm bg-brand-telegram/10 text-brand-telegram border border-brand-telegram/20 flex items-center justify-center hover:bg-brand-telegram/20 transition-colors active:scale-95" title="Telegram"><Send size={14} /></button>)}
             <div className="w-8 h-8 flex items-center justify-center text-text-faint"><ChevronRight size={16} /></div>
          </div>
       </div>
    </motion.div>
  );
};

export default ProviderCard;