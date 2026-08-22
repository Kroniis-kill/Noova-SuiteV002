import React from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import AdminDesktop from '../../modules/desktop/admin/AdminDesktop';
import AdminMobile from '../../modules/mobile/admin/AdminMobile';

/**
 * Cáscara del panel standalone (/admin). A propósito NO reutiliza
 * Sidebar/BottomNav/Header de la app del negocio — este panel no tiene
 * nada que ver con la navegación de un tenant (Ventas, Clientes, etc.),
 * así que le da su propia barra superior mínima con logout.
 *
 * En mobile, AdminMobile ya trae su propio header interno (logo +
 * botones), así que acá solo se agrega la franja de logout arriba para
 * no duplicar el branding.
 */
const AdminPortalShell: React.FC = () => {
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-[100dvh] bg-bg">
      <div className="sticky top-0 z-40 bg-surface-1/95 backdrop-blur-xl border-b border-hairline">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-muted">
            <ShieldCheck size={16} className="text-status-warning-soft" />
            <span className="text-xs font-semibold uppercase tracking-wide">Panel de Plataforma</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-disabled hidden sm:inline">{user?.email}</span>
            <button
              onClick={() => logout()}
              className="w-9 h-9 rounded-md bg-surface-2 hover:bg-surface-3 text-text-muted hover:text-status-danger-soft flex items-center justify-center transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>

      {isMobile ? (
        <AdminMobile />
      ) : (
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6 lg:py-8">
          <AdminDesktop />
        </div>
      )}
    </div>
  );
};

export default AdminPortalShell;
