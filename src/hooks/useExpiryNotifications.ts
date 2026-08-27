import { useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useExpiryEngine, ExpiryEvent } from './useExpiryEngine';

/**
 * Canal PUSH (sistema/navegador). El más agresivo de los 3 — por eso es el
 * más restringido: solo dispara en 3 hitos por evento (3 días antes, 1 día
 * antes, el día que vence/vencido), nunca se repite dos veces por el mismo
 * hito, y agrupa por servicio/cliente (nunca "cuenta por cuenta").
 *
 * Consume useExpiryEngine — la MISMA lista que usan la campanita y el banner —
 * así los 3 canales están de acuerdo en qué es "urgente" y cuándo.
 */

const DEDUP_KEY = 'noova_push_notified_v2'; // v2: dedup por hito, ya no por día calendario
const DIGEST_STATE_KEY = 'noova_push_digest_state';

type DedupStore = Record<string, true>; // key: `${event.id}_${milestone}`

const loadDedup = (): DedupStore => {
  try {
    return JSON.parse(localStorage.getItem(DEDUP_KEY) || '{}');
  } catch {
    return {};
  }
};

const saveDedup = (store: DedupStore) => localStorage.setItem(DEDUP_KEY, JSON.stringify(store));

interface DigestState {
  lastSentAt: string | null;
  sentToday: number;
  day: string;
}

const loadDigestState = (): DigestState => {
  try {
    const parsed = JSON.parse(localStorage.getItem(DIGEST_STATE_KEY) || 'null');
    const today = new Date().toISOString().slice(0, 10);
    if (!parsed || parsed.day !== today) return { lastSentAt: null, sentToday: 0, day: today };
    return parsed;
  } catch {
    return { lastSentAt: null, sentToday: 0, day: new Date().toISOString().slice(0, 10) };
  }
};

const saveDigestState = (s: DigestState) => localStorage.setItem(DIGEST_STATE_KEY, JSON.stringify(s));

const showNativeNotification = async (title: string, body: string, tag: string) => {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration) {
        await registration.showNotification(title, {
          body,
          icon: '/android-chrome-192x192.png',
          badge: '/android-chrome-96x96.png',
          tag, // mismo tag = el OS reemplaza en vez de apilar duplicados visuales
          data: { url: '/' },
        });
        return;
      }
    }
    new Notification(title, { body, icon: '/android-chrome-192x192.png', tag });
  } catch (err) {
    console.error('Error mostrando notificación local:', err);
  }
};

// Filtra qué eventos aplican al "Resumen Agrupado" según lo que el usuario marcó en Settings.
const passesDigestContentFilter = (e: ExpiryEvent, digest: any): boolean => {
  if (e.milestone === 'due') {
    return e.daysRemaining === 0 ? digest.include_today : digest.include_overdue;
  }
  if (e.milestone === '1d') return digest.include_1d;
  if (e.milestone === '3d') return digest.include_3d;
  if (e.entity === 'account') return digest.include_accounts_risk;
  return true;
};

export const useExpiryNotifications = () => {
  const { accounts, sales, clients, settings, payableExpenses, services } = useData() as any;
  const events = useExpiryEngine({ accounts, sales, payables: payableExpenses, clients, services });

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (!accounts.length && !sales.length && !payableExpenses.length) return;

    const prefs = settings.notificationPreferences || { expiry: true, stock: true, payments: true, system: true };
    const digest = settings.digestSettings;

    const allowedByPrefs = events.filter((e) => {
      if (e.entity === 'account') return prefs.stock;
      if (e.entity === 'sale') return prefs.expiry;
      if (e.entity === 'payable') return prefs.payments;
      return true;
    });

    // Solo eventos que caen exactamente en un hito hoy (3d / 1d / vencido).
    const dueToday = allowedByPrefs.filter((e) => e.milestone !== null);

    // Poda de dedup: descarta hitos de eventos que ya no existen (evita crecer para siempre).
    const dedup = loadDedup();
    const currentKeys = new Set(dueToday.map((e) => `${e.id}_${e.milestone}`));
    const prunedDedup: DedupStore = {};
    Object.keys(dedup).forEach((k) => {
      if (currentKeys.has(k)) prunedDedup[k] = true;
    });

    const pending = dueToday.filter((e) => !prunedDedup[`${e.id}_${e.milestone}`]);
    if (pending.length === 0) {
      saveDedup(prunedDedup);
      return;
    }

    const markSent = (e: ExpiryEvent) => {
      prunedDedup[`${e.id}_${e.milestone}`] = true;
    };

    if (digest?.enabled) {
      // ----- Modo digest: agrupar todo en UNA sola notificación, respetando el intervalo y el tope diario -----
      const eligible = pending.filter((e) => passesDigestContentFilter(e, digest));
      if (eligible.length === 0) {
        saveDedup(prunedDedup);
        return;
      }

      const digestState = loadDigestState();
      const hoursSinceLast = digestState.lastSentAt
        ? (Date.now() - new Date(digestState.lastSentAt).getTime()) / 3_600_000
        : Infinity;

      const intervalOk = hoursSinceLast >= (digest.interval_hours || 5);
      const capOk = digestState.sentToday < (digest.max_per_day || 3);

      if (intervalOk && capOk) {
        const critical = eligible.filter((e) => e.severity === 'critical').length;
        const rest = eligible.length - critical;
        const summary =
          critical > 0
            ? `${critical} vencimiento${critical === 1 ? '' : 's'} urgente${critical === 1 ? '' : 's'}${rest > 0 ? ` y ${rest} próximo${rest === 1 ? '' : 's'}` : ''}`
            : `${eligible.length} pendiente${eligible.length === 1 ? '' : 's'} por vencer pronto`;

        showNativeNotification('Resumen de vencimientos', summary, 'noova_digest');
        eligible.forEach(markSent);

        saveDigestState({
          lastSentAt: new Date().toISOString(),
          sentToday: digestState.sentToday + 1,
          day: digestState.day,
        });
      }
      // Si no tocaba enviar aún (intervalo/tope), no se marca como enviado: queda pendiente para el próximo chequeo.
    } else {
      // ----- Modo directo: una notificación por grupo (ya agrupado por servicio/cliente), sin digest -----
      pending.forEach((e) => {
        showNativeNotification(e.title, e.message, e.id);
        markSent(e);
      });
    }

    saveDedup(prunedDedup);
  }, [events, accounts.length, sales.length, payableExpenses.length, settings]);
};
