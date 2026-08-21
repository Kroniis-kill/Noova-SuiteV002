import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useHaptic } from '../../hooks/useHaptic';

interface SearchListModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  onSelect: (item: any) => void;
  title: string;
  renderItem: (item: any) => React.ReactNode;
  filterFn: (item: any, search: string) => boolean;
  zIndex?: number;
}

const SearchListModal: React.FC<SearchListModalProps> = ({ isOpen, onClose, items, onSelect, title, renderItem, filterFn, zIndex }) => {
  const [search, setSearch] = useState('');
  const haptic = useHaptic();
  const filtered = useMemo(() => items.filter(i => filterFn(i, search.toLowerCase())), [items, search, filterFn]);
  useEffect(() => { if (isOpen) setSearch(''); }, [isOpen]);
  if (!isOpen || typeof document === 'undefined' || !document.body) return null;
  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end lg:items-center justify-center h-[100dvh]" style={{ zIndex: zIndex || 10050 }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.98, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 20 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="bg-surface-1 w-full lg:max-w-md rounded-t-xl lg:rounded-xl lg:mx-6 border-t lg:border border-border-subtle shadow-modal overflow-hidden flex flex-col max-h-[85dvh] lg:max-h-[75dvh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between shrink-0 bg-surface-1 border-b border-hairline px-[var(--mobile-side-pad)] lg:px-6 py-5 lg:py-4">
          <h3 className="text-lg lg:text-sm lg:uppercase lg:tracking-eyebrow font-extrabold text-text-primary">{title}</h3>
          <button onClick={onClose} aria-label="Cerrar" className="w-9 h-9 flex items-center justify-center rounded-pill bg-surface-3 hover:bg-surface-4 text-text-muted hover:text-text-primary transition-all duration-150 ease-out-soft active:scale-90"><X size={18} /></button>
        </div>
        <div className="px-[var(--mobile-side-pad)] lg:px-6 pt-4">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled" />
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="w-full bg-surface-sunken rounded-md pl-11 pr-10 h-[52px] text-sm text-text-primary outline-none border border-border-subtle focus:border-brand-primary/50 transition-all font-medium" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-[var(--mobile-side-pad)] lg:p-6 space-y-2">
          {filtered.map((item, idx) => (<div key={idx} onClick={() => { haptic('nav'); onSelect(item); onClose(); }} className="cursor-pointer active:scale-[0.98] transition-transform">{renderItem(item)}</div>))}
          {filtered.length === 0 && <p className="text-center text-text-disabled text-sm py-8">No hay resultados.</p>}
        </div>
      </motion.div>
    </div>, document.body
  );
};

export default SearchListModal;
