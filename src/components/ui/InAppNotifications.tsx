import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, Clock, X, Bell, Wrench } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useUIStore } from '../../store/uiStore';
import { getDaysRemaining } from '../../utils/expiredUtils';
import { ViewState, PendingActionType } from '../../types';

type Severity = 'danger' | 'warning' | 'info';


interface Alert {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  view: ViewState;
  action?: { type: PendingActionType; targetId: string };
}

// Se reinicia automáticamente en cada nueva "sesión de visibilidad":
// cuando la app pasa a segundo plano y vuelve, los avisos se muestran de nuevo.
const useIsDesktop = () => {
  const [is, setIs] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  useEffect(() => {
    const on = () => setIs(window.innerWidth >= 1024);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return is;
};

const InAppNotifications: React.FC = () => {
  const { accounts, sales, services, clients, serviceFailures, settings, setPendingAction } = useData() as any;
  const setView = useUIStore(s => s.setView);
  const currentView = useUIStore(s => s.currentView);
  const isDesktop = useIsDesktop();


  // IDs ya mostrados en esta "sesión de visibilidad" (se limpia al volver a foreground)
  const [shown, setShown] = useState<Set<string>>(() => new Set());
  // Aviso actualmente visible (uno a la vez)
  const [currentId, setCurrentId] = useState<string | null>(null);

  const warningDays: number = settings?.salesPreferences?.warningDays ?? 2;

  const allAlerts = useMemo<Alert[]>(() => {
    const list: Alert[] = [];
    const svcName = (id: string) => services.find((s: any) => s.id === id)?.name || 'Servicio';

    const failingAccountIds = new Set<string>(
      sales
        .filter((s: any) => serviceFailures?.some((f: any) => f.saleId === s.id))
        .map((s: any) => s.accountId)
    );

    type Group = { expired: string[]; soon: string[]; soonDays: number };
    const groups = new Map<string, Group>();
    accounts.forEach((a: any) => {
      if (a.status === 'inactiva' || a.status === 'fallando' || a.status === 'trash') return;
      if (a.is_down || a.failure_started_at) return;
      if (failingAccountIds.has(a.id)) return;

      const d = getDaysRemaining(a.endDate);
      const key = a.serviceId;
      const g = groups.get(key) || { expired: [], soon: [], soonDays: 99 };
      if (d <= 0) g.expired.push(a.id);
      else if (d <= warningDays) { g.soon.push(a.id); g.soonDays = Math.min(g.soonDays, d); }
      groups.set(key, g);
    });
    groups.forEach((g, sid) => {
      const name = svcName(sid).toUpperCase();
      if (g.expired.length > 0) {
        list.push({
          id: `acc_exp_${sid}_${g.expired.length}`,
          severity: 'danger',
          title: name,
          message: `${g.expired.length} ${g.expired.length === 1 ? 'cuenta vencida' : 'cuentas vencidas'}`,
          view: 'inventory',
          action: g.expired.length === 1
            ? { type: 'OPEN_ACCOUNT_DETAIL', targetId: g.expired[0] }
            : { type: 'OPEN_SERVICE_ACCOUNTS', targetId: sid },
        });
      }
      if (g.soon.length > 0) {
        list.push({
          id: `acc_soon_${sid}_${g.soon.length}_${g.soonDays}`,
          severity: 'warning',
          title: name,
          message: `${g.soon.length} ${g.soon.length === 1 ? 'cuenta' : 'cuentas'} por vencer en ${g.soonDays} día${g.soonDays === 1 ? '' : 's'}`,
          view: 'inventory',
          action: g.soon.length === 1
            ? { type: 'OPEN_ACCOUNT_DETAIL', targetId: g.soon[0] }
            : { type: 'OPEN_SERVICE_ACCOUNTS', targetId: sid },
        });
      }
    });

    // Agrupar ventas por cliente: un cliente con varios servicios = una sola notificación
    type SaleGroup = { clientId: string; cname: string; expired: number; soon: number; minSoonDays: number; maxExpDays: number };
    const saleGroups = new Map<string, SaleGroup>();
    sales.forEach((s: any) => {
      const d = getDaysRemaining(s.expiryDate);
      const isExp = d <= 0 && d > -7;
      const isSoon = d > 0 && d <= warningDays;
      if (!isExp && !isSoon) return;
      const client = clients.find((c: any) => c.id === s.clientId);
      const cname = client?.name || 'Cliente';
      const g = saleGroups.get(s.clientId) || { clientId: s.clientId, cname, expired: 0, soon: 0, minSoonDays: 99, maxExpDays: 0 };
      if (isExp) { g.expired++; g.maxExpDays = Math.max(g.maxExpDays, Math.abs(d)); }
      else if (isSoon) { g.soon++; g.minSoonDays = Math.min(g.minSoonDays, d); }
      saleGroups.set(s.clientId, g);
    });
    saleGroups.forEach((g) => {
      if (g.expired > 0) {
        list.push({
          id: `sale_exp_client_${g.clientId}_${g.expired}`,
          severity: 'danger',
          title: g.cname.toUpperCase(),
          message: g.expired === 1
            ? `Venció hace ${g.maxExpDays} día${g.maxExpDays === 1 ? '' : 's'}`
            : `${g.expired} servicios vencidos`,
          view: 'expired',
          action: { type: 'OPEN_RENEWAL', targetId: g.clientId },
        });
      } else if (g.soon > 0) {
        list.push({
          id: `sale_soon_client_${g.clientId}_${g.soon}_${g.minSoonDays}`,
          severity: 'warning',
          title: g.cname.toUpperCase(),
          message: g.soon === 1
            ? `Renueva en ${g.minSoonDays} día${g.minSoonDays === 1 ? '' : 's'}`
            : `${g.soon} servicios renuevan en ${g.minSoonDays} día${g.minSoonDays === 1 ? '' : 's'}`,
          view: 'sales',
          action: { type: 'OPEN_RENEWAL', targetId: g.clientId },
        });
      }
    });


    if (serviceFailures && serviceFailures.length > 0) {
      list.push({
        id: `agenda_${serviceFailures.length}`,
        severity: 'danger',
        title: 'AGENDA DE FALLAS',
        message: `${serviceFailures.length} ${serviceFailures.length === 1 ? 'cliente con falla por atender' : 'clientes con fallas por atender'}`,
        view: 'agenda',
      });
    }

    return list;
  }, [accounts, sales, services, clients, serviceFailures, warningDays]);

  // Avisos pendientes = los que aún no se han mostrado en esta sesión de visibilidad
  const pending = useMemo(() => allAlerts.filter(a => !shown.has(a.id)), [allAlerts, shown]);

  // Si no hay aviso visible, toma el siguiente pendiente
  useEffect(() => {
    if (!currentId && pending.length > 0) {
      setCurrentId(pending[0].id);
    }
  }, [pending, currentId]);

  // Auto-cierra el aviso visible después de 6s y marca como mostrado
  useEffect(() => {
    if (!currentId) return;
    const t = setTimeout(() => {
      setShown(prev => {
        const n = new Set(prev);
        n.add(currentId);
        return n;
      });
      setCurrentId(null);
    }, 6000);
    return () => clearTimeout(t);
  }, [currentId]);

  // Al volver a foreground (o al recibir foco), reinicia "shown" para mostrar los avisos de nuevo
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setShown(new Set());
        setCurrentId(null);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  // Solo mostrar en Dashboard; al cambiar de vista, ocultar inmediatamente
  useEffect(() => {
    if (currentView !== 'dashboard') {
      setCurrentId(null);
    }
  }, [currentView]);

  const current = allAlerts.find(a => a.id === currentId) || null;
  if (!current || currentView !== 'dashboard') return null;


  const dismiss = (id: string) => {
    setShown(prev => {
      const n = new Set(prev);
      n.add(id);
      return n;
    });
    setCurrentId(null);
  };

  const palette: Record<Severity, { icon: string; chip: string; Icon: React.ComponentType<any> }> = {
    danger:  { icon: 'text-status-danger',  chip: 'bg-status-danger/15',  Icon: AlertOctagon },
    warning: { icon: 'text-status-warning', chip: 'bg-status-warning/15', Icon: Clock },
    info:    { icon: 'text-brand-primary',  chip: 'bg-brand-primary/15',  Icon: Bell },
  };
  if (current.view === 'agenda') palette.danger.Icon = Wrench;
  const cfg = palette[current.severity];

  const handleNavigate = () => {
    if (current.action) setPendingAction(current.action);
    setView(current.view);
    dismiss(current.id);
  };

  const containerStyle: React.CSSProperties = isDesktop
    ? { top: 'calc(env(safe-area-inset-top) + 70px)', right: 16, zIndex: 9990 }
    : { bottom: 'calc(env(safe-area-inset-bottom) + 140px)', left: 16, right: 16, zIndex: 9990 };

  return (
    <div className="pointer-events-none fixed flex justify-center" style={containerStyle}>
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: isDesktop ? -16 : 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: isDesktop ? -10 : 30, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className={`pointer-events-auto w-full ${isDesktop ? 'max-w-[360px]' : 'max-w-[480px] mx-auto'} bg-surface-2/95 backdrop-blur-2xl border border-border-subtle rounded-xl shadow-elev-lg overflow-hidden`}
        >
          <button
            type="button"
            onClick={handleNavigate}
            className="w-full flex items-center gap-3 p-3 text-left active:scale-[0.99] transition"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${cfg.chip}`}>
              <cfg.Icon size={18} className={cfg.icon} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-text-primary truncate">
                {current.title}
              </p>
              <p className="text-[12px] text-text-secondary truncate">
                {current.message}
              </p>
            </div>
            <span
              onClick={(e) => { e.stopPropagation(); dismiss(current.id); }}
              aria-label="Cerrar"
              className="shrink-0 w-7 h-7 rounded-lg hover:bg-[rgb(var(--fg-rgb))]/5 text-text-muted flex items-center justify-center transition"
            >
              <X size={13} />
            </span>
          </button>
          {pending.length > 1 && (
            <div className="flex gap-1 px-3 pb-2">
              {pending.slice(0, 5).map((_, i: number) => (
                <span
                  key={i}
                  className={`h-[2px] flex-1 rounded-full transition-colors ${i === 0 ? 'bg-[rgb(var(--fg-rgb))]/60' : 'bg-[rgb(var(--fg-rgb))]/10'}`}
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default InAppNotifications;
