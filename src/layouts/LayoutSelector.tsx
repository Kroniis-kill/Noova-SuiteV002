import React, { useState, useEffect } from 'react';
import MobileLayout from './MobileLayout';
import DesktopLayout from './DesktopLayout';

import { ViewState } from '../types';

interface LayoutSelectorProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  viewLabels: Record<ViewState, string>;
  children: React.ReactNode;
  toggleSidebar: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
}

const LayoutSelector: React.FC<LayoutSelectorProps> = (props) => {
  const [isMobile, setIsMobile] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Initial check
    const checkLayout = () => {
      // Usamos 1024px como punto de quiebre para Desktop completo
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkLayout();
    setMounted(true);

    // Listener
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, []);

  if (!mounted) return null; // Avoid hydration mismatch

  return (
    <>
      
      {isMobile ? (
        <MobileLayout {...props} />
      ) : (
        <DesktopLayout 
          currentView={props.currentView}
          setView={props.setView}
          viewLabels={props.viewLabels}
        >
          {props.children}
        </DesktopLayout>
      )}
    </>
  );
};

export default LayoutSelector;