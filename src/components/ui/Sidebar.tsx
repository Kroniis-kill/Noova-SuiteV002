import React, { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Layers, ShoppingCart, Users, 
  AlertOctagon, CreditCard, Settings, LogOut, Briefcase, 
  X, ChevronRight, Truck, ShieldCheck, Crown, ChevronDown, Calculator
} from 'lucide-react';
import { ViewState } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useData } from '../../context/DataContext';
import { useUIStore } from '../../store/uiStore';
import { PLAN_LABELS } from '../../types/subscriptionTypes';
import AnimatedLogo from './AnimatedLogo';
import Avatar from './Avatar';
import { APP_VERSION } from '../../version';
import { isNativePlatform } from '../../utils/platformUtils';
import { useHaptic } from '../../hooks/useHaptic';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isMobileOpen: boolean;
  closeMobile: () => void;
  isDesktopOpen?: boolean;
}

interface NavItemData {
  id: ViewState;
  label: string;
  icon: React.ElementType;
  subItems?: { id: ViewState; label: string; icon: React.ElementType }[];
}

interface NavItemProps {
  item: NavItemData;
  setView: (view: ViewState) => void;
  closeMobile: () => void;
  isDesktop?: boolean;
  currentView: ViewState;
}

const NavItem: React.FC<NavItemProps> = ({ item, setView, closeMobile, isDesktop, currentView }) => {
  const Icon = item.icon;
  const haptic = useHaptic();
  const hasSubItems = item.subItems && item.subItems.length > 0;
  
  const isParentActive = useMemo(() => {
    if (currentView === item.id) return true;
    return item.subItems?.some(sub => sub.id === currentView) || false;
  }, [currentView, item]);

  const [isExpanded, setIsExpanded] = useState(isParentActive);
  const wasParentActiveRef = useRef(isParentActive);

  useEffect(() => {
    if (isParentActive && !wasParentActiveRef.current && hasSubItems) {
      setIsExpanded(true);
    }
    wasParentActiveRef.current = isParentActive;
  }, [isParentActive, hasSubItems]);

  const handleMainClick = () => {
    haptic('nav');
    if (hasSubItems) {
      setIsExpanded(!isExpanded);
    } else {
      setView(item.id);
      if (!isDesktop) closeMobile();
    }
  };

  return (
    <div className="w-full mb-1">
      <button
        onClick={handleMainClick}
        className={`
          relative w-full flex items-center justify-between px-3 ${isDesktop ? 'py-2' : 'py-3.5'} 
          rounded-md transition-all duration-300 group outline-none
          ${isParentActive ? 'text-text-primary' : 'text-text-disabled hover:text-text-secondary'}
        `}
      >
        {isParentActive && !hasSubItems && (
          <motion.div 
            layoutId="sidebar-active-bg"
            className="absolute inset-0 bg-[rgb(var(--fg-rgb))]/[0.05] border border-[rgb(var(--fg-rgb))]/[0.08] rounded-md z-0" 
          />
        )}

        <div className="flex items-center gap-2.5 relative z-10">
          <div className={`
            p-1.5 rounded-sm transition-all duration-500 
            ${isParentActive 
              ? 'bg-gradient-to-br from-brand-primary to-brand-accent text-white shadow-glow-sm scale-105' 
              : 'bg-[rgb(var(--fg-rgb))]/5 text-text-disabled group-hover:bg-[rgb(var(--fg-rgb))]/10 group-hover:text-text-secondary'}
          `}>
             <Icon size={isDesktop ? 16 : 20} strokeWidth={isParentActive ? 2.5 : 2} />
          </div>

          <span className={`
            text-left ${isDesktop ? 'text-[12px]' : 'text-[15px]'} tracking-tight transition-all 
            ${isParentActive ? 'font-bold' : 'font-medium'}
          `}>
            {item.label}
          </span>
        </div>

        {hasSubItems && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            className={`relative z-10 transition-colors ${isParentActive ? 'text-text-muted' : 'text-text-faint'}`}
          >
            <ChevronDown size={12} />
          </motion.div>
        )}
      </button>

      <AnimatePresence initial={false}>
        {hasSubItems && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden flex flex-col gap-0.5 mt-0.5 mb-2"
          >
            {item.subItems?.map((sub) => {
              const SubIcon = sub.icon;
              const isSubActive = currentView === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    haptic('nav');
                    setView(sub.id);
                    if (!isDesktop) closeMobile();
                  }}
                  className={`
                    w-[calc(100%-40px)] ml-10 flex items-center justify-between px-2.5 ${isDesktop ? 'py-2' : 'py-3'} 
                    rounded-sm transition-all duration-200 group
                    ${isSubActive ? 'bg-[rgb(var(--fg-rgb))]/[0.06] text-text-primary font-bold' : 'text-text-disabled hover:text-text-secondary hover:bg-[rgb(var(--fg-rgb))]/[0.02]'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <SubIcon size={isDesktop ? 12 : 16} className={isSubActive ? 'text-brand-accent' : 'text-text-faint'} />
                    <span className={`${isDesktop ? 'text-[12px]' : 'text-[15px]'} tracking-tight`}>
                      {sub.label}
                    </span>
                  </div>
                  {isSubActive && (
                    <motion.div layoutId="sub-dot" className="w-1 h-1 bg-brand-accent rounded-full shadow-[0_0_5px_#FF1493]" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isMobileOpen, closeMobile }) => {
  const { user, logout } = useAuth();
  const { settings } = useData();
  const { isAdmin, subscription } = useSubscription();
  const isNative = isNativePlatform();
  const haptic = useHaptic();

  const finalItems = useMemo(() => {
    const items: NavItemData[] = [
      { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
      { id: 'sales', label: 'Ventas', icon: ShoppingCart },
      { id: 'inventory', label: 'Inventario', icon: Layers },
      { 
        id: 'contacts', 
        label: 'Contacto', 
        icon: Users,
        subItems: [
          { id: 'contacts', label: 'Clientes', icon: Users },
          { id: 'resellers', label: 'Revendedores', icon: Briefcase },
          { id: 'providers', label: 'Proveedores', icon: Truck },
        ]
      },
      { id: 'expired', label: 'Vencimientos', icon: AlertOctagon },
      { id: 'accounts', label: 'Finanzas', icon: CreditCard },
      { id: 'refund', label: 'Reembolso', icon: Calculator },
      { id: 'settings', label: 'Configuración', icon: Settings },
    ];

    if (isAdmin) {
      items.push({ id: 'admin', label: 'Admin Panel', icon: ShieldCheck });
    } else {
      items.push({ id: 'my_plan', label: 'Mi Suscripción', icon: Crown });
    }
    return items;
  }, [isAdmin]);

  const planLabel = isAdmin 
    ? 'Admin' 
    : (subscription ? PLAN_LABELS[subscription.plan] : 'Free');

  const avatarImage = settings.useBusinessLogo && settings.businessInfo?.logo 
    ? settings.businessInfo.logo 
    : user?.avatar;

  const SidebarContent = ({ isDesktop = false }) => (
    <div className={`h-full flex flex-col relative ${isDesktop ? 'py-4' : 'pb-safe'}`}>
      {/* Brand Header - Premium Style */}
      <div className={`flex items-center gap-3 ${isDesktop ? 'px-6 py-8' : 'px-6 pt-12 pb-8'} shrink-0 group/header`}>
         <div className="relative">
            <div className={`${isDesktop ? 'w-10 h-10' : 'w-12 h-12'} rounded-md p-[1.5px] relative z-10 ${isAdmin ? 'bg-gradient-to-br from-status-warning-soft to-orange-600' : 'bg-gradient-to-br from-brand-primary to-brand-accent'} shadow-glow-sm transition-all duration-500`}>
                <div className="w-full h-full rounded-sm bg-surface-sunken flex items-center justify-center overflow-hidden">
                   <AnimatedLogo size={isDesktop ? 24 : 28} isStatic={true} showFill={true} />
                </div>
            </div>
         </div>
         <div className="flex flex-col relative z-20">
            <span className={`${isDesktop ? 'text-xl' : 'text-2xl'} font-black text-text-primary tracking-tighter leading-none`}>NOOVA</span>
            <span className={`text-[10px] font-bold tracking-[0.3em] uppercase mt-1 ${isAdmin ? 'text-status-warning-soft' : 'text-brand-primary'}`}>
               {isAdmin ? 'MASTER' : 'SUITE'}
            </span>
         </div>
      </div>

      {/* Nav List - Better Spacing */}
      <div className={`flex-1 overflow-y-auto no-scrollbar ${isDesktop ? 'px-4' : 'px-4'} py-4`}>
        {finalItems.map((item) => (
          <NavItem 
            key={item.id} 
            item={item} 
            setView={setView} 
            closeMobile={closeMobile}
            isDesktop={isDesktop}
            currentView={currentView}
          />
        ))}
      </div>

      {/* Bottom User Profile */}
      <div className={`${isDesktop ? 'px-3' : 'p-4'} mt-auto shrink-0 pb-6`}>
         <div className="bg-[rgb(var(--fg-rgb))]/[0.03] border border-[rgb(var(--fg-rgb))]/[0.06] rounded-xl p-3 flex items-center gap-4 relative overflow-hidden group mb-2 shadow-inner">
            <div className="relative shrink-0 cursor-pointer" onClick={() => setView('settings')}>
               <div className={`${isDesktop ? 'w-8 h-8' : 'w-12 h-12'} rounded-full p-[1.5px] ${isAdmin ? 'bg-gradient-to-tr from-status-warning-soft to-orange-600' : 'bg-gradient-to-tr from-brand-primary to-brand-accent'}`}>
                  <Avatar 
                    name={user?.name || 'User'} 
                    image={avatarImage} 
                    size="100%" 
                    className="rounded-full w-full h-full border-2 border-surface-1" 
                  />
               </div>
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
               <span className={`${isDesktop ? 'text-[12px]' : 'text-[15px]'} font-bold text-text-primary truncate leading-tight`}>
                 {user?.name?.split(' ')[0]}
               </span>
               <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border mt-1.5 w-fit uppercase tracking-wider ${isAdmin ? 'bg-status-warning/10 text-status-warning-soft border-status-warning/20' : 'bg-brand-primary/10 text-brand-primary border-brand-primary/20'}`}>
                  {planLabel}
               </span>
            </div>

             <button 
                onClick={(e) => { e.stopPropagation(); haptic('heavy'); logout(); }} 
                className={`${isDesktop ? 'w-8 h-8' : 'w-10 h-10'} flex items-center justify-center rounded-full bg-[rgb(var(--fg-rgb))]/5 text-text-disabled hover:text-status-danger-soft hover:bg-status-danger/10 transition-all active:scale-90 border border-[rgb(var(--fg-rgb))]/5 shrink-0`}
                title="Cerrar Sesión"
             >
                <LogOut size={isDesktop ? 16 : 18} />
             </button>
         </div>

         <div className="text-center mt-3">
            <span className="text-[8px] text-text-faint font-mono tracking-widest uppercase opacity-50">v{APP_VERSION}</span>
         </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex fixed top-4 bottom-4 left-4 w-[210px] flex-col z-50">
         <div className="h-full w-full bg-surface-sunken/95 backdrop-blur-3xl border border-[rgb(var(--fg-rgb))]/[0.08] rounded-2xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)] overflow-hidden">
            <SidebarContent isDesktop={true} />
         </div>
      </aside>

      {typeof document !== 'undefined' && document.body && createPortal(
        <AnimatePresence>
          {isMobileOpen && (
            <>
              <motion.div 
                key="backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={closeMobile}
                className={`fixed inset-0 z-[100] ${isNative ? 'bg-black/70' : 'bg-black/60 backdrop-blur-md'}`}
              />
              
              <motion.div
                key="sidebar"
                initial={{ x: "-100%" }} animate={{ x: "0%" }} exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.8 }}
                className={`fixed z-[101] lg:hidden w-[72vw] max-w-[270px] bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col gpu-accelerated ${isNative ? 'top-4 bottom-4 left-4 my-auto max-h-[92vh]' : 'top-[calc(0.5rem+env(safe-area-inset-top))] bottom-[calc(0.5rem+env(safe-area-inset-bottom))] left-[calc(0.5rem+env(safe-area-inset-left))]'}`}
              >
                <button
                  onClick={closeMobile}
                  className="absolute top-4 right-4 p-2 rounded-full bg-[rgb(var(--fg-rgb))]/5 text-text-muted hover:text-text-primary z-50 border border-[rgb(var(--fg-rgb))]/[0.08] active:scale-95 transition-transform"
                >
                  <X size={18} />
                </button>

                <SidebarContent isDesktop={false} />
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default Sidebar;