
import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { Bell } from 'lucide-react';
import { shouldPrompt, requestSystemPermission, markAsDismissed } from '../../utils/NotificationManager';
import { useToast } from '../../context/ToastContext';

const NotificationPermissionModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // Small delay to allow the app to load fully before showing the modal
    const timer = setTimeout(() => {
      if (shouldPrompt()) {
        setIsOpen(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    // Close modal immediately to show browser prompt clearly
    setIsOpen(false);
    
    const granted = await requestSystemPermission();
    
    if (granted) {
      showToast('🔔 Notificaciones activadas', 'success');
      // Here you would typically subscribe the user to your push service
    } else {
      // If they denied or closed the browser prompt
      markAsDismissed(); // Treat as dismissed to not nag
      showToast('Notificaciones no activadas', 'info');
    }
  };

  const handleDismiss = () => {
    markAsDismissed();
    setIsOpen(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleDismiss} title="">
       <div className="flex flex-col items-center text-center pt-2 pb-2">
          
          {/* Icon */}
          <div className="relative mb-6">
             <div className="absolute inset-0 bg-brand-primary/30 blur-[30px] rounded-full" />
             <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-status-info to-brand-primary-hi flex items-center justify-center shadow-glow border border-[rgb(var(--fg-rgb))]/10">
                <Bell size={40} className="text-text-primary fill-white/20" />
             </div>
             <div className="absolute -top-2 -right-2 w-8 h-8 bg-status-danger rounded-full border-[4px] border-surface-zinc flex items-center justify-center text-white font-semibold text-xs">
                1
             </div>
          </div>

          <h3 className="text-2xl font-bold text-text-primary mb-3 tracking-tight">
             Activar Notificaciones
          </h3>
          
          <p className="text-text-muted text-sm leading-relaxed mb-8 max-w-[280px]">
             Mantente al día con recordatorios de vencimiento, alertas de pago y novedades importantes de tu negocio.
          </p>

          <div className="flex flex-col gap-3 w-full">
             <button 
               onClick={handleAllow}
               className="w-full h-[48px] rounded-md bg-gradient-to-r from-status-info to-brand-primary-hi text-white font-bold text-[13px] shadow-glow hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
             >
                Activar Ahora
             </button>
             
             <button 
               onClick={handleDismiss}
               className="w-full h-[48px] rounded-md bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/10 text-text-muted font-bold text-[13px] hover:text-text-primary hover:bg-[rgb(var(--fg-rgb))]/10 transition-all"
             >
                Quizás más tarde
             </button>
          </div>
       </div>
    </Modal>
  );
};

export default NotificationPermissionModal;
