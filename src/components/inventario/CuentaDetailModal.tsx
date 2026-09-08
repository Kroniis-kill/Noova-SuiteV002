import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Account, ProfileHistoryEntry } from '../../types';
import { Copy, Eye, EyeOff, CheckCircle2, Power, Trash2, Key, User, LayoutTemplate, MonitorPlay, MessageSquare, History, Clock, AlertTriangle, RotateCcw, X, RefreshCw, Loader2, MoreVertical, ShieldAlert, ShieldCheck, Mail } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataContext';
import { formatDate, getLocalDateISO } from '../../utils/contactosUtils';
import { getDaysRemaining } from '../../utils/inventarioUtils';
import { useHaptic } from '../../hooks/useHaptic';

interface CuentaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onEdit: (acc: Account) => void;
  onRenew: (acc: Account) => void;
  onToggleStatus: (acc: Account) => void;
  onToggleFailure: (acc: Account) => void;
  onDelete: (id: string) => void;
  onRestore?: (acc: Account) => void;
}

const CuentaDetailModal: React.FC<CuentaDetailModalProps> = ({ 
  isOpen, onClose, account, onEdit, onRenew, onToggleStatus, onToggleFailure, onDelete, onRestore 
}) => {
  const { showToast } = useToast();
  const { activityLogs, getProfileHistory, services, sales, clients, updateAccount } = useData();
  const haptic = useHaptic();
  
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [profileHistory, setProfileHistory] = useState<ProfileHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const isTrash = account?.status === 'trash';
  const serviceObj = useMemo(() => services.find(s => s.id === account?.serviceId), [account, services]);

  useEffect(() => {
      if (isOpen && activeTab === 'history' && account && !isTrash) {
          setLoadingHistory(true);
          getProfileHistory(account.id).then(data => {
              setProfileHistory(data);
              setLoadingHistory(false);
          });
      }
  }, [isOpen, activeTab, account, isTrash]);

  useEffect(() => {
      if (isOpen) {
          setActiveTab('details');
          setIsSyncing(false);
      }
  }, [isOpen]);

  // --- LÓGICA DE SINCRONIZACIÓN INDIVIDUAL ---
  const handleSyncAccountStock = async () => {
    if (!account || isSyncing) return;
    setIsSyncing(true);
    haptic('nav');

    try {
        const todayStr = getLocalDateISO();
        
        // 1. Obtener ventas realmente activas para ESTA cuenta
        const activeSales = sales.filter(s => 
            s.accountId === account.id && 
            s.expiryDate >= todayStr
        );

        // 2. Reconstruir array de perfiles base
        let newProfiles = Array.from({ length: account.maxScreens }, () => ({
            name: 'Disponible',
            pin: ''
        }));

        let newUsedScreens = 0;

        // 3. Lógica según tipo de cuenta
        if (account.account_type === 'cuenta_completa') {
            if (activeSales.length > 0) {
                newUsedScreens = account.maxScreens;
                const mainSale = activeSales[0];
                const client = clients.find(c => c.id === mainSale.clientId);
                newProfiles[0] = {
                    name: client?.name || 'Cliente (Cuenta Completa)',
                    pin: mainSale.assignedProfiles?.[0]?.pin || ''
                };
            }
        } else {
            let currentSlot = 0;
            activeSales.forEach(sale => {
                const client = clients.find(c => c.id === sale.clientId);
                const clientName = client?.name || 'Cliente';
                const numScreens = sale.screensCount || 1;

                for (let i = 0; i < numScreens; i++) {
                    if (currentSlot < account.maxScreens) {
                        const saleProfile = sale.assignedProfiles?.[i];
                        newProfiles[currentSlot] = {
                            name: saleProfile?.name || clientName,
                            pin: saleProfile?.pin || ''
                        };
                        currentSlot++;
                    }
                }
            });
            newUsedScreens = currentSlot;
        }

        // 4. Comparar y Actualizar si hay cambios
        const hasChanges = JSON.stringify(account.profiles) !== JSON.stringify(newProfiles) || 
                          account.usedScreens !== newUsedScreens;

        if (hasChanges) {
            await updateAccount({
                ...account,
                usedScreens: newUsedScreens,
                profiles: newProfiles,
                notes: (account.notes || '') + `\n[SISTEMA: Stock sincronizado manualmente el ${new Date().toLocaleDateString()}]`
            });
            haptic('success');
            showToast('Stock sincronizado correctamente', 'success');
        } else {
            showToast('El stock ya está al día', 'info');
        }
    } catch (error) {
        showToast('Error al sincronizar', 'error');
    } finally {
        setIsSyncing(false);
    }
  };

  const combinedHistory = useMemo(() => {
      if (!account || isTrash) return [];
      const specificLogs = profileHistory.map(h => ({
          date: new Date(h.createdAt),
          text: `${h.actionType === 'ASSIGNED' ? 'Asignado' : h.actionType === 'RELEASED' ? 'Liberado' : 'Modificado'}: ${h.profileName} ${h.clientName ? `a ${h.clientName}` : ''}`,
          type: 'profile'
      }));
      const systemLogs = activityLogs.filter(log => log.entity === 'ACCOUNT' && log.details.includes(account.email)).map(log => ({
         date: new Date(log.timestamp),
         text: log.details,
         type: 'system'
      }));
      const noteLogs: any[] = [];
      if (account.notes) {
          const lines = account.notes.split('\n');
          lines.forEach(line => {
              if (line.trim().startsWith('[')) {
                  const match = line.match(/\[(.*?):(.*?)\](.*)/);
                  if (match) {
                      const dateStr = match[2].trim();
                      const d = new Date(dateStr);
                      noteLogs.push({ date: isNaN(d.getTime()) ? new Date() : d, text: `${match[1]}: ${match[3] || 'Cambio registrado'}`, type: 'note' });
                  }
              }
          });
      }
      return [...specificLogs, ...systemLogs, ...noteLogs].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [account, activityLogs, profileHistory, isTrash]);

  if (!isOpen || !account) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copiado`, 'success');
  };

  const copyFullFormat = () => {
      let format = `📧 *Cuenta:* ${account.email}\n🔑 *Clave:* ${account.password}`;
      if (account.profiles && account.profiles.length > 0) {
          format += `\n\n📺 *Perfiles:*`;
          account.profiles.forEach(p => { format += `\n- ${p.name || 'Perfil'} (PIN: ${p.pin || 'N/A'})`; });
      }
      navigator.clipboard.writeText(format);
      showToast('Credenciales completas copiadas', 'success');
  };

  const usedProfilesCount = (profiles: any[]) => profiles.filter(p => p.name.trim().toLowerCase() !== 'disponible').length;

  const profiles = account.profiles && account.profiles.length > 0 
    ? account.profiles 
    : Array.from({ length: account.maxScreens }).map(() => ({ name: 'Disponible', pin: '' }));

  const isPaused = account.status === 'inactiva';
  const isFailing = account.status === 'fallando';
  const isSingleEntity = account.account_type === 'cuenta_completa' || account.maxScreens === 1;
  const isSoldSingle = (account.status === 'alquilada' || account.status === 'vendida') || (profiles[0] && profiles[0].name.toLowerCase() !== 'disponible');
  const clientNameSingle = isSoldSingle && profiles[0]?.name && profiles[0].name.toLowerCase() !== 'disponible' ? profiles[0].name : '---';

  const modalVariants = {
    hidden: { y: "100%", opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", damping: 25, stiffness: 300 } },
    exit: { y: "100%", opacity: 0, transition: { duration: 0.2 } }
  };

  if (typeof document === 'undefined') return null;

  if (isTrash) {
    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" />
            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="fixed bottom-0 left-0 right-0 bg-surface-1 rounded-t-xl border-t border-border-subtle z-[9999] p-6 pb-12 max-w-md mx-auto md:bottom-6 md:rounded-xl flex flex-col shadow-modal">
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-6 shrink-0" />
              <div className="flex items-center gap-4 mb-8">
                 <div className="w-14 h-14 rounded-md bg-surface-sunken flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 overflow-hidden shrink-0">
                    {serviceObj?.image_url ? <img src={serviceObj.image_url} className="w-full h-full object-cover" alt="" /> : <Trash2 size={24} className="text-text-faint" />}
                 </div>
                 <div className="min-w-0">
                    <h3 className="text-lg font-black text-text-primary truncate">{serviceObj?.name || 'Servicio Desconocido'}</h3>
                    <div className="flex items-center gap-2 mt-1"><span className="px-2 py-0.5 bg-zinc-800 border border-[rgb(var(--fg-rgb))]/5 rounded-md text-[10px] font-semibold text-text-disabled uppercase tracking-widest">En Papelera</span></div>
                 </div>
              </div>
              <div className="bg-surface-3 rounded-xl p-5 border border-[rgb(var(--fg-rgb))]/5 space-y-4 mb-8">
                  <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-faint uppercase tracking-[0.15em]">Correo de acceso</label>
                      <div className="flex items-center justify-between"><span className="text-sm font-bold text-text-secondary truncate pr-2">{account.email}</span><button onClick={() => copyToClipboard(account.email, 'Correo')} className="text-text-faint hover:text-text-primary p-1"><Copy size={16} /></button></div>
                  </div>
                  <div className="w-full h-px bg-[rgb(var(--fg-rgb))]/[0.03]" />
                  <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-text-faint uppercase tracking-[0.15em]">Contraseña archivada</label>
                      <div className="flex items-center justify-between"><span className="text-sm font-mono text-text-secondary">{showPassword ? account.password : '••••••••'}</span><div className="flex items-center gap-2"><button onClick={() => setShowPassword(!showPassword)} className="text-text-faint hover:text-text-primary p-1">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button><button onClick={() => copyToClipboard(account.password, 'Contraseña')} className="text-text-faint hover:text-text-primary p-1"><Key size={16} /></button></div></div>
                  </div>
              </div>
              <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 text-text-faint text-[10px] font-semibold uppercase tracking-widest"><Clock size={12} /><span>Archivado el {formatDate(new Date().toISOString())}</span></div>
                  <div className="grid grid-cols-2 gap-3 w-full mt-2">
                      <button onClick={() => onRestore && onRestore(account)} className="h-12 bg-status-success text-black font-black rounded-2xl text-xs flex items-center justify-center gap-2 active:scale-95 shadow-lg uppercase tracking-wider"><RotateCcw size={16} /> Restaurar</button>
                      <button onClick={() => onDelete(account.id)} className="h-12 bg-status-danger/10 border border-status-danger/20 text-status-danger-soft font-black rounded-2xl text-xs flex items-center justify-center gap-2 active:scale-95 uppercase tracking-wider"><Trash2 size={16} /> Eliminar</button>
                  </div>
                  <button onClick={onClose} className="text-text-disabled text-[10px] font-semibold uppercase tracking-widest py-2 active:text-text-primary">Cerrar</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    );
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]" />
          <motion.div 
            variants={modalVariants} 
            initial="hidden" 
            animate="visible" 
            exit="exit" 
            className="fixed bottom-0 left-0 right-0 bg-surface-1 rounded-t-xl border-t border-border-subtle z-[9999] flex flex-col max-h-[90dvh] max-w-md mx-auto md:bottom-6 md:rounded-xl shadow-modal overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-2 bg-surface-1 shrink-0 flex items-center justify-between z-10">
                <div className="min-w-0">
                    <h3 className="text-lg font-bold text-text-primary leading-tight truncate">{serviceObj?.name || 'Cuenta'}</h3>
                    <p className="text-[10px] text-text-faint font-bold uppercase tracking-[0.15em] mt-1">{account.account_type === 'cuenta_completa' ? 'Cuenta Completa' : isSingleEntity ? 'Servicio Unipersonal' : 'Por Pantallas'}</p>
                </div>
                <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-pill bg-surface-3 hover:bg-surface-4 text-text-muted hover:text-text-primary transition-all duration-150 ease-out-soft active:scale-90 shrink-0">
                    <X size={18} />
                </button>
            </div>

            {/* Hero: estado, dias restantes y cupo */}
            <div className="px-6 pb-4 shrink-0">
                <div className="rounded-xl p-4 border border-brand-primary/25 bg-gradient-to-br from-brand-primary/[0.14] to-brand-accent/10 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-md bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-brand-primary-hi shrink-0 overflow-hidden">
                        {serviceObj?.image_url ? <img src={serviceObj.image_url} className="w-full h-full object-cover" alt="" /> : (account.account_type === 'cuenta_completa' ? <LayoutTemplate size={20} /> : <MonitorPlay size={20} />)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isFailing ? 'bg-status-expiring' : isPaused ? 'bg-text-disabled' : 'bg-status-success animate-pulse'}`} />
                            <span className={`text-[11px] font-bold ${isFailing ? 'text-status-expiring' : isPaused ? 'text-text-disabled' : 'text-status-success-soft'}`}>{isFailing ? 'Fallando' : isPaused ? 'Pausada' : 'Activa'}</span>
                        </div>
                        <p className="text-[11px] text-text-muted mt-0.5 font-medium truncate">
                            {(() => { const d = getDaysRemaining(account.endDate); return d < 0 ? `Venció hace ${Math.abs(d)} días` : d === 0 ? 'Vence hoy' : `Vence en ${d} días · ${formatDate(account.endDate)}`; })()}
                        </p>
                    </div>
                    <div className="text-[9px] font-bold text-brand-primary-hi uppercase tracking-wide bg-brand-primary/15 border border-brand-primary/25 px-2 py-1 rounded-md shrink-0">
                        {usedProfilesCount(profiles)}/{account.maxScreens}
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="px-6 pb-4 grid grid-cols-4 gap-2 shrink-0">
                <button 
                    onClick={handleSyncAccountStock}
                    disabled={isSyncing}
                    className={`h-14 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all active:scale-95 ${isSyncing ? 'border-brand-primary/50 bg-brand-primary/10 text-brand-primary' : 'border-[rgb(var(--fg-rgb))]/5 bg-surface-3 text-text-muted hover:text-text-primary hover:bg-surface-4'}`}
                >
                    {isSyncing ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}
                    <span className="text-[8px] font-bold uppercase tracking-wide">Sync</span>
                </button>
                
                <button 
                    onClick={() => onToggleFailure(account)}
                    className={`h-14 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all active:scale-95 ${isFailing ? 'border-status-expiring/40 text-status-expiring bg-status-expiring/10' : 'border-[rgb(var(--fg-rgb))]/5 bg-surface-3 text-text-muted hover:text-status-expiring-soft hover:bg-surface-4'}`}
                >
                    {isFailing ? <ShieldAlert size={17} /> : <AlertTriangle size={17} />}
                    <span className="text-[8px] font-bold uppercase tracking-wide">Falla</span>
                </button>

                <button 
                    onClick={() => onToggleStatus(account)} 
                    className={`h-14 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all active:scale-95 ${isPaused ? 'border-zinc-700 text-text-disabled bg-[rgb(var(--fg-rgb))]/5' : 'border-status-success/30 text-status-success-soft bg-status-success/10'}`}
                >
                    {isPaused ? <Power size={17} /> : <ShieldCheck size={17} />}
                    <span className="text-[8px] font-bold uppercase tracking-wide">{isPaused ? 'Activa' : 'Pausa'}</span>
                </button>

                <button 
                    onClick={copyFullFormat} 
                    className="h-14 rounded-xl flex flex-col items-center justify-center gap-1 border border-[rgb(var(--fg-rgb))]/5 bg-surface-3 text-text-muted hover:text-text-primary active:scale-95 transition-all"
                >
                    <MessageSquare size={17} />
                    <span className="text-[8px] font-bold uppercase tracking-wide">Copiar</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="px-6 mb-4 shrink-0">
                <div className="flex bg-surface-zinc p-1 rounded-md border border-[rgb(var(--fg-rgb))]/5">
                    <button onClick={() => setActiveTab('details')} className={`flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-widest rounded-sm transition-all ${activeTab === 'details' ? 'bg-surface-4 text-text-primary shadow-sm border border-[rgb(var(--fg-rgb))]/10' : 'text-text-disabled hover:text-text-secondary'}`}>Detalles</button>
                    <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-widest rounded-sm transition-all flex items-center justify-center gap-2 ${activeTab === 'history' ? 'bg-surface-4 text-text-primary shadow-sm border border-[rgb(var(--fg-rgb))]/10' : 'text-text-disabled hover:text-text-secondary'}`}><History size={12} /> Historial</button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 space-y-4">
                {activeTab === 'details' ? (
                    <div className="space-y-4 animate-fade-in">
                        {/* Credentials Card */}
                        <div className="bg-surface-3 rounded-xl p-5 border border-[rgb(var(--fg-rgb))]/5 space-y-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-text-faint uppercase tracking-[0.15em] flex items-center gap-2">
                                    <Mail size={10} /> Correo de Acceso
                                </label>
                                <div className="flex items-center justify-between bg-surface-sunken rounded-md p-3 border border-[rgb(var(--fg-rgb))]/5 group hover:border-[rgb(var(--fg-rgb))]/10 transition-colors">
                                    <span className="text-sm font-bold text-text-primary truncate pr-2 select-all">{account.email}</span>
                                    <button onClick={() => copyToClipboard(account.email, 'Correo')} className="text-text-disabled hover:text-text-primary p-1.5 rounded-lg hover:bg-[rgb(var(--fg-rgb))]/10 transition-colors"><Copy size={14} /></button>
                                </div>
                            </div>

                            <div className="h-px bg-[rgb(var(--fg-rgb))]/5" />
                            
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-text-faint uppercase tracking-[0.15em] flex items-center gap-2">
                                    <Key size={10} /> Contraseña
                                </label>
                                <div className="flex items-center justify-between bg-surface-sunken rounded-md p-3 border border-[rgb(var(--fg-rgb))]/5 group hover:border-[rgb(var(--fg-rgb))]/10 transition-colors">
                                    <span className="text-sm font-mono text-text-primary tracking-wide">{showPassword ? account.password : '••••••••'}</span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setShowPassword(!showPassword)} className="text-text-disabled hover:text-text-primary p-1.5 rounded-lg hover:bg-[rgb(var(--fg-rgb))]/10 transition-colors">{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                        <button onClick={() => copyToClipboard(account.password, 'Contraseña')} className="text-text-disabled hover:text-text-primary p-1.5 rounded-lg hover:bg-[rgb(var(--fg-rgb))]/10 transition-colors"><Copy size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status / Profiles */}
                        {isSingleEntity ? (
                            isSoldSingle && (
                                <div className="rounded-xl p-4 border bg-surface-3 border-[rgb(var(--fg-rgb))]/5 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-md bg-brand-primary/15 border border-brand-primary/25 flex items-center justify-center text-brand-primary-hi shrink-0">
                                        <User size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] text-text-faint uppercase font-bold tracking-widest">Cliente Asignado</p>
                                        <p className="text-sm text-text-primary font-bold leading-tight truncate">{clientNameSingle}</p>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div>
                                <div className="flex justify-between items-end mb-3 px-1">
                                    <label className="text-[10px] font-bold text-text-faint uppercase tracking-[0.15em]">Perfiles</label>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {profiles.map((prof, idx) => {
                                        const isAvailable = !prof.name || prof.name.trim().toLowerCase() === 'disponible';
                                        const initial = isAvailable ? String(idx + 1) : prof.name.trim().charAt(0).toUpperCase();
                                        return (
                                            <div key={idx} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${isAvailable ? 'bg-status-success/[0.06] border-status-success/15' : 'bg-surface-3 border-[rgb(var(--fg-rgb))]/5'}`}>
                                                <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 ${isAvailable ? 'bg-status-success/20 text-status-success-soft' : 'bg-brand-primary/15 text-brand-primary-hi'}`}>
                                                    {initial}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className={`text-[11px] font-bold truncate ${isAvailable ? 'text-status-success-soft' : 'text-text-primary'}`}>{prof.name || 'Disponible'}</p>
                                                    {!isAvailable && <p className="text-[9px] text-text-disabled font-mono truncate">PIN {prof.pin || '---'}</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {account.notes && (
                            <div className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 rounded-xl p-5">
                                <p className="text-[10px] font-bold text-text-faint uppercase tracking-[0.15em] mb-2 flex items-center gap-2"><MessageSquare size={10} /> Notas Internas</p>
                                <p className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap font-medium">{account.notes}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4 h-full relative animate-fade-in">
                        {loadingHistory ? (
                            <div className="flex flex-col items-center justify-center h-48 text-text-disabled">
                                <Loader2 size={24} className="animate-spin mb-3 text-brand-primary" />
                                <p className="text-[10px] font-semibold uppercase tracking-widest">Cargando historial...</p>
                            </div>
                        ) : combinedHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-text-faint opacity-60">
                                <History size={40} className="mb-4" strokeWidth={1.5} />
                                <p className="text-[10px] font-semibold uppercase tracking-widest">Sin historial registrado</p>
                            </div>
                        ) : (
                            <div className="relative pl-4 border-l border-[rgb(var(--fg-rgb))]/10 space-y-8 py-2 pb-10 ml-2">
                                {combinedHistory.map((item, idx) => (
                                    <div key={idx} className="relative group">
                                        <div className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border-[2px] bg-surface-1 z-10 ${item.type === 'profile' ? 'border-status-success-soft shadow-[0_0_10px_rgba(52,211,153,0.4)]' : item.type === 'system' ? 'border-brand-primary shadow-[0_0_10px_rgba(106,44,255,0.4)]' : 'border-zinc-500'}`} />
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[10px] font-bold text-text-faint uppercase tracking-[0.15em]">{item.date.toLocaleDateString()} • {item.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            <p className={`text-xs leading-relaxed ${item.type === 'profile' ? 'text-emerald-300 font-bold' : item.type === 'system' ? 'text-text-secondary' : 'text-text-muted font-medium'}`}>{item.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-surface-1 border-t border-[rgb(var(--fg-rgb))]/5 shrink-0 flex gap-3 z-10">
                <button onClick={() => { onRenew(account); }} className="flex-1 h-12 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-glow flex items-center justify-center gap-2 active:scale-95 transition-all hover:brightness-110">
                    <RefreshCw size={18} strokeWidth={2.5} /> Renovar
                </button>
                <div className="flex gap-2">
                    <button onClick={() => { onEdit(account); onClose(); }} className="h-12 px-6 rounded-2xl bg-surface-3 text-text-secondary font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all border border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-4 hover:text-text-primary">
                        Editar
                    </button>
                    <button onClick={() => onDelete(account.id)} className="h-12 w-12 rounded-2xl bg-status-danger/10 text-status-danger flex items-center justify-center active:scale-95 transition-all border border-status-danger/20 hover:bg-status-danger/20">
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CuentaDetailModal;
