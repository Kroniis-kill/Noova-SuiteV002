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
            <motion.div variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="fixed bottom-0 left-0 right-0 bg-surface-1 rounded-t-xl border border-[rgb(var(--fg-rgb))]/5 z-[9999] p-6 pb-12 max-w-[400px] mx-auto md:bottom-6 md:rounded-xl flex flex-col overflow-hidden">
              <div className="w-12 h-1.5 bg-surface-4 rounded-full mx-auto mb-6 shrink-0" />
              <div className="flex items-center gap-4 mb-8">
                 <div className="w-14 h-14 rounded-md bg-surface-sunken flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 overflow-hidden shrink-0">
                    {serviceObj?.image_url ? <img src={serviceObj.image_url} className="w-full h-full object-cover" alt="" /> : <Trash2 size={24} className="text-text-faint" />}
                 </div>
                 <div className="min-w-0">
                    <h3 className="text-lg font-black text-text-primary truncate">{serviceObj?.name || 'Servicio Desconocido'}</h3>
                    <div className="flex items-center gap-2 mt-1"><span className="px-2 py-0.5 bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 rounded-md text-[10px] font-semibold text-text-disabled uppercase tracking-widest">En Papelera</span></div>
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
            className="fixed bottom-0 left-0 right-0 bg-surface-1 rounded-t-xl z-[9999] flex flex-col max-h-[90dvh] max-w-[400px] mx-auto md:bottom-6 md:rounded-xl border border-[rgb(var(--fg-rgb))]/5 overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 pt-[18px] pb-[14px] bg-surface-1 shrink-0 flex items-start justify-between border-b border-[rgb(var(--fg-rgb))]/5 z-10">
                <div className="min-w-0">
                    <h3 className="text-[17px] font-bold text-text-primary leading-tight truncate">{serviceObj?.name || 'Cuenta'}</h3>
                    <p className="text-[9px] text-text-faint font-bold uppercase tracking-[0.15em] mt-1">{account.account_type === 'cuenta_completa' ? 'Cuenta Completa' : isSingleEntity ? 'Servicio Unipersonal' : 'Por Pantallas'}</p>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-2 text-text-muted hover:text-text-primary transition-all active:scale-90 shrink-0">
                    <X size={16} />
                </button>
            </div>

            {/* Hero: estado, dias restantes y cupo */}
            <div className="px-5 pt-4 shrink-0">
                <div className="rounded-xl p-4 border border-brand-primary/25 bg-gradient-to-br from-brand-primary/[0.14] to-brand-accent/10 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-md bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-brand-primary-hi shrink-0 overflow-hidden">
                        {serviceObj?.image_url ? <img src={serviceObj.image_url} className="w-full h-full object-cover" alt="" /> : (account.account_type === 'cuenta_completa' ? <LayoutTemplate size={20} /> : <MonitorPlay size={20} />)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isFailing ? 'bg-status-expiring' : isPaused ? 'bg-text-faint' : 'bg-status-success animate-pulse'}`} />
                            <span className={`text-[12px] font-bold ${isFailing ? 'text-status-expiring' : isPaused ? 'text-text-muted' : 'text-status-success-soft'}`}>{isFailing ? 'Fallando' : isPaused ? 'Pausada' : 'Activa'}</span>
                        </div>
                        <p className="text-[11px] text-text-muted mt-[2px] truncate">
                            {(() => { const d = getDaysRemaining(account.endDate); return d < 0 ? `Venció hace ${Math.abs(d)} días` : d === 0 ? 'Vence hoy' : `Vence en ${d} días · ${formatDate(account.endDate)}`; })()}
                        </p>
                    </div>
                    <div className="text-[9px] font-bold text-brand-primary-hi uppercase tracking-[0.1em] bg-brand-primary/15 border border-brand-primary/25 px-2 py-1 rounded-lg shrink-0">
                        {usedProfilesCount(profiles)}/{account.maxScreens}
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="px-5 pt-[14px] grid grid-cols-4 gap-2 shrink-0">
                <button 
                    onClick={handleSyncAccountStock}
                    disabled={isSyncing}
                    className={`rounded-xl py-[10px] px-1 flex flex-col items-center justify-center gap-[5px] border transition-all active:scale-95 ${isSyncing ? 'border-brand-primary/50 bg-brand-primary/10 text-brand-primary-hi' : 'border-[rgb(var(--fg-rgb))]/5 bg-surface-3 text-text-muted hover:text-text-primary'}`}
                >
                    {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                    <span className="text-[8px] font-semibold uppercase tracking-[0.05em]">Sync</span>
                </button>
                
                <button 
                    onClick={() => onToggleFailure(account)}
                    className={`rounded-xl py-[10px] px-1 flex flex-col items-center justify-center gap-[5px] border transition-all active:scale-95 ${isFailing ? 'border-status-expiring/25 text-status-expiring bg-status-expiring/10' : 'border-[rgb(var(--fg-rgb))]/5 bg-surface-3 text-text-muted hover:text-text-primary'}`}
                >
                    {isFailing ? <ShieldAlert size={18} /> : <AlertTriangle size={18} />}
                    <span className="text-[8px] font-semibold uppercase tracking-[0.05em]">Falla</span>
                </button>

                <button 
                    onClick={() => onToggleStatus(account)} 
                    className={`rounded-xl py-[10px] px-1 flex flex-col items-center justify-center gap-[5px] border transition-all active:scale-95 ${isPaused ? 'border-[rgb(var(--fg-rgb))]/5 text-text-muted bg-surface-3' : 'border-status-success/25 text-status-success-soft bg-status-success/10'}`}
                >
                    {isPaused ? <Power size={18} /> : <ShieldCheck size={18} />}
                    <span className="text-[8px] font-semibold uppercase tracking-[0.05em]">{isPaused ? 'Activa' : 'Pausa'}</span>
                </button>

                <button 
                    onClick={copyFullFormat} 
                    className="rounded-xl py-[10px] px-1 flex flex-col items-center justify-center gap-[5px] border border-[rgb(var(--fg-rgb))]/5 bg-surface-3 text-text-muted hover:text-text-primary active:scale-95 transition-all"
                >
                    <MessageSquare size={18} />
                    <span className="text-[8px] font-semibold uppercase tracking-[0.05em]">Copiar</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="px-5 pt-[14px] shrink-0">
                <div className="flex bg-surface-3 p-[3px] rounded-xl">
                    <button onClick={() => setActiveTab('details')} className={`flex-1 py-2 text-[11px] font-bold rounded-md transition-all ${activeTab === 'details' ? 'bg-surface-4 text-text-primary' : 'text-text-disabled'}`}>Detalles</button>
                    <button onClick={() => setActiveTab('history')} className={`flex-1 py-2 text-[11px] font-bold rounded-md transition-all flex items-center justify-center gap-[5px] ${activeTab === 'history' ? 'bg-surface-4 text-text-primary' : 'text-text-disabled'}`}><History size={13} /> Historial</button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pt-[14px] pb-[18px] space-y-3">
                {activeTab === 'details' ? (
                    <div className="space-y-3 animate-fade-in">
                        {/* Credentials Card */}
                        <div className="bg-surface-3 rounded-xl p-[14px] border border-[rgb(var(--fg-rgb))]/5 flex flex-col gap-3">
                            <div>
                                <div className="text-[9px] font-bold text-text-faint uppercase tracking-[0.1em] mb-[5px]">Correo de acceso</div>
                                <div className="flex items-center justify-between bg-surface-sunken rounded-md py-[9px] px-[11px]">
                                    <span className="text-[13px] font-semibold text-text-primary truncate pr-2 select-all">{account.email}</span>
                                    <button onClick={() => copyToClipboard(account.email, 'Correo')} className="text-text-faint hover:text-text-primary shrink-0"><Copy size={14} /></button>
                                </div>
                            </div>

                            <div className="h-px bg-[rgb(var(--fg-rgb))]/5" />

                            <div>
                                <div className="text-[9px] font-bold text-text-faint uppercase tracking-[0.1em] mb-[5px]">Contraseña</div>
                                <div className="flex items-center justify-between bg-surface-sunken rounded-md py-[9px] px-[11px]">
                                    <span className="text-[13px] font-mono text-text-primary tracking-wide">{showPassword ? account.password : '••••••••'}</span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button onClick={() => setShowPassword(!showPassword)} className="text-text-faint hover:text-text-primary">{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                        <button onClick={() => copyToClipboard(account.password, 'Contraseña')} className="text-text-faint hover:text-text-primary"><Copy size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status / Profiles */}
                        {isSingleEntity ? (
                            isSoldSingle && (
                                <div className="rounded-xl p-[14px] border border-[rgb(var(--fg-rgb))]/5 bg-surface-3 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-md bg-brand-primary/15 flex items-center justify-center text-brand-primary-hi shrink-0 text-[11px] font-bold">
                                        {clientNameSingle.trim().charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] text-text-faint uppercase font-bold tracking-[0.1em]">Cliente Asignado</p>
                                        <p className="text-[13px] text-text-primary font-bold leading-tight truncate">{clientNameSingle}</p>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div>
                                <div className="text-[9px] font-bold text-text-faint uppercase tracking-[0.1em] mb-2 pl-[2px]">Perfiles</div>
                                <div className="grid grid-cols-2 gap-2">
                                    {profiles.map((prof, idx) => {
                                        const isAvailable = !prof.name || prof.name.trim().toLowerCase() === 'disponible';
                                        const initial = isAvailable ? String(idx + 1) : prof.name.trim().charAt(0).toUpperCase();
                                        return (
                                            <div key={idx} className={`flex items-center gap-2 p-[10px] rounded-xl border ${isAvailable ? 'bg-status-success/[0.06] border-status-success/15' : 'bg-surface-3 border-[rgb(var(--fg-rgb))]/5'}`}>
                                                <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 ${isAvailable ? 'bg-status-success/15 text-status-success-soft' : 'bg-brand-primary/15 text-brand-primary-hi'}`}>
                                                    {initial}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className={`text-[11px] font-bold truncate ${isAvailable ? 'text-status-success-soft' : 'text-text-primary'}`}>{prof.name || 'Disponible'}</p>
                                                    {!isAvailable && <p className="text-[9px] text-text-faint font-mono truncate">PIN {prof.pin || '---'}</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {account.notes && (
                            <div className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 rounded-xl p-[14px]">
                                <p className="text-[9px] font-bold text-text-faint uppercase tracking-[0.1em] mb-[6px] flex items-center gap-[6px]"><MessageSquare size={12} /> Notas internas</p>
                                <p className="text-[12px] text-text-muted leading-[1.5] whitespace-pre-wrap">{account.notes}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4 h-full relative animate-fade-in">
                        {loadingHistory ? (
                            <div className="flex flex-col items-center justify-center h-48 text-text-faint">
                                <Loader2 size={24} className="animate-spin mb-3 text-brand-primary-hi" />
                                <p className="text-[9px] font-bold uppercase tracking-[0.1em]">Cargando historial...</p>
                            </div>
                        ) : combinedHistory.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-text-faint opacity-60">
                                <History size={40} className="mb-4" strokeWidth={1.5} />
                                <p className="text-[9px] font-bold uppercase tracking-[0.1em]">Sin historial registrado</p>
                            </div>
                        ) : (
                            <div className="relative pl-[14px] border-l border-[rgb(var(--fg-rgb))]/10 ml-1">
                                {combinedHistory.map((item, idx) => (
                                    <div key={idx} className="relative pb-[18px] last:pb-0">
                                        <span className={`absolute -left-[19px] top-[2px] w-2 h-2 rounded-full ${item.type === 'profile' ? 'bg-status-success' : item.type === 'system' ? 'bg-brand-primary-hi' : 'bg-text-faint'}`} />
                                        <div className="text-[9px] font-bold text-text-faint uppercase tracking-[0.1em]">{item.date.toLocaleDateString()} · {item.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                        <p className="text-[12px] text-text-secondary mt-[3px]">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Actions */}
            <div className="p-5 pb-[18px] bg-surface-1 border-t border-[rgb(var(--fg-rgb))]/5 shrink-0 flex gap-2 z-10">
                <button onClick={() => { onRenew(account); }} className="flex-1 h-11 bg-gradient-to-r from-brand-primary to-brand-accent text-text-primary rounded-md font-bold text-[12px] uppercase tracking-[0.05em] flex items-center justify-center gap-[6px] active:scale-95 transition-all hover:brightness-110">
                    <RefreshCw size={15} strokeWidth={2.5} /> Renovar
                </button>
                <button onClick={() => { onEdit(account); onClose(); }} className="h-11 px-4 rounded-2xl bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 text-text-secondary font-bold text-[11px] uppercase active:scale-95 transition-all">
                    Editar
                </button>
                <button onClick={() => onDelete(account.id)} className="w-11 h-11 rounded-2xl bg-status-danger/10 border border-status-danger/20 text-status-danger flex items-center justify-center shrink-0 active:scale-95 transition-all">
                    <Trash2 size={17} />
                </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CuentaDetailModal;
