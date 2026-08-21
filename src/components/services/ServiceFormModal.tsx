
import React, { useState, useEffect, useRef } from 'react';
import { Service, ServiceType } from '../../types';
import { MonitorPlay, LayoutTemplate, User, Save, ChevronDown, Tag, DollarSign, Hash, Layers, Calculator, X, Camera, Upload } from 'lucide-react';
import Modal from '../ui/Modal';
import { useToast } from '../../context/ToastContext';
import { generateUUID } from '../../utils/uuid';
import { useData } from '../../context/DataContext';

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Service | null;
}

const ServiceFormModal: React.FC<ServiceFormModalProps> = ({ isOpen, onClose, initialData }) => {
  const { addService, updateService } = useData();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [screens, setScreens] = useState('');
  const [type, setType] = useState<ServiceType>('por_pantalla');
  const [investment, setInvestment] = useState('');
  const [publicPrice, setPublicPrice] = useState('');
  const [resellerPrice, setResellerPrice] = useState('');
  const [image_url, setImageUrl] = useState('');
  const [calculatedCost, setCalculatedCost] = useState(0);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setScreens(initialData.screens.toString());
        setType(initialData.type);
        setInvestment(initialData.investmentPrice?.toString() || '');
        setPublicPrice(initialData.publicPrice?.toString() || '');
        setResellerPrice(initialData.resellerPrice?.toString() || '');
        setImageUrl(initialData.image_url || '');
        setCalculatedCost(initialData.cost || 0);
      } else {
        setName(''); setScreens(''); setType('por_pantalla');
        setInvestment(''); setPublicPrice(''); setResellerPrice(''); setImageUrl(''); setCalculatedCost(0);
      }
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const totalInv = parseFloat(investment) || 0;
    const numScreens = parseFloat(screens) || 1;
    setCalculatedCost(type === 'cuenta_completa' ? totalInv : (numScreens > 0 ? totalInv / numScreens : 0));
  }, [investment, screens, type]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { showToast('Máximo 2MB', 'error'); return; }
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const serviceData: Service = {
      id: initialData ? initialData.id : generateUUID(),
      name, screens: parseInt(screens) || 1, type,
      investmentPrice: parseFloat(investment) || 0,
      publicPrice: parseFloat(publicPrice) || 0,
      resellerPrice: parseFloat(resellerPrice) || 0,
      image_url,
      cost: Number(calculatedCost.toFixed(2))
    };

    if (initialData) updateService(serviceData);
    else addService(serviceData);
    
    showToast(initialData ? 'Servicio actualizado' : 'Servicio creado', 'success');
    onClose();
  };

  const inputClass = "w-full bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 rounded-md pl-11 pr-4 py-4 text-text-primary text-sm outline-none focus:border-brand-primary transition-all font-medium";
  const labelClass = "text-[10px] font-semibold text-text-disabled uppercase tracking-widest mb-2 block ml-1";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Servicio' : 'Nuevo Servicio'}>
      <form onSubmit={handleSave} className="space-y-6 pb-4">
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
              <div onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-lg bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center overflow-hidden cursor-pointer relative group transition-transform active:scale-95">
                {image_url ? <img src={image_url} className="w-full h-full object-cover" /> : <Camera size={24} className="text-text-disabled" />}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Upload size={20} className="text-white" /></div>
              </div>
              <div className="flex-1">
                 <h4 className="text-text-primary font-bold text-sm">Logo o Icono</h4>
                 <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                 {image_url && <button type="button" onClick={() => setImageUrl('')} className="mt-2 text-status-danger-soft text-[10px] font-semibold">Eliminar imagen</button>}
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

        <div className="bg-surface-sunken rounded-xl p-5 border border-[rgb(var(--fg-rgb))]/5 space-y-4">
            <h4 className="text-[11px] font-semibold text-text-muted uppercase flex items-center gap-2"><Calculator size={14} className="text-brand-primary" /> Estructura de Costos</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Inversión Total</label>
                <div className="relative flex items-center"><DollarSign size={18} className="absolute left-4 text-text-disabled" /><input type="number" step="0.01" value={investment} onChange={e => setInvestment(e.target.value)} className={inputClass} placeholder="0.00" /></div>
              </div>
              <div><label className={labelClass}>P. Público</label><input type="number" step="0.01" value={publicPrice} onChange={e => setPublicPrice(e.target.value)} className={inputClass} placeholder="0.00" /></div>
              <div><label className={labelClass}>P. Socio</label><input type="number" step="0.01" value={resellerPrice} onChange={e => setResellerPrice(e.target.value)} className={inputClass} placeholder="0.00" /></div>
            </div>
            <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-md p-4 flex items-center justify-between"><span className="text-[10px] font-semibold text-brand-primary uppercase">Costo Real Unitario</span><span className="text-lg font-bold text-text-primary">${calculatedCost.toFixed(2)}</span></div>
        </div>

        <button type="submit" className="w-full h-[56px] bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-bold shadow-glow flex items-center justify-center gap-2 active:scale-95 transition-all">
          <Save size={20} /> {initialData ? 'Actualizar Servicio' : 'Guardar Servicio'}
        </button>
      </form>
    </Modal>
  );
};

export default ServiceFormModal;
