
// Project: Noova Suite Clear - Refreshing state for GitHub export
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import { AlertProvider, useAlert } from './context/AlertContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import { ModalProvider } from './context/ModalContext'; 
import { ViewState } from './types';
import { notificationService } from './services/notificationService';
import { useExpiryNotifications } from "./hooks/useExpiryNotifications";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { App as CapacitorApp } from '@capacitor/app'; 
import { useUIStore } from './store/uiStore'; 
import { isNativePlatform } from './utils/platformUtils'; 
import { useThemeSync } from './hooks/useThemeSync';
import SyncIndicator from './components/ui/SyncIndicator';
import InAppNotifications from './components/ui/InAppNotifications';
import OneSignal from 'onesignal-cordova-plugin';

import LayoutSelector from './layouts/LayoutSelector';
import LoadingScreen from './components/ui/LoadingScreen';
import NotificationPermissionModal from './components/ui/NotificationPermissionModal';
import CustomAlert from './components/ui/CustomAlert';
import ErrorBoundary from './components/ui/ErrorBoundary';
import GlobalModalLayer from './components/ui/GlobalModalLayer';

import AccessBlocked from './components/ui/AccessBlocked';
import WhatsAppSelector from './components/ui/WhatsAppSelector'; 
import Onboarding from './components/ui/Onboarding';
import { AnnouncementNotification } from './components/AnnouncementNotification';

import { AnimatePresence, motion } from 'framer-motion';

const lazyRetry = (importFn: () => Promise<any>) => {
  return lazy(async () => {
    try { return await importFn(); } catch (error: any) {
      const storageKey = 'retry-lazy-refreshed';
      if (!window.sessionStorage.getItem(storageKey) && (error.message?.includes('dynamically imported') || error.message?.includes('Failed to fetch'))) {
        window.sessionStorage.setItem(storageKey, 'true');
        window.location.reload();
        return { default: () => <LoadingScreen message="Actualizando..." /> };
      }
      throw error;
    }
  });
};

const AuthPage = lazyRetry(() => import('./pages/AuthPage'));
const InventoryPage = lazyRetry(() => import('./pages/Inventario'));
const ExpiredPage = lazyRetry(() => import('./pages/Expired')); 
const ContactosPage = lazyRetry(() => import('./pages/Contactos'));
const RevendedoresPage = lazyRetry(() => import('./pages/Revendedores'));
const ProvidersPage = lazyRetry(() => import('./pages/Providers')); 
const SalesPage = lazyRetry(() => import('./pages/Sales'));
const SettingsPage = lazyRetry(() => import('./pages/Settings'));
const CuentasPage = lazyRetry(() => import('./pages/Cuentas'));
const DashboardPage = lazyRetry(() => import('./pages/Dashboard')); 
const ReportsPage = lazyRetry(() => import('./pages/Reports'));
const ServicesPage = lazyRetry(() => import('./pages/Services')); 
const AdminPage = lazyRetry(() => import('./pages/AdminPage')); 
const MyPlanPage = lazyRetry(() => import('./pages/MyPlanPage')); 
const PortalPage = lazyRetry(() => import('./pages/PortalPage')); 
const LegalPage = lazyRetry(() => import('./pages/LegalPage'));
const RefundPage = lazyRetry(() => import('./pages/Refund'));

const viewLabels: Record<ViewState, string> = {
  dashboard: 'Dashboard', 
  inventory: 'Inventario', 
  sales: 'Ventas', 
  contacts: 'Contacto', 
  resellers: 'Revendedores', 
  providers: 'Proveedores', 
  expired: 'Vencimientos', 
  accounts: 'Finanzas', 
  reports: 'Reportes', 
  services: 'Servicios', 
  settings: 'Configuración', 
  admin: 'Administración', 
  admin_history: 'Historial Admin', 
  admin_analytics: 'Analíticas Admin', 
  my_plan: 'Mi Plan', 
  expired_plan: 'Plan Expirado', 
  agenda: 'Agenda de Fallas', 
  trash: 'Papelera',
  refund: 'Reembolso',
};

const MainLayout: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const { isAdmin, accessStatus, loadingSub } = useSubscription(); 
  const backAction = useUIStore(state => state.backAction);
  const setGlobalView = useUIStore(state => state.setView);
  const globalView = useUIStore(state => state.currentView);
  const { notifications, isLoading, accounts, clients, settings } = useData(); 
  const { showAlert } = useAlert(); 

  useThemeSync(settings?.theme);

  const [currentView, setCurrentView] = useState<ViewState>('dashboard'); 
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  
  useExpiryNotifications();

  // Marcar como cargado una vez que tenemos todo listo por primera vez
  useEffect(() => {
    if (!loading && !loadingSub && isAuthenticated && !hasLoadedOnce) {
      setHasLoadedOnce(true);
    }
  }, [loading, loadingSub, isAuthenticated, hasLoadedOnce]);

  useEffect(() => {
    if (isAuthenticated && !loading && !loadingSub && user) {
      const userSeen = localStorage.getItem(`noova_tutorial_seen_${user.id}`);
      const globalSeen = localStorage.getItem('noova_tutorial_seen');
      
      if (!userSeen) {
        if (globalSeen && (accounts.length > 0 || clients.length > 0)) {
          // Migrate existing users who have already seen it globally and have data
          localStorage.setItem(`noova_tutorial_seen_${user.id}`, 'true');
        } else {
          setShowTutorial(true);
        }
      }
    }
  }, [isAuthenticated, loading, loadingSub, user, accounts.length, clients.length]);

  const handleTutorialFinish = () => {
    if (user) {
      localStorage.setItem(`noova_tutorial_seen_${user.id}`, 'true');
    }
    setShowTutorial(false);
  };

  // Sincronizar el estado de la vista local con la global del Store (Zustand)
  useEffect(() => {
    if (globalView && globalView !== currentView) {
      setCurrentView(globalView);
    }
  }, [globalView]);

  // --- STARTUP SUMMARY LOGIC ---
  useEffect(() => {
    if (isAuthenticated && !isLoading && notifications.length > 0) {
        const hasShown = sessionStorage.getItem('noova_startup_summary_shown');
        if (hasShown) return;

        const urgentItems = notifications.filter(n => n.priority === 'high');
        
        if (urgentItems.length > 0) {
            const expiredSales = urgentItems.filter(n => n.type === 'expiry').length;
            const stockAlerts = urgentItems.filter(n => n.type === 'stock').length;
            const pendingPay = urgentItems.filter(n => n.type === 'payment').length;

            let summaryText = 'Resumen de atención prioritaria:\n';
            if (expiredSales > 0) summaryText += `• ${expiredSales} servicios vencidos o por vencer.\n`;
            if (stockAlerts > 0) summaryText += `• ${stockAlerts} cuentas de inventario por agotarse.\n`;
            if (pendingPay > 0) summaryText += `• ${pendingPay} pagos pendientes.\n`;
            summaryText += '\nRevisa la sección de alertas para más detalles.';

            showAlert({
                title: `¡Atención Requerida! (${urgentItems.length})`,
                message: summaryText,
                type: 'warning'
            });

            sessionStorage.setItem('noova_startup_summary_shown', 'true');
        }
    }
  }, [isAuthenticated, isLoading, notifications, showAlert]);

  // Sincronizar Clics de Notificaciones / DeepLinks
  useEffect(() => {
     const handleDeepLink = (e: any) => {
         const route = e.detail?.route;
         if (route) setGlobalView(route as ViewState);
     };
     window.addEventListener('notification_click', handleDeepLink);
     return () => window.removeEventListener('notification_click', handleDeepLink);
  }, [setGlobalView]);

  useEffect(() => {
    window.sessionStorage.removeItem('retry-lazy-refreshed');
    
    if (isNativePlatform()) {
        const reqPermissions = async () => {
             try { await notificationService.initialize(); } catch(e) {}
             try {
                 const { Filesystem, Directory } = await import('@capacitor/filesystem');
                 await Filesystem.readdir({ path: '', directory: Directory.Documents }).catch(() => {}); 
             } catch(e) {}
        };
        reqPermissions();
    } else {
        notificationService.initialize();
    }
  }, []);

  useEffect(() => { setIsMobileOpen(false); }, [currentView]);

  useEffect(() => {
    let backListener: any;
    const setupBackListener = async () => {
      try { await CapacitorApp.removeAllListeners(); } catch (e) {}
      backListener = await CapacitorApp.addListener('backButton', () => {
        if (backAction) { backAction(); return; }
        if (isMobileOpen) { setIsMobileOpen(false); return; }
        if (currentView !== 'dashboard') { setGlobalView('dashboard'); return; }
        CapacitorApp.exitApp();
      });
    };
    if (isAuthenticated) setupBackListener();
    return () => { if (backListener) backListener.remove(); };
  }, [currentView, isMobileOpen, backAction, isAuthenticated, setGlobalView]);

  const toggleSidebar = () => setIsMobileOpen(!isMobileOpen);
  
  const isCurrentlyLoading = loading || (isAuthenticated && loadingSub);

  // Ya no bloqueamos con LoadingScreen si ya estamos autenticados, permitiendo una transición directa al iniciar sesión
  if (!hasLoadedOnce && loading && !isAuthenticated) return <LoadingScreen message="Iniciando..." />;

  if (!isAuthenticated) {
    return (
      <>
        <CustomAlert />
        <Suspense fallback={<LoadingScreen message="Cargando Login..." />}>
           <AuthPage />
        </Suspense>
      </>
    );
  }

  if (accessStatus === 'blocked') return <AccessBlocked />;

  return (
    <>
      <SyncIndicator />
      <InAppNotifications />
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999]"
          >
            <Onboarding onFinish={handleTutorialFinish} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnnouncementNotification />
      <NotificationPermissionModal />
      <CustomAlert />
      <WhatsAppSelector />
      <GlobalModalLayer />
      
      <LayoutSelector
        currentView={currentView}
        setView={setGlobalView}
        viewLabels={viewLabels}
        toggleSidebar={toggleSidebar}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      >
        <ErrorBoundary scope="la página">
          <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-[rgb(var(--fg-rgb))]/10 border-t-[#6A2CFF] rounded-full animate-spin" /></div>}>
            {(() => {
              switch (currentView) {
                case 'dashboard': return <DashboardPage setView={setGlobalView} />;
                case 'inventory': return <InventoryPage onBack={() => setGlobalView('dashboard')} />;
                case 'trash': return <InventoryPage onBack={() => setGlobalView('dashboard')} initialView="trash" />;
                case 'expired': return <ExpiredPage onBack={() => setGlobalView('dashboard')} />;
                case 'contacts': return <ContactosPage onBack={() => setGlobalView('dashboard')} />;
                case 'resellers': return <RevendedoresPage onBack={() => setGlobalView('dashboard')} />;
                case 'providers': return <ProvidersPage onBack={() => setGlobalView('dashboard')} />; 
                case 'sales': return <SalesPage onBack={() => setGlobalView('dashboard')} />;
                case 'agenda': return <SalesPage onBack={() => setGlobalView('dashboard')} initialView="agenda" />;
                case 'settings': return <SettingsPage />; 
                case 'accounts': return <CuentasPage onBack={() => setGlobalView('dashboard')} />;
                case 'services': return <ServicesPage onBack={() => setGlobalView('dashboard')} />; 
                case 'reports': return <ReportsPage />;
                case 'admin': return isAdmin ? <AdminPage /> : <DashboardPage setView={setGlobalView} />;
                case 'my_plan': return <MyPlanPage />;
                case 'refund': return <RefundPage onBack={() => setGlobalView('dashboard')} />;
                default: return <DashboardPage setView={setGlobalView} />;
              }
            })()}
          </Suspense>
        </ErrorBoundary>
      </LayoutSelector>
    </>
  );
};

const AppRoutes: React.FC = () => {
  const [routeType, setRouteType] = useState<'app' | 'portal' | 'legal'>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/portal/') || path.startsWith('/portal-cliente/')) return 'portal';
    if (path.startsWith('/legal/')) return 'legal';
    return 'app';
  });

  if (routeType === 'legal') {
      const type = window.location.pathname.includes('privacy') ? 'privacy' : 'terms';
      return <Suspense fallback={<LoadingScreen />}><LegalPage type={type} /></Suspense>;
  }

  if (routeType === 'portal') {
      return (
        <>
          <CustomAlert />
          <ErrorBoundary scope="el portal">
            <Suspense fallback={<LoadingScreen message="Cargando Portal..." />}>
                <PortalPage />
            </Suspense>
          </ErrorBoundary>
        </>
      );
  }

  return (
    <ErrorBoundary scope="App System">
      <ModalProvider> 
        <AuthProvider>
          <SubscriptionProvider>
            <DataProvider>
              <MainLayout />
            </DataProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ModalProvider>
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AlertProvider>
        <ToastProvider>
           <AppRoutes />
        </ToastProvider>
      </AlertProvider>
    </QueryClientProvider>
  );
};

export default App;
