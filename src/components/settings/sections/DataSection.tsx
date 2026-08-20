import React, { useState, useRef } from 'react';
import { Save, Database, Upload, Download, RefreshCw, ChevronRight, Clock } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { backupService } from '../../../services/backupService';
import { styles, ToggleSwitch } from './_shared';

export const DataSection = () => {
    const { showToast } = useToast();
    const { user } = useAuth();
    const { settings, updateSettings } = useData();
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const backupPrefs = settings.backupPreferences || {
        autoBackup: false,
        frequency: 'weekly' as const,
        lastBackup: undefined,
        driveEnabled: false
    };

    const handleBackup = async () => {
        if (!user?.id) return;
        setLoading(true);
        setStatusMessage('Generando copia de seguridad...');
        try {
            await backupService.exportData(user.id);
            const now = new Date().toISOString();
            await updateSettings({ ...settings, backupPreferences: { ...backupPrefs, lastBackup: now } });
            showToast('Copia de seguridad descargada', 'success');
        } catch (error) {
            showToast('Error al crear copia de seguridad', 'error');
        } finally {
            setLoading(false);
            setStatusMessage(null);
        }
    };

    const handleExcelExport = async () => {
        if (!user?.id) return;
        setLoading(true);
        setStatusMessage('Preparando Excel...');
        try {
            await backupService.exportToExcel(user.id);
            showToast('Datos exportados a Excel', 'success');
        } catch (error) {
            showToast('Error al exportar a Excel', 'error');
        } finally {
            setLoading(false);
            setStatusMessage(null);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;

        if (!confirm('Esta acción sobreescribirá tus datos actuales con la información de la copia. ¿Deseas continuar?')) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setLoading(true);
        try {
            const cacheKey = `finance_app_settings_${user.id}`;
            localStorage.removeItem(cacheKey);
            localStorage.removeItem('finance_app_cache_settings');

            await (backupService as any).importData(file, user.id, (msg: string) => { setStatusMessage(msg); });

            showToast('Datos restaurados correctamente. Reiniciando...', 'success');
            setTimeout(() => {
                window.location.href = window.location.origin + window.location.pathname + '?restored=true';
            }, 1000);
        } catch (error) {
            console.error(error);
            showToast('Error al restaurar datos', 'error');
        } finally {
            setLoading(false);
            setStatusMessage(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const toggleAutoBackup = async () => {
        const newPrefs = { ...backupPrefs, autoBackup: !backupPrefs.autoBackup };
        await updateSettings({ ...settings, backupPreferences: newPrefs });
        showToast(newPrefs.autoBackup ? 'Auto-respaldo activado' : 'Auto-respaldo desactivado', 'info');
    };

    const setFrequency = async (freq: 'daily' | 'weekly' | 'monthly') => {
        await updateSettings({ ...settings, backupPreferences: { ...backupPrefs, frequency: freq } });
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
             {loading && (
                <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={(e) => e.stopPropagation()}>
                    <div className="relative w-24 h-24 mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-blue-500 animate-spin" />
                        <div className="absolute inset-4 rounded-full border-4 border-white/5 border-b-emerald-500 animate-spin-slow" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Database className="text-white animate-pulse" size={32} />
                        </div>
                    </div>
                    <p className="text-white font-bold text-lg mb-2 tracking-tight uppercase not-italic">
                        {statusMessage || 'Procesando...'}
                    </p>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
                    </div>
                </div>
             )}

             <div className={styles.card}>
                <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2 text-blue-400">
                    <Database size={20} /> Seguridad de Datos
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <button onClick={handleBackup} disabled={loading} className="aspect-square bg-surface-sunken border border-white/10 hover:bg-white/5 rounded-xl flex flex-col items-center justify-center gap-3 transition-colors group relative overflow-hidden active:scale-95">
                        {loading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10"><RefreshCw className="animate-spin text-white" /></div>}
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                           <Save size={24} />
                        </div>
                        <div className="text-center px-2">
                           <span className="text-white font-semibold text-xs block">Exportar Backup</span>
                           <span className="text-[9px] text-zinc-500 uppercase tracking-tighter">Backup Completo (JSON)</span>
                        </div>
                    </button>

                    <button onClick={() => fileInputRef.current?.click()} disabled={loading} className="aspect-square bg-surface-sunken border border-white/10 hover:bg-white/5 rounded-xl flex flex-col items-center justify-center gap-3 transition-colors group active:scale-95">
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                           <Upload size={24} />
                        </div>
                        <div className="text-center px-2">
                           <span className="text-white font-semibold text-xs block">Importar Backup</span>
                           <span className="text-[9px] text-zinc-500 uppercase tracking-tighter">Restaurar Información</span>
                        </div>
                    </button>
                </div>

                <div className="bg-surface-sunken rounded-xl border border-white/5 p-4 mb-6">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <div>
                            <span className="text-white font-semibold text-xs block">Recordatorio de Respaldo</span>
                            <span className="text-[9px] text-zinc-500">Notificar descarga periódica periódica</span>
                        </div>
                        <ToggleSwitch checked={backupPrefs.autoBackup || false} onChange={toggleAutoBackup} />
                    </div>

                    {backupPrefs.autoBackup && (
                        <div className="grid grid-cols-3 gap-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            {['daily', 'weekly', 'monthly'].map((f) => (
                                <button key={f} onClick={() => setFrequency(f as any)} className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${backupPrefs.frequency === f ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'bg-black/20 border-white/5 text-zinc-600'}`}>
                                    {f === 'daily' ? 'Diario' : f === 'weekly' ? 'Semanal' : 'Mensual'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    <button onClick={handleExcelExport} disabled={loading} className="w-full h-[60px] bg-surface-sunken border border-white/10 rounded-lg flex items-center justify-between px-5 hover:bg-white/5 transition-colors group active:scale-[0.98]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                <Download size={20} />
                            </div>
                            <div className="text-left">
                                <span className="text-white font-bold text-sm block">Exportar a Excel</span>
                                <span className="text-[10px] text-zinc-500">Reporte tabular de datos clave</span>
                            </div>
                        </div>
                        <div className="text-zinc-600 group-hover:text-white transition-colors">
                            <ChevronRight size={18} />
                        </div>
                    </button>

                    {backupPrefs.lastBackup && (
                        <div className="mt-4 px-1 flex items-center gap-2 text-[10px] text-zinc-600 font-semibold uppercase tracking-widest">
                            <Clock size={10} />
                            Ultimo Backup: {new Date(backupPrefs.lastBackup).toLocaleDateString()} {new Date(backupPrefs.lastBackup).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                </div>

                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
             </div>
        </div>
    );
};
