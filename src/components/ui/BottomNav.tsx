import React from 'react';
import { LayoutDashboard, Layers, ShoppingCart, Users, Grip } from 'lucide-react';
import { ViewState } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { useHaptic } from '../../hooks/useHaptic';
import { useUIStore } from '../../store/uiStore';

interface BottomNavProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onMenuClick: () => void;
  isVisible?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView, onMenuClick, isVisible = true }) => {
  const haptic = useHaptic();
  const storeCurrentView = useUIStore((s) => s.currentView);
  const effectiveVisibility = isVisible && currentView !== 'settings' && storeCurrentView !== 'settings';

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Inicio' },
    { id: 'sales',     icon: ShoppingCart,    label: 'Ventas' },
    { id: 'menu',      icon: Grip,            label: 'Menú',    isAction: true },
    { id: 'inventory', icon: Layers,          label: 'Stock' },
    { id: 'contacts',  icon: Users,           label: 'Clientes' },
  ];

  return (
    <AnimatePresence>
      {effectiveVisibility && (
        <motion.nav
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          aria-label="Navegación principal"
          className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-0 right-0 flex justify-center pointer-events-none px-4 md:hidden gpu-accelerated"
          style={{ zIndex: 'var(--z-nav)' }}
        >
          <div className="bg-surface-1/95 backdrop-blur-xl border border-border-subtle rounded-md shadow-elev-lg w-full max-w-[380px] h-[76px] flex items-center justify-between p-2 pointer-events-auto ring-1 ring-hairline relative gpu-accelerated">
            {navItems.map((item) => {
              const isActive = currentView === item.id;

              if (item.isAction) {
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    aria-label={item.label}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => { haptic('nav'); onMenuClick(); }}
                    className="w-[60px] h-[60px] rounded-xl bg-brand-gradient flex items-center justify-center text-white shadow-glow-primary border-[3px] border-surface-1 relative overflow-hidden group mx-1 z-20 focus-visible:ring-2 focus-visible:ring-brand-accent/60 outline-none"
                    style={{ touchAction: 'manipulation' }}
                  >
                    <div className="absolute inset-0 bg-[rgb(var(--fg-rgb))]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-out-soft" />
                    <Grip size={26} aria-hidden="true" />
                  </motion.button>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => { haptic('nav'); setView(item.id as ViewState); }}
                  className="relative flex-1 h-full flex flex-col items-center justify-center gap-1 text-text-disabled outline-none select-none active:scale-95 transition-transform duration-150 ease-out-soft focus-visible:text-text-primary"
                  style={{ touchAction: 'manipulation' }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill-active"
                      className="absolute inset-x-1 top-2 bottom-2 bg-[rgb(var(--fg-rgb))]/[0.06] rounded-sm -z-10"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}

                  <div className={`transition-all duration-300 ease-out-soft ${isActive ? 'text-text-primary -translate-y-1' : ''}`}>
                    <item.icon
                      size={24}
                      strokeWidth={isActive ? 2.5 : 2}
                      aria-hidden="true"
                      className={isActive ? 'drop-shadow-[0_0_12px_rgb(var(--fg-rgb)/0.5)]' : ''}
                    />
                  </div>

                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      layoutId="nav-dot"
                      aria-hidden="true"
                      className="w-1 h-1 bg-brand-accent rounded-pill absolute bottom-3 shadow-glow-accent"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
};

export default BottomNav;
