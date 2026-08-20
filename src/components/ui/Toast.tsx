
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X, Copy, BellRing } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
  onClick?: () => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(({ id, message, type, onClose, onClick }, ref) => {
  
  const config = {
    success: {
      icon: <CheckCircle2 size={20} className="text-status-success" />,
      bgIcon: 'bg-green-500/10', 
      border: 'border-green-500/20',
      textTitle: 'text-status-success'
    },
    error: {
      icon: <AlertTriangle size={20} className="text-status-danger" />,
      bgIcon: 'bg-red-500/10',
      border: 'border-red-500/20',
      textTitle: 'text-red-500'
    },
    info: {
      icon: <BellRing size={20} className="text-brand-primary" />,
      bgIcon: 'bg-brand-primary/10',
      border: 'border-brand-primary/20',
      textTitle: 'text-white'
    }
  };

  const isCopy = message.toLowerCase().includes('copia') || message.toLowerCase().includes('copy');
  const style = config[type];
  const IconToRender = isCopy ? <Copy size={18} className="text-brand-primary" /> : style.icon;

  const handleClick = () => {
    if (onClick) {
      onClick();
      onClose(id);
    }
  };

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: -100, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -100, scale: 0.95, transition: { duration: 0.3 } }}
      transition={{ type: "spring", stiffness: 350, damping: 25, mass: 0.8 }}
      onClick={handleClick}
      className={`
        pointer-events-auto relative w-full max-w-md
        bg-surface-3/95 backdrop-blur-2xl
        border border-white/10
        rounded-xl shadow-[0_30px_60px_-12px_rgba(0,0,0,0.5)]
        flex items-center gap-4 p-4 pr-10
        z-[11000]
        ${onClick ? 'cursor-pointer hover:bg-surface-4/95 active:scale-[0.98] transition-all' : ''}
      `}
    >
      {/* Icon Area */}
      <div className={`w-11 h-11 rounded-md flex items-center justify-center shrink-0 border border-white/5 ${style.bgIcon}`}>
        {IconToRender}
      </div>

      {/* Content */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className={`text-[11px] font-extrabold leading-tight mb-0.5 uppercase tracking-wider ${style.textTitle}`}>
          {type === 'success' ? (isCopy ? 'Portapapeles' : 'Confirmado') : type === 'error' ? 'Alerta' : 'Notificación'}
        </span>
        <span className="text-[13px] font-medium text-zinc-200 leading-snug">
          {message}
        </span>
      </div>

      {/* Close Button */}
      <button 
        onClick={() => onClose(id)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/5 text-zinc-600 transition-colors"
      >
        <X size={14} strokeWidth={3} />
      </button>

      {/* Sutil inner ring */}
      <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5 pointer-events-none" />
    </motion.div>
  );
});

Toast.displayName = 'Toast';

export default Toast;
