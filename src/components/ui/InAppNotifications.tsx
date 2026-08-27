import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, X, Wrench } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useUIStore } from '../../store/uiStore';
import { useExpiryEngine, ExpiryEvent } from '../../hooks/useExpiryEngine';

/**
 * Canal BANNER (Dashboard). Es el "vistazo rápido" al abrir la app — no el
 * inbox (eso es la campanita) ni el aviso del sistema (eso es el push).
 * Por eso acá solo mostramos lo realmente urgente (vencido / vence hoy),
 * como máximo 3 avisos, y solo en el Dashboard.
 *
 * El reset ahora es por DÍA CALENDARIO, no por "sesión de visibilidad": antes,
 * minimizar y volver a abrir la app repetía los mismos avisos aunque nada
 * hubiera cambiado, lo cual se sentía como duplicado.
 */

const MAX_BANNER_ITEMS = 3;
const SHOWN_KEY = 'noova_banner_shown_v2';

interface ShownStore {
  day: string;
  ids: string[];
}

const loadShown = (): Set<string> => {
  try {
    const parsed: ShownStore = JSON.parse(localStorage.getItem(SHOWN_KEY) || 'null');
    const today = new Date().toISOString().slice(0, 10);
    if (!parsed || parsed.day !== today) return new Set();
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
};

const saveShown = (ids: Set<string>) => {
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(SHOWN_KEY, JSON.stringify({ day: today, ids: Array.from(ids) } as ShownStore));
};

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
  const { accounts, sales, services, clients, serviceFailures, payableExpenses, setPendingAction } = useData() as any;
  const setView = useUIStore((s) => s.setView);
  const currentView = useUIStore((s) => s.currentView);
  const isDesktop = useIsDesktop();

  const events = useExpiryEngine({ accounts, sales, payables: payableExpenses, clients, services, serviceFailures });

  // Solo lo urgente, y como mucho 3 — el banner no es el inbox.
  const criticalAlerts = useMemo<ExpiryEvent[]>(
    () => events.filter((e) => e.severity === 'critical').slice(0, MAX_BANNER_ITEMS),
    [events]
  );

  const agendaAlert: ExpiryEvent | null =
    serviceFailures && serviceFailures.length > 0
      ? {
          id: `agenda_${serviceFailures.length}`,
          entity: 'account',
          groupKey: 'agenda',
          severity: 'critical',
          daysRemaining: 0,
          itemCount: serviceFailures.length,
          itemIds: [],
          title: 'Agenda de fallas',
          message: `${serviceFailures.length} ${serviceFailures.length === 1 ? 'cliente con falla por atender' : 'clientes con fallas por atender'}`,
          view: 'agenda',
          milestone: 'due',
        }
      : null;

  const allAlerts = useMemo(
    () => (agendaAlert ? [agendaAlert, ...criticalAlerts] : criticalAlerts).slice(0, MAX_BANNER_ITEMS),
    [agendaAlert, criticalAlerts]
  );

  const [shown, setShown] = useState<Set<string>>(() => loadShown());
  const [currentId, setCurrentId] = useState<string | null>(null);

  const pending = useMemo(() => allAlerts.filter((a) => !shown.has(a.id)), [allAlerts, shown]);

  useEffect(() => {
    if (!currentId && pending.length > 0) setCurrentId(pending[0].id);
  }, [pending, currentId]);

  useEffect(() => {
    if (!currentId) return;
    const t = setTimeout(() => {
      setShown((prev) => {
        const n = new Set(prev);
        n.add(currentId);
        saveShown(n);
        return n;
      });
      setCurrentId(null);
    }, 6000);
    return () => clearTimeout(t);
  }, [currentId]);

  // Ya NO se reinicia al volver a foreground — solo cambia con un nuevo día calendario
  // (loadShown ya descarta el set guardado si la fecha no coincide).

  useEffect(() => {
    if (currentView !== 'dashboard') setCurrentId(null);
  }, [currentView]);

  const current = allAlerts.find((a) => a.id === currentId) || null;
  if (!current || currentView !== 'dashboard') return null;

  const dismiss = (id: string) => {
    setShown((prev) => {
      const n = new Set(prev);
      n.add(id);
      saveShown(n);
      return n;
    });
    setCurrentId(null);
  };

  const isAgenda = current.view === 'agenda';
  const Icon = isAgenda ? Wrench : AlertOctagon;

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
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-status-danger/15">
              <Icon size={18} className="text-status-danger" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-text-primary truncate">
                {current.title}
              </p>
              <p className="text-[12px] text-text-secondary truncate">{current.message}</p>
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
              {pending.slice(0, MAX_BANNER_ITEMS).map((_, i: number) => (
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
