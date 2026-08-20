
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ModalType = 
  | 'SALE_FORM' 
  | 'CLIENT_FORM' 
  | 'EXPENSE_FORM' 
  | 'RECEIPT' 
  | 'CONFIRMATION'
  | 'CUSTOM'; // Fallback para modales ad-hoc

interface ModalPayload {
  type: ModalType;
  props?: any;
  content?: ReactNode; // Para modales CUSTOM
  zIndex?: number;
}

interface ModalContextType {
  openModal: (type: ModalType, props?: any, content?: ReactNode) => void;
  closeModal: () => void;
  activeModal: ModalPayload | null;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeModal, setActiveModal] = useState<ModalPayload | null>(null);

  const openModal = (type: ModalType, props?: any, content?: ReactNode) => {
    setActiveModal({ type, props, content });
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  return (
    <ModalContext.Provider value={{ openModal, closeModal, activeModal }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within a ModalProvider');
  return context;
};
