
import React from 'react';
import { isMobile } from '../../utils/device';
import { motion, AnimatePresence } from 'framer-motion';

// Solo importamos las versiones base (Lite)
import DashboardMobile from '../../modules/mobile/dashboard/DashboardMobile';
import DashboardDesktop from '../../modules/desktop/dashboard/DashboardDesktop';

import { ViewState } from '../../types';

interface DashboardProps {
  setView: (view: ViewState) => void;
}

const DashboardPage: React.FC<DashboardProps> = ({ setView }) => {
  const isMob = isMobile();

  return (
    <div className="relative w-full h-full min-h-screen bg-bg">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full h-full"
      >
        {isMob ? (
          <DashboardMobile setView={setView} />
        ) : (
          <DashboardDesktop />
        )}
      </motion.div>
    </div>
  );
};

export default DashboardPage;
