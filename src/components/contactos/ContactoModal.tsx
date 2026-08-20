import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { Client, Reseller, ClientTag } from '../../types';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
// Added ChevronDown to imports
import { User, Phone, Briefcase, FileText, ChevronRight, Check, Send, Search, X, Calendar, UserPlus, Ban, Tag, ChevronDown } from 'lucide-react';
import { generateUUID } from '../../utils/uuid';
import { getLocalDateISO } from '../../utils/contactosUtils';

// --- SUB-COMPONENT: RESELLER SEARCH MODAL ---
interface ResellerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  resellers: Reseller[];
  onSelect: (reseller: Reseller | null) => void;
}

const ResellerSearchModal: React.FC<ResellerSearchModalProps> = ({ isOpen, onClose, resellers, onSelect }) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search) return resellers;
    const q = search.toLowerCase();
    return resellers.filter(r => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
  }, [resellers, search]);

  useEffect(() => { if (isOpen) setSearch(''); }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Asignar Socio">
      <div className="flex flex-col h-[50vh] md:h-[350px] pt-1">
        <div className="relative mb-3 shrink-0">
           <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
           <input 
             value={search} onChange={(e) => setSearch(e.target.value)}
             placeholder="Buscar socio..."
             className="w-full bg-surface-sunken border border-white/10 rounded-sm pl-10 pr-10 h-10 lg:h-11 text-xs text-white outline-none focus:border-brand-primary/50 transition-all placeholder:text-zinc-600 font-medium"
             autoFocus
           />
           {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"><X size={14} /></button>}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
           <button onClick={() => { onSelect(null); onClose(); }} className="w-full flex items-center gap-3 p-3 rounded-sm bg-surface-zinc/60 border border-white/5 hover:bg-surface-4 transition-all group text-left">
              <div className="w-8 h-8 rounded-xs bg-white/5 flex items-center justify-center text-zinc-400 border border-white/5 shrink-0"><User size={14} /></div>
              <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-zinc-200">Cliente Directo</p></div>
              <Check size={14} className="text-zinc-700" />
           </button>
           {filtered.map(r => (
              <button key={r.id} onClick={() => { onSelect(r); onClose(); }} className="w-full flex items-center gap-3 p-3 rounded-sm bg-surface-zinc/60 border border-white/5 hover:bg-surface-4 hover:border-brand-primary/30 transition-all group text-left">
                 <div className="w-8 h-8 rounded-xs flex items-center justify-center text-white font-semibold text-[10px] shadow-lg shrink-0" style={{ backgroundColor: r.color }}>{r.name.substring(0,2).toUpperCase()}</div>
                 <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">{r.name}</p>
                    <p className="text-[9px] text-zinc-500 font-mono">{r.code}</p>
                 </div>
                 <ChevronRight size={14} className="text-zinc-600" />
              </button>
           ))}
        </div>
      </div>
    </Modal>
  );
};

// --- MAIN COMPONENT ---

interface ContactoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (client: Client) => void;
  initialData?: Client | null;
}

const ContactoModal: React.FC<ContactoModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const { resellers } = useData();
  const { showToast } = useToast();
  const [isResellerSearchOpen, setIsResellerSearchOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '', name: '', phone: '', telegram: '', 
    registrationDate: getLocalDateISO(), activeServices: 0, 
    notes: '', resellerId: '', tags: [] as ClientTag[], isBlocked: false
  });

  const selectedReseller = resellers.find(r => r.id === formData.resellerId);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ id: initialData.id, name: initialData.originalName || initialData.name, phone: initialData.originalPhone || initialData.phone || '', telegram: initialData.telegram || '', registrationDate: initialData.registrationDate, activeServices: initialData.activeServices, notes: initialData.notes || '', resellerId: initialData.resellerId || '', tags: initialData.tags || [], isBlocked: initialData.isBlocked || false });
      } else {
        setFormData({ id: generateUUID(), name: '', phone: '', telegram: '', registrationDate: getLocalDateISO(), activeServices: 0, notes: '', resellerId: '', tags: ['Nuevo'], isBlocked: false });
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) { showToast('Nombre obligatorio', 'error'); return; }
    let finalClientData: Client = { ...formData, name: formData.name.trim(), phone: formData.phone.trim(), telegram: formData.telegram.trim(), notes: formData.notes.trim() };
    if (formData.resellerId) {
      const reseller = resellers.find(r => r.id === formData.resellerId);
      if (reseller) { finalClientData = { ...finalClientData, originalName: formData.name.trim(), originalPhone: formData.phone.trim(), name: `${reseller.code}${formData.name.trim()}`, phone: formData.phone.trim() || reseller.whatsapp }; }
    }
    onSubmit(finalClientData); onClose();
  };

  const styles = {
    label: "text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block ml-1",
    inputContainer: "relative flex items-center bg-surface-sunken border border-white/10 rounded-sm h-10 lg:h-11 transition-all focus-within:border-brand-primary/60",
    input: "w-full h-full bg-transparent text-xs text-white placeholder:text-zinc-600 px-4 outline-none font-medium",
    iconLeft: "pl-11",
    iconElement: "absolute left-4 text-zinc-500 pointer-events-none",
    textarea: "w-full bg-surface-sunken border border-white/10 rounded-sm p-4 text-xs text-white outline-none focus:border-brand-primary/60 font-medium resize-none",
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Detalles de Contacto' : 'Nuevo Contacto'}>
        <div className="flex flex-col gap-6 pt-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">Información de Perfil</h4>
                <div><label className={styles.label}>Nombre Completo</label><div className={styles.inputContainer}><User size={16} className={styles.iconElement} /><input name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej. Juan Pérez" className={`${styles.input} ${styles.iconLeft}`} required autoFocus /></div></div>
                <div className="grid grid-cols-2 gap-3">
                   <div><label className={styles.label}>WhatsApp</label><div className={styles.inputContainer}><Phone size={16} className={styles.iconElement} /><input name="phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="Número" className={`${styles.input} ${styles.iconLeft}`} /></div></div>
                   <div><label className={styles.label}>Telegram</label><div className={styles.inputContainer}><Send size={16} className={styles.iconElement} /><input name="telegram" value={formData.telegram} onChange={e => setFormData({...formData, telegram: e.target.value})} placeholder="@usuario" className={`${styles.input} ${styles.iconLeft}`} /></div></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div><label className={styles.label}>Revendedor</label><div onClick={() => setIsResellerSearchOpen(true)} className={`${styles.inputContainer} cursor-pointer group hover:border-brand-primary/60`}><Briefcase size={16} className={styles.iconElement} /><div className={`${styles.input} ${styles.iconLeft} flex items-center pr-8`}><span className={`truncate ${formData.resellerId ? "text-white" : "text-zinc-700"}`}>{selectedReseller ? selectedReseller.name : "Directo"}</span></div><ChevronDown size={14} className="absolute right-4 text-zinc-500" /></div></div>
                   <div><label className={styles.label}>Fecha Registro</label><div className={styles.inputContainer}><Calendar size={16} className={styles.iconElement} /><input type="date" name="registrationDate" value={formData.registrationDate} onChange={e => setFormData({...formData, registrationDate: e.target.value})} className={`${styles.input} ${styles.iconLeft} font-mono`} /></div></div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-zinc-600 text-[9px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">Estado y Notas</h4>
                <div className={`p-4 rounded-md border flex items-center justify-between transition-all ${formData.isBlocked ? 'bg-status-danger/10 border-status-danger/20' : 'bg-surface-zinc border-white/5'}`}><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-full flex items-center justify-center ${formData.isBlocked ? 'bg-status-danger text-white shadow-glow-sm' : 'bg-white/5 text-zinc-500'}`}><Ban size={16} /></div><div><h4 className={`text-xs font-semibold ${formData.isBlocked ? 'text-status-danger-soft' : 'text-zinc-300'}`}>{formData.isBlocked ? 'Bloqueado' : 'Acceso Libre'}</h4><p className="text-[9px] text-zinc-500 leading-tight">Evita ventas accidentales.</p></div></div><button type="button" onClick={() => setFormData(prev => ({ ...prev, isBlocked: !prev.isBlocked }))} className={`w-10 h-5.5 rounded-full relative transition-colors duration-300 border ${formData.isBlocked ? 'bg-status-danger border-status-danger' : 'bg-zinc-800 border-zinc-700'}`}><div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${formData.isBlocked ? 'translate-x-4' : ''}`} /></button></div>
                <div><label className={styles.label}>Notas Privadas</label><textarea name="notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={5} placeholder="Detalles extra del cliente..." className={styles.textarea} /></div>
              </div>
            </div>
            <div className="pt-4 border-t border-white/5 flex justify-end"><button type="submit" className="btn-primary px-12 h-11 lg:h-12 rounded-md text-xs font-semibold uppercase tracking-widest flex items-center gap-2"><Check size={18} strokeWidth={3} /> {initialData ? 'Actualizar' : 'Registrar'} Contacto</button></div>
          </form>
        </div>
      </Modal>
      <ResellerSearchModal isOpen={isResellerSearchOpen} onClose={() => setIsResellerSearchOpen(false)} resellers={resellers} onSelect={(r) => setFormData(prev => ({ ...prev, resellerId: r?.id || '' }))} />
    </>
  );
};

export default ContactoModal;