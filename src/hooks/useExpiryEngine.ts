import { useMemo } from 'react';
import { Account, Sale, PayableExpense, Client, ViewState, PendingAction } from '../types';
import { getDaysRemaining } from '../utils/expiredUtils';

export type ExpirySeverity = 'critical' | 'warning' | 'info';
export type ExpiryEntity = 'account' | 'sale' | 'payable';

/**
 * Un "evento" es ya un grupo (por servicio o por cliente), no un registro suelto.
 * Los 3 canales de notificación (push, campanita, banner) consumen esta MISMA
 * lista — cada uno solo decide qué recortar y cómo mostrarlo. Así evitamos que
 * cada canal recalcule "qué está por vencer" con sus propias reglas y se
 * desincronicen entre sí (la causa original de las notificaciones duplicadas).
 */
export interface ExpiryEvent {
  id: string; // estable: `${entity}_${bucket}_${groupKey}` — no cambia mientras exista el grupo
  entity: ExpiryEntity;
  groupKey: string;
  severity: ExpirySeverity;
  daysRemaining: number; // el mínimo del grupo (el más urgente)
  itemCount: number;
  itemIds: string[];
  title: string;
  message: string;
  view: ViewState;
  action?: PendingAction;
  /** Hito para el canal push: '3d' | '1d' | 'due'. Nulo si no aplica a ningún hito hoy. */
  milestone: '3d' | '1d' | 'due' | null;
}

// Ventana máxima que consideramos "relevante" en general (la campanita filtra dentro de esto).
const MAX_WINDOW_DAYS = 7;

const severityForDays = (days: number): ExpirySeverity => {
  if (days <= 0) return 'critical';
  if (days <= 3) return 'warning';
  return 'info';
};

const milestoneForDays = (days: number): ExpiryEvent['milestone'] => {
  if (days <= 0) return 'due';
  if (days === 1) return '1d';
  if (days === 3) return '3d';
  return null;
};

interface EngineInput {
  accounts: Account[];
  sales: Sale[];
  payables: PayableExpense[];
  clients: Client[];
  services?: { id: string; name: string }[];
  /** Cuentas con una falla activa ya se muestran en la Agenda de fallas — se excluyen aquí para no duplicar aviso. */
  serviceFailures?: { saleId: string }[];
}

export const useExpiryEngine = ({
  accounts,
  sales,
  payables,
  clients,
  services = [],
  serviceFailures = [],
}: EngineInput) => {
  const events = useMemo<ExpiryEvent[]>(() => {
    const list: ExpiryEvent[] = [];
    const svcName = (id: string) => services.find((s) => s.id === id)?.name || 'Servicio';

    const failingAccountIds = new Set<string>(
      sales
        .filter((s) => serviceFailures.some((f) => f.saleId === s.id))
        .map((s) => s.accountId)
    );

    // ---------- CUENTAS (agrupadas por servicio) ----------
    type AccGroup = { expired: string[]; soon: string[]; soonDays: number; expDays: number };
    const accGroups = new Map<string, AccGroup>();

    accounts.forEach((a) => {
      if (a.status === 'inactiva' || a.status === 'fallando' || a.status === 'trash') return;
      if (a.is_down || a.failure_started_at) return; // ya cubierto por la agenda de fallas
      if (failingAccountIds.has(a.id)) return; // idem, vía la venta asociada

      const d = getDaysRemaining(a.endDate);
      if (d > MAX_WINDOW_DAYS) return;

      const g = accGroups.get(a.serviceId) || { expired: [], soon: [], soonDays: 99, expDays: 0 };
      if (d <= 0) {
        g.expired.push(a.id);
        g.expDays = Math.min(g.expDays, d);
      } else {
        g.soon.push(a.id);
        g.soonDays = Math.min(g.soonDays, d);
      }
      accGroups.set(a.serviceId, g);
    });

    accGroups.forEach((g, serviceId) => {
      const name = svcName(serviceId);
      if (g.expired.length > 0) {
        list.push({
          id: `account_exp_${serviceId}`,
          entity: 'account',
          groupKey: serviceId,
          severity: 'critical',
          daysRemaining: g.expDays,
          itemCount: g.expired.length,
          itemIds: g.expired,
          title: name,
          message: g.expired.length === 1 ? 'Cuenta vencida' : `${g.expired.length} cuentas vencidas`,
          view: 'inventory',
          action:
            g.expired.length === 1
              ? { type: 'OPEN_ACCOUNT_DETAIL', targetId: g.expired[0] }
              : { type: 'OPEN_SERVICE_ACCOUNTS', targetId: serviceId },
          milestone: 'due',
        });
      }
      if (g.soon.length > 0) {
        list.push({
          id: `account_soon_${serviceId}`,
          entity: 'account',
          groupKey: serviceId,
          severity: severityForDays(g.soonDays),
          daysRemaining: g.soonDays,
          itemCount: g.soon.length,
          itemIds: g.soon,
          title: name,
          message: `${g.soon.length === 1 ? 'Cuenta por vencer' : `${g.soon.length} cuentas por vencer`} en ${g.soonDays} día${g.soonDays === 1 ? '' : 's'}`,
          view: 'inventory',
          action:
            g.soon.length === 1
              ? { type: 'OPEN_ACCOUNT_DETAIL', targetId: g.soon[0] }
              : { type: 'OPEN_SERVICE_ACCOUNTS', targetId: serviceId },
          milestone: milestoneForDays(g.soonDays),
        });
      }
    });

    // ---------- VENTAS / SERVICIOS DE CLIENTE (agrupadas por cliente) ----------
    type SaleGroup = { expired: string[]; soon: string[]; soonDays: number; expDays: number };
    const saleGroups = new Map<string, SaleGroup>();

    sales.forEach((s) => {
      const d = getDaysRemaining(s.expiryDate);
      if (d > MAX_WINDOW_DAYS) return;

      const g = saleGroups.get(s.clientId) || { expired: [], soon: [], soonDays: 99, expDays: 0 };
      if (d <= 0) {
        g.expired.push(s.id);
        g.expDays = Math.min(g.expDays, d);
      } else {
        g.soon.push(s.id);
        g.soonDays = Math.min(g.soonDays, d);
      }
      saleGroups.set(s.clientId, g);
    });

    saleGroups.forEach((g, clientId) => {
      const client = clients.find((c) => c.id === clientId);
      const cname = client?.name || 'Cliente';

      if (g.expired.length > 0) {
        list.push({
          id: `sale_exp_${clientId}`,
          entity: 'sale',
          groupKey: clientId,
          severity: 'critical',
          daysRemaining: g.expDays,
          itemCount: g.expired.length,
          itemIds: g.expired,
          title: cname,
          message:
            g.expired.length === 1
              ? `Venció hace ${Math.abs(g.expDays)} día${Math.abs(g.expDays) === 1 ? '' : 's'}`
              : `${g.expired.length} servicios vencidos`,
          view: 'expired',
          action: { type: 'OPEN_RENEWAL', targetId: clientId },
          milestone: 'due',
        });
      }
      if (g.soon.length > 0) {
        list.push({
          id: `sale_soon_${clientId}`,
          entity: 'sale',
          groupKey: clientId,
          severity: severityForDays(g.soonDays),
          daysRemaining: g.soonDays,
          itemCount: g.soon.length,
          itemIds: g.soon,
          title: cname,
          message:
            g.soon.length === 1
              ? `Renueva en ${g.soonDays} día${g.soonDays === 1 ? '' : 's'}`
              : `${g.soon.length} servicios renuevan en ${g.soonDays} día${g.soonDays === 1 ? '' : 's'}`,
          view: 'sales',
          action: { type: 'OPEN_RENEWAL', targetId: clientId },
          milestone: milestoneForDays(g.soonDays),
        });
      }
    });

    // ---------- PAGOS POR VENCER (uno por gasto, no se agrupan) ----------
    payables.forEach((p) => {
      const d = getDaysRemaining(p.dueDate);
      if (d > MAX_WINDOW_DAYS) return;

      const severity = severityForDays(d);
      list.push({
        id: `payable_${p.id}`,
        entity: 'payable',
        groupKey: p.id,
        severity,
        daysRemaining: d,
        itemCount: 1,
        itemIds: [p.id],
        title: p.name,
        message:
          d < 0
            ? `Vencido hace ${Math.abs(d)} día${Math.abs(d) === 1 ? '' : 's'} · ${p.amount} ${p.currency}`
            : d === 0
              ? `Vence hoy · ${p.amount} ${p.currency}`
              : `Vence en ${d} día${d === 1 ? '' : 's'} · ${p.amount} ${p.currency}`,
        view: 'accounts',
        action: { type: 'OPEN_PAYABLE', targetId: p.id },
        milestone: milestoneForDays(d),
      });
    });

    // Más urgente primero: critical > warning > info, y dentro de cada uno, menos días primero.
    const rank: Record<ExpirySeverity, number> = { critical: 0, warning: 1, info: 2 };
    return list.sort((a, b) => rank[a.severity] - rank[b.severity] || a.daysRemaining - b.daysRemaining);
  }, [accounts, sales, payables, clients, services, serviceFailures]);

  return events;
};
