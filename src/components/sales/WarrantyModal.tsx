import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { Sale, Account, Service } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  ShieldCheck, Calendar, ChevronDown, Lock, AlertTriangle, 
  LayoutGrid, RefreshCw, Search, X, ChevronRight, 
  MessageCircle, Check, Monitor, ArrowRightLeft, 
  ArrowRight, Info, ShoppingCart, Layers, Timer, Wallet
} from 'lucide-react';
import { sendWhatsAppMessage, formatDate, parseLocalISO, getLocalDateISO } from '../../utils/contactosUtils';
import { generateUUID } from '../../utils/uuid';
import { calculateOccupancy } from '../../utils/inventarioUtils';
import { supabase } from '../../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { getDaysRemaining } from '../../utils/expiredUtils';

// --- SUB-COMPONENTS ---

interface SearchListModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  onSelect: (item: any) => void;
  title: string;
  placeholder?: string;
  renderItem: (item: any) => React.ReactNode;
  zIndex?: number;
}

const SearchListModal: React.FC<SearchListModalProps> = ({ isOpen, onClose, items, onSelect, title, placeholder, renderItem, zIndex }) => {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search) return items;
    return items.filter(item => 
        JSON.stringify(item).toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  useEffect(() => { if (isOpen) setSearch(''); }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} zIndex={zIndex}>
      <div className="flex flex-col h-[60vh] md:h-[450px] pt-1">
        <div className="relative mb-4 shrink-0">
           <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
           <input 
             value={search} onChange={(e) => setSearch(e.target.value)}
             placeholder={placeholder || "Buscar..."}
             className="w-full bg-surface-sunken border border-white/10 rounded-md pl-11 pr-10 py-3.5 text-sm text-white outline-none focus:border-brand-primary/50 transition-all placeholder:text-zinc-600 font-medium"
             autoFocus
           />
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
           {filtered.map((item, idx) => (
              <button 
                key={idx} 
                type="button"
                onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(item); 
                    onClose(); 
                }} 
                className="w-full text-left mb-2 outline-none"
              >
                 {renderItem(item)}
              </button>
           ))}
           {filtered.length === 0 && (
               <div className="py-20 text-center opacity-40">
                   <p className="text-sm">No se encontraron resultados.</p>
               </div>
           )}
        </div>
      </div>
    </Modal>
  );
};

// --- MAIN COMPONENT ---

interface WarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  zIndex?: number;
}

const WarrantyModal: React.FC<WarrantyModalProps> = ({ isOpen, onClose, sale, zIndex = 10000 }) => {
  const { sales, accounts, updateSale, updateAccount, clients, settings, addProfileHistory, services } = useData();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  
  // -- ESTADOS DE MODO Y SELECCIÓN --
  const [warrantyMode, setWarrantyMode] = useState<'replace' | 'credit'>('replace');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [targetSaleId, setTargetSaleId] = useState(''); // Para modo abono
  const [daysToAdd, setDaysToAdd] = useState(0);
  const [prorataAdjustment, setProrataAdjustment] = useState(0);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profilePin, setProfilePin] = useState('');
  const [reason, setReason] = useState('');
  
  const [modalSearch, setModalSearch] = useState<'account' | 'service' | 'target_sale' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicialización de datos al abrir
  useEffect(() => {
    if (isOpen && sale) {
      setSelectedAccountId(sale.accountId);
      const svc = services.find(s => s.name === sale.serviceName);
      setSelectedServiceId(svc?.id || '');
      setTargetSaleId('');
      setDaysToAdd(0);
      setProrataAdjustment(0);
      setNewExpiryDate(sale.expiryDate);
      setWarrantyMode('replace');
      setReason('');
      
      if (sale.assignedProfiles && sale.assignedProfiles.length > 0) {
        setProfileName(sale.assignedProfiles[0].name);
        setProfilePin(sale.assignedProfiles[0].pin);
      } else {
        setProfileName(''); setProfilePin('');
      }
    }
  }, [isOpen, sale, services]);

  // -- LÓGICA DE CÁLCULO DE PRORRATA / ABONO --
  const currentAccount = useMemo(() => accounts.find(a => a.id === sale?.accountId), [sale, accounts]);
  const targetSale = useMemo(() => sales.find(s => s.id === targetSaleId), [targetSaleId, sales]);
  const client = useMemo(() => clients.find(c => c.id === sale?.clientId), [sale, clients]);
  
  const clientOtherActiveSales = useMemo(() => {
      if (!sale) return [];
      return sales.filter(s => s.clientId === sale.clientId && s.id !== sale.id && getDaysRemaining(s.expiryDate) > 0);
  }, [sale, sales]);

  useEffect(() => {
      if (!sale) return;

      if (warrantyMode === 'replace') {
          const originalSvc = services.find(s => s.name === sale.serviceName);
          const newSvc = services.find(s => s.id === selectedServiceId);
          if (!newSvc || !originalSvc || originalSvc.id === newSvc.id) {
              setProrataAdjustment(0); return;
          }
          const currentRemainingDays = getDaysRemaining(sale.expiryDate, currentAccount);
          if (currentRemainingDays <= 0) { setProrataAdjustment(0); return; }
          const dailyOriginal = (originalSvc.publicPrice || 1) / 30;
          const creditValue = dailyOriginal * currentRemainingDays;
          const dailyNew = (newSvc.publicPrice || 1) / 30;
          const extraDays = dailyNew > 0 ? (creditValue / dailyNew) : currentRemainingDays;
          setProrataAdjustment(Math.round(extraDays - currentRemainingDays));
      } else {
          // LÓGICA DE ABONO: De un servicio fallido a otro activo
          if (!targetSale) { setProrataAdjustment(0); return; }
          const sourceSvc = services.find(s => s.name === sale.serviceName);
          const destSvc = services.find(s => s.name === targetSale.serviceName);
          if (!sourceSvc || !destSvc) { setProrataAdjustment(0); return; }

          const sourceRemainingDays = getDaysRemaining(sale.expiryDate, currentAccount);
          if (sourceRemainingDays <= 0) { setProrataAdjustment(0); return; }

          const isReseller = !!client?.resellerId;
          const priceSource = isReseller ? (sourceSvc.resellerPrice || 0) : (sourceSvc.publicPrice || 0);
          const creditValue = (priceSource / 30) * sourceRemainingDays;
          const priceDest = isReseller ? (destSvc.resellerPrice || 0) : (destSvc.publicPrice || 0);
          const dailyDest = priceDest / 30;
          
          const extraDays = dailyDest > 0 ? Math.round(creditValue / dailyDest) : 0;
          setProrataAdjustment(extraDays);
      }
  }, [warrantyMode, selectedServiceId, targetSaleId, sale, services, currentAccount, client]);

  // Actualizar fecha final
  useEffect(() => {
    if (!sale || warrantyMode !== 'replace') return;
    const current = parseLocalISO(sale.expiryDate);
    current.setDate(current.getDate() + daysToAdd + prorataAdjustment);
    setNewExpiryDate(current.toISOString().split('T')[0]);
  }, [daysToAdd, prorataAdjustment, sale, warrantyMode]);

  if (!sale) return null;

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const logPrefix = `\n[GARANTÍA ${new Date().toLocaleDateString()}]: `;

    try {
        if (warrantyMode === 'credit') {
            if (!targetSale) throw new Error("Debes seleccionar un servicio destino");
            
            // 1. Extender destino
            const targetOldExpiry = parseLocalISO(targetSale.expiryDate);
            targetOldExpiry.setDate(targetOldExpiry.getDate() + prorataAdjustment);
            const targetNewExpiry = targetOldExpiry.toISOString().split('T')[0];

            await updateSale({
                ...targetSale,
                expiryDate: targetNewExpiry,
                notes: (targetSale.notes || '') + logPrefix + `Abono de ${prorataAdjustment} días recibido desde ${sale.serviceName} por falla.`
            });

            // 2. Finalizar origen
            await updateSale({
                ...sale,
                expiryDate: getLocalDateISO(),
                notes: (sale.notes || '') + logPrefix + `Tiempo transferido a ${targetSale.serviceName}. Servicio cerrado.`
            });
            
            showToast('Saldo transferido exitosamente', 'success');

        } else {
            // MODO REEMPLAZO / REPOSICIÓN
            if (!selectedAccountId || !reason) throw new Error("Datos incompletos");

            let updatedSale = { ...sale };
            let logNote = logPrefix + reason + ".";

            // Cambio de servicio si aplica
            const selectedService = services.find(s => s.id === selectedServiceId);
            if (selectedService && selectedService.name !== sale.serviceName) {
                updatedSale.serviceName = selectedService.name;
                const isReseller = !!client?.resellerId;
                const newPriceUnit = isReseller ? (selectedService.resellerPrice || 0) : (selectedService.publicPrice || 0);
                updatedSale.amount = selectedService.type === 'cuenta_completa' ? newPriceUnit : newPriceUnit * (sale.screensCount || 1);
                logNote += ` Cambio de tarifa: ${sale.serviceName} -> ${selectedService.name}.`;
            }

            // Cambio de cuenta si aplica
            if (selectedAccountId !== sale.accountId) {
                const oldAccount = accounts.find(a => a.id === sale.accountId);
                const newAccount = accounts.find(a => a.id === selectedAccountId);
                if (oldAccount) {
                    const oldUsed = Math.max(0, (oldAccount.usedScreens || 0) - (sale.screensCount || 1));
                    updateAccount({ ...oldAccount, usedScreens: oldUsed });
                }
                if (newAccount) {
                    const newUsed = (newAccount.usedScreens || 0) + (sale.screensCount || 1);
                    updateAccount({ ...newAccount, usedScreens: newUsed });
                }
                updatedSale.accountId = selectedAccountId;
                logNote += ` Nueva cuenta: ${newAccount?.email}.`;
            }

            // Ajuste de tiempo
            const totalAdj = daysToAdd + prorataAdjustment;
            if (totalAdj !== 0) {
                updatedSale.expiryDate = newExpiryDate;
                logNote += ` Compensación: ${totalAdj} días.`;
            }

            if (updatedSale.assignedProfiles && updatedSale.assignedProfiles.length > 0) {
                updatedSale.assignedProfiles[0] = { name: profileName, pin: profilePin };
            }

            updatedSale.notes = (updatedSale.notes || '') + logNote;
            await updateSale(updatedSale);
            
            showToast('Garantía procesada', 'success');
        }
        onClose();
    } catch (e: any) {
        showToast(e.message || 'Error al procesar', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const styles = {
    label: "text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block ml-1",
    inputContainer: "relative flex items-center bg-surface-sunken border border-white/10 rounded-md h-[52px] transition-all focus-within:border-brand-primary/60",
    input: "w-full bg-transparent text-[13px] text-white placeholder:text-zinc-600 px-3 h-full outline-none font-medium rounded-md",
    modeBtn: "flex-1 py-3.5 rounded-md text-[11px] font-semibold uppercase transition-all flex items-center justify-center gap-2 border"
  };

  const subModalZIndex = (zIndex || 10000) + 100;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Gestión de Garantía" zIndex={zIndex}>
         <div className="space-y-4 pt-1">
            
            {/* SEGMENTED CONTROL MODO */}
            <div className="flex bg-surface-sunken p-1 rounded-lg border border-white/10">
                <button 
                    onClick={() => setWarrantyMode('replace')}
                    className={`${styles.modeBtn} ${warrantyMode === 'replace' ? 'bg-surface-4 text-white border-white/10 shadow-sm' : 'bg-transparent text-zinc-500 border-transparent'}`}
                >
                    <RefreshCw size={14} /> Reponer / Cambiar
                </button>
                <button 
                    onClick={() => setWarrantyMode('credit')}
                    className={`${styles.modeBtn} ${warrantyMode === 'credit' ? 'bg-surface-4 text-brand-primary border-white/10 shadow-sm' : 'bg-transparent text-zinc-500 border-transparent'}`}
                >
                    <ArrowRightLeft size={14} /> Abonar a otro
                </button>
            </div>

            <AnimatePresence mode="wait">
                {warrantyMode === 'replace' ? (
                    <motion.div key="replace" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                        {/* SELECTOR SERVICIO */}
                        <div>
                           <label className={styles.label}>PLATAFORMA DESTINO</label>
                           <button type="button" onClick={() => setModalSearch('service')} className={`${styles.inputContainer} w-full text-left`}>
                              <LayoutGrid size={18} className="absolute left-4 text-zinc-500" />
                              <div className={`${styles.input} pl-11 flex items-center justify-between pr-8`}>
                                <span className="text-white truncate">{services.find(s => s.id === selectedServiceId)?.name || sale.serviceName}</span>
                                {selectedServiceId && services.find(s => s.id === selectedServiceId)?.name !== sale.serviceName && (
                                    <span className="text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold border border-amber-500/20">CAMBIO</span>
                                )}
                              </div>
                              <ChevronDown size={14} className="absolute right-4 text-zinc-500" />
                           </button>
                        </div>

                        {/* SELECTOR CUENTA */}
                        <div>
                           <label className={styles.label}>CUENTA DE REEMPLAZO</label>
                           <button type="button" onClick={() => setModalSearch('account')} className={`${styles.inputContainer} w-full text-left`}>
                              <RefreshCw size={18} className="absolute left-4 text-zinc-500" />
                              <div className={`${styles.input} pl-11 flex items-center`}><span className="text-white truncate">{accounts.find(a => a.id === selectedAccountId)?.email || 'Seleccionar cuenta...'}</span></div>
                              <ChevronDown size={14} className="absolute right-4 text-zinc-500" />
                           </button>
                        </div>

                        {/* AJUSTE TIEMPO */}
                        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                           <div className="flex items-center gap-2 mb-3 text-[10px] font-semibold text-zinc-500 uppercase"><Calendar size={12} /><span>Compensación de tiempo</span></div>
                           <div className="grid grid-cols-2 gap-3">
                              <div className="bg-surface-sunken rounded-md p-3 border border-white/5">
                                 <label className="text-[9px] text-zinc-600 font-bold mb-1 block uppercase">Días Manuales</label>
                                 <input type="number" value={daysToAdd} onChange={(e) => setDaysToAdd(parseInt(e.target.value) || 0)} className="w-full bg-transparent text-white font-bold outline-none" />
                              </div>
                              <div className="bg-surface-sunken rounded-md p-3 border border-white/5 text-center">
                                 <label className="text-[9px] text-zinc-600 font-bold mb-1 block uppercase">Nueva Fecha</label>
                                 <div className="text-emerald-400 font-bold text-sm font-mono">{newExpiryDate}</div>
                              </div>
                           </div>
                           {prorataAdjustment !== 0 && (
                               <div className="mt-3 p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between">
                                   <span className="text-[10px] text-blue-300 font-medium">Equivalencia por cambio de precio:</span>
                                   <span className={`text-xs font-semibold ${prorataAdjustment > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{prorataAdjustment > 0 ? `+${prorataAdjustment}` : prorataAdjustment}d</span>
                               </div>
                           )}
                        </div>

                        {/* CREDENCIALES PERFIL */}
                        <div className="bg-white/[0.02] border border-white/[0.04] rounded-xl p-4">
                           <div className="flex items-center gap-2 mb-3 text-[10px] font-semibold text-zinc-500 uppercase"><Monitor size={12} /><span>Credenciales de perfil</span></div>
                           <div className="flex gap-3">
                              <div className="flex-1 h-[44px] bg-surface-sunken rounded-sm border border-white/5"><input placeholder="Nombre Perfil" value={profileName} onChange={(e) => setProfileName(e.target.value)} className="w-full h-full bg-transparent px-3 text-xs text-white outline-none" /></div>
                              <div className="w-[80px] h-[44px] bg-surface-sunken rounded-sm border border-white/5"><input placeholder="PIN" value={profilePin} onChange={(e) => setProfilePin(e.target.value)} className="w-full h-full bg-transparent text-center text-xs text-white font-mono outline-none" /></div>
                           </div>
                        </div>

                        <div>
                           <label className={styles.label}>MOTIVO <span className="text-red-400">*</span></label>
                           <div className={styles.inputContainer}>
                              <AlertTriangle size={18} className="absolute left-4 text-zinc-500" />
                              <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-full bg-transparent text-[13px] text-white px-11 outline-none appearance-none cursor-pointer font-medium">
                                 <option value="">Seleccionar...</option>
                                 <option value="Bloqueo de hogar">Bloqueo de hogar</option>
                                 <option value="Caída de cuenta">Caída de cuenta</option>
                                 <option value="Error en perfil">Error en perfil</option>
                                 <option value="Compensación">Compensación por fallas</option>
                              </select>
                              <ChevronDown size={14} className="absolute right-4 text-zinc-500" />
                           </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div key="credit" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
                        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg flex gap-3 items-start">
                            <div className="p-2 bg-blue-500/20 rounded-full text-blue-400 shrink-0"><Info size={18} /></div>
                            <p className="text-[11px] text-blue-200 leading-snug">Ideal si el cliente prefiere sumar el tiempo restante de este servicio fallido a otro que ya tenga activo.</p>
                        </div>

                        <div>
                           <label className={styles.label}>SELECCIONAR SERVICIO DESTINO</label>
                           <button type="button" onClick={() => setModalSearch('target_sale')} className={`${styles.inputContainer} w-full text-left cursor-pointer active:scale-95 transition-all`}>
                              <ShoppingCart size={18} className="absolute left-4 text-zinc-500" />
                              <div className={`${styles.input} pl-11 flex items-center`}><span className={targetSale ? 'text-white' : 'text-zinc-500'}>{targetSale ? `${targetSale.serviceName} (Vence: ${targetSale.expiryDate})` : 'Elegir servicio activo...'}</span></div>
                              <ChevronDown size={14} className="absolute right-4 text-zinc-500" />
                           </button>
                        </div>

                        {targetSale && (
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center space-y-4">
                                <div className="flex items-center justify-center gap-6">
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mb-2 border border-red-500/20"><Layers size={20} /></div>
                                        <span className="text-[10px] font-semibold text-zinc-500 uppercase">Origen</span>
                                        <span className="text-xs font-semibold text-white truncate max-w-[80px]">{sale.serviceName}</span>
                                    </div>
                                    <ArrowRight className="text-zinc-700" />
                                    <div className="flex flex-col items-center">
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2 border border-emerald-500/20"><RefreshCw size={20} /></div>
                                        <span className="text-[10px] font-semibold text-zinc-500 uppercase">Destino</span>
                                        <span className="text-xs font-semibold text-white truncate max-w-[80px]">{targetSale.serviceName}</span>
                                    </div>
                                </div>
                                
                                <div className="pt-4 border-t border-white/5">
                                    <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-widest">Equivalencia Abonar:</p>
                                    <p className="text-3xl font-extrabold text-emerald-400 mt-1">+{prorataAdjustment} DÍAS</p>
                                    <p className="text-[10px] text-zinc-500 mt-2">Próxima fecha: <span className="text-zinc-300 font-bold">{
                                        (() => {
                                            const d = parseLocalISO(targetSale.expiryDate);
                                            d.setDate(d.getDate() + prorataAdjustment);
                                            return d.toISOString().split('T')[0];
                                        })()
                                    }</span></p>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="pt-4 flex flex-col gap-3">
              <button 
                  onClick={() => handleSave()} 
                  disabled={isSubmitting || (warrantyMode === 'replace' && (!reason || !selectedAccountId)) || (warrantyMode === 'credit' && !targetSaleId)} 
                  className="bg-gradient-to-r from-brand-primary to-brand-accent text-white h-[56px] rounded-lg font-bold shadow-glow transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-[13px]"
              >
                  {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <><Check size={18} /> {warrantyMode === 'replace' ? 'Confirmar Reposición' : 'Confirmar Abono'}</>}
              </button>
              <button onClick={onClose} className="w-full py-3 text-zinc-500 text-xs font-semibold active:text-white">Cerrar</button>
            </div>
         </div>
      </Modal>

      {/* SUB-MODALES DE BÚSQUEDA */}
      <SearchListModal 
         isOpen={modalSearch === 'account'} 
         onClose={() => setModalSearch(null)} 
         title="Seleccionar Cuenta"
         zIndex={subModalZIndex}
         items={accounts.filter(a => a.serviceId === selectedServiceId && a.status === 'activa' && (a.id === currentAccount?.id || (a.maxScreens - calculateOccupancy(a) >= (sale.screensCount || 1))))}
         onSelect={(acc) => setSelectedAccountId(acc.id)}
         renderItem={(acc: Account) => (
            <div className="flex items-center gap-3 p-3 rounded-md bg-surface-zinc border border-white/5 hover:bg-surface-4 transition-all group text-left">
                <div className="w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white shrink-0"><RefreshCw size={18} /></div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-200 group-hover:text-white truncate">{acc.email}</p>
                    <p className="text-[10px] text-zinc-500">{acc.maxScreens - calculateOccupancy(acc)} disponibles</p>
                </div>
                <ChevronRight size={16} className="text-zinc-600 group-hover:text-white" />
            </div>
         )}
      />

      <SearchListModal 
        isOpen={modalSearch === 'service'} 
        onClose={() => setModalSearch(null)} 
        title="Cambiar Servicio"
        zIndex={subModalZIndex}
        items={services} 
        onSelect={(svc) => { setSelectedServiceId(svc.id); if (svc.id !== currentAccount?.serviceId) setSelectedAccountId(''); }}
        renderItem={(s: Service) => (
            <div className="flex items-center justify-between p-3 rounded-md bg-surface-zinc border border-white/5 hover:bg-surface-4 transition-all group text-left">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white shrink-0"><Monitor size={18} /></div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-200 group-hover:text-white truncate">{s.name}</p>
                        <p className="text-[10px] text-zinc-500">${s.publicPrice} / mes</p>
                    </div>
                 </div>
                 <ChevronRight size={16} className="text-zinc-600 group-hover:text-white" />
            </div>
        )}
      />

      <SearchListModal 
        isOpen={modalSearch === 'target_sale'} 
        onClose={() => setModalSearch(null)} 
        title="Elegir Servicio Destino"
        zIndex={subModalZIndex}
        items={clientOtherActiveSales} 
        onSelect={(s: Sale) => setTargetSaleId(s.id)}
        renderItem={(s: Sale) => (
            <div className="flex items-center justify-between p-3 rounded-md bg-surface-zinc border border-white/5 hover:border-brand-primary/30 transition-all text-left">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center border border-brand-primary/20"><RefreshCw size={18} /></div>
                    <div>
                        <p className="text-sm font-bold text-white leading-tight">{s.serviceName}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Vence: {formatDate(s.expiryDate)}</p>
                    </div>
                </div>
                <ChevronRight size={14} className="text-zinc-600" />
            </div>
        )}
      />
    </>
  );
};

export default WarrantyModal;