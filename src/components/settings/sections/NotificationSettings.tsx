import React, { useState } from 'react';
import { Save, Clock, Briefcase, DollarSign, BellRing, Rocket, CheckCircle2 } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { styles, ToggleSwitch } from './_shared';

export const NotificationSettings = () => {
    const { settings, updateSettings } = useData();
    const { showToast } = useToast();

    const [perms, setPerms] = useState(settings.notificationPreferences || { expiry: true, stock: true, payments: true, system: true });
    const [digest, setDigest] = useState(settings.digestSettings || {
        enabled: false, interval_hours: 5, max_per_day: 3,
        include_today: true, include_1d: true, include_3d: true, include_overdue: true, include_accounts_risk: true
    });

    const handlePermToggle = (key: keyof typeof perms) => setPerms(prev => ({ ...prev, [key]: !prev[key] }));
    const handleDigestToggle = () => setDigest(prev => ({ ...prev, enabled: !prev.enabled }));

    const handleSave = () => {
        updateSettings({ ...settings, notificationPreferences: perms, digestSettings: digest });
        showToast('Preferencias guardadas', 'success');
    };

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-status-info/20 p-4 rounded-xl flex items-start gap-4">
                 <div className="bg-status-info/10 p-2.5 rounded-full text-status-info-soft border border-status-info/20 shrink-0">
                     <Rocket size={20} />
                 </div>
                 <div>
                     <h4 className="text-primary font-bold text-sm mb-1">Próximamente: Push Notifications</h4>
                     <p className="text-muted text-xs leading-relaxed">
                         Estamos trabajando para enviarte alertas directas a tu dispositivo incluso cuando la app está cerrada.
                     </p>
                 </div>
             </div>

             <div className={styles.card}>
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-primary font-bold text-sm">Alertas Activas (In-App)</h3>
                        <p className="text-[10px] text-disabled mt-0.5">Controla qué avisos ves mientras usas Noova</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className={styles.toggleContainer}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[rgb(var(--fg-rgb))]/5 rounded-full"><Clock size={16} className="text-status-danger-soft" /></div>
                            <span className="text-sm font-bold text-primary">Vencimientos</span>
                        </div>
                        <ToggleSwitch checked={perms.expiry} onChange={() => handlePermToggle('expiry')} />
                    </div>

                    <div className={styles.toggleContainer}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[rgb(var(--fg-rgb))]/5 rounded-full"><Briefcase size={16} className="text-status-info-soft" /></div>
                            <span className="text-sm font-bold text-primary">Inventario / Stock</span>
                        </div>
                        <ToggleSwitch checked={perms.stock} onChange={() => handlePermToggle('stock')} />
                    </div>

                    <div className={styles.toggleContainer}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[rgb(var(--fg-rgb))]/5 rounded-full"><DollarSign size={16} className="text-status-warning-soft" /></div>
                            <span className="text-sm font-bold text-primary">Pagos Pendientes</span>
                        </div>
                        <ToggleSwitch checked={perms.payments} onChange={() => handlePermToggle('payments')} />
                    </div>

                    <div className={styles.toggleContainer}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[rgb(var(--fg-rgb))]/5 rounded-full"><BellRing size={16} className="text-status-success-soft" /></div>
                            <div>
                                <span className="text-sm font-bold text-primary block">Resumen de Inicio</span>
                                <span className="text-[9px] text-disabled">Mostrar recordatorios al entrar</span>
                            </div>
                        </div>
                        <ToggleSwitch checked={perms.system} onChange={() => handlePermToggle('system')} />
                    </div>
                </div>
             </div>

             <div className={styles.card}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-primary font-bold text-sm">Resumen Agrupado (Digest)</h3>
                        <p className="text-[10px] text-disabled">Agrupar notificaciones para no saturar</p>
                    </div>
                    <ToggleSwitch checked={digest.enabled} onChange={handleDigestToggle} />
                </div>

                {digest.enabled && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={styles.label}>Intervalo (Horas)</label>
                                <select value={digest.interval_hours} onChange={e => setDigest({...digest, interval_hours: parseInt(e.target.value)})} className={styles.select}>
                                    <option value="1">Cada 1h</option>
                                    <option value="3">Cada 3h</option>
                                    <option value="5">Cada 5h</option>
                                    <option value="12">Cada 12h</option>
                                </select>
                            </div>
                            <div>
                                <label className={styles.label}>Máx. por Día</label>
                                <select value={digest.max_per_day} onChange={e => setDigest({...digest, max_per_day: parseInt(e.target.value)})} className={styles.select}>
                                    <option value="1">1 vez</option>
                                    <option value="3">3 veces</option>
                                    <option value="5">5 veces</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className={styles.label}>Incluir en el resumen:</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setDigest({...digest, include_today: !digest.include_today})} className={`p-3 rounded-sm border flex items-center justify-between text-[11px] font-semibold ${digest.include_today ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'bg-surface-sunken border-[rgb(var(--fg-rgb))]/5 text-disabled'}`}>
                                    Vencen Hoy <CheckCircle2 size={14} className={digest.include_today ? 'opacity-100' : 'opacity-0'} />
                                </button>
                                <button onClick={() => setDigest({...digest, include_1d: !digest.include_1d})} className={`p-3 rounded-sm border flex items-center justify-between text-[11px] font-semibold ${digest.include_1d ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'bg-surface-sunken border-[rgb(var(--fg-rgb))]/5 text-disabled'}`}>
                                    Vencen Mañana <CheckCircle2 size={14} className={digest.include_1d ? 'opacity-100' : 'opacity-0'} />
                                </button>
                                <button onClick={() => setDigest({...digest, include_3d: !digest.include_3d})} className={`p-3 rounded-sm border flex items-center justify-between text-[11px] font-semibold ${digest.include_3d ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'bg-surface-sunken border-[rgb(var(--fg-rgb))]/5 text-disabled'}`}>
                                    En 3 Días <CheckCircle2 size={14} className={digest.include_3d ? 'opacity-100' : 'opacity-0'} />
                                </button>
                                <button onClick={() => setDigest({...digest, include_overdue: !digest.include_overdue})} className={`p-3 rounded-sm border flex items-center justify-between text-[11px] font-semibold ${digest.include_overdue ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'bg-surface-sunken border-[rgb(var(--fg-rgb))]/5 text-disabled'}`}>
                                    Ya Vencidas <CheckCircle2 size={14} className={digest.include_overdue ? 'opacity-100' : 'opacity-0'} />
                                </button>
                                <button onClick={() => setDigest({...digest, include_accounts_risk: !digest.include_accounts_risk})} className={`p-3 rounded-sm border flex items-center justify-between text-[11px] font-semibold col-span-2 ${digest.include_accounts_risk ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary' : 'bg-surface-sunken border-[rgb(var(--fg-rgb))]/5 text-disabled'}`}>
                                    Stock en Riesgo <CheckCircle2 size={14} className={digest.include_accounts_risk ? 'opacity-100' : 'opacity-0'} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
             </div>

             <button onClick={handleSave} className={styles.buttonPrimary}>
                 <Save size={18} /> Guardar Configuración
             </button>
        </div>
    );
};
