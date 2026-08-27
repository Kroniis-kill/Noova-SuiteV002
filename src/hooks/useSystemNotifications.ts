import { useEffect, useMemo, useState } from 'react';
import { Account, Sale, PayableExpense, AppNotification, Client, Service } from '../types';
import { useExpiryEngine } from './useExpiryEngine';

const READ_CHANGED_EVENT = 'noova_notifications_read_changed';

/**
 * Canal CAMPANITA (Centro de Notificaciones). Es el inbox: acá sí se
 * muestran todos los eventos dentro de la ventana (hasta 7 días), porque el
 * usuario decide cuándo entrar a revisarlo — a diferencia del push o el
 * banner, no interrumpe por su cuenta.
 *
 * Consume useExpiryEngine (misma fuente que el push y el banner) y le suma
 * estado de leído/no-leído persistido, para que el badge de la campana
 * refleje pendientes reales en vez de "todo lo que exista".
 */

const READ_KEY = 'noova_notifications_read_ids';

const loadReadIds = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));
  } catch {
    return new Set();
  }
};

export const markNotificationRead = (id: string) => {
  const ids = loadReadIds();
  ids.add(id);
  localStorage.setItem(READ_KEY, JSON.stringify(Array.from(ids)));
  window.dispatchEvent(new Event(READ_CHANGED_EVENT));
};

export const markAllNotificationsRead = (ids: string[]) => {
  localStorage.setItem(READ_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(READ_CHANGED_EVENT));
};

export const useSystemNotifications = (
  accounts: Account[],
  sales: Sale[],
  payables: PayableExpense[],
  clients: Client[],
  services: Service[] = []
): AppNotification[] => {
  const events = useExpiryEngine({ accounts, sales, payables, clients, services });

  // Forzar recálculo cuando cambia el estado leído/no-leído (viene de fuera de React, vía localStorage).
  const [readTick, setReadTick] = useState(0);
  useEffect(() => {
    const onChange = () => setReadTick((t) => t + 1);
    window.addEventListener(READ_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(READ_CHANGED_EVENT, onChange);
  }, []);

  return useMemo(() => {
    const readIds = loadReadIds();

    return events.map((e): AppNotification => ({
      id: e.id,
      title: e.title,
      message: e.message,
      type: e.entity === 'account' ? 'stock' : e.entity === 'payable' ? 'payment' : 'expiry',
      priority: e.severity === 'critical' ? 'high' : e.severity === 'warning' ? 'medium' : 'low',
      date: new Date().toISOString(),
      read: readIds.has(e.id),
      linkTo: e.view,
      actionId: e.itemCount === 1 ? e.itemIds[0] : undefined,
      metadata: { clientId: e.entity === 'sale' ? e.groupKey : undefined, itemIds: e.itemIds },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, readTick]);
};
