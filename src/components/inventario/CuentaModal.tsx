import React, { useState, useEffect, useMemo } from 'react';
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
           <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500" />
           <input 
             value={search} onChange={(e) => setSearch(e.target.value)}
             placeholder={placeholder}
             className="w-full bg-surface-sunken rounded-lg pl-12 pr-10 h-12 text-sm text-white outline-none border border-white/10 focus:border-brand-primary/60 transition-all placeholder:text-zinc-700 font-medium"
             autoFocus
           />
           {search && <button onClick={() => setSearch('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-1"><X size={16} /></button>}
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
    sectionLabel: "text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-3 block ml-1",
    inputContainer: "relative flex items-center bg-surface-zinc border border-white/5 rounded-md h-[52px] transition-all focus-within:border-primary/40",
    input: "w-full h-full bg-transparent text-sm text-white placeholder:text-zinc-700 px-4 outline-none font-medium",
    iconElement: "absolute left-4 text-zinc-600 pointer-events-none",
    cardDark: "bg-surface-sunken border border-white/[0.03] rounded-xl p-5 shadow-inner",
    toggleBtn: "w-12 h-6 rounded-full relative transition-all duration-300 p-1 flex items-center",
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Cuenta' : 'Nueva Cuenta'}>
        <form onSubmit={handleSubmit} className="space-y-6 pt-1">
          
          {/* SERVICIO */}
          <div className="space-y-1">
            <label className={styles.sectionLabel}>Servicio</label>
            <div 
                onClick={() => { if(!initialData || !serviceId) setIsServiceSearchOpen(true) }} 
                className={`${styles.inputContainer} cursor-pointer group hover:bg-surface-3 ${initialData && serviceId ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
                <Layers size={18} className={styles.iconElement} />
                <div className={`${styles.input} pl-12 flex items-center justify-between`}>
                    <span className={formData.serviceId ? "text-white font-bold" : "text-zinc-600"}>
                        {selectedService?.name || "Seleccionar..."}
                    </span>
                    <ChevronDown size={16} className="text-zinc-600" />
                </div>
            </div>
          </div>

          {/* PROVEEDOR */}
          <div className="space-y-1">
            <label className={styles.sectionLabel}>Proveedor</label>
            <div onClick={() => setIsProviderSearchOpen(true)} className={`${styles.inputContainer} cursor-pointer hover:bg-surface-3`}>
                <Truck size={18} className={styles.iconElement} />
                <div className={`${styles.input} pl-12 flex items-center justify-between pr-4`}>
                    <span className={formData.providerId ? "text-white font-bold" : "text-zinc-600"}>
                        {selectedProvider ? selectedProvider.name : "Seleccionar..."}
                    </span>
                    <div className="flex items-center gap-2">
                        {formData.providerId && <X size={16} className="text-zinc-600 hover:text-white" onClick={(e) => { e.stopPropagation(); setFormData({...formData, providerId: ''}); }} />}
                    </div>
                </div>
            </div>
          </div>

          {/* CREDENCIALES MAESTRAS */}
          <div className="space-y-3">
            <label className={styles.sectionLabel}>Credenciales Maestras</label>
            <div className={styles.inputContainer}>
                <Mail size={18} className={styles.iconElement} />
                <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="correo@ejemplo.com" className={`${styles.input} pl-12`} required />
            </div>
            <div className={styles.inputContainer}>
                <Key size={18} className={styles.iconElement} />
                <input value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Contraseña" className={`${styles.input} pl-12 font-mono`} required />
                <button type="button" onClick={handleGeneratePassword} className="absolute right-3 p-2 text-zinc-600 hover:text-white transition-colors">
                    <RefreshCw size={18} />
                </button>
            </div>
          </div>

          {/* PERFILES */}
          <div className="space-y-3">
            <label className={styles.sectionLabel}>Perfiles ({profiles.length})</label>
            <div className="space-y-2">
                {profiles.map((prof, idx) => (
                    <div key={idx} className="flex gap-2">
                        <div className="flex-1 flex items-center bg-surface-zinc border border-white/5 rounded-md h-[52px] overflow-hidden">
                            <div className="w-12 h-full flex items-center justify-center bg-black/20 border-r border-white/5 text-zinc-600 text-xs font-semibold font-mono">
                                {idx + 1}
                            </div>
                            <input 
                                value={prof.name} 
                                onChange={e => handleProfileChange(idx, 'name', e.target.value)} 
                                placeholder="Nombre del Perfil" 
                                className="w-full h-full bg-transparent px-4 text-sm text-white outline-none font-medium"
                            />
                        </div>
                        <div className="w-[100px] flex items-center bg-surface-zinc border border-white/5 rounded-md h-[52px]">
                            <input 
                                value={prof.pin} 
                                onChange={e => handleProfileChange(idx, 'pin', e.target.value)} 
                                placeholder="PIN" 
                                className="w-full h-full bg-transparent px-4 text-center text-sm text-white font-mono outline-none"
                                inputMode="numeric"
                            />
                        </div>
                    </div>
                ))}
            </div>
          </div>

          {/* RENOVACIÓN AUTOMÁTICA CARD */}
          <div className="bg-surface-1 border border-white/[0.04] rounded-xl p-5 flex items-center justify-between shadow-inner">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-md bg-surface-3 flex items-center justify-center text-brand-primary border border-white/5 shadow-sm">
                   <RotateCcw size={22} className={formData.autoRenewal ? 'animate-spin-slow' : ''} />
                </div>
                <div>
                   <h4 className="text-sm font-bold text-white leading-tight">Renovación Automática</h4>
                   <p className="text-[10px] text-zinc-500 font-medium mt-0.5">Se extenderá 1 mes al vencer</p>
                </div>
             </div>
             <button 
                type="button" 
                onClick={() => setFormData(prev => ({ ...prev, autoRenewal: !prev.autoRenewal }))}
                className={`${styles.toggleBtn} ${formData.autoRenewal ? 'bg-brand-primary' : 'bg-surface-4'}`}
             >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${formData.autoRenewal ? 'translate-x-6' : 'translate-x-0'}`} />
             </button>
          </div>

          {/* PAÍS E INICIO */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className={styles.sectionLabel}>País</label>
                <div className={styles.inputContainer}>
                    <Globe size={18} className={styles.iconElement} />
                    <input value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} placeholder="Global" className={`${styles.input} pl-12`} />
                </div>
            </div>
            <div className="space-y-1">
                <label className={styles.sectionLabel}>Inicio</label>
                <div className={`${styles.inputContainer} pr-4`}>
                    <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className={`${styles.input} text-center font-bold`} />
                    <ChevronDown size={14} className="text-zinc-600 shrink-0" />
                </div>
            </div>
          </div>

          {/* VENCIMIENTO MES/DIA */}
          <div className="space-y-1">
            <label className={styles.sectionLabel}>Vencimiento</label>
            <div className="grid grid-cols-2 gap-4">
               <div className="flex items-center bg-surface-zinc border border-white/5 rounded-lg h-[52px] overflow-hidden">
                  <div className="px-4 h-full flex items-center justify-center bg-black/20 border-r border-white/5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                     Mes
                  </div>
                  <input type="number" value={months} onChange={e => setMonths(e.target.value)} className="w-full h-full bg-transparent text-center text-sm text-white font-bold outline-none" placeholder="0" />
               </div>
               <div className="flex items-center bg-surface-zinc border border-white/5 rounded-lg h-[52px] overflow-hidden">
                  <div className="px-4 h-full flex items-center justify-center bg-black/20 border-r border-white/5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                     Día
                  </div>
                  <input type="number" value={days} onChange={e => setDays(e.target.value)} className="w-full h-full bg-transparent text-center text-sm text-white font-bold outline-none" placeholder="0" />
               </div>
            </div>
          </div>

          {/* NOTAS INTERNAS */}
          <div className="space-y-1">
            <label className={styles.sectionLabel}>Notas Internas</label>
            <div className="relative">
              <FileText size={18} className="absolute left-4 top-4 text-zinc-600 pointer-events-none" />
              <textarea 
                value={formData.notes || ''} 
                onChange={e => setFormData({...formData, notes: e.target.value})} 
                placeholder="Escribe detalles adicionales sobre esta cuenta..." 
                className="w-full bg-surface-zinc border border-white/5 rounded-md pl-12 pr-4 pt-4 pb-4 text-sm text-white outline-none focus:border-primary/40 transition-all placeholder:text-zinc-700 min-h-[120px] font-medium resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* BOTÓN FINAL */}
          <div className="pt-4 pb-4">
             <button 
                type="submit" 
                className="w-full h-[60px] bg-surface-3 border border-white/10 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl"
             >
                <Check size={20} className="text-emerald-400" strokeWidth={3} /> Guardar Cambios
             </button>
          </div>

        </form>
      </Modal>

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
          <div className="w-full flex items-center gap-4 p-4 rounded-lg bg-surface-3 border border-white/5 hover:border-primary/40 transition-all text-left">
              <div className="w-11 h-11 rounded-md bg-surface-sunken flex items-center justify-center text-zinc-600 border border-white/5 overflow-hidden shrink-0">
                {s.image_url ? <img src={s.image_url} className="w-full h-full object-cover" /> : <Layers size={22} />}
              </div>
              <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{s.name}</p>
                  <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">{s.type.replace('_', ' ')}</p>
              </div>
              <ChevronRight size={18} className="text-zinc-700" />
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
          <div className="w-full flex items-center gap-4 p-4 rounded-lg bg-surface-3 border border-white/5 hover:border-primary/40 transition-all text-left">
              <div className="w-11 h-11 rounded-md flex items-center justify-center text-white font-semibold text-xs shrink-0" style={{ backgroundColor: p.color }}>
                {p.name.substring(0,2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{p.name}</p>
                  <p className="text-[10px] text-zinc-600 font-mono">{p.whatsapp}</p>
              </div>
              <ChevronRight size={18} className="text-zinc-700" />
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