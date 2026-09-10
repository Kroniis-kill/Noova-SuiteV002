import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Modal from '../ui/Modal';
import { Account, Service, ScreenProfile, ServiceType, Provider, Sale } from '../../types';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { 
  ChevronDown, Mail, Key, Calendar, Layers, Globe, Check, 
  Truck, Monitor, User, LayoutGrid, RefreshCw, Search, 
  X, ChevronRight, RotateCcw, Wand2, Hash, ShieldCheck, 
  MonitorPlay, UserCheck, Power, FileText
} from 'lucide-react';
import { generateUUID } from '../../utils/uuid';
import { addTime, getLocalDateISO } from '../../utils/contactosUtils';
import PasswordChangeNotifyModal from './PasswordChangeNotifyModal';
import { getDaysRemaining } from '../../utils/inventarioUtils';
import { motion, AnimatePresence } from 'framer-motion';

// --- SUB-COMPONENTES: MODALES DE BÚSQUEDA ---

interface SearchModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  items: T[];
  onSelect: (item: T) => void;
  title: string;
  placeholder: string;
  renderItem: (item: T) => React.ReactNode;
  filterFn: (item: T, query: string) => boolean;
}

function SearchListModal<T>({ isOpen, onClose, items, onSelect, title, placeholder, renderItem, filterFn }: SearchModalProps<T>) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search) return items;
    return items.filter(i => filterFn(i, search.toLowerCase()));
  }, [items, search, filterFn]);

  useEffect(() => { if (isOpen) setSearch(''); }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} zIndex={70000}>
      <div className="flex flex-col h-[60vh] md:h-[400px] pt-1">
        <div className="relative mb-4 shrink-0 px-1">
           <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-text-disabled" />
           <input 
             value={search} onChange={(e) => setSearch(e.target.value)}
             placeholder={placeholder}
             className="w-full bg-surface-zinc rounded-md pl-12 pr-10 h-[52px] text-sm text-text-primary outline-none border border-[rgb(var(--fg-rgb))]/5 focus:border-brand-primary/40 transition-all placeholder:text-text-faint font-medium"
             autoFocus
           />
           {search && <button onClick={() => setSearch('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-text-disabled hover:text-text-primary p-1"><X size={16} /></button>}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
           {filtered.map((item, idx) => (
              <div key={idx} onClick={() => { onSelect(item); onClose(); }} className="cursor-pointer active:scale-[0.98] transition-transform">
                 {renderItem(item)}
              </div>
           ))}
        </div>
      </div>
    </Modal>
  );
}

// --- COMPONENTE PRINCIPAL ---

interface CuentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (accountData: Partial<Account>) => void;
  initialData?: Account | null;
  serviceId: string | null;
  services: Service[];
}

const CuentaModal: React.FC<CuentaModalProps> = ({ isOpen, onClose, onSubmit, initialData, serviceId, services }) => {
  const { providers, sales, clients } = useData();
  const { showToast } = useToast();

  const [isServiceSearchOpen, setIsServiceSearchOpen] = useState(false);
  const [isProviderSearchOpen, setIsProviderSearchOpen] = useState(false);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [affectedSales, setAffectedSales] = useState<Sale[]>([]);
  const [updatedAccountForNotify, setUpdatedAccountForNotify] = useState<Account | null>(null);

  const defaultFormData: Partial<Account> = {
    id: '', serviceId: '', email: '', password: '', country: 'Global',
    startDate: getLocalDateISO(), endDate: '', notes: '',
    status: 'activa', maxScreens: 1, plan: 'Premium', account_type: 'por_pantalla',
    providerId: '', usedScreens: 0, autoRenewal: false
  };

  const [formData, setFormData] = useState<Partial<Account>>(defaultFormData);
  const [months, setMonths] = useState('0');
  const [days, setDays] = useState('0');
  const [profiles, setProfiles] = useState<ScreenProfile[]>([]);
  
  const selectedService = services.find(s => s.id === formData.serviceId);
  const selectedProvider = providers.find(p => p.id === formData.providerId);
  const currentMode: ServiceType = selectedService?.type || (formData.account_type as ServiceType) || 'por_pantalla';

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...defaultFormData, ...initialData });
        setMonths('0'); setDays('0'); 
        if (initialData.profiles && Array.isArray(initialData.profiles) && initialData.profiles.length > 0) {
            setProfiles(initialData.profiles);
        } else {
            const screens = Number(initialData.maxScreens) || 1;
            setProfiles(Array(screens).fill(null).map((_, i) => ({ name: 'Disponible', pin: '' })));
        }
      } else {
         const defaultService = serviceId ? services.find(s => s.id === serviceId) : null; 
         const defaultScreens = defaultService ? defaultService.screens : 1;
         const defaultType = defaultService?.type || 'por_pantalla';
         setFormData({ ...defaultFormData, serviceId: defaultService?.id || '', maxScreens: defaultScreens, account_type: defaultType });
         setMonths('1'); setDays('0');
         setProfiles(Array(defaultScreens).fill(null).map((_, i) => ({ name: 'Disponible', pin: '' })));
      }
      setIsNotifyModalOpen(false);
    }
  }, [initialData, isOpen, serviceId, services]);

  useEffect(() => {
    if (!formData.startDate) return;
    const m = parseInt(months) || 0;
    const d = parseInt(days) || 0;
    if (m === 0 && d === 0 && initialData) return;
    const calculatedEnd = addTime(formData.startDate, m, d);
    if (calculatedEnd !== formData.endDate) setFormData(prev => ({ ...prev, endDate: calculatedEnd }));
  }, [formData.startDate, months, days, initialData]);

  const handleGeneratePassword = () => {
    const currentPass = formData.password || '';
    const match = currentPass.match(/^([^0-9]+)/);
    const prefix = match ? match[1] : (selectedService?.name?.split(' ')[0] || 'Noova');
    const newVal = prefix + Math.floor(1000 + Math.random() * 9000);
    setFormData(prev => ({ ...prev, password: newVal }));
    showToast('Clave sugerida aplicada', 'info');
  };

  const handleServiceSelect = (svc: Service) => {
    const screens = svc.type === 'cuenta_completa' ? 1 : svc.screens;
    setFormData(prev => ({ ...prev, serviceId: svc.id, maxScreens: screens, account_type: svc.type }));
    setProfiles(Array(screens).fill(null).map((_, i) => ({ name: 'Disponible', pin: '' })));
  };

  const handleProfileChange = (idx: number, field: keyof ScreenProfile, value: string) => {
    const newProfiles = [...profiles];
    if (newProfiles[idx]) { 
        newProfiles[idx] = { ...newProfiles[idx], [field]: value }; 
        setProfiles(newProfiles); 
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serviceId || !formData.email || !formData.password) { 
        showToast('Faltan datos obligatorios', 'error'); 
        return; 
    }
    let used = profiles.filter(p => p && p.name && p.name.trim().toLowerCase() !== 'disponible').length;
    const finalAccount: Account = { ...formData, usedScreens: used, profiles: profiles, account_type: currentMode } as Account;
    
    onSubmit(finalAccount);
    
    if (initialData && initialData.password !== formData.password) {
        const activeSales = sales.filter(s => s.accountId === initialData.id && getDaysRemaining(s.expiryDate) >= 0);
        if (activeSales.length > 0) { 
            setAffectedSales(activeSales); 
            setUpdatedAccountForNotify(finalAccount); 
            setIsNotifyModalOpen(true); 
            return; 
        }
    }
    
    showToast('Cuenta guardada', 'success'); 
    onClose();
  };

  const styles = {
    sectionLabel: "text-[9px] font-bold text-text-faint uppercase tracking-[0.1em] mb-2 pl-[2px] block",
    inputContainer: "relative flex items-center bg-surface-sunken rounded-md h-[46px] transition-all",
    input: "w-full h-full bg-transparent text-[13px] text-text-primary placeholder:text-text-faint px-3 outline-none border-none appearance-none font-semibold [color-scheme:dark] [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0",
    cardDark: "bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 rounded-xl p-[14px]",
    toggleBtn: "w-[38px] h-[22px] rounded-full relative transition-all duration-300 shrink-0",
  };

  const modalVariants = {
    hidden: { y: "100%", opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300 } },
    exit: { y: "100%", opacity: 0, transition: { duration: 0.2 } }
  };

  if (typeof document === 'undefined') return null;

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" />
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="fixed bottom-0 left-0 right-0 bg-surface-1 rounded-t-xl z-[9999] flex flex-col max-h-[90dvh] max-w-[400px] mx-auto md:bottom-6 md:rounded-xl border border-[rgb(var(--fg-rgb))]/5 overflow-hidden"
              >
                {/* Header */}
                <div className="px-5 pt-[18px] pb-[14px] flex items-center justify-between border-b border-[rgb(var(--fg-rgb))]/5 shrink-0">
                  <div className="min-w-0">
                    <h3 className="text-[17px] font-bold text-text-primary leading-tight">{initialData ? 'Editar cuenta' : 'Nueva cuenta'}</h3>
                    <p className="text-[9px] text-text-faint font-bold uppercase tracking-[0.15em] mt-1 truncate">{selectedService?.name || 'Agregar al inventario'}</p>
                  </div>
                  <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 text-text-muted hover:text-text-primary transition-all active:scale-90 shrink-0">
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto px-5 pt-4 pb-[18px] flex flex-col gap-[14px]">

                  {/* SERVICIO + PROVEEDOR */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { if (!initialData || !serviceId) setIsServiceSearchOpen(true); }}
                      className={`bg-surface-3 border rounded-xl p-[10px] flex items-center gap-2 text-left ${formData.serviceId ? 'border-[rgb(var(--fg-rgb))]/5' : 'border-dashed border-[rgb(var(--fg-rgb))]/[0.15]'} ${initialData && serviceId ? 'opacity-60' : ''}`}
                    >
                      <div className="w-[30px] h-[30px] rounded-lg bg-surface-sunken flex items-center justify-center shrink-0 text-text-faint">
                        <Layers size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[8px] text-text-faint uppercase font-bold">Servicio</div>
                        <div className={`text-[11px] font-bold truncate ${formData.serviceId ? 'text-text-primary' : 'text-text-faint'}`}>{selectedService?.name || 'Seleccionar...'}</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsProviderSearchOpen(true)}
                      className={`relative bg-surface-3 border rounded-xl p-[10px] flex items-center gap-2 text-left ${formData.providerId ? 'border-[rgb(var(--fg-rgb))]/5' : 'border-dashed border-[rgb(var(--fg-rgb))]/[0.15]'}`}
                    >
                      <div className="w-[30px] h-[30px] rounded-lg bg-surface-sunken flex items-center justify-center shrink-0 text-text-faint">
                        <Truck size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[8px] text-text-faint uppercase font-bold">Proveedor</div>
                        <div className={`text-[11px] font-bold truncate ${formData.providerId ? 'text-text-primary' : 'text-text-faint'}`}>{selectedProvider?.name || 'Seleccionar...'}</div>
                      </div>
                      {formData.providerId && (
                        <span onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, providerId: '' }); }} className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-surface-sunken flex items-center justify-center text-text-faint hover:text-text-primary">
                          <X size={10} />
                        </span>
                      )}
                    </button>
                  </div>

                  {/* CREDENCIALES MAESTRAS */}
                  <div className={styles.cardDark}>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 rounded-md h-10 px-3">
                        <Mail size={15} className="text-text-faint shrink-0" />
                        <input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="correo@ejemplo.com" className="w-full h-full bg-transparent text-[13px] text-text-primary placeholder:text-text-faint outline-none border-none font-medium" required />
                      </div>
                    </div>
                    <div className="h-px bg-[rgb(var(--fg-rgb))]/5 my-3" />
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 rounded-md h-10 px-3">
                        <Key size={15} className="text-text-faint shrink-0" />
                        <input value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="Contraseña" className="w-full h-full bg-transparent text-[13px] text-text-primary placeholder:text-text-faint outline-none border-none font-mono" required />
                        <button type="button" onClick={handleGeneratePassword} className="shrink-0 text-brand-primary-hi">
                          <RefreshCw size={15} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* PERFILES */}
                  <div>
                    <label className={styles.sectionLabel}>Perfiles ({profiles.length})</label>
                    <div className="flex flex-col gap-[6px]">
                      {profiles.map((prof, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 rounded-md h-[46px] pl-2 pr-2">
                          <div className="w-6 h-6 rounded-md bg-brand-primary/15 text-brand-primary-hi flex items-center justify-center text-[10px] font-bold shrink-0">
                            {idx + 1}
                          </div>
                          <input
                            value={prof.name}
                            onChange={e => handleProfileChange(idx, 'name', e.target.value)}
                            placeholder="Nombre del Perfil"
                            className="flex-1 min-w-0 h-full bg-transparent px-1 text-[12px] text-text-primary outline-none border-none font-medium placeholder:text-text-faint"
                          />
                          <div className="w-[72px] shrink-0 h-8 flex items-center bg-surface-sunken rounded-md">
                            <input
                              value={prof.pin}
                              onChange={e => handleProfileChange(idx, 'pin', e.target.value)}
                              placeholder="PIN"
                              className="w-full h-full bg-transparent px-2 text-center text-[11px] text-text-primary font-mono outline-none border-none appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder:text-text-faint"
                              inputMode="numeric"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RENOVACIÓN AUTOMÁTICA */}
                  <div className={`${styles.cardDark} flex items-center justify-between`}>
                    <div className="flex items-center gap-[10px]">
                      <div className="w-8 h-8 rounded-md bg-surface-sunken flex items-center justify-center text-brand-primary-hi shrink-0">
                        <RotateCcw size={16} className={formData.autoRenewal ? 'animate-spin-slow' : ''} />
                      </div>
                      <div>
                        <div className="text-[12px] font-bold text-text-primary leading-tight">Renovación automática</div>
                        <div className="text-[9px] text-text-faint mt-[1px]">Se extiende 1 mes al vencer</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, autoRenewal: !prev.autoRenewal }))}
                      className={`${styles.toggleBtn} ${formData.autoRenewal ? 'bg-brand-primary' : 'bg-surface-4'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md absolute top-[3px] transition-transform duration-300 ${formData.autoRenewal ? 'translate-x-[19px]' : 'translate-x-[3px]'}`} />
                    </button>
                  </div>

                  {/* VIGENCIA */}
                  <div>
                    <label className={styles.sectionLabel}>Vigencia</label>
                    <div className={`${styles.cardDark} flex flex-col gap-2`}>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={styles.inputContainer}>
                          <Globe size={15} className="absolute left-3 text-text-faint pointer-events-none" />
                          <input value={formData.country} onChange={e => setFormData({ ...formData, country: e.target.value })} placeholder="Global" className={`${styles.input} pl-8`} />
                        </div>
                        <div className={styles.inputContainer}>
                          <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className={`${styles.input} text-center`} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={styles.inputContainer}>
                          <span className="pl-3 text-[8px] font-bold text-text-faint uppercase shrink-0">Mes</span>
                          <input type="number" value={months} onChange={e => setMonths(e.target.value)} className={`${styles.input} text-center`} placeholder="0" />
                        </div>
                        <div className={styles.inputContainer}>
                          <span className="pl-3 text-[8px] font-bold text-text-faint uppercase shrink-0">Día</span>
                          <input type="number" value={days} onChange={e => setDays(e.target.value)} className={`${styles.input} text-center`} placeholder="0" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NOTAS INTERNAS */}
                  <div>
                    <label className={styles.sectionLabel}>Notas internas</label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Escribe detalles adicionales sobre esta cuenta..."
                      className="w-full bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 rounded-md p-[14px] text-[12px] text-text-muted outline-none placeholder:text-text-faint min-h-[90px] resize-none leading-[1.5]"
                    />
                  </div>

                  {/* BOTÓN FINAL */}
                  <button
                    type="submit"
                    className="w-full h-[46px] rounded-md bg-gradient-to-r from-brand-primary to-brand-accent text-text-primary font-bold text-[13px] flex items-center justify-center gap-[6px] active:scale-95 transition-all hover:brightness-110"
                  >
                    <Check size={16} strokeWidth={3} /> {initialData ? 'Guardar cambios' : 'Crear cuenta'}
                  </button>

                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* MODALES DE BÚSQUEDA REUTILIZADOS */}
      <SearchListModal<Service>
        isOpen={isServiceSearchOpen}
        onClose={() => setIsServiceSearchOpen(false)}
        title="Seleccionar Servicio"
        placeholder="Buscar..."
        items={services}
        onSelect={handleServiceSelect}
        filterFn={(s, q) => s.name.toLowerCase().includes(q)}
        renderItem={(s) => (
          <div className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 hover:border-brand-primary/40 transition-all text-left">
              <div className="w-11 h-11 rounded-md bg-surface-sunken flex items-center justify-center text-text-faint border border-[rgb(var(--fg-rgb))]/5 overflow-hidden shrink-0">
                {s.image_url ? <img src={s.image_url} className="w-full h-full object-cover" /> : <Layers size={22} />}
              </div>
              <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">{s.name}</p>
                  <p className="text-[9px] text-text-faint font-black uppercase tracking-widest">{s.type.replace('_', ' ')}</p>
              </div>
              <ChevronRight size={18} className="text-text-faint" />
          </div>
        )}
      />

      <SearchListModal<Provider>
        isOpen={isProviderSearchOpen}
        onClose={() => setIsProviderSearchOpen(false)}
        title="Seleccionar Proveedor"
        placeholder="Buscar..."
        items={providers}
        onSelect={(p) => setFormData(prev => ({ ...prev, providerId: p?.id || '' }))}
        filterFn={(p, q) => p.name.toLowerCase().includes(q)}
        renderItem={(p) => (
          <div className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 hover:border-brand-primary/40 transition-all text-left">
              <div className="w-11 h-11 rounded-md flex items-center justify-center text-text-primary font-semibold text-xs shrink-0" style={{ backgroundColor: p.color }}>
                {p.name.substring(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">{p.name}</p>
                  <p className="text-[10px] text-text-faint font-mono">{p.whatsapp}</p>
              </div>
              <ChevronRight size={18} className="text-text-faint" />
          </div>
        )}
      />
      
      {updatedAccountForNotify && (
          <PasswordChangeNotifyModal 
             isOpen={isNotifyModalOpen}
             onClose={() => { setIsNotifyModalOpen(false); onClose(); }}
             affectedSales={affectedSales}
             account={updatedAccountForNotify}
             clients={clients}
          />
      )}
    </>
  );
};

export default CuentaModal;
