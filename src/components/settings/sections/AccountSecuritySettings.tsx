import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Trash2, ImagePlus, AlertTriangle, Moon, Sun, Monitor, Camera } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { useSubscription } from '../../../context/SubscriptionContext';
import { backupService } from '../../../services/backupService';
import Avatar from '../../ui/Avatar';
import { styles, ToggleSwitch } from './_shared';

export const AccountSecuritySettings = () => {
    const { user, updateProfile, updatePassword } = useAuth();
    const { showToast } = useToast();
    const { updateSettings, settings } = useData();
    const { isAdmin } = useSubscription();

    const [name, setName] = useState(user?.name || '');
    const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
    const [useBizLogo, setUseBizLogo] = useState(settings.useBusinessLogo || false);
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');

    useEffect(() => {
        setUseBizLogo(settings.useBusinessLogo || false);
    }, [settings.useBusinessLogo]);

    const handleProfileUpdate = async () => {
        try {
            await updateProfile(name, avatarUrl);
            await updateSettings({ ...settings, useBusinessLogo: useBizLogo });
            showToast('Perfil actualizado', 'success');
        } catch (e) { showToast('Error al actualizar', 'error'); }
    };

    const handleChangePassword = async () => {
        if (newPass.length < 6) { showToast('Mínimo 6 caracteres', 'error'); return; }
        if (newPass !== confirmPass) { showToast('No coinciden', 'error'); return; }
        try {
            await updatePassword(newPass);
            showToast('Contraseña actualizada', 'success');
            setNewPass(''); setConfirmPass('');
        } catch (e) { showToast('Error', 'error'); }
    };

    const toggleTheme = (theme: 'dark' | 'light' | 'system') => {
        updateSettings({ ...settings, theme });
    };

    const deleteAll = async (type: string) => {
        if (!user?.id) return;
        const typeMap: any = { 'Ventas': 'Ventas', 'Clientes': 'Clientes', 'Productos': 'Productos', 'Todo': 'Todo' };
        if (confirm(`¿Estás seguro de ELIMINAR TODOS los datos de ${type}? Esta acción no se puede deshacer.`)) {
            try {
                showToast(`Eliminando ${type}...`, 'info');
                await (backupService as any).deleteUserData(user.id, typeMap[type] || 'Todo');
                showToast(`Datos de ${type} eliminados correctamente`, 'success');
                setTimeout(() => window.location.reload(), 1500);
            } catch (error) {
                console.error(error);
                showToast(`Error al eliminar ${type}`, 'error');
            }
        }
    };

    const handleDeleteAccount = async () => {
        if (!user?.id) return;
        if (confirm("¿ELIMINAR TU CUENTA? Esta acción borrará todos tus datos permanentemente y cerrará tu sesión.")) {
             try {
                 showToast('Eliminando todos tus datos...', 'info');
                 await (backupService as any).deleteUserData(user.id, 'Todo');
                 showToast('Cuenta limpiada. Cerrando sesión...', 'success');
                 setTimeout(async () => { window.location.href = '/login'; }, 2000);
             } catch (error) {
                 console.error(error);
                 showToast('Error al procesar eliminación', 'error');
             }
        }
    };

    const previewAvatar = useBizLogo && settings.businessInfo?.logo ? settings.businessInfo.logo : avatarUrl;

    return (
        <div className="space-y-6 animate-fade-in pb-10">
             <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-2xl p-6 text-center relative overflow-hidden shadow-sm">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 blur-[50px] rounded-full pointer-events-none" />

                 <div className="relative inline-block mb-4">
                     <div className={`w-24 h-24 rounded-full p-[3px] bg-gradient-to-tr from-brand-primary to-brand-accent shadow-glow`}>
                         <Avatar name={name} image={previewAvatar} size="100%" className="rounded-full w-full h-full border-4 border-surface-1" />
                     </div>
                     {isAdmin && <div className="absolute bottom-0 right-0 bg-status-warning-soft text-black text-[9px] font-bold px-2 py-0.5 rounded-full border-2 border-surface-1">ADMIN</div>}
                 </div>

                 <div className="space-y-4 text-left mt-2">
                     <div className="flex items-center gap-2 mb-2 justify-center">
                         <User size={14} className="text-brand-primary" />
                         <span className="text-sm font-bold text-primary">Datos Personales</span>
                     </div>

                     <div>
                         <label className={styles.label}>Nombre Visible</label>
                         <input value={name} onChange={e => setName(e.target.value)} className={styles.input} />
                     </div>

                     <div className="bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 rounded-2xl p-4 space-y-4">
                         <div className="flex items-center justify-between">
                             <div>
                                 <span className="text-xs font-semibold text-primary block">Usar Logo del Negocio</span>
                                 <span className="text-[10px] text-disabled">Como foto de perfil en la app</span>
                             </div>
                             <ToggleSwitch checked={useBizLogo} onChange={() => setUseBizLogo(!useBizLogo)} />
                         </div>

                         {!useBizLogo && (
                             <div className="animate-fade-in">
                                <label className={styles.label}>URL Foto de Perfil</label>
                                <div className="flex gap-2">
                                    <input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} className={styles.input} placeholder="https://..." />
                                    <div className="w-[52px] h-[52px] rounded-md bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-muted shrink-0">
                                        <Camera size={20} />
                                    </div>
                                </div>
                             </div>
                         )}
                     </div>

                     <div>
                         <label className={styles.label}>Correo Electrónico</label>
                         <input value={user?.email} disabled className={`${styles.input} opacity-50 cursor-not-allowed`} />
                     </div>

                     <button onClick={handleProfileUpdate} className="w-full h-[48px] bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 hover:bg-[rgb(var(--fg-rgb))]/10 text-primary rounded-md font-semibold text-xs transition-all">
                         Actualizar Perfil
                     </button>
                 </div>
             </div>

             <div className={styles.card}>
                 <h3 className="text-primary font-bold text-sm mb-4 flex items-center gap-2">
                    <Lock size={16} className="text-status-success-soft" /> Cambiar Contraseña
                 </h3>
                 <div className="space-y-4">
                     <div>
                         <label className={styles.label}>Nueva Contraseña</label>
                         <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Mínimo 6 caracteres" className={styles.input} />
                     </div>
                     <div>
                         <label className={styles.label}>Confirmar Contraseña</label>
                         <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Repetir contraseña" className={styles.input} />
                     </div>
                     <button onClick={handleChangePassword} className={styles.buttonPrimary}>
                         Actualizar Clave
                     </button>
                 </div>
             </div>

             <div className={styles.card}>
                 <h3 className="text-primary font-bold text-sm mb-4 flex items-center gap-2">
                    <ImagePlus size={16} className="text-status-info-soft" /> Apariencia
                 </h3>
                 <div className="grid grid-cols-3 gap-3">
                     {/* Estas 3 vistas previas usan colores fijos a propósito (no tokens):
                        deben verse siempre como "una tarjeta oscura", "una tarjeta clara" y
                        "mitad y mitad", sin importar qué tema esté activo en ese momento. */}
                     <button onClick={() => toggleTheme('dark')} className={`h-[80px] rounded-md border flex flex-col items-center justify-center gap-2 transition-all bg-[#0a0a0a] text-white ${settings.theme === 'dark' ? 'border-brand-primary shadow-lg' : 'border-[rgba(255,255,255,0.1)] opacity-70'}`}>
                         <motion.div whileHover={{ scale: 1.1 }}><Moon size={20} /></motion.div> <span className="text-[10px] font-semibold uppercase">Oscuro</span>
                     </button>
                     <button onClick={() => toggleTheme('light')} className={`h-[80px] rounded-md border flex flex-col items-center justify-center gap-2 transition-all bg-white text-black ${settings.theme === 'light' ? 'border-brand-primary shadow-lg' : 'border-zinc-200 opacity-70'}`}>
                         <motion.div whileHover={{ scale: 1.1 }}><Sun size={20} /></motion.div> <span className="text-[10px] font-semibold uppercase">Claro</span>
                     </button>
                     <button onClick={() => toggleTheme('system')} className={`h-[80px] rounded-md border flex flex-col items-center justify-center gap-2 transition-all bg-gradient-to-br from-[#0a0a0a] from-50% to-white to-50% text-white ${settings.theme === 'system' ? 'border-brand-primary shadow-lg' : 'border-[rgba(255,255,255,0.1)] opacity-70'}`}>
                         <motion.div whileHover={{ scale: 1.1 }}><Monitor size={20} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" /></motion.div> <span className="text-[10px] font-semibold uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Sistema</span>
                     </button>
                 </div>
             </div>

             <div className="border border-status-danger/20 bg-status-danger/5 rounded-2xl p-6">
                 <h3 className="text-status-danger font-bold text-sm mb-6 flex items-center gap-2">
                    <AlertTriangle size={18} /> Zona de Peligro
                 </h3>

                 <button onClick={() => deleteAll('Ventas')} className={styles.buttonDanger}>
                    <div className="flex items-center gap-3"><Trash2 size={16} /> Eliminar Todas las Ventas</div>
                 </button>
                 <button onClick={() => deleteAll('Clientes')} className={styles.buttonDanger}>
                    <div className="flex items-center gap-3"><Trash2 size={16} /> Eliminar Todos los Clientes</div>
                 </button>
                 <button onClick={() => deleteAll('Productos')} className={styles.buttonDanger}>
                    <div className="flex items-center gap-3"><Trash2 size={16} /> Eliminar Todos los Productos</div>
                 </button>
                 <button onClick={() => deleteAll('Todo')} className={styles.buttonDanger}>
                    <div className="flex items-center gap-3"><Trash2 size={16} /> Eliminar Todos los Datos</div>
                 </button>

                 <div className="w-full h-px bg-status-danger/20 my-4" />

                 <button onClick={handleDeleteAccount} className="w-full h-[52px] border border-status-danger/50 text-status-danger hover:bg-status-danger hover:text-primary rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2">
                    <Trash2 size={18} /> Eliminar Cuenta
                 </button>
             </div>
        </div>
    );
};
