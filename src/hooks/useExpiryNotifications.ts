
import { useEffect } from "react";
import { useData } from "../context/DataContext";
import {
  buildAccountExpiryNotifications,
  buildSaleExpiryNotifications,
  buildPayableExpiryNotifications,
  loadAlreadyNotifiedIds,
  saveAlreadyNotifiedIds,
} from "../utils/notificationsUtils";

export const useExpiryNotifications = () => {
  const { accounts, sales, clients, settings, payableExpenses } = useData();

  useEffect(() => {
    // Verificar soporte y contexto
    if (typeof window === "undefined" || !('Notification' in window)) return;

    // Verificar permisos nativos (OneSignal maneja el prompt, pero el navegador guarda el estado aquí)
    if (Notification.permission !== "granted") return;

    // Solo ejecutar si hay datos cargados para evitar falsos positivos al iniciar
    if (!accounts.length && !sales.length && !payableExpenses.length) return;

    // Check Settings Preferences
    const prefs = settings.notificationPreferences || { expiry: true, stock: true, payments: true, system: true };

    let notifiedIds = loadAlreadyNotifiedIds();
    const all = [];

    // Filter notifications based on user preferences
    if (prefs.stock) {
        const accountNotifs = buildAccountExpiryNotifications(accounts, settings);
        all.push(...accountNotifs);
    }

    if (prefs.expiry) {
        const saleNotifs = buildSaleExpiryNotifications(sales, clients, settings);
        all.push(...saleNotifs);
    }

    if (prefs.payments) {
        const payableNotifs = buildPayableExpiryNotifications(payableExpenses);
        all.push(...payableNotifs);
    }

    // Filtrar notificaciones ya enviadas hoy
    const toSend = all.filter((n) => !notifiedIds.has(n.id));

    if (toSend.length === 0) return;

    const triggerNotification = async (title: string, body: string, tag: string) => {
      try {
        // Intenta usar Service Worker para notificaciones persistentes (PWA standard)
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          if (registration) {
            await registration.showNotification(title, {
              body,
              icon: '/android-chrome-192x192.png',
              badge: '/android-chrome-96x96.png',
              tag, // Evita duplicados en el centro de notificaciones
              data: { url: '/' } // Data para el click handler
            });
            return;
          }
        }
        
        // Fallback a API básica si SW no está listo
        new Notification(title, {
          body,
          icon: '/android-chrome-192x192.png',
          tag
        });
      } catch (err) {
        console.error("Error mostrando notificación local:", err);
      }
    };

    // Enviar notificaciones
    toSend.forEach((notif) => {
      triggerNotification(notif.title, notif.message, notif.id);
      notifiedIds.add(notif.id);
    });

    saveAlreadyNotifiedIds(notifiedIds);
  }, [accounts, sales, clients, settings, payableExpenses]);
};
