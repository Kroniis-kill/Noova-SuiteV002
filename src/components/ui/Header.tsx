import React, { useState } from 'react';
import { Bell, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useData } from '../../context/DataContext';
import { useSubscription } from '../../context/SubscriptionContext';
import NotificationCenter from './NotificationCenter';

interface HeaderProps {
  openMobile: () => void;
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, showBack, onBack }) => {
  const { notifications } = useData();
  const unreadCount = notifications.filter(n => !n.read).length;
  const { subscription, isAdmin } = useSubscription();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const getSuiteColor = () => {
    if (isAdmin) return 'text-status-warning-soft';
    if (!subscription) return 'text-text-disabled';

    switch (subscription.plan) {
      case 'monthly':    return 'text-status-info-soft';
      case 'quarterly':  return 'text-indigo-400';
      case 'semiannual': return 'text-purple-400';
      case 'annual':     return 'text-status-success-soft';
      case 'lifetime':   return 'text-status-warning-soft';
      case 'free':
      default:           return 'text-text-disabled';
    }
  };

  const iconButton =
    'w-11 h-11 rounded-md flex items-center justify-center bg-surface-3 hover:bg-surface-4 border border-hairline text-text-primary shadow-elev-sm transition-all duration-150 ease-out-soft active:scale-95 focus-visible:ring-2 focus-visible:ring-brand-primary/50 outline-none';

  return (
    <>
      <div
        className="w-full bg-transparent sticky top-0 px-[var(--mobile-side-pad)] h-[64px] flex items-center"
        style={{ zIndex: 'var(--z-header)' }}
      >
        <motion.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full h-[49px] flex items-center justify-between"
        >
          <div className="flex-1 flex justify-start">
            {showBack && (
              <button type="button" onClick={onBack} aria-label="Volver" className={iconButton}>
                <ChevronLeft size={24} strokeWidth={2.5} />
              </button>
            )}
          </div>

          <div className="flex-[2] flex justify-center items-center">
            <span className="text-[17px] font-black tracking-premium text-text-primary font-sans whitespace-nowrap drop-shadow-md uppercase">
              NOOVA{' '}
              <span className={`lowercase font-medium transition-colors duration-500 ${getSuiteColor()}`}>
                suite
              </span>
            </span>
          </div>

          <div className="flex-1 flex justify-end">
            <button
              type="button"
              onClick={() => setIsNotifOpen(true)}
              aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} sin leer)` : ''}`}
              className={`relative ${iconButton}`}
            >
              <Bell size={22} fill="currentColor" />
              {unreadCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-2 right-2 w-2 h-2 bg-status-danger rounded-pill ring-2 ring-surface-3"
                />
              )}
            </button>
          </div>
        </motion.header>
      </div>

      <NotificationCenter
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onNavigate={() => setIsNotifOpen(false)}
      />
    </>
  );
};

export default Header;
