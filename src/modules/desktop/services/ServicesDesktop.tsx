
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../../context/DataContext';
import { Service, ServiceType } from '../../../types';
import { 
  MonitorPlay, LayoutTemplate, User, Plus, Edit2, 
  Trash2, Search, Tag, DollarSign, Hash, Layers, 
  Save, ChevronDown, Calculator, Briefcase, ShoppingBag,
  TrendingUp, BarChart2, Image as ImageIcon, Upload, X, Camera
} from 'lucide-react';
import Modal from '../../../components/ui/Modal'; 
import { useToast } from '../../../context/ToastContext';
import { generateUUID } from '../../../utils/uuid';
import { motion, AnimatePresence } from 'framer-motion';

const ServicesDesktop: React.FC = () => {
  const { services, addService, deleteService, updateService } = useData();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [name, setName] = useState('');
  const [screens, setScreens] = useState('');
  const [type, setType] = useState<ServiceType>('por_pantalla');
  const [investment, setInvestment] = useState(''); 
  const [publicPrice, setPublicPrice] = useState(''); 
  const [resellerPrice, setResellerPrice] = useState(''); 
  const [image_url, setImageUrl] = useState('');
  const [calculatedCost, setCalculatedCost] = useState(0);

  useEffect(() => {
    const totalInv = parseFloat(investment) || 0;
    const numScreens = parseFloat(screens) || 1;
    if (type === 'cuenta_completa') {
        setCalculatedCost(totalInv);
    } else {
        setCalculatedCost(numScreens > 0 ? totalInv / numScreens : 0);
    }
  }, [investment, screens, type]);

  const resetForm = () => {
    setName(''); setScreens(''); setType('por_pantalla');
    setInvestment(''); setPublicPrice(''); setResellerPrice(''); setImageUrl(''); setCalculatedCost(0);
  };

  const populateForm = (svc: Service) => {
    setName(svc.name); setScreens(svc.screens.toString()); setType(svc.type);
    setInvestment(svc.investmentPrice > 0 ? svc.investmentPrice.toString() : '');
    setPublicPrice(svc.publicPrice > 0 ? svc.publicPrice.toString() : '');
    setResellerPrice(svc.resellerPrice > 0 ? svc.resellerPrice.toString() : '');
    setImageUrl(svc.image_url || '');
    setCalculatedCost(svc.cost || 0);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('La imagen es muy pesada (máx 2MB)', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const serviceData: Service = {
      id: editingService ? editingService.id : generateUUID(),
      name, screens: parseInt(screens) || 1, type,
      investmentPrice: parseFloat(investment) || 0,
      publicPrice: parseFloat(publicPrice) || 0,
      resellerPrice: parseFloat(resellerPrice) || 0,
      image_url,
      cost: Number(calculatedCost.toFixed(2))
    };

    if (editingService) updateService(serviceData);
    else addService(serviceData);
    
    showToast(editingService ? 'Servicio actualizado' : 'Servicio creado', 'success');
    setIsModalOpen(false);
  };

  const openEditModal = (svc: Service) => {
    setEditingService(svc);
    populateForm(svc);
    setIsModalOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'cuenta_completa': return <LayoutTemplate size={24} />;
      case 'usuario_unico': return <User size={24} />;
      default: return <MonitorPlay size={24} />;
    }
  };

  const filtered = services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const inputClass = "w-full bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 rounded-lg pl-12 pr-4 py-3.5 text-primary text-sm outline-none focus:border-brand-primary transition-all font-medium";
  const labelClass = "text-[11px] font-semibold text-disabled uppercase tracking-widest mb-2 block ml-1";

  return (
    <div className="space-y-10 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-primary flex items-center gap-3">
              <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary border border-brand-primary/20"><Layers size={22} /></div>
              Catálogo de Servicios
           </h2>
           <p className="text-disabled text-sm mt-1">Configura plataformas, costos y precios de venta.</p>
        </div>
        <div className="flex gap-4">
            <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-disabled group-focus-within:text-brand-primary transition-colors" size={18} />
                <input placeholder="Filtrar catálogo..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-72 bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 rounded-lg pl-11 pr-4 py-3 text-sm text-primary outline-none focus:border-brand-primary/50 transition-all" />
            </div>
            <button onClick={() => { setEditingService(null); resetForm(); setIsModalOpen(true); }} className="bg-brand-gradient text-white px-8 py-3 rounded-lg font-bold text-sm shadow-glow hover:scale-105 transition-all flex items-center gap-2"><Plus size={20} /> Nuevo Servicio</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
            {filtered.map(service => {
                const profit = (service.publicPrice || 0) - (service.cost || 0);
                const margin = service.publicPrice > 0 ? (profit / service.publicPrice) * 100 : 0;
                return (
                    <motion.div key={service.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -5 }} className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-lg bg-surface-sunken flex items-center justify-center text-brand-primary border border-[rgb(var(--fg-rgb))]/5 overflow-hidden">
                                    {service.image_url ? <img src={service.image_url} className="w-full h-full object-cover" /> : getTypeIcon(service.type)}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-primary leading-tight">{service.name}</h3>
                                    <p className="text-[10px] text-disabled font-bold uppercase mt-1">{service.screens} Pantallas • {service.type.replace('_', ' ')}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditModal(service)} className="w-9 h-9 rounded-full bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-muted hover:text-primary border border-[rgb(var(--fg-rgb))]/5"><Edit2 size={14} /></button>
                                <button onClick={() => deleteService(service.id)} className="w-9 h-9 rounded-full bg-status-danger/10 flex items-center justify-center text-status-danger-soft border border-status-danger/10"><Trash2 size={14} /></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 rounded-lg p-4">
                                <span className="text-[10px] font-semibold text-disabled uppercase flex items-center gap-1.5 mb-1"><TrendingUp size={10} /> Costo Unit.</span>
                                <p className="text-xl font-bold text-primary font-mono">${service.cost}</p>
                            </div>
                            <div className="bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 rounded-lg p-4">
                                <span className="text-[10px] font-semibold text-disabled uppercase flex items-center gap-1.5 mb-1"><ShoppingBag size={10} /> Venta Público</span>
                                <p className="text-xl font-bold text-status-success-soft font-mono">${service.publicPrice}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-brand-primary/20 flex items-center justify-center text-brand-primary"><BarChart2 size={16} /></div>
                                <div><p className="text-[10px] font-semibold text-brand-primary uppercase">Margen Est.</p><p className="text-sm font-bold text-primary font-mono">+${profit.toFixed(1)}</p></div>
                            </div>
                            <div className="text-right"><span className="text-[10px] font-semibold text-disabled uppercase">ROI</span><p className="text-sm font-bold text-status-success">{margin.toFixed(0)}%</p></div>
                        </div>
                    </motion.div>
                );
            })}
        </AnimatePresence>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingService ? 'Actualizar Servicio' : 'Nuevo Servicio'}>
         <form onSubmit={handleSave} className="space-y-8 pt-4 pb-4">
             <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                   <label className={labelClass}>Identificación del Servicio</label>
                   <div className="relative flex items-center">
                      <Tag size={18} className="absolute left-4 text-disabled" />
                      <input value={name} onChange={e => setName(e.target.value)} className={inputClass} required placeholder="Nombre (Ej. Netflix, YouTube Premium)" />
                   </div>
                </div>

                <div className="col-span-2">
                   <label className={labelClass}>Imagen del Servicio</label>
                   <div className="flex items-center gap-6 bg-surface-sunken p-6 rounded-xl border border-[rgb(var(--fg-rgb))]/10">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-28 h-28 rounded-xl bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center overflow-hidden cursor-pointer relative group transition-transform active:scale-95"
                      >
                         {image_url ? (
                            <img src={image_url} className="w-full h-full object-cover" alt="Preview" />
                         ) : (
                            <div className="flex flex-col items-center gap-2 text-faint group-hover:text-muted transition-colors">
                               <Camera size={32} />
                               <span className="text-[10px] font-semibold uppercase tracking-widest">Subir Imagen</span>
                            </div>
                         )}
                         <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Upload size={24} className="text-primary" />
                         </div>
                      </div>
                      <div className="flex-1">
                         <h4 className="text-primary font-bold text-base mb-1">Identidad Visual</h4>
                         <p className="text-disabled text-xs leading-relaxed max-w-[300px]">Sube una imagen de la plataforma para mejorar el reconocimiento visual en el inventario y catálogo.</p>
                         <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImageUpload} 
                            className="hidden" 
                            accept="image/*" 
                         />
                         {image_url && (
                           <button 
                             type="button"
                             onClick={() => setImageUrl('')}
                             className="mt-3 text-status-danger-soft text-xs font-semibold flex items-center gap-1.5 hover:text-red-300 transition-colors"
                           >
                             <X size={14} /> Eliminar imagen actual
                           </button>
                         )}
                      </div>
                   </div>
                </div>

                <div>
                   <label className={labelClass}>Modalidad de Venta</label>
                   <div className="relative flex items-center">
                      <Layers size={18} className="absolute left-4 text-disabled" />
                      <select value={type} onChange={e => setType(e.target.value as ServiceType)} className={`${inputClass} appearance-none cursor-pointer`}><option value="por_pantalla">Por Pantalla</option><option value="cuenta_completa">Cuenta Completa</option><option value="usuario_unico">Usuario Único</option></select>
                      <ChevronDown className="absolute right-4 text-disabled pointer-events-none" size={16} />
                   </div>
                </div>
                <div>
                   <label className={labelClass}>Cupos Disponibles</label>
                   <div className="relative flex items-center">
                      <Hash size={18} className="absolute left-4 text-disabled" />
                      <input type="number" value={screens} onChange={e => setScreens(e.target.value)} className={inputClass} placeholder="1" />
                   </div>
                </div>
             </div>
             <div className="bg-surface-sunken rounded-xl p-6 border border-[rgb(var(--fg-rgb))]/5">
                <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20"><Calculator size={20} /></div><h4 className="text-primary font-bold text-sm">Calculadora Financiera</h4></div>
                <div className="grid grid-cols-2 gap-6 items-end">
                   <div>
                      <label className={labelClass}>Inversión Total (Costo Cuenta)</label>
                      <div className="relative flex items-center">
                         <DollarSign size={18} className="absolute left-4 text-disabled" />
                         <input type="number" step="0.01" value={investment} onChange={e => setInvestment(e.target.value)} className={inputClass} placeholder="0.00" />
                      </div>
                   </div>
                   <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-lg h-[52px] flex items-center justify-between px-6">
                      <span className="text-xs font-semibold text-brand-primary uppercase">Costo Real Unitario</span>
                      <span className="text-xl font-bold text-primary font-mono">${calculatedCost.toFixed(2)}</span>
                   </div>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-6">
                <div><label className={labelClass}>Precio Venta Público</label><input type="number" step="0.01" value={publicPrice} onChange={e => setPublicPrice(e.target.value)} className={inputClass} placeholder="0.00" /></div>
                <div><label className={labelClass}>Precio Venta Socio</label><input type="number" step="0.01" value={resellerPrice} onChange={e => setResellerPrice(e.target.value)} className={inputClass} placeholder="0.00" /></div>
             </div>
             <div className="pt-6">
               <button type="submit" className="w-full h-[60px] bg-brand-gradient text-white rounded-xl font-extrabold text-sm shadow-glow hover:scale-[1.01] transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                 <Save size={22} /> {editingService ? 'Actualizar Datos' : 'Registrar Servicio'}
               </button>
             </div>
         </form>
      </Modal>
    </div>
  );
};

export default ServicesDesktop;
