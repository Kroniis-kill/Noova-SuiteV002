
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Modal from '../ui/Modal';
import { Sale, Client, ScreenProfile, ServiceType, Service, Account, FinancialAccount } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  Check, ChevronRight, Wallet, Search, Minus, Plus, ChevronDown, 
  Loader2, Ban, DollarSign, ShoppingCart, Trash2, ArrowLeft, 
  X, MessageCircle, RefreshCw, Wand2, FileText, Save, 
  Calendar, User, LayoutTemplate, Lock, Mail, Tag, 
  Briefcase, TrendingUp, History, Layers, 
  CreditCard, Info, ArrowRight, Monitor, UserPlus, Phone,
  Hash, Clock, AlertCircle
} from 'lucide-react';
import { generateUUID } from '../../utils/uuid';
import { generatePin } from '../../utils/uuid';
import { addTime, sendWhatsAppMessage, getLocalDateISO } from '../../utils/contactosUtils';
import { getCombinedWhatsAppTemplate } from '../../utils/salesUtils';
import { calculateOccupancy } from '../../utils/inventarioUtils';
import { useHaptic } from '../../hooks/useHaptic';
import { motion, AnimatePresence } from 'framer-motion';
import { withRetry } from '../../utils/supabaseUtils';
import { supabase } from '../../supabaseClient';

// Estos 4 componentes vivían definidos inline en este mismo archivo
// (redefiniéndose en cada import). Ahora son archivos propios en
// ./sales/, más fáciles de mantener y de testear por separado.
import BlockWarningModal from './BlockWarningModal';
import NewClientFormModal from './NewClientFormModal';
import SearchListModal from './SearchListModal';
import ItemConfigPanel from './ItemConfigPanel';
import { CartItem, SaleModalProps } from './saleModal.types';

const SaleModal: React.FC<SaleModalProps> = ({ isOpen, onClose, initialData, zIndex }) => {
  const { user } = useAuth();
  const { clients, services, accounts, addSale, updateSale, addClient, financialAccounts, executeTransaction, settings } = useData();
  const { showToast } = useToast();
  const haptic = useHaptic();

  const [step, setStep] = useState(1); // Force Step 1 (Main Dashboard) by default
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Selection States
  const [selectedClientId, setSelectedClientId] = useState('');
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isItemConfigOpen, setIsItemConfigOpen] = useState(false);
  const [tempServiceId, setTempServiceId] = useState('');
  const [tempAccountId, setTempAccountId] = useState('');
  const [tempStartDate, setTempStartDate] = useState(getLocalDateISO());
  const [tempMonths, setTempMonths] = useState(1);
  const [tempDays, setTempDays] = useState(0);
  const [tempScreens, setTempScreens] = useState(1);
  const [tempAmount, setTempAmount] = useState('');
  const [tempProfiles, setTempProfiles] = useState<ScreenProfile[]>([]);
  const [tempType, setTempType] = useState<ServiceType>('por_pantalla');
  const [tempInvitedEmail, setTempInvitedEmail] = useState('');
  const [tempInvitedPassword, setTempInvitedPassword] = useState('');
  const [walletId, setWalletId] = useState('');
  const [addToWallet, setAddToWallet] = useState(true);
  const [totalToPay, setTotalToPay] = useState(0);
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [isMigration, setIsMigration] = useState(false); 
  const [modalSearch, setModalSearch] = useState<'client' | 'service' | 'account' | 'wallet' | null>(null);

  const [isBlockWarningOpen, setIsBlockWarningOpen] = useState(false);
  const [blockWarningAccount, setBlockWarningAccount] = useState<string>('');

  // Persistencia de Borrador local
  useEffect(() => {
    // Guardar borrador automáticamente si es una venta nueva
    if (isOpen && !initialData && user && (selectedClientId || cart.length > 0)) {
      const draft = {
        selectedClientId,
        cart,
        walletId,
        addToWallet,
        step,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(`noova_sale_draft_${user.id}`, JSON.stringify(draft));
    }
  }, [selectedClientId, cart, walletId, addToWallet, step, isOpen, initialData, user?.id]);

  useEffect(() => {
      if (isOpen) {
          if (initialData) {
              setSelectedClientId(initialData.clientId);
              const svc = services.find(s => s.name === initialData.serviceName);
              const item: CartItem = {
                  tempId: initialData.id,
                  serviceId: svc ? svc.id : '',
                  serviceName: initialData.serviceName,
                  accountId: initialData.accountId,
                  accountEmail: accounts.find(a => a.id === initialData.accountId)?.email || '???',
                  saleType: initialData.saleType || 'por_pantalla',
                  startDate: initialData.date.split('T')[0], 
                  months: 0, 
                  days: 0,
                  screens: initialData.screensCount || 1, 
                  amount: initialData.amount,
                  profiles: initialData.assignedProfiles || [],
                  invitedEmail: initialData.invitedEmail,
                  invitedPassword: initialData.invitedPassword
              };
              setCart([item]);
              setTempServiceId(item.serviceId);
              setTempAccountId(item.accountId);
              setTempStartDate(item.startDate);
              setTempMonths(0);
              setTempDays(0);
              setTempScreens(item.screens);
              setTempAmount(item.amount.toString());
              setTempProfiles(item.profiles);
              setTempType(item.saleType);
              setTempInvitedEmail(item.invitedEmail || '');
              setTempInvitedPassword(item.invitedPassword || '');
              setStep(1);
              // Removed setIsItemConfigOpen(true) to avoid double modal when editing
          } else {
              // Intentar cargar borrador antes de resetear
              let draftLoaded = false;
              if (user) {
                  const savedDraft = localStorage.getItem(`noova_sale_draft_${user.id}`);
                  if (savedDraft) {
                      try {
                          const draft = JSON.parse(savedDraft);
                          if (draft.cart && draft.cart.length > 0) {
                              setSelectedClientId(draft.selectedClientId || '');
                              setCart(draft.cart || []);
                              setWalletId(draft.walletId || '');
                              setAddToWallet(draft.addToWallet ?? true);
                              setStep(draft.step || 1);
                              draftLoaded = true;
                          }
                      } catch (e) {}
                  }
              }
              
              if (!draftLoaded) {
                  resetAll();
                  setStep(1);
              }
          }
      }
  }, [isOpen, initialData, user?.id]);

  const resetAll = () => {
      setStep(1); 
      setSelectedClientId(''); 
      setCart([]);
      resetItemForm(); 
      setWalletId(''); 
      setAddToWallet(true); 
      setIsMigration(false); 
      setIsSubmitting(false);
  };

  const resetItemForm = () => {
      setTempServiceId(''); setTempAccountId(''); setTempStartDate(getLocalDateISO());
      setTempMonths(1); setTempDays(0); setTempScreens(1); setTempAmount('');
      setTempProfiles([]); setTempType('por_pantalla'); setTempInvitedEmail(''); setTempInvitedPassword('');
  };
  
  const selectedClient = useMemo(() => clients.find(c => c.id === selectedClientId), [selectedClientId, clients]);
  const isResellerClient = !!selectedClient?.resellerId;

  // ... (Efectos de precio y billetera se mantienen iguales) ...
  useEffect(() => {
      if (tempServiceId && !initialData) {
          const svc = services.find(s => s.id === tempServiceId);
          if (svc) {
              setTempType(svc.type);
              const priceToUse = isResellerClient ? (svc.resellerPrice || 0) : (svc.publicPrice || 0);
              const calcPrice = svc.type === 'cuenta_completa' ? priceToUse : (priceToUse * tempScreens);
              setTempAmount((calcPrice * tempMonths).toFixed(2));
              
              if (svc.type === 'cuenta_completa' || svc.type === 'usuario_unico') {
                  setTempScreens(1); 
                  if (tempProfiles.length === 0) setTempProfiles([{ name: '', pin: '' }]);
              } else {
                  if (tempProfiles.length !== tempScreens) {
                      const autoPin = settings.salesPreferences?.autoPin;
                      setTempProfiles(Array(tempScreens).fill(null).map((_, i) => ({ name: `Perfil ${i+1}`, pin: autoPin ? generatePin() : '' })));
                  }
              }
          }
      }
  }, [tempServiceId, tempScreens, tempMonths, isResellerClient, settings.salesPreferences?.autoPin, services, initialData]);

  useEffect(() => {
      const wallet = financialAccounts.find(f => f.id === walletId);
      if (wallet && totalToPay > 0) {
          const rate = settings.exchangeRate || 1;
          const isWalletStrong = ['USD', 'USDT', 'USDC', 'EUR'].includes(wallet.currency);
          const isSystemStrong = ['USD', 'USDT', 'USDC', 'EUR'].includes(settings.currency);
          if (!isWalletStrong && isSystemStrong) setConvertedAmount(totalToPay * rate);
          else if (isWalletStrong && !isSystemStrong) setConvertedAmount(rate > 0 ? totalToPay / rate : 0);
          else setConvertedAmount(totalToPay);
      } else setConvertedAmount(totalToPay);
  }, [walletId, totalToPay, settings.exchangeRate, settings.currency, financialAccounts]);

  const handleProfileChange = (index: number, field: keyof ScreenProfile, value: string) => {
      setTempProfiles(prev => {
          const next = [...prev];
          if (!next[index]) next[index] = { name: '', pin: '' };
          next[index] = { ...next[index], [field]: value };
          return next;
      });
  };

  const handleAutoAssign = () => {
      if (!tempServiceId) return showToast('Selecciona plataforma', 'error');
      const availableAccounts = accounts.filter(a => a.serviceId === tempServiceId && a.status === 'activa' && (a.maxScreens - calculateOccupancy(a)) >= tempScreens);
      if (availableAccounts.length === 0) return showToast('Sin cupo disponible', 'error');
      availableAccounts.sort((a, b) => (a.maxScreens - calculateOccupancy(a)) - (b.maxScreens - calculateOccupancy(b)));
      setTempAccountId(availableAccounts[0].id);
      showToast('Cuenta asignada automáticamente', 'success');
  };

  const handleAddItem = async () => {
      if (!tempServiceId) return showToast('Selecciona plataforma', 'error');
      if (!tempAccountId) return showToast('Selecciona cuenta', 'error');
      
      const acc = accounts.find(a => a.id === tempAccountId);
      if (selectedClient && acc && !initialData) {
          setIsSubmitting(true);
          try {
              const { data } = await withRetry<any>(() => 
                supabase.from('profile_history')
                  .select('id, client_name, account_id, notes')
                  .eq('client_name', selectedClient.name)
                  .eq('account_id', tempAccountId)
                  .ilike('notes', '%Bloqueo de hogar%')
                  .limit(1)
              );
              if (data && Array.isArray(data) && data.length > 0) {
                  setBlockWarningAccount(acc.email);
                  setIsBlockWarningOpen(true);
                  setIsSubmitting(false);
                  return; 
              }
          } catch (e) {
              console.warn("Fallo al verificar historial de bloqueo, pasando por alto...", e);
          } finally {
              // Ensure we drop the submitting state if we are about to call executeAddItem (which will either open the modal or add to cart quickly, though executeAddItem manages its own isSubmitting)
              setIsSubmitting(false);
          }
      }
      await executeAddItem();
  };

  const executeAddItem = async () => {
      if (initialData) {
          setIsSubmitting(true);
          try {
              const svc = services.find(s => s.id === tempServiceId);
              const acc = accounts.find(a => a.id === tempAccountId);
              
              let expiryDate = initialData.expiryDate;
              if (tempMonths > 0 || tempDays > 0) {
                  expiryDate = addTime(initialData.expiryDate, tempMonths, tempDays);
              }

              const saleData: Sale = { 
                  ...initialData,
                  accountId: tempAccountId, 
                  serviceName: svc?.name || initialData.serviceName, 
                  saleType: tempType, 
                  amount: parseFloat(tempAmount) || 0, 
                  expiryDate: expiryDate, 
                  screensCount: tempScreens, 
                  assignedProfiles: tempProfiles, 
                  invitedEmail: tempInvitedEmail, 
                  invitedPassword: tempInvitedPassword 
              };
              
              await updateSale(saleData);
              haptic('success');
              showToast('Venta actualizada', 'success');
              onClose();
              resetAll();
          } catch (e) {
              showToast('Error al actualizar', 'error');
          } finally {
              setIsSubmitting(false);
          }
          return;
      }

      const svc = services.find(s => s.id === tempServiceId);
      const acc = accounts.find(a => a.id === tempAccountId);
      const newItem: CartItem = { 
          tempId: generateUUID(), 
          serviceId: tempServiceId, 
          serviceName: svc?.name || 'Servicio', 
          accountId: tempAccountId, 
          accountEmail: acc?.email || 'Cuenta', 
          saleType: tempType, 
          startDate: tempStartDate, 
          months: tempMonths, 
          days: tempDays, 
          screens: tempScreens, 
          amount: parseFloat(tempAmount) || 0, 
          profiles: tempProfiles, 
          invitedEmail: tempInvitedEmail, 
          invitedPassword: tempInvitedPassword 
      };
      if (initialData) setCart([newItem]); else setCart([...cart, newItem]);
      setIsItemConfigOpen(false);
      setIsBlockWarningOpen(false);
      if (!initialData) resetItemForm();
  };

  const handleFinalize = async (action: 'save' | 'send') => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
          if (!selectedClientId) { showToast('Selecciona un cliente', 'error'); setIsSubmitting(false); return; }
          const client = clients.find(c => c.id === selectedClientId);
          if (!client) { showToast('Cliente no encontrado', 'error'); setIsSubmitting(false); return; }
          
          const currentResellerId = client.resellerId;
          const createdSales: Sale[] = [];
          
          for (const item of cart) {
             let expiryDate = initialData ? initialData.expiryDate : addTime(item.startDate, item.months, item.days);
             if (item.months > 0 || item.days > 0) {
                 expiryDate = addTime(initialData ? initialData.expiryDate : item.startDate, item.months, item.days);
             }

             const saleDate = isMigration ? new Date(item.startDate).toISOString() : (initialData ? initialData.date : new Date().toISOString());
             const saleData: Sale = { 
                 id: item.tempId, 
                 clientId: selectedClientId, 
                 accountId: item.accountId, 
                 serviceName: item.serviceName, 
                 saleType: item.saleType, 
                 amount: item.amount, 
                 date: saleDate, 
                 expiryDate: expiryDate, 
                 screensCount: item.screens, 
                 assignedProfiles: item.profiles, 
                 exchangeRate: settings.exchangeRate, 
                 isPartial: false, 
                 invitedEmail: item.invitedEmail, 
                 invitedPassword: item.invitedPassword, 
                 resellerId: currentResellerId 
             };
             
             if (initialData) await updateSale(saleData); else await addSale(saleData);
             createdSales.push(saleData);
          }

          if (!isMigration && addToWallet && walletId && totalToPay > 0 && !initialData) {
             const wallet = financialAccounts.find(w => w.id === walletId);
             if (wallet) {
                 const serviceNames = cart.map(i => i.serviceName).join(', ');
                 executeTransaction({ id: generateUUID(), accountId: walletId, type: 'funding', amount: parseFloat(convertedAmount.toFixed(2)), currency: wallet.currency, exchangeRate: settings.exchangeRate, usdEquivalent: totalToPay, date: new Date().toISOString(), description: `Venta: ${serviceNames} a ${client.name}`, paymentMethod: 'Venta Directa' });
             }
          }

          haptic('success');
          showToast(initialData ? 'Venta actualizada' : 'Venta completada', 'success');
          
          // Limpiar borrador local al tener éxito
          if (!initialData && user) {
            localStorage.removeItem(`noova_sale_draft_${user.id}`);
          }

          if (action === 'send') {
              const msg = getCombinedWhatsAppTemplate('data', createdSales, client.name, accounts, settings, 'whatsapp', false);
              sendWhatsAppMessage(client.phone || '', msg);
          }
          onClose(); resetAll();
      } catch (e) { showToast('Error al procesar', 'error'); } finally { setIsSubmitting(false); }
  };

  const totalCart = cart.reduce((acc, i) => acc + i.amount, 0);

  return (
    <>
      <Modal isOpen={isOpen} onClose={() => { haptic('nav'); onClose(); if(!initialData) resetAll(); }} title={initialData ? "Editar Servicio" : "Nueva Venta"} zIndex={zIndex}>
         <div className="flex flex-col h-full relative">
            
            {step === 1 && (
                initialData ? (
                    <div className="flex flex-col animate-fade-in pb-4 pt-1 space-y-6">
                        {/* 1. SELECCIÓN DE SERVICIO Y CUENTA */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-disabled uppercase tracking-widest ml-1">Origen del Servicio</label>
                            
                            <button onClick={() => { haptic('nav'); setModalSearch('service'); }} className="w-full bg-surface-zinc border border-[rgb(var(--fg-rgb))]/5 rounded-lg p-4 flex items-center justify-between active:scale-[0.98] transition-all hover:bg-surface-3 group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-md bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-brand-primary">
                                        <Monitor size={22} />
                                    </div>
                                    <div className="text-left">
                                        <span className="block text-[10px] font-semibold text-disabled uppercase">Plataforma</span>
                                        <span className={`block text-sm font-bold truncate ${tempServiceId ? 'text-primary' : 'text-faint'}`}>
                                            {services.find(s => s.id === tempServiceId)?.name || 'Seleccionar...'}
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-faint group-hover:text-primary" />
                            </button>

                            <div className="flex gap-2">
                                <button onClick={() => { haptic('nav'); if(tempServiceId) setModalSearch('account'); else showToast('Selecciona servicio','error'); }} disabled={!tempServiceId} className={`flex-1 bg-surface-zinc border border-[rgb(var(--fg-rgb))]/5 rounded-lg p-4 flex items-center justify-between active:scale-[0.98] transition-all hover:bg-surface-3 group ${!tempServiceId ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-12 h-12 rounded-md bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-status-success shrink-0">
                                            <Mail size={22} />
                                        </div>
                                        <div className="text-left min-w-0">
                                            <span className="block text-[10px] font-semibold text-disabled uppercase">Cuenta / Stock</span>
                                            <span className={`block text-sm font-bold truncate ${tempAccountId ? 'text-primary' : 'text-faint'}`}>
                                                {accounts.find(a => a.id === tempAccountId)?.email || 'Asignar cuenta...'}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronDown size={18} className="text-faint group-hover:text-primary shrink-0" />
                                </button>
                            </div>
                        </div>

                        {/* 2. TIEMPO Y DURACIÓN */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-disabled uppercase tracking-widest ml-1">Vigencia y Tiempo</label>
                            <div className="bg-surface-zinc rounded-xl p-4 border border-[rgb(var(--fg-rgb))]/5 space-y-4">
                                <div className="flex items-center bg-surface-sunken rounded-md px-4 h-[52px] border border-[rgb(var(--fg-rgb))]/10">
                                    <Calendar size={18} className="text-disabled mr-3" />
                                    <input type="date" value={tempStartDate} onChange={e => setTempStartDate(e.target.value)} className="bg-transparent text-sm text-primary font-bold w-full outline-none uppercase tracking-wider" />
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <div className="bg-surface-sunken rounded-md border border-[rgb(var(--fg-rgb))]/10 p-1 flex items-center justify-between h-[52px] w-full">
                                            <button onClick={() => setTempMonths(Math.max(0, tempMonths - 1))} className="w-10 h-full rounded-sm bg-[rgb(var(--fg-rgb))]/5 text-muted hover:text-primary flex items-center justify-center active:scale-90 transition-all"><Minus size={16} /></button>
                                            <div className="flex flex-col items-center leading-none"><span className="text-lg font-bold text-primary">{tempMonths}</span><span className="text-[8px] font-bold text-faint uppercase tracking-wide">MESES</span></div>
                                            <button onClick={() => setTempMonths(tempMonths + 1)} className="w-10 h-full rounded-sm bg-[rgb(var(--fg-rgb))]/5 text-muted hover:text-primary flex items-center justify-center active:scale-90 transition-all"><Plus size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="bg-surface-sunken rounded-md border border-[rgb(var(--fg-rgb))]/10 p-1 flex items-center justify-between h-[52px] w-full">
                                            <button onClick={() => setTempDays(Math.max(0, tempDays - 1))} className="w-10 h-full rounded-sm bg-[rgb(var(--fg-rgb))]/5 text-muted hover:text-primary flex items-center justify-center active:scale-90 transition-all"><Minus size={16} /></button>
                                            <div className="flex flex-col items-center leading-none"><span className="text-lg font-bold text-primary">{tempDays}</span><span className="text-[8px] font-bold text-faint uppercase tracking-wide">DÍAS</span></div>
                                            <button onClick={() => setTempDays(tempDays + 1)} className="w-10 h-full rounded-sm bg-[rgb(var(--fg-rgb))]/5 text-muted hover:text-primary flex items-center justify-center active:scale-90 transition-all"><Plus size={16} /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. PRECIO Y PERFILES */}
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <div className="flex justify-between items-center mb-3 px-1">
                                    <label className="text-[10px] font-bold text-disabled uppercase tracking-widest">Precio de Venta</label>
                                    {isResellerClient && <span className="text-[9px] bg-status-warning/10 text-status-warning px-2 py-0.5 rounded border border-status-warning/20 font-bold uppercase">Tarifa Socio</span>}
                                </div>
                                <div className="relative h-[60px] bg-surface-zinc rounded-lg border border-[rgb(var(--fg-rgb))]/5 flex items-center px-5 focus-within:border-brand-primary/50 focus-within:ring-1 focus-within:ring-brand-primary/20 transition-all">
                                    <DollarSign size={24} className="text-status-success mr-2" />
                                    <input type="number" value={tempAmount} onChange={e => setTempAmount(e.target.value)} className="w-full bg-transparent text-2xl font-black text-primary outline-none placeholder:text-faint" placeholder="0.00" inputMode="decimal" />
                                </div>
                            </div>

                            {tempType === 'por_pantalla' && (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-bold text-disabled uppercase tracking-widest">Perfiles ({tempScreens})</label>
                                        <div className="flex gap-1">
                                            <button onClick={() => setTempScreens(Math.max(1, tempScreens - 1))} className="w-7 h-7 rounded-lg bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-muted hover:text-primary"><Minus size={14}/></button>
                                            <button onClick={() => setTempScreens(tempScreens + 1)} className="w-7 h-7 rounded-lg bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-muted hover:text-primary"><Plus size={14}/></button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {tempProfiles.map((p, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <div className="flex-1 bg-surface-zinc rounded-md border border-[rgb(var(--fg-rgb))]/5 h-[50px] flex items-center px-4 focus-within:border-brand-primary/40 transition-colors">
                                                    <User size={16} className="text-faint mr-3" />
                                                    <input value={p.name} onChange={e => handleProfileChange(idx, 'name', e.target.value)} placeholder={`Perfil ${idx+1}`} className="bg-transparent w-full text-sm text-primary font-bold outline-none placeholder:text-faint" />
                                                </div>
                                                <div className="w-24 bg-surface-zinc rounded-md border border-[rgb(var(--fg-rgb))]/5 h-[50px] flex items-center px-3 focus-within:border-brand-primary/40 transition-colors">
                                                    <Hash size={14} className="text-faint mr-2" />
                                                    <input value={p.pin} onChange={e => handleProfileChange(idx, 'pin', e.target.value)} placeholder="PIN" className="bg-transparent w-full text-sm text-primary font-mono font-bold outline-none text-center placeholder:text-faint" inputMode="numeric" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(tempType === 'usuario_unico' || tempType === 'cuenta_completa') && (
                                <div className="p-4 bg-status-info/5 border border-status-info/10 rounded-lg space-y-4">
                                    <div className="flex items-center gap-2 text-status-info-soft mb-1">
                                        <Info size={16} />
                                        <span className="text-xs font-semibold uppercase">Credenciales de Acceso</span>
                                    </div>
                                    
                                    {tempType === 'usuario_unico' && (
                                        <>
                                            <div className="flex items-center bg-surface-sunken rounded-md h-[48px] px-4 border border-[rgb(var(--fg-rgb))]/5">
                                                <Mail size={16} className="text-disabled mr-3" />
                                                <input value={tempInvitedEmail} onChange={e => setTempInvitedEmail(e.target.value)} placeholder="Correo del cliente" className="bg-transparent w-full text-sm text-primary outline-none font-medium" />
                                            </div>
                                            <div className="flex items-center bg-surface-sunken rounded-md h-[48px] px-4 border border-[rgb(var(--fg-rgb))]/5">
                                                <Lock size={16} className="text-disabled mr-3" />
                                                <input value={tempInvitedPassword} onChange={e => setTempInvitedPassword(e.target.value)} placeholder="Contraseña asignada" className="bg-transparent w-full text-sm text-primary outline-none font-mono font-medium" />
                                            </div>
                                        </>
                                    )}

                                    {tempType === 'cuenta_completa' && (
                                        <div className="flex items-center bg-surface-sunken rounded-md h-[48px] px-4 border border-[rgb(var(--fg-rgb))]/5">
                                            <User size={16} className="text-disabled mr-3" />
                                            <input value={tempProfiles[0]?.name || ''} onChange={e => handleProfileChange(0, 'name', e.target.value)} placeholder="Nombre referencial" className="bg-transparent w-full text-sm text-primary outline-none font-medium" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions for Edit Mode */}
                        <div className="pt-6 flex gap-3">
                            <button onClick={onClose} className="flex-1 h-[56px] rounded-lg bg-[rgb(var(--fg-rgb))]/5 text-muted font-semibold text-xs uppercase tracking-wider hover:bg-[rgb(var(--fg-rgb))]/10 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={() => { haptic('nav'); handleAddItem(); }} className="flex-[2] h-[56px] bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-glow flex items-center justify-center gap-2 active:scale-95 transition-all hover:brightness-110">
                               <Check size={18} strokeWidth={3} />
                               Guardar Cambios
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col animate-fade-in pb-32 pt-1">
                    
                    {/* 1. CLIENT SELECTION AREA */}
                    
                    {/* CASE A: No selection made yet */}
                    { !selectedClientId && (
                        <div className="grid grid-cols-2 gap-3 mb-4 shrink-0">
                             <button onClick={() => { haptic('nav'); setModalSearch('client'); }} className="h-28 bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-brand-primary/40 active:scale-95 transition-all group shadow-sm">
                                 <div className="w-12 h-12 rounded-full bg-surface-1 flex items-center justify-center group-hover:bg-[rgb(var(--fg-rgb))]/5 transition-colors">
                                     <Search size={24} className="text-muted group-hover:text-primary" />
                                 </div>
                                 <div className="text-center leading-tight">
                                     <span className="block text-[13px] font-bold text-primary">Cliente</span>
                                     <span className="block text-[11px] font-medium text-disabled">Registrado</span>
                                 </div>
                             </button>
                             <button onClick={() => { haptic('nav'); setIsNewClientModalOpen(true); }} className="h-28 bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-brand-primary/40 active:scale-95 transition-all group shadow-sm">
                                 <div className="w-12 h-12 rounded-full bg-surface-1 flex items-center justify-center group-hover:bg-[rgb(var(--fg-rgb))]/5 transition-colors">
                                     <UserPlus size={24} className="text-muted group-hover:text-primary" />
                                 </div>
                                 <div className="text-center leading-tight">
                                     <span className="block text-[13px] font-bold text-primary">Nuevo</span>
                                     <span className="block text-[11px] font-medium text-disabled">Cliente</span>
                                 </div>
                             </button>
                        </div>
                    )}
                    
                    {/* CASE B: Registered Client Selected */}
                    { selectedClientId && (
                        <div className="mb-4 shrink-0">
                             <div className="flex items-center justify-between bg-surface-3 p-4 rounded-xl border border-[rgb(var(--fg-rgb))]/5 shadow-sm animate-fade-in">
                                 <div className="flex items-center gap-4">
                                     <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white font-bold text-sm shadow-glow">
                                         {clients.find(c => c.id === selectedClientId)?.name?.substring(0,2).toUpperCase()}
                                     </div>
                                     <div>
                                         <p className="text-[10px] text-disabled font-black uppercase tracking-widest leading-none mb-1">Cliente</p>
                                         <p className="text-sm font-bold text-primary truncate max-w-[180px]">{clients.find(c => c.id === selectedClientId)?.name}</p>
                                     </div>
                                 </div>
                                 {!initialData && <button onClick={() => { haptic('nav'); setSelectedClientId(''); }} className="w-10 h-10 bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 rounded-full flex items-center justify-center text-disabled hover:text-primary transition-colors"><RefreshCw size={16} /></button>}
                             </div>
                        </div>
                    )}

                    {/* 2. CART AREA */}
                    <div className="bg-surface-3 rounded-xl border border-[rgb(var(--fg-rgb))]/5 p-1 relative overflow-hidden flex flex-col mb-4 w-full min-h-[200px]">
                        <div className="p-3 border-b border-[rgb(var(--fg-rgb))]/5 bg-surface-3 z-10 sticky top-0">
                            <h4 className="text-[10px] font-bold text-disabled uppercase tracking-widest ml-2">Servicios en carrito</h4>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                             {cart.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 min-h-[150px]">
                                    <ShoppingCart size={40} className="mb-3 text-disabled" strokeWidth={1.5} />
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-disabled">Sin Items</p>
                                </div>
                             ) : (
                                cart.map(item => (
                                    <div key={item.tempId} onClick={() => { haptic('nav'); setTempServiceId(item.serviceId); setTempAccountId(item.accountId); setTempStartDate(item.startDate); setTempMonths(item.months); setTempDays(item.days); setTempScreens(item.screens); setTempAmount(item.amount.toString()); setTempProfiles(item.profiles); setTempType(item.saleType); setTempInvitedEmail(item.invitedEmail || ''); setTempInvitedPassword(item.invitedPassword || ''); setIsItemConfigOpen(true); }} className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/5 p-3.5 rounded-lg flex justify-between items-center relative overflow-hidden group shadow-sm active:scale-95 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-sm bg-surface-3 flex items-center justify-center text-brand-primary border border-[rgb(var(--fg-rgb))]/5"><Layers size={18} /></div>
                                            <div><h4 className="text-sm font-bold text-primary leading-tight">{item.serviceName}</h4><p className="text-[10px] text-disabled font-mono mt-0.5">{item.accountEmail}</p></div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right"><span className="block text-status-success-soft font-bold text-sm">${item.amount}</span><span className="text-[8px] text-faint font-bold uppercase">{item.saleType.replace('_',' ')}</span></div>
                                            {!initialData && <button onClick={(e) => { e.stopPropagation(); setCart(cart.filter(i => i.tempId !== item.tempId)); }} className="w-8 h-8 flex items-center justify-center bg-status-danger/10 text-status-danger rounded-lg hover:bg-status-danger/20 transition-colors"><Trash2 size={14} /></button>}
                                        </div>
                                    </div>
                                ))
                             )}
                        </div>
                    </div>

                    {/* 3. ADD BUTTON */}
                    {!initialData && (
                        <button 
                            onClick={() => { haptic('nav'); resetItemForm(); setIsItemConfigOpen(true); }} 
                            className="w-full h-14 bg-surface-3 border-2 border-dashed border-[rgb(var(--fg-rgb))]/10 hover:border-[rgb(var(--fg-rgb))]/20 hover:bg-surface-3 rounded-lg text-muted font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all mb-6"
                        >
                            <Plus size={18} /> Agregar Servicio
                        </button>
                    )}

                    {/* 4. FOOTER */}
                    <div className="fixed bottom-6 left-6 right-6 z-30">
                        <div className="bg-white text-black rounded-xl p-2 flex items-center justify-between shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8)] border border-[rgb(var(--fg-rgb))]/10">
                             <div className="pl-5 flex flex-col justify-center">
                                 <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-0.5">Total a Pagar</p>
                                 <p className="text-2xl font-black leading-none">${totalCart.toFixed(2)}</p>
                             </div>
                             <button 
                                onClick={() => { 
                                    if(cart.length === 0) return; 
                                    if(!selectedClientId) { showToast('Selecciona un cliente', 'error'); return; }
                                    haptic('nav'); setTotalToPay(totalCart); setStep(2); 
                                }} 
                                disabled={cart.length === 0} 
                                className="h-14 px-8 rounded-lg bg-black text-white font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30 transition-all shadow-lg"
                             >
                                {initialData ? 'Confirmar' : 'Checkout'} <ArrowRight size={16} />
                             </button>
                        </div>
                    </div>
                </div>
            ))}

            {step === 2 && (
              <div className="flex flex-col h-full bg-surface-1 lg:rounded-2xl overflow-hidden animate-fade-in">
                  
                  {/* Header & Total - Matching the clean look of the reference top section */}
                  <div className="pt-10 pb-8 px-6 text-center relative">
                       <button onClick={() => { haptic('nav'); setStep(1); }} className="absolute top-6 left-6 w-10 h-10 rounded-full bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-muted hover:text-primary transition-colors active:scale-90">
                           <ArrowLeft size={20} />
                       </button>
                       
                       <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                           <span className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] mb-2 bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">Total a Pagar</span>
                           <div className="flex items-baseline justify-center gap-1">
                               <span className="text-2xl font-medium text-disabled relative -top-1">$</span>
                               <span className="text-6xl font-black text-primary tracking-tighter">{totalToPay.toFixed(2)}</span>
                           </div>
                           {/* If wallet selected and currency differs, show conversion like reference "≈ $12" */}
                           {addToWallet && walletId && financialAccounts.find(f => f.id === walletId)?.currency !== 'USD' && (
                               <p className="text-sm font-bold text-disabled mt-2 font-mono">
                                   ≈ {convertedAmount.toFixed(2)} {financialAccounts.find(f => f.id === walletId)?.currency}
                               </p>
                           )}
                       </motion.div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar px-6 space-y-6">
                       
                       {/* "Detalles Bancarios" Style Section -> Wallet Selection */}
                       {!initialData && (
                         <div className="mb-6">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <h3 className="text-sm font-bold text-primary">Método de Ingreso</h3>
                                {/* Sweep Switch */}
                                <div 
                                    onClick={() => { 
                                        haptic('nav'); 
                                        const newValue = !isMigration;
                                        setIsMigration(newValue); 
                                        setAddToWallet(!newValue); 
                                    }}
                                    className="flex items-center gap-3 cursor-pointer"
                                >
                                    <span className={`text-[10px] font-semibold uppercase tracking-widest transition-colors ${!isMigration ? 'text-status-success' : 'text-faint'}`}>
                                        Cobrar
                                    </span>
                                    
                                    <div 
                                        className={`w-14 h-8 rounded-full relative transition-colors duration-300 border ${isMigration ? 'bg-status-warning/20 border-status-warning' : 'bg-status-success/20 border-status-success'}`}
                                    >
                                        <motion.div 
                                            initial={false}
                                            animate={{ x: isMigration ? 24 : 0 }}
                                            className={`absolute top-1 left-1 w-6 h-6 rounded-full shadow-md flex items-center justify-center ${isMigration ? 'bg-status-warning' : 'bg-status-success'}`}
                                        >
                                             {isMigration ? <History size={14} className="text-black" /> : <DollarSign size={14} className="text-primary" />}
                                        </motion.div>
                                    </div>
                                    
                                    <span className={`text-[10px] font-semibold uppercase tracking-widest transition-colors ${isMigration ? 'text-status-warning' : 'text-faint'}`}>
                                        Historial
                                    </span>
                                </div>
                            </div>

                            {!isMigration && (
                                <div className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl overflow-hidden">
                                     {/* Billetera Row */}
                                     <button 
                                        onClick={() => { haptic('nav'); setModalSearch('wallet'); }}
                                        className="w-full p-4 flex items-center justify-between hover:bg-[rgb(var(--fg-rgb))]/[0.02] transition-colors group border-b border-[rgb(var(--fg-rgb))]/5"
                                     >
                                         <div className="flex items-center gap-4">
                                             <div className={`w-12 h-12 rounded-md flex items-center justify-center border ${walletId ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary' : 'bg-zinc-800/50 border-zinc-700 text-disabled'}`}>
                                                 <Wallet size={20} />
                                             </div>
                                             <div className="text-left">
                                                 <span className="block text-[10px] font-semibold text-disabled uppercase tracking-wider mb-0.5">Billetera Destino</span>
                                                 <span className={`block text-sm font-bold ${walletId ? 'text-primary' : 'text-muted'}`}>
                                                     {financialAccounts.find(f => f.id === walletId)?.name || 'Seleccionar...'}
                                                 </span>
                                             </div>
                                         </div>
                                         <div className="w-8 h-8 rounded-full bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-disabled group-hover:text-primary">
                                             <ChevronRight size={16} />
                                         </div>
                                     </button>

                                     {/* Currency Details Row (If wallet selected) */}
                                     {walletId && (
                                        <div className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                 <div className="w-12 h-12 rounded-md bg-status-success/10 flex items-center justify-center border border-status-success/20 text-status-success">
                                                     <DollarSign size={20} />
                                                 </div>
                                                 <div className="text-left">
                                                     <span className="block text-[10px] font-semibold text-disabled uppercase tracking-wider mb-0.5">Monto a Ingresar</span>
                                                     <span className="block text-sm font-bold text-primary font-mono">
                                                         {convertedAmount.toFixed(2)} {financialAccounts.find(f => f.id === walletId)?.currency}
                                                     </span>
                                                 </div>
                                            </div>
                                        </div>
                                     )}
                                </div>
                            )}
                            
                            {isMigration && (
                                <div className="p-4 rounded-lg bg-status-warning/10 border border-status-warning/20 flex gap-3 items-start">
                                     <History size={20} className="text-status-warning shrink-0 mt-0.5" />
                                     <p className="text-xs text-amber-200/80 leading-relaxed">
                                         Estás registrando una venta histórica. No se sumará saldo a ninguna billetera, solo quedará el registro en el historial del cliente.
                                     </p>
                                </div>
                            )}
                         </div>
                       )}
                       
                       {/* Warning if no wallet selected in Real mode */}
                       {!isMigration && !walletId && !initialData && (
                           <div className="flex items-center gap-3 p-4 rounded-lg bg-status-danger/10 border border-status-danger/20">
                               <AlertCircle size={20} className="text-status-danger-soft" />
                               <p className="text-xs font-semibold text-red-300">Debes seleccionar una billetera para continuar.</p>
                           </div>
                       )}
                  </div>

                  {/* Bottom Actions - Styled big like the reference */}
                  <div className="p-6 border-t border-[rgb(var(--fg-rgb))]/5 bg-surface-1 space-y-3">
                       <button 
                          onClick={() => { haptic('nav'); handleFinalize('send'); }} 
                          disabled={isSubmitting || (addToWallet && !walletId && !initialData && !isMigration)} 
                          className="w-full h-14 bg-gradient-to-r from-brand-primary to-brand-accent rounded-lg text-white font-bold text-sm uppercase tracking-widest shadow-[0_0_30px_-5px_rgba(106,44,255,0.4)] hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                       >
                          <MessageCircle size={18} fill="currentColor" />
                          Confirmar y Notificar
                       </button>
                       
                       <button 
                          onClick={() => { haptic('nav'); handleFinalize('save'); }} 
                          disabled={isSubmitting || (addToWallet && !walletId && !initialData && !isMigration)}
                          className="w-full h-12 bg-surface-3 text-muted font-semibold text-xs rounded-lg border border-[rgb(var(--fg-rgb))]/5 hover:text-primary hover:bg-[rgb(var(--fg-rgb))]/5 transition-all"
                       >
                          Guardar
                       </button>
                  </div>
              </div>
            )}
         </div>
      </Modal>
      
      <NewClientFormModal 
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
        onSuccess={(id) => { setSelectedClientId(id); setStep(1); }}
        zIndex={zIndex ? zIndex + 200 : undefined}
      />
      
      <BlockWarningModal isOpen={isBlockWarningOpen} onClose={() => setIsBlockWarningOpen(false)} onConfirm={() => { haptic('nav'); executeAddItem(); }} accountEmail={accounts.find(a => a.id === tempAccountId)?.email} />
      <ItemConfigPanel 
        isOpen={isItemConfigOpen} 
        onClose={() => setIsItemConfigOpen(false)} 
        zIndex={zIndex ? zIndex + 50 : undefined} 
        tempServiceId={tempServiceId} 
        services={services} 
        tempAccountId={tempAccountId} 
        accounts={accounts.filter(a => a.serviceId === tempServiceId && a.status === 'activa' && (a.maxScreens - calculateOccupancy(a)) > 0)} 
        tempStartDate={tempStartDate} 
        tempMonths={tempMonths} 
        tempDays={tempDays} 
        tempScreens={tempScreens} 
        tempAmount={tempAmount} 
        tempProfiles={tempProfiles} 
        tempType={tempType} 
        tempInvitedEmail={tempInvitedEmail} 
        tempInvitedPassword={tempInvitedPassword} 
        setTempInvitedEmail={setTempInvitedEmail} 
        setTempInvitedPassword={setTempInvitedPassword} 
        isResellerClient={isResellerClient} 
        setTempStartDate={setTempStartDate} 
        setTempMonths={setTempMonths} 
        setTempDays={setTempDays} 
        setTempScreens={setTempScreens} 
        setTempAmount={setTempAmount} 
        handleProfileChange={handleProfileChange} 
        handleAddItem={handleAddItem} 
        openServiceSearch={() => setModalSearch('service')} 
        openAccountSearch={() => { if(tempServiceId) setModalSearch('account'); else showToast('Selecciona servicio','error'); }} 
        onAutoAssign={handleAutoAssign}
        isEditing={!!initialData}
      />
      <SearchListModal 
        isOpen={modalSearch === 'client'} 
        onClose={() => setModalSearch(null)} 
        items={clients} 
        onSelect={(c: Client) => { if (c.isBlocked) { haptic('error'); showToast('Cliente Bloqueado', 'error'); return; } setSelectedClientId(c.id); setStep(1); }} 
        title="Seleccionar Cliente" 
        filterFn={(c, q) => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)} 
        zIndex={zIndex ? zIndex + 200 : undefined} 
        renderItem={(c: Client) => (
            <div className={`p-4 rounded-lg border mb-2 flex items-center justify-between transition-all ${c.isBlocked ? 'bg-red-900/10 border-status-danger/20 opacity-50' : 'bg-surface-1 border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-zinc active:scale-[0.98]'}`}>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white text-sm font-bold shadow-lg border border-[rgb(var(--fg-rgb))]/10">
                        {c.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-primary leading-tight">{c.name}</p>
                        <p className="text-[11px] text-disabled font-mono mt-0.5">{c.phone}</p>
                    </div>
                </div>
                {c.isBlocked ? <Ban size={18} className="text-status-danger" /> : <ChevronRight size={18} className="text-faint" />}
            </div>
        )} 
      />
      <SearchListModal isOpen={modalSearch === 'service'} onClose={() => setModalSearch(null)} items={services} onSelect={(s: Service) => setTempServiceId(s.id)} title="Elegir Plataforma" filterFn={(s, q) => s.name.toLowerCase().includes(q)} zIndex={zIndex ? zIndex + 200 : undefined} renderItem={(s: Service) => (<div className="p-4 rounded-lg bg-surface-1 border border-[rgb(var(--fg-rgb))]/5 mb-1 flex justify-between items-center hover:border-brand-primary/40 transition-all"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-sm bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 overflow-hidden">{s.image_url ? <img src={s.image_url} className="w-full h-full object-cover" /> : <Layers size={20} className="text-disabled" />}</div><span className="text-sm font-bold text-primary">{s.name}</span></div><span className="text-[9px] font-black text-disabled uppercase tracking-widest">{s.screens} Cupos</span></div>)} />
      <SearchListModal isOpen={modalSearch === 'account'} onClose={() => setModalSearch(null)} items={accounts.filter(a => a.serviceId === tempServiceId && a.status === 'activa' && (a.maxScreens - calculateOccupancy(a)) > 0)} onSelect={(a: Account) => setTempAccountId(a.id)} title="Seleccionar Stock" filterFn={(a, q) => a.email.toLowerCase().includes(q)} zIndex={zIndex ? zIndex + 200 : undefined} renderItem={(a: Account) => (<div className="p-4 rounded-lg bg-surface-1 border border-[rgb(var(--fg-rgb))]/5 mb-1 flex justify-between items-center hover:border-brand-primary/40 transition-all"><div className="flex flex-col min-w-0 pr-3"><span className="text-sm font-bold text-primary truncate max-w-[200px] leading-tight">{a.email}</span><span className="text-[10px] font-mono text-disabled mt-1">Expira: {a.endDate}</span></div><div className="flex flex-col items-end"><span className={`text-[9px] font-black text-status-success-soft uppercase bg-status-success/10 px-2 py-1 rounded-lg border border-status-success/20 tracking-widest`}>Disponible</span><span className="text-[8px] text-faint font-bold mt-1">{a.maxScreens - calculateOccupancy(a)} LIBRES</span></div></div>)} />
      <SearchListModal isOpen={modalSearch === 'wallet'} onClose={() => setModalSearch(null)} items={financialAccounts.filter(f => f.isActive !== false)} onSelect={(w: FinancialAccount) => setWalletId(w.id)} title="Billetera de Cobro" filterFn={(w, q) => w.name.toLowerCase().includes(q)} zIndex={zIndex ? zIndex + 200 : undefined} renderItem={(w: FinancialAccount) => (<div className="p-4 rounded-lg bg-surface-1 border border-[rgb(var(--fg-rgb))]/5 mb-1 flex justify-between items-center hover:border-brand-primary/40 transition-all"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 shadow-sm"><Wallet size={18} /></div><span className="text-sm font-bold text-primary">{w.name}</span></div><span className="text-[10px] font-bold text-disabled font-mono tracking-widest bg-[rgb(var(--fg-rgb))]/5 px-2 py-1 rounded-lg">{w.currency}</span></div>)} />
    </>
  );
};
export default SaleModal;
