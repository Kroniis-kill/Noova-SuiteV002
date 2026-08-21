import React, { useState, useRef } from 'react';
import { Save, Building, Upload, X } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { styles } from './_shared';

export const BusinessIdentitySection = () => {
    const { settings, updateSettings } = useData();
    const { showToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [name, setName] = useState(settings.businessInfo?.name || '');
    const [whatsapp, setWhatsapp] = useState(settings.businessInfo?.whatsapp || '');
    const [website, setWebsite] = useState(settings.businessInfo?.website || '');
    const [logo, setLogo] = useState(settings.businessInfo?.logo || '');

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                showToast('La imagen es muy pesada (máx 2MB)', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => { setLogo(reader.result as string); };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        updateSettings({ ...settings, businessInfo: { name, whatsapp, logo, website } });
        showToast('Identidad actualizada', 'success');
    };

    return (
        <div className="space-y-6 animate-fade-in">
             <div className={styles.card}>
                <h3 className="text-primary font-bold text-lg mb-4 flex items-center gap-2">
                    <Building size={20} className="text-status-info-soft" /> Identidad del Negocio
                </h3>

                <div className="space-y-5">
                    <div>
                        <label className={styles.label}>Nombre Comercial</label>
                        <input value={name} onChange={e => setName(e.target.value)} className={styles.input} placeholder="Ej. SimioNet" />
                    </div>
                    <div>
                        <label className={styles.label}>WhatsApp Soporte</label>
                        <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className={styles.input} placeholder="58412..." />
                    </div>
                    <div>
                        <label className={styles.label}>Sitio Web (Opcional)</label>
                        <input value={website} onChange={e => setWebsite(e.target.value)} className={styles.input} placeholder="https://tuweb.com" />
                    </div>
                    <div>
                        <label className={styles.label}>Logo del Negocio</label>
                        <div className="flex gap-3">
                            <input value={logo} onChange={e => setLogo(e.target.value)} className={styles.input} placeholder="URL de imagen o carga un archivo" />
                            <button onClick={() => fileInputRef.current?.click()} className="w-[52px] h-[52px] rounded-md bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-muted hover:text-primary shrink-0 active:scale-90 transition-transform">
                                <Upload size={20} />
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                        </div>
                        <p className="text-[10px] text-disabled mt-2 ml-1">Este logo aparecerá en el Portal de Cliente y Recibos.</p>

                        {logo && (
                            <div className="mt-4 flex flex-col items-center">
                                <div className="w-24 h-24 rounded-lg bg-black border border-[rgb(var(--fg-rgb))]/10 overflow-hidden p-2 relative group">
                                    <img src={logo} alt="Logo Preview" className="w-full h-full object-contain" />
                                    <button onClick={() => setLogo('')} className="absolute top-1 right-1 p-1 bg-status-danger rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <X size={12} />
                                    </button>
                                </div>
                                <span className="text-[9px] font-bold text-faint mt-2 uppercase tracking-widest">Vista Previa</span>
                            </div>
                        )}
                    </div>
                </div>
             </div>
             <button onClick={handleSave} className={styles.buttonPrimary}>
                 <Save size={18} /> Guardar Cambios
             </button>
        </div>
    );
};
