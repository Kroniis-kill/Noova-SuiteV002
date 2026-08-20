import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { useAlert } from '../../context/AlertContext';

const CustomAlert: React.FC = () => {
  const { isOpen, closeAlert, alertData } = useAlert();

  if (!alertData) return null;

  const getIcon = () => {
    switch (alertData.type) {
      case 'error': return <XCircle size={24} className="text-status-danger" />;
      case 'success': return <CheckCircle2 size={24} className="text-status-success" />;
      case 'warning': return <AlertTriangle size={24} className="text-status-warning" />;
      default: return <Info size={24} className="text-brand-primary" />;
    }
  };

  const getTitleColor = () => {
    switch (alertData.type) {
      case 'error': return 'text-red-500';
      case 'success': return 'text-status-success';
      case 'warning': return 'text-status-warning';
      default: return 'text-white';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay solo en móvil, en desktop es un aviso lateral libre */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/10 backdrop-blur-[2px] z-[100000] lg:hidden"
            onClick={closeAlert}
          />
          
          {/* Contenedor: En móvil arriba centrado, en Desktop abajo a la derecha */}
          <div className="fixed inset-x-0 top-0 flex justify-center z-[100001] pointer-events-none p-4 mt-safe lg:top-auto lg:bottom-6 lg:right-6 lg:left-auto lg:inset-x-auto lg:p-0">
            <motion.div
              initial={{ opacity: 0, x: 100, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="pointer-events-auto w-full max-w-md bg-surface-3/95 backdrop-blur-2xl border border-white/10 rounded-xl p-6 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden"
            >
              <div className="relative z-10 flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-2.5 bg-white/5 rounded-2xl border border-white/5 shadow-inner shrink-0">
                    {getIcon()}
                  </div>
                  <h3 className={`text-lg font-bold tracking-tight leading-tight ${getTitleColor()}`}>
                    {alertData.title}
                  </h3>
                </div>
                
                <p className="text-sm text-zinc-300 mb-6 leading-relaxed whitespace-pre-wrap pl-1">
                  {alertData.message}
                </p>

                <div className="flex justify-end">
                  <button
                    onClick={closeAlert}
                    className="px-8 py-3 bg-brand-primary hover:bg-brand-primary-hi text-white font-semibold text-xs rounded-full transition-all active:scale-95 shadow-lg shadow-brand-primary/20"
                  >
                    Entendido
                  </button>
                </div>
              </div>
              
              {/* Decoración lateral para Desktop */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] rounded-full -mr-16 -mt-16 pointer-events-none hidden lg:block" />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CustomAlert;