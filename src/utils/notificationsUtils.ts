
import { Sale, Account, Client, AppSettings, PayableExpense } from "../types";
import { getDaysRemaining } from "./expiredUtils";

export type ExpiryNotificationType =
  | "account_about_to_expire"
  | "account_expired"
  | "sale_about_to_expire"
  | "sale_expired"
  | "payable_about_to_expire"
  | "payable_expired";

export interface ExpiryNotification {
  id: string;
  type: ExpiryNotificationType;
  title: string;
  message: string;
}

/**
 * Construye notificaciones relacionadas con cuentas que están por vencer o vencidas.
 */
export const buildAccountExpiryNotifications = (
  accounts: Account[],
  settings: AppSettings
): ExpiryNotification[] => {
  const notifications: ExpiryNotification[] = [];

  accounts.forEach((acc) => {
    const days = getDaysRemaining(acc.endDate);
    if (acc.status === "inactiva") return;

    // Por vencer (2 o 1 días)
    if (days === 2 || days === 1) {
      notifications.push({
        id: `account_${acc.id}_about_to_expire`,
        type: "account_about_to_expire",
        title: "Cuenta próxima a vencer",
        message: `La cuenta ${acc.email} vence en ${days} día(s). Revisa el inventario para renovarla.`,
      });
    }

    // Vencida
    if (days <= 0) {
      notifications.push({
        id: `account_${acc.id}_expired`,
        type: "account_expired",
        title: "Cuenta vencida",
        message: `La cuenta ${acc.email} ya está vencida. Actualiza su estado o reasígnala.`,
      });
    }
  });

  return notifications;
};

/**
 * Construye notificaciones relacionadas con ventas que están por vencer o vencidas.
 */
export const buildSaleExpiryNotifications = (
  sales: Sale[],
  clients: Client[],
  settings: AppSettings
): ExpiryNotification[] => {
  const notifications: ExpiryNotification[] = [];

  sales.forEach((sale) => {
    const days = getDaysRemaining(sale.expiryDate);
    const client = clients.find((c) => c.id === sale.clientId);
    const clientName = client?.name || "Cliente";

    // Por vencer (2 o 1 días)
    if (days === 2 || days === 1) {
      notifications.push({
        id: `sale_${sale.id}_about_to_expire`,
        type: "sale_about_to_expire",
        title: "Servicio por vencer",
        message: `El servicio ${sale.serviceName} de ${clientName} vence en ${days} día(s).`,
      });
    }

    // Vencida
    if (days <= 0) {
      notifications.push({
        id: `sale_${sale.id}_expired`,
        type: "sale_expired",
        title: "Servicio vencido",
        message: `El servicio ${sale.serviceName} de ${clientName} ya venció. Recuerda contactar al cliente.`,
      });
    }
  });

  return notifications;
};

/**
 * Construye notificaciones para gastos por pagar.
 */
export const buildPayableExpiryNotifications = (
  payables: PayableExpense[]
): ExpiryNotification[] => {
  const notifications: ExpiryNotification[] = [];

  payables.forEach((payable) => {
    const days = getDaysRemaining(payable.dueDate);

    // Por vencer (hoy o mañana)
    if (days === 1 || days === 0) {
      notifications.push({
        id: `payable_${payable.id}_warning`,
        type: "payable_about_to_expire",
        title: days === 0 ? "Pago vence HOY" : "Pago vence mañana",
        message: `Recuerda realizar el pago de: ${payable.name} (${payable.amount} ${payable.currency}).`,
      });
    }

    // Vencido
    if (days < 0) {
      notifications.push({
        id: `payable_${payable.id}_expired`,
        type: "payable_expired",
        title: "Pago Vencido",
        message: `El pago de ${payable.name} está vencido por ${Math.abs(days)} días.`,
      });
    }
  });

  return notifications;
};

/**
 * Guardamos en localStorage qué notificaciones ya se enviaron hoy
 * para evitar repetirlas cada vez que se abre la app.
 */
const STORAGE_KEY = "noova_notified_ids";

export const loadAlreadyNotifiedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as { date: string; ids: string[] };

    const today = new Date().toISOString().slice(0, 10);
    if (parsed.date !== today) {
      return new Set();
    }

    return new Set(parsed.ids || []);
  } catch {
    return new Set();
  }
};

export const saveAlreadyNotifiedIds = (ids: Set<string>) => {
  const today = new Date().toISOString().slice(0, 10);
  const payload = {
    date: today,
    ids: Array.from(ids),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};
