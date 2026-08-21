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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center p-4 h-[100dvh]" style={{ zIndex: zIndex || 10050 }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="bg-surface-1 w-full max-w-md rounded-lg border border-border-subtle shadow-modal overflow-hidden flex flex-col max-h-[75dvh]" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-[rgb(var(--fg-rgb))]/5 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="text-primary font-bold text-center ml-1">{title}</h3>
            <button onClick={onClose} className="p-1 rounded-full bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 active:scale-95 transition-transform"><X size={16} className="text-muted" /></button>
          </div>
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-disabled" />
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="w-full bg-surface-sunken rounded-md pl-11 pr-10 h-[52px] text-sm text-primary outline-none border border-[rgb(var(--fg-rgb))]/10 focus:border-brand-primary/50 transition-all font-medium" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
          {filtered.map((item, idx) => (<div key={idx} onClick={() => { haptic('nav'); onSelect(item); onClose(); }} className="cursor-pointer active:scale-[0.98] transition-transform">{renderItem(item)}</div>))}
          {filtered.length === 0 && <p className="text-center text-disabled text-sm py-8">No hay resultados.</p>}
        </div>
      </motion.div>
    </div>, document.body
  );
};

export default SearchListModal;
