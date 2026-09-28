import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Check, X } from 'lucide-react';
import { useHaptic } from '../../hooks/useHaptic';
import { ItemConfigPanelProps } from './saleModal.types';
import ItemConfigForm from './ItemConfigForm';

const ItemConfigPanel: React.FC<ItemConfigPanelProps> = (props) => {
  const haptic = useHaptic();

  if (!props.isOpen || typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" style={{ zIndex: (props.zIndex || 10020) - 1 }} onClick={props.onClose} />
      <div className="fixed inset-0 flex items-end lg:items-center justify-center p-0 lg:p-4 pointer-events-none" style={{ zIndex: props.zIndex || 10020 }}>
        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 32, mass: 0.8 }} className="pointer-events-auto w-full lg:max-w-lg bg-surface-1 rounded-t-xl lg:rounded-lg border-t border-border-subtle lg:border shadow-modal flex flex-col h-[90dvh] lg:h-auto lg:max-h-[85vh] overflow-hidden">

          {/* ───────── HEADER ───────── */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 bg-surface-1">
            <div className="min-w-0">
              <h3 className="text-lg font-black text-text-primary leading-tight">{props.isEditing ? 'Editar servicio' : 'Configurar servicio'}</h3>
              <p className="text-[11px] text-text-disabled font-medium">Define los detalles de la venta</p>
            </div>
            <button onClick={() => { haptic('nav'); props.onClose(); }} aria-label="Cerrar" className="w-9 h-9 bg-surface-3 hover:bg-surface-4 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary transition-all active:scale-90 shrink-0"><X size={18} /></button>
          </div>

          {/* ───────── CONTENIDO ───────── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 pt-2">
            <ItemConfigForm {...props} />
          </div>

          {/* ───────── FOOTER ───────── */}
          <div className="px-6 py-5 bg-surface-1 border-t border-[rgb(var(--fg-rgb))]/5 shrink-0 flex gap-3">
            <button onClick={props.onClose} className="flex-1 h-[52px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-4 text-text-secondary hover:text-text-primary rounded-md font-semibold text-sm transition-all active:scale-[0.98]">
              Cancelar
            </button>
            <button onClick={() => { haptic('nav'); props.handleAddItem(); }} className="btn-primary flex-[2] h-[52px] rounded-md text-sm flex items-center justify-center gap-2">
              {props.isEditing ? <Check size={18} strokeWidth={3} /> : <ShoppingCart size={18} />}
              {props.isEditing ? 'Guardar cambios' : 'Agregar al carrito'}
            </button>
          </div>
        </motion.div>
      </div>
    </>, document.body
  );
};

export default ItemConfigPanel;
