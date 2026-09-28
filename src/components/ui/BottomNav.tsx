import React from 'react';
import { LayoutDashboard, Layers, ShoppingCart, Users, Menu } from 'lucide-react';
import { ViewState } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useHaptic } from '../../hooks/useHaptic';
import { useUIStore } from '../../store/uiStore';

interface BottomNavProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onMenuClick: () => void;
  isVisible?: boolean;
  isMenuOpen?: boolean;
}

interface NavItem {
  id: ViewState;
  icon: React.ElementType;
  label: string;
  // Vistas que también deben marcar este ítem como activo
  alsoActiveOn?: ViewState[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { id: 'sales',     icon: ShoppingCart,    label: 'Ventas' },
  { id: 'inventory', icon: Layers,          label: 'Stock' },
  { id: 'contacts',  icon: Users,           label: 'Clientes', alsoActiveOn: ['resellers', 'providers'] },
];

const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  setView,
  onMenuClick,
  isVisible = true,
  isMenuOpen = false,
}) => {
  const haptic = useHaptic();
  const storeCurrentView = useUIStore((s) => s.currentView);
  const effectiveVisibility = isVisible && currentView !== 'settings' && storeCurrentView !== 'settings';

  const surface =
    'bg-surface-1/95 backdrop-blur-xl border border-border-subtle shadow-elev-lg ring-1 ring-hairline';

  return (
    <AnimatePresence>
      {effectiveVisibility && (
        <motion.nav
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          aria-label="Navegación principal"
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center pointer-events-none px-[var(--mobile-side-pad)] md:hidden gpu-accelerated"
          style={{ zIndex: 'var(--z-nav)' }}
        >
          <div className="w-full max-w-[420px] flex items-center gap-2.5">
            {/* Píldora con las secciones principales */}
            <div
              className={`${surface} flex-1 min-w-0 h-[68px] rounded-pill flex items-center justify-between p-2 pointer-events-auto gpu-accelerated`}
            >
              {NAV_ITEMS.map((item) => {
                const isActive =
                  currentView === item.id || !!item.alsoActiveOn?.includes(currentView);
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => { haptic('nav'); setView(item.id); }}
                    className="relative flex-1 h-full flex flex-col items-center justify-center gap-0.5 outline-none select-none active:scale-95 transition-transform duration-150 ease-out-soft focus-visible:ring-2 focus-visible:ring-brand-accent/60 rounded-pill"
                    style={{ touchAction: 'manipulation' }}
                  >
                    {isActive ? (
                      <motion.div
                        layoutId="nav-pill-active"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="w-[52px] h-[52px] rounded-full bg-brand-gradient shadow-glow-primary flex items-center justify-center text-white"
                      >
                        <Icon size={24} strokeWidth={2.25} aria-hidden="true" />
                      </motion.div>
                    ) : (
                      <>
                        <Icon size={22} strokeWidth={2} aria-hidden="true" className="text-text-disabled" />
                        <span className="text-[11px] font-medium leading-none text-text-disabled tracking-tight">
                          {item.label}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Botón circular de menú (abre el modal) */}
            <button
              type="button"
              aria-label="Menú"
              aria-haspopup="dialog"
              aria-expanded={isMenuOpen}
              onClick={() => { haptic('nav'); onMenuClick(); }}
              className={`${surface} w-[68px] h-[68px] shrink-0 rounded-full flex items-center justify-center pointer-events-auto active:scale-95 transition-all duration-150 ease-out-soft outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 gpu-accelerated ${
                isMenuOpen ? 'text-brand-primary-hi' : 'text-text-secondary'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              <Menu size={26} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
};

export default BottomNav;
