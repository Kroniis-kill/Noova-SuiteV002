
import React, { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { ActivityLog, LogAction, LogEntity } from '../../types';
import { 
  History, Plus, Edit2, Trash2, LogIn, ShoppingCart, 
  Users, Layers, Wallet, Monitor, Truck, Briefcase, Settings, Search, Filter, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ActivityLogList: React.FC = () => {
  const { activityLogs } = useData();
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState<LogEntity | 'ALL'>('ALL');

  // Group logs by Date
  const groupedLogs = useMemo(() => {
    let result = activityLogs;
    if (search) {
      result = result.filter(log => log.details.toLowerCase().includes(search.toLowerCase()));
    }
    if (filterEntity !== 'ALL') {
      result = result.filter(log => log.entity === filterEntity);
    }
    
    const sorted = result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100);
    
    const groups: Record<string, ActivityLog[]> = {};
    sorted.forEach(log => {
        const date = new Date(log.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        if (!groups[date]) groups[date] = [];
        groups[date].push(log);
    });
    
    return groups;
  }, [activityLogs, search, filterEntity]);

  const getActionConfig = (action: LogAction) => {
    switch (action) {
      case 'CREATE': return { icon: <Plus size={14} />, color: 'text-status-success-soft', bg: 'bg-status-success/10' };
      case 'UPDATE': return { icon: <Edit2 size={14} />, color: 'text-status-info-soft', bg: 'bg-status-info/10' };
      case 'DELETE': return { icon: <Trash2 size={14} />, color: 'text-status-danger-soft', bg: 'bg-status-danger/10' };
      case 'LOGIN': return { icon: <LogIn size={14} />, color: 'text-status-warning-soft', bg: 'bg-status-warning/10' };
      default: return { icon: <History size={14} />, color: 'text-text-muted', bg: 'bg-[rgb(var(--fg-rgb))]/5' };
    }
  };

  const getEntityLabel = (entity: LogEntity) => {
      switch(entity) {
          case 'SALE': return 'Ventas';
          case 'CLIENT': return 'Clientes';
          case 'INVENTORY': case 'ACCOUNT': return 'Inventario';
          case 'FINANCE': return 'Finanzas';
          default: return entity;
      }
  };

  return (
    <div className="bg-surface-3 border border-border-subtle rounded-2xl p-0 shadow-elev-lg relative overflow-hidden flex flex-col h-[70vh] min-h-[420px] w-full max-w-5xl mx-auto">
       
       {/* Header */}
       <div className="p-5 border-b border-hairline bg-surface-zinc/50 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
          <div>
             <h2 className="text-lg font-bold text-text-primary flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 shadow-glow-sm">
                    <Clock size={20} />
                </div>
                Historial de Cambios
             </h2>
             <p className="text-text-muted text-xs mt-1 ml-[52px]">Registro detallado de operaciones</p>
          </div>
          
          <div className="flex gap-3">
             <div className="relative group flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled group-focus-within:text-brand-primary transition-colors" />
                <input 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder="Buscar en logs..."
                  className="bg-surface-sunken border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-xs text-text-primary w-full md:w-64 focus:border-brand-primary/50 outline-none transition-all placeholder:text-text-faint font-medium"
                />
             </div>
             
             <div className="relative group shrink-0">
                 <select 
                   value={filterEntity} 
                   onChange={e => setFilterEntity(e.target.value as any)}
                   className="appearance-none bg-surface-sunken border border-border-subtle rounded-xl pl-4 pr-8 py-2.5 text-xs text-text-secondary font-bold outline-none focus:border-brand-primary/50 cursor-pointer hover:text-text-primary transition-colors"
                 >
                    <option value="ALL">Todo</option>
                    <option value="SALE">Ventas</option>
                    <option value="CLIENT">Clientes</option>
                    <option value="INVENTORY">Inventario</option>
                    <option value="FINANCE">Finanzas</option>
                 </select>
                 <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none" />
             </div>
          </div>
       </div>

       {/* Timeline List */}
       <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-8 bg-surface-1 relative">
          
          {(Object.entries(groupedLogs) as [string, ActivityLog[]][]).map(([date, logs]) => (
              <div key={date} className="relative pl-4 border-l border-border-subtle">
                  <span className="absolute -left-[19px] -top-1 bg-surface-1 text-[10px] font-semibold text-text-disabled uppercase py-1 px-2 border border-hairline rounded-pill">{date}</span>
                  
                  <div className="space-y-3 mt-4">
                      {logs.map(log => {
                          const config = getActionConfig(log.action);
                          const time = new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                          return (
                              <div key={log.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-[rgb(var(--fg-rgb))]/[0.02] transition-colors group">
                                  <div className={`mt-1 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${config.bg} ${config.color}`}>
                                      {config.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-sm text-text-secondary leading-snug">{log.details}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[10px] font-mono text-text-disabled">{time}</span>
                                          <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                          <span className="text-[10px] font-semibold text-text-disabled uppercase">{getEntityLabel(log.entity)}</span>
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          ))}

          {Object.keys(groupedLogs).length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <History size={48} className="text-text-disabled mb-4" />
                <h3 className="text-text-secondary font-bold text-lg">Sin Actividad Reciente</h3>
             </div>
          )}
       </div>
    </div>
  );
};

export default ActivityLogList;
