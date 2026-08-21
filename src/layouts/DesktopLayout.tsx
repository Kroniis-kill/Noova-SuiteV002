
import React from 'react';
import { ViewState } from '../types';
import Sidebar from '../components/ui/Sidebar';
import Header from '../components/ui/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../store/uiStore';

interface DesktopLayoutProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  viewLabels: Record<ViewState, string>;
  children: React.ReactNode;
}

const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  currentView,
  setView,
  viewLabels,
  children
}) => {
  const { goBack, backAction, viewHistory } = useUIStore();
  

  const handleBack = () => {
    if (backAction) {
        backAction();
    } else {
        goBack();
    }
  };

  const showHeader = currentView !== 'dashboard' || viewHistory.length > 0;

  return (
    <div className="flex h-screen w-full bg-bg text-primary font-sans selection:bg-brand-primary/30 overflow-hidden">
      
      <Sidebar 
        currentView={currentView} 
        setView={setView} 
        isMobileOpen={false}
        closeMobile={() => {}}
      />

      {/* Main content aligned with 210px sidebar width */}
      <main 
        className="flex-1 flex flex-col relative z-10 min-w-0 bg-bg ml-0 lg:ml-[210px]"
      >
        
        <AnimatePresence>
          {showHeader && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="sticky top-0 z-[100] w-full pt-8 px-10"
            >
              <Header 
                  openMobile={() => {}} 
                  title={viewLabels[currentView]} 
                  showBack={true}
                  onBack={handleBack}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`flex-1 overflow-y-auto custom-scrollbar p-10 pb-20 ${currentView === 'dashboard' ? 'pt-10' : 'pt-4'}`}>
           <div className="max-w-[1680px] mx-auto w-full h-full">
              <AnimatePresence mode="wait">
                 <motion.div
                    key={currentView}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full"
                 >
                    {children}
                 </motion.div>
              </AnimatePresence>
           </div>
        </div>

      </main>
    </div>
  );
};

export default DesktopLayout;
