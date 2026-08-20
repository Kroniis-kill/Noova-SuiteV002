
import React from 'react';
import { useModal } from '../../context/ModalContext';
import { AnimatePresence } from 'framer-motion';

// Import Global Modals here to avoid circular deps in components
import SaleModal from '../sales/SaleModal';
import ContactoModal from '../contactos/ContactoModal';
import ExpenseModal from '../accounting/ExpenseModal';
import ReceiptModal from '../sales/ReceiptModal';
import Modal from './Modal';

const GlobalModalLayer: React.FC = () => {
  const { activeModal, closeModal } = useModal();

  if (!activeModal) return null;

  return (
    <AnimatePresence>
      {activeModal.type === 'SALE_FORM' && (
        <SaleModal 
          isOpen={true} 
          onClose={closeModal} 
          initialData={activeModal.props?.initialData} 
          zIndex={20000}
        />
      )}

      {activeModal.type === 'CLIENT_FORM' && (
        <ContactoModal 
          isOpen={true} 
          onClose={closeModal} 
          onSubmit={activeModal.props?.onSubmit}
          initialData={activeModal.props?.initialData}
        />
      )}

      {activeModal.type === 'EXPENSE_FORM' && (
        <ExpenseModal 
          isOpen={true} 
          onClose={closeModal}
        />
      )}

      {activeModal.type === 'RECEIPT' && (
        <ReceiptModal 
          isOpen={true} 
          onClose={closeModal}
          sales={activeModal.props?.sales}
          client={activeModal.props?.client}
          zIndex={20000}
        />
      )}

      {activeModal.type === 'CUSTOM' && activeModal.content}

      {activeModal.type === 'CONFIRMATION' && (
         <Modal isOpen={true} onClose={closeModal} title={activeModal.props?.title || 'Confirmar'}>
            <div className="space-y-4 pt-2">
                <p className="text-zinc-400 text-sm">{activeModal.props?.message}</p>
                <div className="flex gap-3">
                    <button onClick={closeModal} className="flex-1 py-3 bg-white/5 rounded-md text-zinc-400 text-xs font-semibold">Cancelar</button>
                    <button 
                        onClick={() => { activeModal.props?.onConfirm(); closeModal(); }} 
                        className="flex-1 py-3 bg-red-500 text-white text-xs font-semibold shadow-glow"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
         </Modal>
      )}
    </AnimatePresence>
  );
};

export default GlobalModalLayer;
