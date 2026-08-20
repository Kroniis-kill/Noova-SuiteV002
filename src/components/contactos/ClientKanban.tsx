
import React, { useMemo } from 'react';
import { Client, Sale } from '../../types';
import { getDaysRemaining } from '../../utils/expiredUtils';
import { motion } from 'framer-motion';
import { User, Zap, AlertTriangle, Moon, Phone, Layers } from 'lucide-react';
import Avatar from '../ui/Avatar';

interface ClientKanbanProps {
  clients: Client[];
  sales: Sale[];
  onClientClick: (client: Client) => void;
}

type KanbanStatus = 'nuevo' | 'activo' | 'riesgo' | 'inactivo';

interface KanbanColumn {
  id: KanbanStatus;
  title: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  borderColor: string;
}

const COLUMNS: KanbanColumn[] = [
  { id: 'nuevo', title: 'Nuevos', icon: User, color: 'text-blue-400', bg: 'bg-blue-500/5', borderColor: 'border-blue-500/20' },
  { id: 'activo', title: 'Activos', icon: Zap, color: 'text-emerald-400', bg: 'bg-emerald-500/5', borderColor: 'border-emerald-500/20' },
  { id: 'riesgo', title: 'En Riesgo', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/5', borderColor: 'border-amber-500/20' },
  { id: 'inactivo', title: 'Inactivos', icon: Moon, color: 'text-zinc-400', bg: 'bg-zinc-500/5', borderColor: 'border-zinc-500/20' },
];

const ClientKanban: React.FC<ClientKanbanProps> = ({ clients, sales, onClientClick }) => {
  
  // Logic to categorize clients
  const categorizedClients = useMemo(() => {
    const groups: Record<KanbanStatus, Client[]> = {
      nuevo: [],
      activo: [],
      riesgo: [],
      inactivo: []
    };

    clients.forEach(client => {
      const clientSales = sales.filter(s => s.clientId === client.id);
      
      let status: KanbanStatus = 'inactivo';

      if (clientSales.length === 0) {
        status = 'nuevo';
      } else {
        // Check active sales
        const activeSales = clientSales.filter(s => getDaysRemaining(s.expiryDate) > 0);
        
        if (activeSales.length > 0) {
           // If has active sales, check if any is at risk (<= 7 days)
           const minDays = Math.min(...activeSales.map(s => getDaysRemaining(s.expiryDate)));
           if (minDays <= 7) {
             status = 'riesgo';
           } else {
             status = 'activo';
           }
        } else {
           // No active sales, so inactive
           status = 'inactivo';
        }
      }
      
      groups[status].push(client);
    });

    return groups;
  }, [clients, sales]);

  return (
    <div className="flex gap-3 overflow-x-auto overflow-y-hidden pb-4 h-full snap-x snap-mandatory md:snap-none w-full pr-4">
      {COLUMNS.map(col => {
        const items = categorizedClients[col.id];
        const Icon = col.icon;

        return (
          <div 
            key={col.id} 
            className={`min-w-[320px] w-[92vw] md:w-full md:min-w-[300px] flex flex-col h-full snap-center bg-surface-3 rounded-xl border border-white/5 overflow-hidden shadow-lg shrink-0`}
          >
            {/* Header */}
            <div className={`p-4 border-b border-white/5 flex items-center justify-between ${col.bg}`}>
               <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg bg-black/20 ${col.color}`}>
                     <Icon size={16} />
                  </div>
                  <span className={`text-sm font-bold ${col.color}`}>{col.title}</span>
               </div>
               <span className="text-xs font-semibold text-zinc-500 bg-black/20 px-2 py-0.5 rounded-full">
                  {items.length}
               </span>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 bg-surface-1/50">
               {items.map(client => (
                 <motion.div
                   layout
                   key={client.id}
                   onClick={() => onClientClick(client)}
                   className="bg-surface-3 border border-white/5 p-3 rounded-md hover:border-white/10 cursor-pointer shadow-sm active:scale-98 transition-all group"
                 >
                    <div className="flex items-center gap-3">
                       <Avatar name={client.name} size={36} className="rounded-sm text-xs font-semibold" />
                       <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-white truncate leading-tight group-hover:text-brand-primary transition-colors">{client.name}</h4>
                          <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                             <Phone size={10} /> {client.phone}
                          </p>
                       </div>
                    </div>
                    
                    {client.activeServices > 0 && (
                       <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5">
                          <span className="text-[10px] font-semibold text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/5 flex items-center gap-1">
                             <Layers size={10} /> {client.activeServices} Servicios
                          </span>
                       </div>
                    )}
                 </motion.div>
               ))}
               
               {items.length === 0 && (
                  <div className="py-8 text-center opacity-40">
                     <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">Vacío</p>
                  </div>
               )}
            </div>
          </div>
        );
      })}
      {/* Spacer for right edge */}
      <div className="w-1 shrink-0" />
    </div>
  );
};

export default ClientKanban;
