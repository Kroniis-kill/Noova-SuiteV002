import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../store/uiStore';

export interface ActionItem {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  color?: string; // Tailwind bg color class
}

interface ScrollFloatingActionsProps {
  onAdd?: () => void; // Single action (Legacy)
  actions?: ActionItem[]; // Multiple actions (Speed Dial)
  onBack?: () => void; // Prop maintained for interface compatibility
}

const ScrollFloatingActions: React.FC<ScrollFloatingActionsProps> = ({ onAdd, actions }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { setBottomNavVisible } = useUIStore();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (!mainElement) return;

    const handleScroll = () => {
      const currentView = useUIStore.getState().currentView;
      // Mostrar controles al hacer scroll hacia abajo y ocultar menú inferior
      if (mainElement.scrollTop > 60) {
        setIsVisible(true);
        setBottomNavVisible(false);
      } else {
        setIsVisible(false);
        // Solo restaurar si no estamos en ajustes
        if (currentView !== 'settings') {
          setBottomNavVisible(true);
        }
        setIsMenuOpen(false); // Cerrar menú al volver arriba
      }
    };

    mainElement.addEventListener('scroll', handleScroll);
    return () => {
      mainElement.removeEventListener('scroll', handleScroll);
      // Asegurar que el menú inferior vuelva al desmontar si es necesario y no estamos en ajustes
      const currentView = useUIStore.getState().currentView;
      if (currentView !== 'settings') {
        setBottomNavVisible(true);
      }
    };
  }, [setBottomNavVisible]);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToTop = () => {
    const mainElement = document.querySelector('main');
    if (mainElement) mainElement.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMainClick = () => {
    if (actions && actions.length > 0) {
      setIsMenuOpen(!isMenuOpen);
    } else if (onAdd) {
      onAdd();
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          ref={menuRef}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 flex items-end justify-between pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-24 pointer-events-none"
        >
           {/* Left Group: Scroll Top Only */}
           <div className="flex gap-3 pointer-events-auto">
              {/* Scroll Top Button */}
              <button 
                onClick={scrollToTop}
                className="w-12 h-12 bg-[rgb(var(--fg-rgb))]/5 backdrop-blur-md border border-[rgb(var(--fg-rgb))]/10 rounded-md flex items-center justify-center text-primary shadow-lg active:scale-90 transition-transform"
              >
                 <ArrowUp size={20} />
              </button>
           </div>

           {/* Right: Main Action (Speed Dial or Single) */}
           <div className="flex flex-col items-end gap-3 pointer-events-auto relative">
              
              {/* Speed Dial Menu */}
              <AnimatePresence>
                {isMenuOpen && actions && (
                  <div className="flex flex-col gap-3 items-end mb-2">
                    {actions.map((action, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.8 }}
                        transition={{ delay: idx * 0.05, type: 'spring', stiffness: 400, damping: 25 }}
                        className="flex items-center gap-3"
                      >
                        <span className="text-xs font-semibold text-white bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[rgb(var(--fg-rgb))]/10 shadow-lg">
                          {action.label}
                        </span>
                        <button
                          onClick={() => {
                            action.onClick();
                            setIsMenuOpen(false);
                          }}
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-primary shadow-xl border border-[rgb(var(--fg-rgb))]/10 active:scale-90 transition-transform ${action.color || 'bg-surface-3'}`}
                        >
                          <action.icon size={20} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>

              {/* Main FAB */}
              <button 
                onClick={handleMainClick}
                className={`w-14 h-14 bg-gradient-to-tr from-brand-primary to-brand-accent rounded-lg flex items-center justify-center text-white shadow-[0_0_30px_-5px_rgba(106,44,255,0.6)] active:scale-90 transition-all border-2 border-surface-3 z-10 ${isMenuOpen ? 'rotate-45' : 'rotate-0'}`}
              >
                 <Plus size={28} strokeWidth={2.5} />
              </button>
           </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScrollFloatingActions;