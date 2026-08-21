
import React from 'react';
import { motion } from 'framer-motion';
import AnimatedLogo from './AnimatedLogo';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = "Iniciando..." }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-bg text-primary font-sans overflow-hidden">
      
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 flex flex-col items-center justify-center space-y-8"
      >
        <div className="relative">
           <div className="relative w-20 h-20 flex items-center justify-center">
              <AnimatedLogo size={70} showFill={false} delay={0} />
           </div>
        </div>

        <div className="flex flex-col items-center gap-4">
           <div className="flex flex-col items-center gap-3">
               <div className="w-8 h-8 border-2 border-[rgb(var(--fg-rgb))]/10 border-t-[#6A2CFF] rounded-full animate-spin" />
               <span className="text-[10px] font-semibold text-disabled uppercase tracking-widest animate-pulse">
                 {message}
               </span>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;
