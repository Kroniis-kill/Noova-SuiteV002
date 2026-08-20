
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { AppLauncher } from '@capacitor/app-launcher';
import { MessageCircle, Briefcase, Check, Zap, Repeat } from 'lucide-react';
import { motion } from 'framer-motion';

export type WhatsAppType = 'personal' | 'business';

interface WhatsAppRequest {
  phone: string;
  message: string;
}

const WhatsAppSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [request, setRequest] = useState<WhatsAppRequest | null>(null);
  const [selectedApp, setSelectedApp] = useState<WhatsAppType>('personal');

  useEffect(() => {
    const handleOpenSelector = (e: CustomEvent<WhatsAppRequest>) => {
      setRequest(e.detail);
      setIsOpen(true);
      // Default selection based on what might be common, or stick to personal
      setSelectedApp('personal');
    };

    window.addEventListener('open-whatsapp-selector' as any, handleOpenSelector);
    return () => {
      window.removeEventListener('open-whatsapp-selector' as any, handleOpenSelector);
    };
  }, []);

  const executeOpen = async (app: WhatsAppType) => {
    if (!request) return;
    
    const scheme = app === 'personal' ? 'whatsapp://' : 'whatsapp-business://';
    // Clean phone number (remove + or spaces if any, though existing util usually handles this)
    const phone = request.phone.replace(/[\s+]/g, '');
    const url = `${scheme}send?phone=${phone}&text=${request.message}`;

    try {
      await AppLauncher.openUrl({ url });
    } catch (error) {
      console.error("Error launching WhatsApp:", error);
    }
    setIsOpen(false);
  };

  const handleJustOnce = () => {
    executeOpen(selectedApp);
  };

  const handleAlways = () => {
    localStorage.setItem('noova_wa_pref', selectedApp);
    executeOpen(selectedApp);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Enviar Mensaje" zIndex={99999}>
      <div className="pt-2 pb-2">
        <p className="text-zinc-400 text-sm mb-6 text-center">
          ¿Qué aplicación deseas usar?
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Personal Option */}
          <button
            onClick={() => setSelectedApp('personal')}
            className={`relative p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all duration-200 ${
              selectedApp === 'personal'
                ? 'bg-brand-whatsapp/10 border-brand-whatsapp ring-1 ring-brand-whatsapp/50'
                : 'bg-surface-zinc border-white/5 opacity-60 hover:opacity-100'
            }`}
          >
            {selectedApp === 'personal' && (
              <div className="absolute top-3 right-3 w-5 h-5 bg-brand-whatsapp rounded-full flex items-center justify-center text-black">
                <Check size={12} strokeWidth={3} />
              </div>
            )}
            <div className="w-14 h-14 rounded-full bg-brand-whatsapp/20 flex items-center justify-center text-brand-whatsapp">
              <MessageCircle size={28} />
            </div>
            <span className={`text-xs font-semibold uppercase tracking-wide ${selectedApp === 'personal' ? 'text-white' : 'text-zinc-500'}`}>
              WhatsApp
            </span>
          </button>

          {/* Business Option */}
          <button
            onClick={() => setSelectedApp('business')}
            className={`relative p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all duration-200 ${
              selectedApp === 'business'
                ? 'bg-brand-whatsapp/10 border-brand-whatsapp ring-1 ring-brand-whatsapp/50'
                : 'bg-surface-zinc border-white/5 opacity-60 hover:opacity-100'
            }`}
          >
            {selectedApp === 'business' && (
              <div className="absolute top-3 right-3 w-5 h-5 bg-brand-whatsapp rounded-full flex items-center justify-center text-black">
                <Check size={12} strokeWidth={3} />
              </div>
            )}
            <div className="w-14 h-14 rounded-full bg-brand-whatsapp/20 flex items-center justify-center text-brand-whatsapp">
              <Briefcase size={28} />
            </div>
            <span className={`text-xs font-semibold uppercase tracking-wide ${selectedApp === 'business' ? 'text-white' : 'text-zinc-500'}`}>
              Business
            </span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleJustOnce}
            className="h-[50px] rounded-md bg-surface-3 border border-white/10 hover:bg-white/5 text-zinc-300 font-semibold text-xs transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Zap size={16} className="text-zinc-500" /> Solo una vez
          </button>
          
          <button
            onClick={handleAlways}
            className="h-[50px] rounded-md bg-gradient-to-r from-brand-primary to-brand-accent text-white font-semibold text-xs shadow-glow transition-all flex items-center justify-center gap-2 active:scale-95 hover:brightness-110"
          >
            <Repeat size={16} /> Siempre
          </button>
        </div>
        
        <p className="text-[10px] text-zinc-600 text-center mt-4">
          Puedes cambiar esto después en Configuración.
        </p>
      </div>
    </Modal>
  );
};

export default WhatsAppSelector;
