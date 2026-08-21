
import React, { useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { ShoppingCart, Calendar, DollarSign, Clock, Tag } from 'lucide-react';
import { formatDate } from '../../utils/contactosUtils';
import { Sale } from '../../types';

interface ClientPurchaseHistoryProps {
  clientId: string;
}

const ClientPurchaseHistory: React.FC<ClientPurchaseHistoryProps> = ({ clientId }) => {
  const { sales, services, accounts } = useData();
  
  // Filter sales for this client and sort by date descending
  // This includes ALL sales records in the database, ensuring history remains even if expired
  const clientSales = useMemo(() => {
    return sales
      .filter(s => s.clientId === clientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, clientId]);

  if (clientSales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-disabled opacity-60 bg-[rgb(var(--fg-rgb))]/[0.01] border border-dashed border-[rgb(var(--fg-rgb))]/5 rounded-2xl">
        <ShoppingCart size={40} className="mb-4 stroke-[1.5]" />
        <p className="text-sm font-medium">No se registran compras</p>
        <p className="text-[10px] mt-1 uppercase tracking-widest font-black text-center">El historial incluye todas las suscripciones registradas hasta la fecha</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
      {clientSales.map((sale) => {
        const service = services.find(s => s.name === sale.serviceName);
        const account = accounts.find(acc => acc.id === sale.accountId);
        const displayEmail = sale.invitedEmail || account?.email || 'Sin correo asociado';
        
        return (
          <div key={sale.id} className="group relative bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-4 transition-all hover:bg-surface-3 hover:border-[rgb(var(--fg-rgb))]/20 shadow-sm overflow-hidden">
            {/* Background Decorative Gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-primary/5 to-transparent pointer-events-none" />
            
            <div className="flex justify-between items-start mb-4 relative z-10">
               <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-brand-primary shadow-inner overflow-hidden relative group-hover:border-brand-primary/30 transition-colors">
                     {service?.image_url ? (
                         <img src={service.image_url} alt={sale.serviceName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                     ) : (
                         <Tag size={24} />
                     )}
                  </div>
                  <div className="min-w-0">
                     <h4 className="text-[14px] font-black text-primary uppercase tracking-tight truncate mb-0.5">{sale.serviceName}</h4>
                     <p className="text-[11px] text-muted font-mono truncate selection:bg-brand-primary/30">{displayEmail}</p>
                     
                     <div className="flex items-center gap-2 mt-2">
                        <span className="px-1.5 py-0.5 rounded-md bg-[rgb(var(--fg-rgb))]/5 text-[9px] font-bold text-disabled uppercase border border-[rgb(var(--fg-rgb))]/5">
                            {sale.saleType.replace('_', ' ')}
                        </span>
                        {sale.screensCount && sale.screensCount > 1 && (
                            <span className="text-[9px] text-brand-primary font-semibold uppercase tracking-widest bg-brand-primary/10 px-1.5 py-0.5 rounded-md border border-brand-primary/20">
                                {sale.screensCount}P
                            </span>
                        )}
                     </div>
                  </div>
               </div>
               <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1 text-status-success-soft">
                     <DollarSign size={14} className="stroke-[3]" />
                     <span className="text-lg font-black tracking-tighter tabular-nums">{sale.amount.toFixed(2)}</span>
                  </div>
                  <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${sale.isPartial ? 'text-status-warning' : 'text-faint'}`}>
                    {sale.isPartial ? 'Pago Pendiente' : 'Completado'}
                  </p>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-[rgb(var(--fg-rgb))]/[0.03] relative z-10">
               <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-faint border border-[rgb(var(--fg-rgb))]/5">
                      <Calendar size={14} />
                  </div>
                  <div className="min-w-0">
                     <p className="text-[8px] text-disabled font-black uppercase tracking-widest">Adquirido</p>
                     <p className="text-[10px] text-secondary font-bold truncate">{formatDate(sale.date)}</p>
                  </div>
               </div>
               <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-faint border border-[rgb(var(--fg-rgb))]/5">
                      <Clock size={14} />
                  </div>
                  <div className="min-w-0">
                     <p className="text-[8px] text-disabled font-black uppercase tracking-widest">Vencimiento</p>
                     <p className="text-[10px] text-brand-accent font-bold truncate">{formatDate(sale.expiryDate)}</p>
                  </div>
               </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ClientPurchaseHistory;
