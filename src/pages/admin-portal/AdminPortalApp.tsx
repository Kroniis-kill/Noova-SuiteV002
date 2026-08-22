import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { SubscriptionProvider } from '../../context/SubscriptionContext';
import { ToastProvider } from '../../context/ToastContext';
import LoadingScreen from '../../components/ui/LoadingScreen';
import AdminLoginScreen from './AdminLoginScreen';
import AdminPortalShell from './AdminPortalShell';
import { checkIsAdmin } from '../../utils/isAdmin';

/**
 * Puerta de acceso del panel de plataforma.
 *
 * Deliberadamente NO reutiliza el flujo de `App.tsx` (que asume un
 * tenant logueado con datos de negocio). Acá solo importa: ¿hay sesión
 * de Supabase? ¿esa sesión tiene rol 'admin'? Si cualquiera de las dos
 * falla, no se muestra nada del panel — ni siquiera la cáscara vacía.
 */
const AdminAccessGate: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const [adminCheck, setAdminCheck] = useState<'checking' | 'granted' | 'denied'>('checking');

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setAdminCheck('checking');
      return;
    }
    setAdminCheck('checking');
    checkIsAdmin(user.id).then((isAdmin) => {
      if (cancelled) return;
      setAdminCheck(isAdmin ? 'granted' : 'denied');
    });
    return () => { cancelled = true; };
  }, [user]);

  // Efecto separado (no dentro del render): si la sesión no tiene rol
  // admin, la cerramos. Dejarla "colgada" acá sería confuso — no es la
  // app del usuario, no tiene nada que hacer en este panel.
  useEffect(() => {
    if (adminCheck === 'denied') {
      logout();
    }
  }, [adminCheck, logout]);

  if (authLoading) {
    return <LoadingScreen message="Verificando acceso..." />;
  }

  if (!user) {
    return <AdminLoginScreen />;
  }

  if (adminCheck === 'checking') {
    return <LoadingScreen message="Verificando permisos..." />;
  }

  if (adminCheck === 'denied') {
    return (
      <AdminLoginScreen deniedMessage="Esta cuenta no tiene permisos de administrador de plataforma." />
    );
  }

  return <AdminPortalShell />;
};

const AdminPortalApp: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <AdminAccessGate />
        </SubscriptionProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default AdminPortalApp;
