import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../../context/DataContext';
import { Service, ServiceType } from '../../../types';
import { 
  Trash2, Plus, MonitorPlay, LayoutTemplate, User, 
  Edit2, Save, ChevronDown, Tag, DollarSign, 
  Hash, Layers, Calculator, ShoppingBag, Briefcase,
  TrendingUp, Search, X, Image as ImageIcon, Upload, Camera
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { useToast } from '../../../context/ToastContext';
import { generateUUID } from '../../../utils/uuid';
import ScrollFloatingActions from '../../../components/ui/ScrollFloatingActions';
import { motion, AnimatePresence } from 'framer-motion';
import { useHighlightAction } from '../../../hooks/useHighlightAction';

interface ServicesMobileProps {
  onBack?: () => void;
}

const ServicesMobile: React.FC<ServicesMobileProps> = ({ onBack }) => {
  const { services, addService, deleteService, updateService } = useData();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [name, setName] = useState('');
  const [screens, setScreens] = useState('');
  const [type, setType] = useState<ServiceType>('por_pantalla');
  const [investment, setInvestment] = useState('');
  const [publicPrice, setPublicPrice] = useState('');
  const [resellerPrice, setResellerPrice] = useState('');
  const [image_url, setImageUrl] = useState('');
  const [calculatedCost, setCalculatedCost] = useState(0);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

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
    setName('');
    setScreens('');
    setType('por_pantalla');
    setInvestment('');
    setPublicPrice('');
    setResellerPrice('');
    setImageUrl('');
    setCalculatedCost(0);
  };

  const populateForm = (svc: Service) => {
    setName(svc.name);
    setScreens(svc.screens.toString());
    setType(svc.type);
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

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addService({
      id: generateUUID(),
      name,
      screens: parseInt(screens) || 1,
      type,
      investmentPrice: parseFloat(investment) || 0,
      publicPrice: parseFloat(publicPrice) || 0,
      resellerPrice: parseFloat(resellerPrice) || 0,
      image_url,
      cost: Number(calculatedCost.toFixed(2))
    });
    resetForm();
    setIsAddModalOpen(false);
    showToast('Servicio creado', 'success');
  };

  const handleEditClick = (svc: Service) => {
    setEditingService(svc);
    populateForm(svc);
    setIsEditModalOpen(true);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      updateService({
        ...editingService,
        name,
        screens: parseInt(screens) || 1,
        type,
        investmentPrice: parseFloat(investment) || 0,
        publicPrice: parseFloat(publicPrice) || 0,
        resellerPrice: parseFloat(resellerPrice) || 0,
        image_url,
        cost: Number(calculatedCost.toFixed(2))
      });
      setIsEditModalOpen(false);
      setEditingService(null);
      resetForm();
      showToast('Servicio actualizado', 'success');
    }
  };

  const getTypeIcon = (t: ServiceType) => {
    switch(t) {
      case 'por_pantalla': return <MonitorPlay size={18} />;
      case 'cuenta_completa': return <LayoutTemplate size={18} />;
      case 'usuario_unico': return <User size={18} />;
    }
  };

  const filteredServices = services.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const inputClass = "w-full bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 rounded-md pl-11 pr-4 py-4 text-text-primary text-sm outline-none focus:border-brand-primary transition-all font-medium";
  const labelClass = "text-[10px] font-semibold text-text-disabled uppercase tracking-widest mb-2 block ml-1";
  const isHighlighted = useHighlightAction('services');

  const renderFields = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Identificación</label>
          <div className="relative flex items-center">
            <Tag size={18} className="absolute left-4 text-text-disabled" />
            <input placeholder="Nombre de la Plataforma" value={name} onChange={e => setName(e.target.value)} className={inputClass} required />
          </div>
        </div>

        <div>
          <label className={labelClass}>Imagen del Servicio</label>
          <div className="flex items-center gap-4 bg-surface-sunken p-4 rounded-xl border border-[rgb(var(--fg-rgb))]/5">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-lg bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center overflow-hidden cursor-pointer relative group active:scale-95 transition-transform"
              >
                {image_url ? (
                  <img src={image_url} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-text-disabled">
                    <Camera size={24} />
                    <span className="text-[8px] font-bold uppercase">Subir</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                   <Upload size={20} className="text-text-primary" />
                </div>
              </div>
              <div className="flex-1">
                 <h4 className="text-text-primary font-bold text-sm leading-tight">Logo o Icono</h4>
                 <p className="text-text-disabled text-[10px] mt-1">Sube una imagen cuadrada de alta calidad para identificar mejor el servicio.</p>
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
                     className="mt-2 text-status-danger-soft text-[10px] font-semibold flex items-center gap-1"
                   >
                     <X size={12} /> Eliminar imagen
                   </button>
                 )}
              </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Modalidad</label>
            <div className="relative flex items-center">
              <Layers size={18} className="absolute left-4 text-text-disabled" />
              <select value={type} onChange={(e) => setType(e.target.value as ServiceType)} className={`${inputClass} appearance-none cursor-pointer`}>
                <option value="por_pantalla">Por Pantalla</option>
                <option value="cuenta_completa">Completa</option>
                <option value="usuario_unico">Usuario Único</option>
              </select>
              <ChevronDown className="absolute right-4 text-text-disabled pointer-events-none" size={16} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Cupos Máx.</label>
            <div className="relative flex items-center">
              <Hash size={18} className="absolute left-4 text-text-disabled" />
              <input type="number" value={screens} onChange={e => setScreens(e.target.value)} className={inputClass} placeholder="1" required />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-surface-sunken rounded-xl p-5 border border-[rgb(var(--fg-rgb))]/5 space-y-4">
        <h4 className="text-[11px] font-semibold text-text-muted uppercase flex items-center gap-2"><Calculator size={14} className="text-brand-primary" /> Estructura de Costos</h4>
        <div>
          <label className={labelClass}>Inversión Total</label>
          <div className="relative flex items-center">
            <DollarSign size={18} className="absolute left-4 text-text-disabled" />
            <input type="number" step="0.01" value={investment} onChange={e => setInvestment(e.target.value)} className={inputClass} placeholder="0.00" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>P. Público</label>
            <input type="number" step="0.01" value={publicPrice} onChange={e => setPublicPrice(e.target.value)} className={inputClass} placeholder="0.00" />
          </div>
          <div>
            <label className={labelClass}>P. Socio</label>
            <input type="number" step="0.01" value={resellerPrice} onChange={e => setResellerPrice(e.target.value)} className={inputClass} placeholder="0.00" />
          </div>
        </div>
        <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-md p-4 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-brand-primary uppercase">Costo Real p/ Pantalla</span>
            <span className="text-lg font-bold text-text-primary">${calculatedCost.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-40">
      <div className="relative z-20 flex items-center justify-between mb-4 px-2">
         <div>
            <h1 className="text-2xl font-black text-text-primary tracking-tight">Catálogo</h1>
            <p className="text-text-muted text-[11px] font-medium mt-0.5">Gestión de plataformas y precios</p>
         </div>
         <button 
           onClick={() => { resetForm(); setIsAddModalOpen(true); }} 
           className={`w-10 h-10 bg-gradient-to-r from-brand-primary to-brand-accent rounded-md flex items-center justify-center text-white shadow-glow active:scale-95 transition-all ${isHighlighted ? 'ring-4 ring-white animate-pulse' : ''}`}
         >
           <Plus size={22} strokeWidth={2.5} />
         </button>
      </div>

      <div className="mb-6 relative z-20 px-1">
          <div className="relative h-[48px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 rounded-md flex items-center px-4 transition-all focus-within:border-brand-primary/50 shadow-sm">
              <Search size={18} className="text-text-disabled shrink-0" />
              <input 
                 value={searchTerm} 
                 onChange={e => setSearchTerm(e.target.value)} 
                 placeholder="Buscar servicio..." 
                 className="bg-transparent border-none outline-none text-sm text-text-primary w-full ml-3 placeholder:text-text-faint font-medium" 
              />
              {searchTerm && (
                 <button onClick={() => setSearchTerm('')} className="p-1">
                     <X size={14} className="text-text-disabled" />
                 </button>
              )}
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnimatePresence mode='popLayout'>
            {filteredServices.map((svc, idx) => (
              <motion.div key={svc.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.05 }} className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-5 shadow-lg relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-md bg-surface-sunken flex items-center justify-center text-brand-primary border border-[rgb(var(--fg-rgb))]/5 overflow-hidden">
                        {svc.image_url ? <img src={svc.image_url} className="w-full h-full object-cover" /> : getTypeIcon(svc.type)}
                      </div>
                      <div>
                        <h4 className="text-text-primary font-bold text-base leading-tight">{svc.name}</h4>
                        <p className="text-[10px] text-text-disabled uppercase font-semibold mt-0.5">{svc.screens} Cupos • {svc.type.replace('_', ' ')}</p>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => handleEditClick(svc)} className="w-9 h-9 rounded-sm bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-muted active:scale-90 transition-all"><Edit2 size={15} /></button>
                      <button onClick={() => deleteService(svc.id)} className="w-9 h-9 rounded-sm bg-status-danger/10 flex items-center justify-center text-status-danger-soft active:scale-90 transition-all"><Trash2 size={15} /></button>
                   </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[rgb(var(--fg-rgb))]/5">
                   <div className="text-center"><p className="text-[9px] font-bold text-text-disabled uppercase">Costo</p><p className="text-text-secondary font-bold text-sm mt-0.5">${svc.cost || 0}</p></div>
                   <div className="text-center"><p className="text-[9px] font-bold text-text-disabled uppercase">Venta</p><p className="text-status-success-soft font-bold text-sm mt-0.5">${svc.publicPrice || 0}</p></div>
                   <div className="text-center"><p className="text-[9px] font-bold text-text-disabled uppercase">Utilidad</p><p className="text-brand-primary font-bold text-sm mt-0.5">${((svc.publicPrice || 0) - (svc.cost || 0)).toFixed(1)}</p></div>
                </div>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Nuevo Servicio">
        <form onSubmit={handleAdd} className="pb-4">
           {renderFields()}
           <button type="submit" className="w-full h-[56px] bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-bold shadow-glow mt-8 flex items-center justify-center gap-2 active:scale-95 transition-all"><Save size={20} /> Guardar Servicio</button>
        </form>
      </Modal>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Servicio">
        <form onSubmit={handleUpdateSubmit} className="pb-4">
           {renderFields()}
           <button type="submit" className="w-full h-[56px] bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-bold shadow-glow mt-8 flex items-center justify-center gap-2 active:scale-95 transition-all"><Save size={20} /> Actualizar Datos</button>
        </form>
      </Modal>

      <ScrollFloatingActions onAdd={() => { resetForm(); setIsAddModalOpen(true); }} onBack={onBack} />
    </div>
  );
};

export default ServicesMobile;