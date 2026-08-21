import React, { useState } from 'react';
import { Save, MessageSquare, Send, Zap, Maximize2, Minimize2 } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { MessageTemplates } from '../../../types';
import { styles } from './_shared';

export const MessagesSection = () => {
    const { settings, updateSettings } = useData();
    const { showToast } = useToast();

    const [platform, setPlatform] = useState<'whatsapp' | 'telegram'>('whatsapp');
    const [activeCategory, setActiveCategory] = useState<'ventas' | 'vencimientos' | 'operaciones'>('ventas');
    const [editorHeight, setEditorHeight] = useState<'normal' | 'expanded'>('normal');

    const [templates, setTemplates] = useState<MessageTemplates>(settings.messageTemplates);
    const [telegramTemplates, setTelegramTemplates] = useState<MessageTemplates>(settings.telegramMessageTemplates || settings.messageTemplates);

    const CATEGORIES = {
        ventas: [
            { id: 'newSaleGlobal', label: 'Global', desc: 'Resumen del pedido.' },
            { id: 'newSaleScreen', label: 'Pantalla', desc: 'Ventas de perfiles.' },
            { id: 'newSaleFull', label: 'Completa', desc: 'Cuentas maestras.' },
            { id: 'newSaleUnique', label: 'Invitado', desc: 'Accesos directos.' },
        ],
        vencimientos: [
            { id: 'warning2Days', label: 'Aviso 2d', desc: 'Recordatorio preventivo.' },
            { id: 'warning1Day', label: 'Aviso 1d', desc: 'Urgente mañana.' },
            { id: 'expiration', label: 'Vencido', desc: 'Finalización hoy.' },
        ],
        operaciones: [
            { id: 'renewal', label: 'Renovado', desc: 'Confirmación de pago.' },
            { id: 'passwordChange', label: 'Nueva Clave', desc: 'Credenciales nuevas.' },
            { id: 'replacement', label: 'Garantía', desc: 'Reposición por falla.' },
            { id: 'warrantyExtension', label: 'Extensión', desc: 'Abono de días extra.' },
            { id: 'failureReport', label: 'Aviso Falla', desc: 'Caída masiva.' },
            { id: 'failureSolved', label: 'Falla Resuelta', desc: 'Solución técnica.' },
        ]
    };

    const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>('newSaleGlobal');

    const currentTemplates = platform === 'whatsapp' ? templates : telegramTemplates;

    const handleSave = () => {
        updateSettings({ ...settings, messageTemplates: templates, telegramMessageTemplates: telegramTemplates });
        showToast('Plantillas guardadas', 'success');
    };

    const updateCurrentTemplateValue = (val: string) => {
        if (platform === 'whatsapp') setTemplates(prev => ({ ...prev, [selectedTemplateKey]: val }));
        else setTelegramTemplates(prev => ({ ...prev, [selectedTemplateKey]: val }));
    };

    const insertVariable = (variable: string) => {
        const currentVal = currentTemplates[selectedTemplateKey] || '';
        updateCurrentTemplateValue(currentVal + variable);
    };

    const VARIABLE_PILLS = [
        '{cliente}', '{servicio}', '{correo}', '{password}', '{perfil}', '{pin}',
        '{fecha_corte}', '{moneda}', '{precio}', '{link_portal}', '{dias_compensados}',
        '{correo_invitado}', '{password_invitado}', '{servicios_agrupados}', '{lista_servicios}'
    ];

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex bg-surface-1 p-1.5 rounded-lg border border-[rgb(var(--fg-rgb))]/[0.08] w-full shadow-lg">
                <button onClick={() => setPlatform('whatsapp')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-md text-[11px] font-semibold uppercase tracking-widest transition-all ${platform === 'whatsapp' ? 'bg-brand-whatsapp text-black shadow-[0_8px_20px_-5px_rgba(37,211,102,0.4)]' : 'text-disabled hover:text-primary'}`}>
                    <MessageSquare size={14} fill={platform === 'whatsapp' ? "currentColor" : "none"} />
                    WhatsApp
                </button>
                <button onClick={() => setPlatform('telegram')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-md text-[11px] font-semibold uppercase tracking-widest transition-all ${platform === 'telegram' ? 'bg-brand-telegram text-white shadow-[0_8px_20px_-5px_rgba(0,136,204,0.4)]' : 'text-disabled hover:text-primary'}`}>
                    <Send size={14} fill={platform === 'telegram' ? "currentColor" : "none"} />
                    Telegram
                </button>
            </div>

            <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-2xl overflow-hidden flex flex-col shadow-2xl transition-all duration-500">
                <div className="p-4 flex bg-black/20 border-b border-[rgb(var(--fg-rgb))]/5 shrink-0">
                    <div className="bg-surface-sunken p-1 rounded-lg flex border border-[rgb(var(--fg-rgb))]/5 w-full shadow-inner">
                        <button onClick={() => { setActiveCategory('ventas'); setSelectedTemplateKey('newSaleGlobal'); }} className={`flex-1 py-2.5 rounded-md text-[10px] font-semibold uppercase tracking-widest transition-all ${activeCategory === 'ventas' ? 'bg-surface-4 text-primary shadow-md' : 'text-disabled hover:text-muted'}`}>Ventas</button>
                        <button onClick={() => { setActiveCategory('vencimientos'); setSelectedTemplateKey('warning2Days'); }} className={`flex-1 py-2.5 rounded-md text-[10px] font-semibold uppercase tracking-widest transition-all ${activeCategory === 'vencimientos' ? 'bg-surface-4 text-primary shadow-md' : 'text-disabled hover:text-muted'}`}>Alertas</button>
                        <button onClick={() => { setActiveCategory('operaciones'); setSelectedTemplateKey('renewal'); }} className={`flex-1 py-2.5 rounded-md text-[10px] font-semibold uppercase tracking-widest transition-all ${activeCategory === 'operaciones' ? 'bg-surface-4 text-primary shadow-md' : 'text-disabled hover:text-muted'}`}>Soporte</button>
                    </div>
                </div>

                <div className="p-3 grid grid-cols-2 gap-2.5 shrink-0 bg-surface-sunken/50 border-b border-[rgb(var(--fg-rgb))]/5">
                    {CATEGORIES[activeCategory].map(item => {
                        const isSelected = selectedTemplateKey === item.id;
                        return (
                            <button key={item.id} onClick={() => setSelectedTemplateKey(item.id)} className={`flex flex-col text-left p-3 rounded-lg border transition-all active:scale-95 group overflow-hidden relative ${isSelected ? 'bg-brand-primary/10 border-brand-primary shadow-[0_0_15px_rgba(106,44,255,0.1)]' : 'bg-surface-1 border-[rgb(var(--fg-rgb))]/5 hover:border-[rgb(var(--fg-rgb))]/10'}`}>
                                <span className={`text-[8px] font-black uppercase tracking-[0.2em] mb-1 ${isSelected ? 'text-brand-primary' : 'text-faint'}`}>{isSelected ? 'EDITANDO' : 'PLANTILLA'}</span>
                                <span className={`text-[12px] font-bold leading-tight truncate ${isSelected ? 'text-primary' : 'text-disabled group-hover:text-secondary'}`}>{item.label}</span>
                                {isSelected && <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-brand-primary/10 rounded-full blur-md" />}
                            </button>
                        );
                    })}
                </div>

                <div className={`flex flex-col transition-all duration-500 bg-surface-sunken ${editorHeight === 'expanded' ? 'min-h-[500px]' : 'min-h-[280px]'}`}>
                    <div className="flex items-center justify-between py-3.5 px-6 bg-black/10 border-b border-[rgb(var(--fg-rgb))]/[0.04] shrink-0">
                        <div className="flex items-center gap-2.5">
                           <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse shadow-[0_0_8px_#6A2CFF]" />
                           <h4 className="text-[11px] font-bold text-primary uppercase tracking-widest">{CATEGORIES[activeCategory].find(i => i.id === selectedTemplateKey)?.label}</h4>
                        </div>
                        <button onClick={() => setEditorHeight(editorHeight === 'normal' ? 'expanded' : 'normal')} className="p-2 bg-[rgb(var(--fg-rgb))]/5 rounded-xl text-disabled hover:text-primary transition-colors active:scale-90">
                           {editorHeight === 'normal' ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
                        </button>
                    </div>

                    <textarea value={currentTemplates[selectedTemplateKey] || ''} onChange={e => updateCurrentTemplateValue(e.target.value)} className="flex-1 w-full bg-transparent text-[14px] text-secondary outline-none p-6 resize-none leading-relaxed font-medium placeholder:text-faint custom-scrollbar" placeholder="Redacta el contenido dinámico de la plantilla aquí..." />
                </div>

                <div className="px-5 py-4 shrink-0 bg-surface-sunken border-t border-[rgb(var(--fg-rgb))]/[0.05]">
                    <div className="bg-surface-zinc border border-[rgb(var(--fg-rgb))]/5 rounded-lg p-4 shadow-inner">
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Zap size={10} className="text-brand-accent" fill="currentColor" />
                            <span className="text-[9px] font-black text-disabled uppercase tracking-[0.2em]">Variables del Sistema</span>
                        </div>
                        <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                            {VARIABLE_PILLS.map(pill => (
                                <button key={pill} onClick={() => insertVariable(pill)} className="px-4 py-2 bg-black/40 border border-[rgb(var(--fg-rgb))]/10 rounded-xl text-[11px] font-mono font-bold text-brand-primary whitespace-nowrap active:scale-95 transition-all hover:bg-brand-primary hover:text-primary hover:border-brand-primary shadow-sm">{pill}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <button onClick={handleSave} className={styles.buttonPrimary + " mt-4 shadow-lg active:scale-98"}>
                <Save size={20} /> Guardar Configuración Global
            </button>
        </div>
    );
};
