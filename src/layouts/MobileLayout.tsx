import React, { useRef, useEffect } from 'react';
import Sidebar from '../components/ui/Sidebar';
import Header from '../components/ui/Header';
import BottomNav from '../components/ui/BottomNav';
import { ViewState } from '../types';
import { useUIStore } from '../store/uiStore';

interface MobileLayoutProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  viewLabels: Record<ViewState, string>;
  children: React.ReactNode;
  toggleSidebar: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (isOpen: boolean) => void;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  currentView,
  setView,
  viewLabels,
  children,
  toggleSidebar,
  isMobileOpen,
  setIsMobileOpen
}) => {
  const mainRef = useRef<HTMLElement>(null);
  const backAction = useUIStore(state => state.backAction);
  const setBackAction = useUIStore(state => state.setBackAction);
  const isBottomNavVisible = useUIStore(state => state.isBottomNavVisible);

  useEffect(() => {
      setBackAction(null);
  }, [currentView, setBackAction]);

  const handleGlobalBack = () => {
      if (backAction) backAction();
      else setView('dashboard');
  };

  return (
    <div className="min-h-[100dvh] h-[100dvh] w-full bg-bg text-primary flex overflow-hidden font-sans relative">
      <Sidebar 
        currentView={currentView} 
        setView={setView} 
        isMobileOpen={isMobileOpen}
        closeMobile={() => setIsMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col h-full relative z-10 min-w-0">
        {currentView !== 'dashboard' && (
          <div className="sticky top-0 z-[100] w-full pt-safe">
            <Header 
                openMobile={toggleSidebar} 
                title={viewLabels[currentView]} 
                showBack={true}
                onBack={handleGlobalBack}
            />
          </div>
        )}

        <main 
          ref={mainRef}
          className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative z-10 will-change-scroll ${
            (isBottomNavVisible && currentView !== 'settings') ? 'pb-[calc(8rem+env(safe-area-inset-bottom))]' : 'pb-[calc(2.5rem+env(safe-area-inset-bottom))]'
          }`}
        >
             <div className="view-container">
                {children}
             </div>
        </main>
      </div>

      <BottomNav 
        currentView={currentView} 
        setView={setView}
        onMenuClick={() => setIsMobileOpen(true)}
        isVisible={isBottomNavVisible && currentView !== 'settings'}
      />
    </div>
  );
};

export default MobileLayout;