
import React, { createContext, useContext, useState, useCallback } from 'react';

interface AlertOptions {
  title: string;
  message: string;
  type?: 'error' | 'success' | 'info' | 'warning';
  onOk?: () => void;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  closeAlert: () => void;
  isOpen: boolean;
  alertData: AlertOptions | null;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [alertData, setAlertData] = useState<AlertOptions | null>(null);

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertData(options);
    setIsOpen(true);
  }, []);

  const closeAlert = useCallback(() => {
    setIsOpen(false);
    if (alertData?.onOk) {
      alertData.onOk();
    }
    // Small delay to clear data for animation purposes
    setTimeout(() => setAlertData(null), 300);
  }, [alertData]);

  return (
    <AlertContext.Provider value={{ showAlert, closeAlert, isOpen, alertData }}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};
