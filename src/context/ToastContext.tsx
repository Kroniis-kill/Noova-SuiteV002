import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast, { ToastType } from '../components/ui/Toast';
import { useAlert } from './AlertContext';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClick?: () => void;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType, options?: { duration?: number, onClick?: () => void }) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Puente imperativo: permite mostrar un toast desde código que vive fuera
// del árbol de React (como el manejador global de errores de react-query
// en queryClient.ts). No reemplaza al hook useToast() — sigue siendo la
// forma normal de usar toasts dentro de componentes.
let toastBridge: ToastContextType['showToast'] | null = null;
export const showGlobalToast: ToastContextType['showToast'] = (...args) => {
  toastBridge?.(...args);
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const { showAlert } = useAlert();

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', options?: { duration?: number, onClick?: () => void }) => {
    const id = Date.now().toString() + Math.random().toString();
    const duration = options?.duration || 3000;
    
    setToasts((prev) => [...prev, { id, message, type, onClick: options?.onClick }]);
    
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  // Mantiene el puente apuntando siempre a la instancia viva más reciente.
  useEffect(() => {
    toastBridge = showToast;
    return () => { if (toastBridge === showToast) toastBridge = null; };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Contenedor en la parte superior con z-index superior a modales */}
      <div className="fixed top-0 left-0 right-0 z-[99999] flex flex-col items-center pointer-events-none px-4 pt-safe mt-4 space-y-3">
        <AnimatePresence mode='popLayout'>
          {toasts.map((toast) => (
            <Toast 
              key={toast.id}
              id={toast.id}
              message={toast.message}
              type={toast.type}
              onClick={toast.onClick}
              onClose={removeToast}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};