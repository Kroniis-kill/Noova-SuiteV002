import React from 'react';
import { Client } from '../../types';
import { Layers, MessageCircle, Phone, Ban, AlertTriangle, Star, Zap, Clock, History } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { sendWhatsAppMessage, getClientTags } from '../../utils/contactosUtils'; 
import Avatar from '../ui/Avatar';

interface ContactoCardProps {
  client: Client;
  onClick: (client: Client) => void;
  onHistoryClick?: (client: Client) => void;
  isActive?: boolean;
}

const ContactoCard: React.FC<ContactoCardProps> = React.memo(({ client, onClick, onHistoryClick, isActive }) => {
  const { resellers } = useData();
  const reseller = client.resellerId ? resellers.find(r => r.id === client.resellerId) : null;

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    sendWhatsAppMessage(client.phone ?? '', ''); 
  };

  const handleHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onHistoryClick) onHistoryClick(client);
  };

  const displayTags = getClientTags(client, client.activeServices);

  const getTagBadge = (tag: string) => {
      switch(tag) {
          case 'VIP': return <span key={tag} className="text-[9px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold uppercase"><Star size={8} className="fill-yellow-500" /> VIP</span>;
          case 'Problemático': return <span key={tag} className="text-[9px] bg-orange-500/10 text-orange-500 border border-orange-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold uppercase"><AlertTriangle size={8} /> Prob.</span>;
          case 'Nuevo': return <span key={tag} className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold uppercase"><Zap size={8} /> Nuevo</span>;
          case 'Frecuente': return <span key={tag} className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold uppercase"><Clock size={8} /> Frec.</span>;
          default: return null;
      }
  };

  return (
    <div 
      onClick={() => onClick(client)}
      className={`
        group relative w-full p-4 lg:p-5 rounded-xl border shadow-elev-sm transition-all duration-150 ease-out-soft cursor-pointer overflow-hidden
        ${isActive
          ? 'bg-brand-primary/10 border-brand-primary/50 shadow-glow-primary-sm'
          : client.isBlocked
            ? 'bg-status-danger/5 border-status-danger/30 hover:bg-status-danger/10'
            : 'bg-surface-1 border-border-subtle hover:bg-surface-2 hover:border-border-strong'
        }
      `}
    >
      {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary" />}
      {client.isBlocked && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />}

      <div className="flex items-center gap-4 relative z-10">
         <div className="relative shrink-0">
            <Avatar name={client.name} size={48} className={`rounded-full shadow-lg border ${client.isBlocked ? 'border-red-500/30' : 'border-white/[0.08]'}`} />
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] ${isActive ? 'border-surface-zinc' : 'border-surface-1'} flex items-center justify-center bg-surface-1`}>
               {client.isBlocked ? (<div className="w-full h-full rounded-full bg-red-500 flex items-center justify-center"><Ban size={8} className="text-white" /></div>) : (<div className={`w-2 h-2 rounded-full ${client.activeServices > 0 ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-zinc-600'}`} />)}
            </div>
         </div>
         
         <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`text-[14px] font-bold truncate leading-tight ${isActive ? 'text-white' : client.isBlocked ? 'text-red-200' : 'text-zinc-200 group-hover:text-white'}`}>
                           {client.name}
                        </h3>
                        {displayTags.length > 0 && (<div className="flex flex-wrap gap-1">{displayTags.map(tag => getTagBadge(tag))}</div>)}
                        {client.isBlocked && <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold uppercase">Bloqueado</span>}
                    </div>
                </div>

                {client.activeServices > 0 && (<span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap ml-2"><Layers size={8} /> {client.activeServices}</span>)}
            </div>
            
            <div className="flex items-center gap-3 mt-1.5">
               <span className="text-[11px] text-zinc-500 font-mono flex items-center gap-1 truncate"><Phone size={10} /> {client.phone}</span>
               {reseller && (<span className="text-[9px] text-amber-500 bg-amber-500/10 px-1.5 rounded border border-amber-500/20 truncate max-w-[80px]">{reseller.name}</span>)}
            </div>
         </div>

         <div className="flex gap-2 shrink-0">
            {onHistoryClick && (
                <button 
                onClick={handleHistory}
                className={`
                    w-8 h-8 rounded-sm flex items-center justify-center transition-all bg-white/5 text-zinc-500 hover:text-brand-primary hover:bg-brand-primary/10 border border-white/[0.08]
                `}
                title="Historial de compras"
                >
                <History size={14} />
                </button>
            )}
            <button 
                onClick={handleWhatsApp}
                className={`
                    w-8 h-8 rounded-sm flex items-center justify-center transition-all shrink-0
                    ${isActive 
                        ? 'bg-brand-whatsapp text-black shadow-lg hover:brightness-110' 
                        : 'bg-white/5 text-zinc-500 hover:text-brand-whatsapp hover:bg-brand-whatsapp/10 border border-white/[0.08]'
                    }
                `}
            >
                <MessageCircle size={14} />
            </button>
         </div>
      </div>
    </div>
  );
});

export default ContactoCard;