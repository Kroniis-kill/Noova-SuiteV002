import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, PanInfo, useDragControls } from 'framer-motion';
import {
  AlertOctagon, CreditCard, Calculator, Settings, Crown, ShieldCheck,
  Users, Briefcase, Truck, LogOut, ChevronRight, ChevronDown
} from 'lucide-react';
import { ViewState } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useHaptic } from '../../hooks/useHaptic';
import { APP_VERSION } from '../../version';

interface MobileMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

interface SheetItem {
  id: ViewState;
  label: string;
  icon: React.ElementType;
}

const CONTACT_SUB_ITEMS: SheetItem[] = [
  { id: 'contacts',  label: 'Clientes',      icon: Users },
  { id: 'resellers', label: 'Revendedores',  icon: Briefcase },
  { id: 'providers', label: 'Proveedores',   icon: Truck },
];

const IconTile: React.FC<{ icon: React.ElementType; active?: boolean }> = ({ icon: Icon, active }) => (
  <div
    className={`w-10 h-10 shrink-0 rounded-sm flex items-center justify-center transition-colors ${
      active
        ? 'bg-brand-gradient text-white shadow-glow-sm'
        : 'bg-brand-primary/15 text-brand-primary-hi'
    }`}
  >
    <Icon size={20} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
  </div>
);

const MobileMenuSheet: React.FC<MobileMenuSheetProps> = ({ isOpen, onClose, currentView, setView }) => {
  const { logout } = useAuth();
  const { isAdmin } = useSubscription();
  const haptic = useHaptic();
  const dragControls = useDragControls();

  const isContactsActive = CONTACT_SUB_ITEMS.some((s) => s.id === currentView);
  const [contactsOpen, setContactsOpen] = useState(isContactsActive);

  useEffect(() => {
    if (isOpen) setContactsOpen(isContactsActive);
  }, [isOpen, isContactsActive]);

  const items = useMemo<SheetItem[]>(() => {
    const list: SheetItem[] = [
      { id: 'expired',  label: 'Vencimientos',  icon: AlertOctagon },
      { id: 'accounts', label: 'Finanzas',      icon: CreditCard },
      { id: 'refund',   label: 'Reembolso',     icon: Calculator },
      { id: 'settings', label: 'Configuración', icon: Settings },
    ];
    list.push(
      isAdmin
        ? { id: 'admin',   label: 'Admin Panel',     icon: ShieldCheck }
        : { id: 'my_plan', label: 'Mi Suscripción',  icon: Crown }
    );
    return list;
  }, [isAdmin]);

  const go = (view: ViewState) => {
    haptic('nav');
    setView(view);
    onClose();
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) onClose();
  };

  if (typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            key="menu-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            className="fixed left-0 right-0 bottom-0 z-[101] max-h-[88dvh] flex flex-col bg-surface-1 border-t border-border-subtle rounded-t-xl shadow-modal gpu-accelerated"
          >
            {/* Handle + título */}
            <div
              className="shrink-0 pt-2.5 pb-3.5 cursor-grab active:cursor-grabbing"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-10 h-1 rounded-pill bg-text-faint mx-auto" />
              <h2 className="text-center text-[17px] font-black tracking-premium text-text-primary mt-3.5">
                Menú
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar border-t border-border-subtle">
              {/* Contactos (expandible) */}
              <div className="px-4">
                <button
                  type="button"
                  onClick={() => { haptic('nav'); setContactsOpen((o) => !o); }}
                  aria-expanded={contactsOpen}
                  className="w-full min-h-[58px] flex items-center gap-3.5 text-left outline-none active:opacity-70"
                >
                  <IconTile icon={Users} active={isContactsActive} />
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className={`text-[15px] text-text-primary ${isContactsActive ? 'font-bold' : 'font-medium'}`}>
                      Contactos
                    </span>
                    <span className="text-[12px] text-text-muted truncate">
                      Clientes, revendedores, proveedores
                    </span>
                  </div>
                  <motion.span animate={{ rotate: contactsOpen ? 180 : 0 }} className="text-text-disabled">
                    <ChevronDown size={18} aria-hidden="true" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {contactsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                      className="overflow-hidden flex flex-col gap-0.5 pb-2"
                    >
                      {CONTACT_SUB_ITEMS.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = currentView === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => go(sub.id)}
                            className={`ml-[54px] flex items-center justify-between gap-2 px-3 py-3 rounded-sm text-left outline-none transition-colors ${
                              isSubActive
                                ? 'bg-[rgb(var(--fg-rgb))]/[0.06] text-text-primary font-bold'
                                : 'text-text-muted active:bg-[rgb(var(--fg-rgb))]/[0.04]'
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <SubIcon size={16} className={isSubActive ? 'text-brand-accent' : 'text-text-faint'} aria-hidden="true" />
                              <span className="text-[14px] tracking-tight">{sub.label}</span>
                            </span>
                            {isSubActive && <span className="w-1.5 h-1.5 rounded-pill bg-brand-accent shadow-glow-accent" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Resto de opciones */}
              <div className="px-4">
                {items.map((item) => {
                  const isActive = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className="w-full min-h-[58px] flex items-center gap-3.5 text-left border-t border-hairline outline-none active:opacity-70"
                    >
                      <IconTile icon={item.icon} active={isActive} />
                      <span className={`flex-1 text-[15px] text-text-primary ${isActive ? 'font-bold' : 'font-medium'}`}>
                        {item.label}
                      </span>
                      <ChevronRight size={18} className="text-text-disabled" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>

              {/* Cerrar sesión */}
              <div className="px-4 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => { haptic('heavy'); onClose(); logout(); }}
                  className="w-full min-h-[62px] flex items-center gap-3.5 text-left outline-none active:opacity-70"
                >
                  <div className="w-10 h-10 shrink-0 rounded-sm bg-status-danger/10 text-status-danger-soft flex items-center justify-center">
                    <LogOut size={20} aria-hidden="true" />
                  </div>
                  <span className="text-[15px] font-medium text-status-danger-soft">Cerrar sesión</span>
                </button>
              </div>

              <div className="border-t border-border-subtle text-center pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                <span className="text-[11px] text-text-faint font-mono tracking-widest">v{APP_VERSION}</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default MobileMenuSheet;
