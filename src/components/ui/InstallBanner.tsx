import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, X, Smartphone, Share } from 'lucide-react';

const InstallBanner: React.FC = () => {
  const { isInstallable, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const isIPhone = /iPhone|iPad|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS/.test(ua);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    if (isIPhone && isSafari && !isStandalone) {
      setIsIOS(true);
    }
  }, []);

  // Show if it's Android (Chrome installable) OR iOS (Safari instructions)
  const shouldShow = (isInstallable || isIOS) && !isDismissed;

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-[80px] left-4 right-4 z-40 md:hidden"
      >
        <div className="bg-surface-zinc/95 backdrop-blur-xl border border-[rgb(var(--fg-rgb))]/10 rounded-xl p-4 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.9)] relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-[40px] rounded-full pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-md bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center shadow-lg shrink-0 overflow-hidden">
               <img src="/logo.svg" className="w-8 h-8" alt="Logo Noova" />
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-text-primary font-bold text-[15px] leading-tight">Instala Noova Suite</h4>
              <p className="text-text-muted text-[11px] leading-snug mt-0.5">
                {isIOS 
                  ? "Acceso directo desde tu pantalla de inicio." 
                  : "Experiencia fluida y rápida sin navegador."}
              </p>
            </div>

            <button 
              onClick={() => setIsDismissed(true)}
              className="p-2 text-text-faint hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-4">
            {isIOS ? (
              <div className="bg-[rgb(var(--fg-rgb))]/5 rounded-xl p-3 flex flex-col gap-2">
                 <div className="flex items-center gap-2 text-xs text-text-secondary font-medium">
                   <div className="w-6 h-6 rounded-md bg-[rgb(var(--fg-rgb))]/10 flex items-center justify-center"><Share size={14} className="text-status-info-soft" /></div>
                   <span>1. Toca el botón <strong>Compartir</strong> en Safari.</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs text-text-secondary font-medium">
                   <div className="w-6 h-6 rounded-md bg-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-primary">+</div>
                   <span>2. Selecciona <strong>Añadir a pantalla de inicio</strong>.</span>
                 </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={install}
                  className="flex-1 h-11 bg-white text-black rounded-md text-sm font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                >
                  <Download size={16} />
                  Instalar ahora
                </button>
                <button 
                  onClick={() => setIsDismissed(true)}
                  className="h-11 px-6 bg-[rgb(var(--fg-rgb))]/5 text-text-muted hover:text-text-primary rounded-md text-xs font-semibold border border-[rgb(var(--fg-rgb))]/5 active:scale-95 transition-all"
                >
                  Luego
                </button>
              </div>
            )}
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InstallBanner;