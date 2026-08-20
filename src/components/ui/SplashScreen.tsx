
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import AnimatedLogo from './AnimatedLogo';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    // Reducido a 2.5s para que se sienta más rápido
    const timer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <motion.div 
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-transparent overflow-hidden font-sans gpu-accelerated"
      initial={{ opacity: 1 }}
      exit={{ 
        opacity: 0, 
        scale: 1.05, 
        filter: 'blur(10px)',
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
        pointerEvents: 'none' // CRITICAL: Ensures clicks pass through during/after exit
      }}
    >
      <div className="relative">
          {/* Logo Animation */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            className="relative z-10 gpu-accelerated"
          >
            <AnimatedLogo size={120} delay={0.1} showFill={false} />
          </motion.div>
      </div>

      <motion.div className="mt-10 text-center relative z-10">
        <div className="overflow-hidden h-14 flex items-center justify-center">
            <motion.h1 
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 20 }}
                className="text-4xl font-bold tracking-[0.2em] text-white"
            >
                NOOVA
            </motion.h1>
        </div>
        
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 0.5 }}
           transition={{ delay: 0.8, duration: 0.5 }}
           className="h-[1px] w-24 bg-white/50 mx-auto mt-2 mb-2"
        />

        <motion.p
           initial={{ opacity: 0 }}
           animate={{ opacity: 0.6 }}
           transition={{ delay: 0.9 }}
           className="text-[10px] text-white font-medium uppercase tracking-[0.4em]"
        >
           Suite Manager
        </motion.p>
      </motion.div>

    </motion.div>
  );
};

export default SplashScreen;
