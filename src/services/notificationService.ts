
import { isNativePlatform } from '../utils/platformUtils';
import { initOneSignal as initWebOneSignal } from '../notifications/onesignal';
import { supabase } from '../supabaseClient';

const ONESIGNAL_APP_ID = "aaa272f3-b269-45b2-bdd1-a9f4964c56a0";

export const notificationService = {
  initialize: async () => {
    // 1. Get current authenticated user ID from Supabase
    const { data: { user } } = await supabase.auth.getUser();
    const externalUserId = user?.id;

    if (isNativePlatform()) {
      setTimeout(async () => {
          try {
            const win = window as any;
            const OneSignalNative = win.plugins?.OneSignal;
            
            if (OneSignalNative) {
              OneSignalNative.initialize(ONESIGNAL_APP_ID);
              
              if (OneSignalNative.Notifications) {
                  // Native Event Listener for Click
                  OneSignalNative.Notifications.addEventListener('click', (event: any) => {
                    const data = event.notification.additionalData;
                    if (data && data.route) {
                        // Dispatch custom event for App.tsx to handle deep linking
                        window.dispatchEvent(new CustomEvent('notification_click', { detail: data }));
                    }
                  });
              }

              // Login User to OneSignal
              if (externalUserId) {
                  OneSignalNative.login(externalUserId);
                  if (user?.email) OneSignalNative.User.addEmail(user.email);
              }
            }
          } catch (e) {
            console.error("Error initializing Native OneSignal:", e);
          }
      }, 1000);
    } else {
      // Web Initialization
      initWebOneSignal();
      
      // Web Login (If OneSignal is loaded)
      if (typeof window !== "undefined") {
         const OneSignal = (window as any).OneSignal || [];
         OneSignal.push(() => {
             if (externalUserId) {
                 OneSignal.login(externalUserId);
             }
             
             // FIXED: Use v16 Notifications API instead of .on()
             if (OneSignal.Notifications) {
                 OneSignal.Notifications.addEventListener('click', (event: any) => {
                     const data = event.notification.additionalData;
                     if (data && data.route) {
                          window.location.hash = `#${data.route}`;
                          window.dispatchEvent(new CustomEvent('notification_click', { detail: data }));
                     }
                 });
             }
         });
      }
    }
  },

  requestPermission: async (): Promise<boolean> => {
    if (isNativePlatform()) {
       try {
           const win = window as any;
           const OneSignalNative = win.plugins?.OneSignal;
           if (OneSignalNative?.Notifications) {
               const result = await OneSignalNative.Notifications.requestPermission(true);
               return result;
           }
       } catch (e) {
           console.error(e);
           return false;
       }
    } else {
       if ('OneSignal' in window) {
           const OneSignal = (window as any).OneSignal;
           await OneSignal.push(() => {
               OneSignal.Slidedown.promptPush();
           });
           return true; 
       } else if ('Notification' in window) {
           const result = await Notification.requestPermission();
           return result === 'granted';
       }
    }
    return false;
  },

  sendLocalNotification: (title: string, body: string) => {
      if ('Notification' in window && Notification.permission === 'granted') {
           new Notification(title, { body, icon: '/android-chrome-192x192.png' });
       }
  }
};
