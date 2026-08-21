
import React, { useState, useMemo } from 'react';
import Modal from './Modal'; 
import { 
  Bell, Check, Clock, AlertCircle, CreditCard, Layers, 
  ChevronRight, Filter, Calendar, Package, DollarSign, 
  ArrowLeft, MessageCircle, ExternalLink, Trash2, Eye
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { AppNotification, PendingAction, ViewState, Client, Account, PayableExpense } from '../../types';
import { useToast } from '../../context/ToastContext';
import { formatDate, sendWhatsAppMessage } from '../../utils/contactosUtils';
import { getDaysRemaining } from '../../utils/expiredUtils';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewState) => void;
}

type CategoryFilter = 'all' | 'expiry' | 'stock' | 'payment';
type TimeFilter = 'all' | 'today' | 'soon';

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose, onNavigate }) => {
  const { notifications, setPendingAction, clients, accounts, payableExpenses } = useData();
  const { showToast } = useToast();
  
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);

  // Advanced Filtering
  const filtered = useMemo(() => {
    return notifications.filter(n => {
      // Category check
      const categoryMatch = categoryFilter === 'all' || n.type === categoryFilter;
      if (!categoryMatch) return false;

      // Time check
      if (timeFilter === 'all') return true;

      // We need to infer the date diff
      // In useSystemNotifications, we used title or message patterns, but we can also use priority
      // priority 'high' usually means today or overdue.
      const isToday = n.title.toLowerCase().includes('hoy') || n.priority === 'high';
      const isSoon = n.message.toLowerCase().includes('días') && !isToday;

      if (timeFilter === 'today') return isToday;
      if (timeFilter === 'soon') return isSoon;

      return true;
    });
  }, [notifications, categoryFilter, timeFilter]);

  const getIcon = (type: string, priority: string, size = 18) => {
      if (priority === 'high') return <AlertCircle size={size} className="text-status-danger" />;
      switch(type) {
          case 'payment': return <CreditCard size={size} className="text-status-warning" />;
          case 'stock': return <Layers size={size} className="text-status-info" />;
          case 'expiry': return <Calendar size={size} className="text-brand-primary" />;
          default: return <Bell size={size} className="text-muted" />;
      }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <span className="px-2 py-0.5 rounded-full bg-status-danger/10 text-status-danger text-[9px] font-black uppercase tracking-widest border border-status-danger/20">Urgente</span>;
      case 'medium': return <span className="px-2 py-0.5 rounded-full bg-status-warning/10 text-status-warning text-[9px] font-black uppercase tracking-widest border border-status-warning/20">Pendiente</span>;
      default: return <span className="px-2 py-0.5 rounded-full bg-zinc-500/10 text-disabled text-[9px] font-black uppercase tracking-widest border border-zinc-500/20">Info</span>;
    }
  };

  const executeAction = (n: AppNotification) => {
    if (!n.linkTo) return;
    
    let action: PendingAction | null = null;
    if (n.type === 'expiry' && n.metadata?.clientId) {
      action = { type: 'OPEN_RENEWAL', targetId: n.metadata.clientId };
    } else if (n.type === 'stock' && n.actionId) {
      action = { type: 'OPEN_ACCOUNT_DETAIL', targetId: n.actionId };
    } else if (n.type === 'payment' && n.actionId) {
      action = { type: 'OPEN_PAYABLE', targetId: n.actionId };
    }

    if (action) setPendingAction(action);
    onNavigate(n.linkTo);
    onClose();
    setSelectedNotification(null);
  };

  const handleWhatsApp = (n: AppNotification) => {
    if (n.type === 'expiry' && n.metadata?.clientId) {
      const client = clients.find(c => c.id === n.metadata.clientId);
      if (client?.phone) {
        sendWhatsAppMessage(client.phone, 'Hola, te escribo para recordarte el vencimiento de tus servicios.');
        return;
      }
    }
    showToast('No se encontró contacto válido', 'error');
  };

  // Detail View Component
  const NotificationDetail = ({ n }: { n: AppNotification }) => {
    // Attempt to find related data
    const client = n.metadata?.clientId ? clients.find(c => c.id === n.metadata.clientId) : null;
    const account = n.type === 'stock' && n.actionId ? accounts.find(a => a.id === n.actionId) : null;

    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
        <button 
          onClick={() => setSelectedNotification(null)}
          className="flex items-center gap-2 text-disabled hover:text-primary transition-colors mb-4 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-semibold uppercase tracking-widest">Volver al listado</span>
        </button>

        <div className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 rounded-xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-primary/10 to-transparent pointer-events-none" />
          
          <div className="flex items-start gap-4 mb-6 relative z-10">
            <div className={`w-14 h-14 rounded-lg flex items-center justify-center shrink-0 shadow-inner ${n.priority === 'high' ? 'bg-status-danger/10 border border-status-danger/20' : 'bg-brand-primary/10 border border-brand-primary/20'}`}>
              {getIcon(n.type, n.priority, 24)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2 mb-1.5">
                {getPriorityBadge(n.priority)}
                <span className="px-2 py-0.5 rounded-full bg-[rgb(var(--fg-rgb))]/5 text-muted text-[9px] font-black uppercase tracking-widest border border-[rgb(var(--fg-rgb))]/10">{n.type}</span>
              </div>
              <h3 className="text-lg font-black text-primary leading-tight">{n.title}</h3>
              <p className="text-[10px] text-disabled font-mono mt-1 uppercase tracking-wider">{new Date(n.date).toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-black/20 rounded-lg p-4 border border-[rgb(var(--fg-rgb))]/5 mb-6 relative z-10">
            <p className="text-sm text-secondary leading-relaxed font-medium">
              {n.message}
            </p>
          </div>

          {(client || account) && (
            <div className="bg-[rgb(var(--fg-rgb))]/5 rounded-lg p-4 border border-[rgb(var(--fg-rgb))]/5 mb-6 animate-in fade-in zoom-in-95 duration-500">
              <h4 className="text-[10px] font-bold text-disabled uppercase tracking-[0.2em] mb-3">Información Relevante</h4>
              {client && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center text-brand-primary font-semibold text-xs">{client.name.charAt(0)}</div>
                  <div>
                    <p className="text-xs font-semibold text-primary">{client.name}</p>
                    <p className="text-[10px] text-disabled font-mono">{client.phone}</p>
                  </div>
                </div>
              )}
              {account && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-muted"><Package size={18} /></div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-primary truncate">{account.email}</p>
                    <p className="text-[10px] text-disabled font-mono uppercase">Vence: {formatDate(account.endDate)}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 relative z-10">
            {n.type === 'expiry' && client && (
              <button 
                onClick={() => handleWhatsApp(n)}
                className="flex items-center justify-center gap-2 h-12 bg-brand-whatsapp text-black rounded-2xl font-bold text-[11px] uppercase tracking-wider shadow-lg shadow-brand-whatsapp/20 active:scale-95 transition-all"
              >
                <MessageCircle size={16} /> WhatsApp
              </button>
            )}
            <button 
              onClick={() => executeAction(n)}
              className={`flex items-center justify-center gap-2 h-12 rounded-2xl font-bold text-[11px] uppercase tracking-wider active:scale-95 transition-all ${
                n.type === 'expiry' && client 
                  ? 'bg-white text-black' 
                  : 'col-span-2 bg-gradient-to-r from-brand-primary to-brand-accent text-white shadow-glow'
              }`}
            >
              <Eye size={16} /> Ver registro
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Centro de Notificaciones" zIndex={2000}>
       <div className="flex flex-col h-[75vh] md:h-[600px] pt-1">
          
          {!selectedNotification && (
            <div className="space-y-4 shrink-0 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
               {/* Elegant Category Filters */}
               <div className="flex bg-black/20 p-1 rounded-md border border-[rgb(var(--fg-rgb))]/5 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'all', label: 'Todo', icon: Bell },
                    { id: 'expiry', label: 'Ventas', icon: Calendar },
                    { id: 'stock', label: 'Cuentas', icon: Package },
                    { id: 'payment', label: 'Pagos', icon: DollarSign }
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const isActive = categoryFilter === cat.id;
                    return (
                      <button 
                        key={cat.id}
                        onClick={() => setCategoryFilter(cat.id as CategoryFilter)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-sm whitespace-nowrap text-[11px] font-semibold uppercase transition-all ${
                          isActive 
                            ? 'bg-surface-3 text-primary shadow-lg border border-[rgb(var(--fg-rgb))]/10' 
                            : 'text-disabled hover:text-secondary'
                        }`}
                      >
                        <Icon size={14} className={isActive ? 'text-brand-primary' : ''} />
                        {cat.label}
                      </button>
                    );
                  })}
               </div>

               {/* Time Filters */}
               <div className="flex gap-2">
                  {[
                    { id: 'all', label: 'Cualquier fecha' },
                    { id: 'today', label: 'Para hoy' },
                    { id: 'soon', label: 'Próximos' }
                  ].map((t) => {
                    const isActive = timeFilter === t.id;
                    return (
                      <button 
                        key={t.id}
                        onClick={() => setTimeFilter(t.id as TimeFilter)}
                        className={`flex-1 py-2 rounded-sm text-[10px] font-semibold uppercase tracking-widest transition-all border ${
                          isActive 
                            ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' 
                            : 'bg-transparent border-[rgb(var(--fg-rgb))]/5 text-disabled hover:border-[rgb(var(--fg-rgb))]/10'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
               </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto no-scrollbar pt-1">
             {selectedNotification ? (
               <NotificationDetail n={selectedNotification} />
             ) : (
               <div className="space-y-2.5 pb-4 animate-in fade-in duration-500">
                  {filtered.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-disabled py-20 px-6 border border-dashed border-[rgb(var(--fg-rgb))]/5 rounded-2xl bg-[rgb(var(--fg-rgb))]/[0.01]">
                        <div className="w-16 h-16 bg-[rgb(var(--fg-rgb))]/5 rounded-xl flex items-center justify-center mb-4"><Check size={32} className="text-status-success/40" /></div>
                        <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Sin pendientes</h3>
                        <p className="text-xs mt-1 text-disabled italic text-center">No hay notificaciones que coincidan con los filtros seleccionados.</p>
                      </div>
                  ) : (
                      filtered.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSelectedNotification(item)}
                          className={`w-full text-left p-4 rounded-xl border transition-all active:scale-[0.98] group relative overflow-hidden flex items-start gap-4 bg-surface-1 border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-3 hover:border-[rgb(var(--fg-rgb))]/20 shadow-sm`}
                        >
                            {item.priority === 'high' && <div className="absolute left-0 top-3 bottom-3 w-1 bg-status-danger rounded-r-full" />}
                            
                            <div className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                              item.priority === 'high' 
                                ? 'bg-status-danger/10 border-status-danger/20 text-status-danger' 
                                : 'bg-[rgb(var(--fg-rgb))]/5 border-[rgb(var(--fg-rgb))]/5 text-muted group-hover:text-primary'
                            }`}>
                              {getIcon(item.type, item.priority)}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-0.5">
                                  <h4 className={`text-xs font-semibold truncate pr-2 ${item.priority === 'high' ? 'text-red-100' : 'text-primary'}`}>{item.title}</h4>
                                  <span className="text-[9px] text-disabled whitespace-nowrap font-mono bg-[rgb(var(--fg-rgb))]/5 px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0">{new Date(item.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</span>
                                </div>
                                <p className="text-[11px] text-muted leading-snug line-clamp-1">{item.message}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[9px] font-black uppercase text-faint tracking-wider bg-[rgb(var(--fg-rgb))]/5 px-1.5 rounded">{item.type}</span>
                                  {item.priority === 'high' && <span className="text-[9px] font-black uppercase text-status-danger/80 animate-pulse">Urgente</span>}
                                </div>
                            </div>
                            <div className="self-center opacity-40 group-hover:opacity-100 transition-opacity -mr-1 text-disabled"><ChevronRight size={14} /></div>
                        </button>
                      ))
                  )}
               </div>
             )}
          </div>
       </div>
    </Modal>
  );
};

export default NotificationCenter;
