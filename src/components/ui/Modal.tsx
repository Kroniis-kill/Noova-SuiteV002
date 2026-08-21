import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { isNativePlatform } from '../../utils/platformUtils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  zIndex?: number;
  isTopMost?: boolean;
  /** Ancho máximo en desktop. sm=md(28rem) · md=lg(32rem · default) · lg=2xl(42rem) · xl=4xl(56rem) */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'lg:max-w-md',
  md: 'lg:max-w-lg',
  lg: 'lg:max-w-2xl',
  xl: 'lg:max-w-4xl',
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, zIndex, isTopMost = false, size = 'md' }) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const isNative = isNativePlatform();

  const baseZIndex = isTopMost
    ? 'var(--z-modal-top)'
    : (zIndex ? String(zIndex) : 'var(--z-modal-base)');

  const springTransition = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
    mass: 0.8,
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const contentVariants = isMobile
    ? {
        hidden: { y: '100%' },
        visible: { y: 0, transition: springTransition },
        exit: { y: '100%', transition: { duration: 0.2, ease: 'easeIn' as const } },
      }
    : {
        hidden: { opacity: 0, scale: 0.98, y: 20 },
        visible: { opacity: 1, scale: 1, y: 0, transition: springTransition },
        exit: { opacity: 0, scale: 0.98, y: 20, transition: { duration: 0.15 } },
      };

  if (typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          style={{ zIndex: baseZIndex }}
          className="fixed inset-0 overflow-hidden flex items-end lg:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            key="overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className={`absolute inset-0 ${isNative ? 'bg-black/80' : 'bg-black/60 backdrop-blur-sm'}`}
          />

          <motion.div
            key="modal-content"
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`
              relative w-full bg-surface-1 shadow-modal gpu-accelerated flex flex-col overflow-hidden
              ${isMobile
                ? 'rounded-t-xl border-t border-border-subtle'
                : `rounded-xl ${SIZE_CLASSES[size]} border border-border-subtle my-10 mx-6`}
            `}
            style={{ maxHeight: isMobile ? '92dvh' : '88vh' }}
          >
            {isMobile && (
              <div className="w-full flex justify-center pt-3 pb-1 shrink-0" onClick={onClose}>
                <div className="w-12 h-1.5 bg-text-text-faint rounded-pill" />
              </div>
            )}

            <div
              className={`flex items-center justify-between shrink-0 bg-surface-1 border-b border-hairline ${
                isMobile ? 'px-[var(--mobile-side-pad)] py-5' : 'px-6 py-4'
              }`}
            >
              <h3
                className={`${
                  isMobile ? 'text-lg' : 'text-sm uppercase tracking-eyebrow'
                } font-extrabold text-text-primary`}
              >
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="w-9 h-9 flex items-center justify-center rounded-pill bg-surface-3 hover:bg-surface-4 text-text-muted hover:text-text-primary transition-all duration-150 ease-out-soft active:scale-90 focus-visible:ring-2 focus-visible:ring-brand-primary/50 outline-none"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className={`overflow-y-auto custom-scrollbar flex-1 pb-safe ${
                isMobile ? 'p-[var(--mobile-side-pad)]' : 'p-6'
              }`}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default Modal;
