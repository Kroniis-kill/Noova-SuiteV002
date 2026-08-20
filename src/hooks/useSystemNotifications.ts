
import { useMemo } from 'react';
import { Account, Sale, PayableExpense, AppNotification, Client } from '../types';
import { getDaysRemaining } from '../utils/expiredUtils';

// Este hook procesa los datos crudos y devuelve una lista de notificaciones procesables
export const useSystemNotifications = (
  accounts: Account[],
  sales: Sale[],
  payables: PayableExpense[],
  clients: Client[]
) => {
  const notifications = useMemo(() => {
    const list: AppNotification[] = [];

    // 1. SALES EXPIRY
    // Agrupar ventas por cliente para no spammear
    const salesByClient: Record<string, { clientName: string, count: number, minDays: number }> = {};

    sales.forEach(sale => {
      const days = getDaysRemaining(sale.expiryDate);
      if (days <= 2) {
         const client = clients.find(c => c.id === sale.clientId);
         const name = client?.name || 'Cliente';
         
         if (!salesByClient[sale.clientId]) {
             salesByClient[sale.clientId] = { clientName: name, count: 0, minDays: 99 };
         }
         salesByClient[sale.clientId].count++;
         if(days < salesByClient[sale.clientId].minDays) salesByClient[sale.clientId].minDays = days;
      }
    });

    Object.entries(salesByClient).forEach(([clientId, data]) => {
        let title = '';
        let msg = '';
        let priority: 'high' | 'medium' = 'medium';

        if (data.minDays < 0) {
            title = 'Servicios Vencidos';
            msg = `${data.clientName} tiene ${data.count} servicio(s) vencido(s).`;
            priority = 'high';
        } else if (data.minDays === 0) {
            title = 'Vence Hoy';
            msg = `Los servicios de ${data.clientName} vencen hoy.`;
            priority = 'high';
        } else {
            title = 'Próximo Vencimiento';
            msg = `${data.clientName} tiene servicios por vencer en ${data.minDays} días.`;
        }

        list.push({
            id: `sale-${clientId}`,
            title,
            message: msg,
            type: 'expiry',
            priority,
            date: new Date().toISOString(),
            read: false,
            linkTo: 'sales',
            metadata: { clientId }
        });
    });

    // 2. ACCOUNTS EXPIRY
    accounts.forEach(acc => {
       if (acc.status === 'inactiva') return;
       const days = getDaysRemaining(acc.endDate);
       if (days <= 3) {
          list.push({
             id: `acc-${acc.id}`,
             title: days < 0 ? 'Cuenta Vencida' : 'Inventario por Vencer',
             message: `${acc.email} ${days < 0 ? 'ha vencido' : `vence en ${days} días`}.`,
             type: 'stock',
             priority: days <= 0 ? 'high' : 'medium',
             date: new Date().toISOString(),
             read: false,
             linkTo: 'inventory',
             actionId: acc.id
          });
       }
    });

    // 3. PAYABLES
    payables.forEach(p => {
       const days = getDaysRemaining(p.dueDate);
       if (days <= 2) {
          list.push({
             id: `pay-${p.id}`,
             title: 'Pago Pendiente',
             message: `Pago a ${p.name} (${p.amount} ${p.currency}) vence ${days === 0 ? 'hoy' : days < 0 ? 'hace ' + Math.abs(days) + ' días' : 'pronto'}.`,
             type: 'payment',
             priority: days <= 0 ? 'high' : 'medium',
             date: new Date().toISOString(),
             read: false,
             linkTo: 'accounts'
          });
       }
    });

    // Sort: High Priority first
    return list.sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (a.priority !== 'high' && b.priority === 'high') return 1;
        return 0;
    });

  }, [accounts, sales, payables, clients]);

  return notifications;
};
