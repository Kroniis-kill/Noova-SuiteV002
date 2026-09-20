
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../ui/Modal';
import { Sale, Client, ScreenProfile, ServiceType, Service, Account, FinancialAccount } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { 
  Check, ChevronRight, Wallet, Search, Plus, Ban, DollarSign, ShoppingCart, Trash2, ArrowLeft, MessageCircle, History, Layers, ArrowRight, UserPlus, AlertCircle
} from 'lucide-react';
import { generateUUID } from '../../utils/uuid';
import { generatePin } from '../../utils/uuid';
import { addTime, sendWhatsAppMessage, getLocalDateISO } from '../../utils/contactosUtils';
import { getCombinedWhatsAppTemplate } from '../../utils/salesUtils';
import { calculateOccupancy } from '../../utils/inventarioUtils';
import { useHaptic } from '../../hooks/useHaptic';
import { motion } from 'framer-motion';
import { withRetry } from '../../utils/supabaseUtils';
import { supabase } from '../../supabaseClient';

// Estos 4 componentes vivían definidos inline en este mismo archivo
// (redefiniéndose en cada import). Ahora son archivos propios en
// ./sales/, más fáciles de mantener y de testear por separado.
import BlockWarningModal from './BlockWarningModal';
import NewClientFormModal from './NewClientFormModal';
import SearchListModal from './SearchListModal';
import ItemConfigPanel from './ItemConfigPanel';
import ItemConfigForm, { SALE_TYPE_LABELS } from './ItemConfigForm';
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

  // --- DERIVADOS Y HANDLERS DE LA UI ---

  // Cuentas de stock con cupo libre para la plataforma elegida
  const availableAccounts = accounts.filter(a => a.serviceId === tempServiceId && a.status === 'activa' && (a.maxScreens - calculateOccupancy(a)) > 0);

  // Abre el panel de configuración con los datos de un item ya agregado al carrito
  const openItemForEdit = (item: CartItem) => {
      haptic('nav');
      setTempServiceId(item.serviceId); setTempAccountId(item.accountId); setTempStartDate(item.startDate);
      setTempMonths(item.months); setTempDays(item.days); setTempScreens(item.screens);
      setTempAmount(item.amount.toString()); setTempProfiles(item.profiles); setTempType(item.saleType);
      setTempInvitedEmail(item.invitedEmail || ''); setTempInvitedPassword(item.invitedPassword || '');
      setIsItemConfigOpen(true);
  };

  const handleGoToCheckout = () => {
      if (cart.length === 0) return;
      if (!selectedClientId) { showToast('Selecciona un cliente', 'error'); return; }
      haptic('nav'); setTotalToPay(totalCart); setStep(2);
  };

  // Props compartidas por el panel "Configurar servicio" y por el modo "Editar servicio"
  const itemFormProps = {
      tempServiceId, services, tempAccountId, accounts: availableAccounts,
      tempStartDate, tempMonths, tempDays, tempScreens, tempAmount, tempProfiles, tempType,
      tempInvitedEmail, tempInvitedPassword, setTempInvitedEmail, setTempInvitedPassword,
      isResellerClient, setTempStartDate, setTempMonths, setTempDays, setTempScreens, setTempAmount,
      handleProfileChange,
      openServiceSearch: () => setModalSearch('service'),
      openAccountSearch: () => { if (tempServiceId) setModalSearch('account'); else showToast('Selecciona servicio', 'error'); },
      onAutoAssign: handleAutoAssign,
  };


  return (
    <>
      <Modal isOpen={isOpen} onClose={() => { haptic('nav'); onClose(); if(!initialData) resetAll(); }} title={initialData ? "Editar servicio" : "Nueva venta"} zIndex={zIndex}>
         <div className="flex flex-col h-full relative">
            
            {step === 1 && (
                initialData ? (
                    /* ───────── MODO EDICIÓN: mismo formulario que "Configurar servicio" ───────── */
                    <div className="flex flex-col animate-fade-in pt-1 gap-5">
                        <ItemConfigForm
                            {...itemFormProps}
                            accounts={accounts}
                            isEditing
                            currentExpiry={initialData.expiryDate}
                        />
                        <div className="flex gap-3">
                            <button onClick={onClose} className="flex-1 h-[52px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-4 text-text-secondary hover:text-text-primary rounded-md font-semibold text-sm transition-all active:scale-[0.98]">
                                Cancelar
                            </button>
                            <button onClick={() => { haptic('nav'); handleAddItem(); }} className="btn-primary flex-[2] h-[52px] rounded-md text-sm flex items-center justify-center gap-2">
                                <Check size={18} strokeWidth={3} />
                                Guardar cambios
                            </button>
                        </div>
                    </div>
                ) : (
                    /* ───────── NUEVA VENTA: paso 1 (cliente + carrito) ───────── */
                    <div className="flex flex-col animate-fade-in pt-1">

                        {/* Progreso */}
                        <div className="mb-5">
                            <p className="text-[11px] text-text-disabled font-medium mb-2">Paso 1 de 2 · Cliente y servicios</p>
                            <div className="flex gap-1.5">
                                <div className="flex-1 h-[3px] rounded-full bg-brand-primary" />
                                <div className="flex-1 h-[3px] rounded-full bg-[rgb(var(--fg-rgb))]/10" />
                            </div>
                        </div>

                        {/* 1. CLIENTE */}
                        <div className="mb-5">
                            <label className="text-[10px] font-bold text-text-disabled uppercase tracking-widest ml-1 mb-2 block">Cliente</label>
                            {!selectedClientId ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => { haptic('nav'); setModalSearch('client'); }} className="h-[88px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-brand-primary/40 active:scale-95 transition-all">
                                        <Search size={22} className="text-text-muted" />
                                        <span className="text-[13px] font-bold text-text-primary">Cliente registrado</span>
                                    </button>
                                    <button onClick={() => { haptic('nav'); setIsNewClientModalOpen(true); }} className="h-[88px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-brand-primary/40 active:scale-95 transition-all">
                                        <UserPlus size={22} className="text-text-muted" />
                                        <span className="text-[13px] font-bold text-text-primary">Cliente nuevo</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 bg-surface-3 p-3 rounded-xl border border-[rgb(var(--fg-rgb))]/5 animate-fade-in">
                                    <div className="w-11 h-11 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-sm shrink-0">
                                        {selectedClient?.name?.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-text-primary truncate">{selectedClient?.name}</p>
                                        {selectedClient?.phone && <p className="text-[11px] text-text-disabled font-mono mt-0.5 truncate">{selectedClient.phone}</p>}
                                    </div>
                                    <button onClick={() => { haptic('nav'); setSelectedClientId(''); }} className="h-9 px-3 rounded-full bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors shrink-0 active:scale-95">
                                        Cambiar
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 2. SERVICIOS DEL CARRITO */}
                        <div>
                            <div className="flex items-center justify-between mb-2 px-1">
                                <label className="text-[10px] font-bold text-text-disabled uppercase tracking-widest">Servicios</label>
                                {cart.length > 0 && <span className="text-[11px] text-text-disabled">{cart.length} {cart.length === 1 ? 'agregado' : 'agregados'}</span>}
                            </div>

                            <div className="space-y-2">
                                {cart.length === 0 ? (
                                    <div className="bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 rounded-xl py-6 flex flex-col items-center justify-center gap-2 text-text-disabled">
                                        <ShoppingCart size={26} strokeWidth={1.5} />
                                        <p className="text-[13px] font-medium">Aún no agregaste servicios</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div key={item.tempId} onClick={() => openItemForEdit(item)} className="bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 p-3 rounded-xl flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all">
                                            <div className="w-10 h-10 rounded-md bg-brand-primary/15 text-brand-primary-hi flex items-center justify-center shrink-0"><Layers size={18} /></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-text-primary truncate">{item.serviceName}</p>
                                                <p className="text-[11px] text-text-disabled font-mono truncate mt-0.5">{item.accountEmail}</p>
                                                <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgb(var(--fg-rgb))]/5 text-text-muted">{SALE_TYPE_LABELS[item.saleType] || item.saleType}</span>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                                                <span className="text-[15px] font-bold text-status-success-soft">${item.amount.toFixed(2)}</span>
                                                <button aria-label="Quitar servicio" onClick={(e) => { e.stopPropagation(); setCart(cart.filter(i => i.tempId !== item.tempId)); }} className="w-8 h-8 flex items-center justify-center bg-status-danger/10 text-status-danger rounded-lg hover:bg-status-danger/20 transition-colors"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <button
                                onClick={() => { haptic('nav'); resetItemForm(); setIsItemConfigOpen(true); }}
                                className="mt-2 w-full h-12 rounded-xl border border-dashed border-[rgb(var(--fg-rgb))]/15 hover:border-[rgb(var(--fg-rgb))]/25 text-text-muted hover:text-text-primary text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                            >
                                <Plus size={18} /> Agregar servicio
                            </button>
                        </div>

                        {/* 3. TOTAL + CONTINUAR (queda pegado abajo al hacer scroll) */}
                        <div className="sticky bottom-0 z-10 -mx-3 lg:-mx-6 px-3 lg:px-6 mt-5 py-3 bg-surface-1 border-t border-[rgb(var(--fg-rgb))]/5 flex items-center gap-3">
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-text-disabled uppercase tracking-widest">Total</p>
                                <p className="text-2xl font-black text-text-primary leading-none mt-1">${totalCart.toFixed(2)}</p>
                            </div>
                            <button
                                onClick={handleGoToCheckout}
                                disabled={cart.length === 0}
                                className="btn-primary flex-1 h-[52px] rounded-md text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:shadow-none"
                            >
                                Ir a cobrar <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )
            )}

            {step === 2 && (
              <div className="flex flex-col h-full bg-surface-1 lg:rounded-2xl overflow-hidden animate-fade-in">
                  
                  {/* Header & Total - Matching the clean look of the reference top section */}
                  <div className="pt-10 pb-8 px-6 text-center relative">
                       <button onClick={() => { haptic('nav'); setStep(1); }} className="absolute top-6 left-6 w-10 h-10 rounded-full bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors active:scale-90">
                           <ArrowLeft size={20} />
                       </button>
                       
                       <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                           <span className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.2em] mb-2 bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">Total a Pagar</span>
                           <div className="flex items-baseline justify-center gap-1">
                               <span className="text-2xl font-medium text-text-disabled relative -top-1">$</span>
                               <span className="text-6xl font-black text-text-primary tracking-tighter">{totalToPay.toFixed(2)}</span>
                           </div>
                           {/* If wallet selected and currency differs, show conversion like reference "≈ $12" */}
                           {addToWallet && walletId && financialAccounts.find(f => f.id === walletId)?.currency !== 'USD' && (
                               <p className="text-sm font-bold text-text-disabled mt-2 font-mono">
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
                                <h3 className="text-sm font-bold text-text-primary">Método de Ingreso</h3>
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
                                    <span className={`text-[10px] font-semibold uppercase tracking-widest transition-colors ${!isMigration ? 'text-status-success' : 'text-text-faint'}`}>
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
                                             {isMigration ? <History size={14} className="text-black" /> : <DollarSign size={14} className="text-text-primary" />}
                                        </motion.div>
                                    </div>
                                    
                                    <span className={`text-[10px] font-semibold uppercase tracking-widest transition-colors ${isMigration ? 'text-status-warning' : 'text-text-faint'}`}>
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
                                             <div className={`w-12 h-12 rounded-md flex items-center justify-center border ${walletId ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary' : 'bg-zinc-800/50 border-zinc-700 text-text-disabled'}`}>
                                                 <Wallet size={20} />
                                             </div>
                                             <div className="text-left">
                                                 <span className="block text-[10px] font-semibold text-text-disabled uppercase tracking-wider mb-0.5">Billetera Destino</span>
                                                 <span className={`block text-sm font-bold ${walletId ? 'text-text-primary' : 'text-text-muted'}`}>
                                                     {financialAccounts.find(f => f.id === walletId)?.name || 'Seleccionar...'}
                                                 </span>
                                             </div>
                                         </div>
                                         <div className="w-8 h-8 rounded-full bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-disabled group-hover:text-text-primary">
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
                                                     <span className="block text-[10px] font-semibold text-text-disabled uppercase tracking-wider mb-0.5">Monto a Ingresar</span>
                                                     <span className="block text-sm font-bold text-text-primary font-mono">
                                                         {convertedAmount.toFixed(2)} {financialAccounts.find(f => f.id === walletId)?.currency}
                                                     </span>
                                                 </div>
                                            </div>
                                        </div>
                                     )}
                                </div>
                            )}
                            
                            {isMigration && (
                                <div className="p-4 rounded-md bg-status-warning/10 border border-status-warning/20 flex gap-3 items-start">
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
                           <div className="flex items-center gap-3 p-4 rounded-md bg-status-danger/10 border border-status-danger/20">
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
                          className="w-full h-12 bg-gradient-to-r from-brand-primary to-brand-accent rounded-md text-white font-bold text-sm uppercase tracking-widest shadow-[0_0_30px_-5px_rgba(106,44,255,0.4)] hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                       >
                          <MessageCircle size={18} fill="currentColor" />
                          Confirmar y Notificar
                       </button>
                       
                       <button 
                          onClick={() => { haptic('nav'); handleFinalize('save'); }} 
                          disabled={isSubmitting || (addToWallet && !walletId && !initialData && !isMigration)}
                          className="w-full h-12 bg-surface-3 text-text-muted font-semibold text-xs rounded-md border border-[rgb(var(--fg-rgb))]/5 hover:text-text-primary hover:bg-[rgb(var(--fg-rgb))]/5 transition-all"
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
        {...itemFormProps}
        isOpen={isItemConfigOpen} 
        onClose={() => setIsItemConfigOpen(false)} 
        zIndex={zIndex ? zIndex + 50 : undefined} 
        handleAddItem={handleAddItem} 
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
            <div className={`p-4 rounded-xl border mb-2 flex items-center justify-between transition-all ${c.isBlocked ? 'bg-red-900/10 border-status-danger/20 opacity-50' : 'bg-surface-1 border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-zinc active:scale-[0.98]'}`}>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white text-sm font-bold shadow-lg border border-[rgb(var(--fg-rgb))]/10">
                        {c.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-text-primary leading-tight">{c.name}</p>
                        <p className="text-[11px] text-text-disabled font-mono mt-0.5">{c.phone}</p>
                    </div>
                </div>
                {c.isBlocked ? <Ban size={18} className="text-status-danger" /> : <ChevronRight size={18} className="text-text-faint" />}
            </div>
        )} 
      />
      <SearchListModal isOpen={modalSearch === 'service'} onClose={() => setModalSearch(null)} items={services} onSelect={(s: Service) => setTempServiceId(s.id)} title="Elegir Plataforma" filterFn={(s, q) => s.name.toLowerCase().includes(q)} zIndex={zIndex ? zIndex + 200 : undefined} renderItem={(s: Service) => (<div className="p-4 rounded-xl bg-surface-1 border border-[rgb(var(--fg-rgb))]/5 mb-1 flex justify-between items-center hover:border-brand-primary/40 transition-all"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-sm bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 overflow-hidden">{s.image_url ? <img src={s.image_url} className="w-full h-full object-cover" /> : <Layers size={20} className="text-text-disabled" />}</div><span className="text-sm font-bold text-text-primary">{s.name}</span></div><span className="text-[9px] font-black text-text-disabled uppercase tracking-widest">{s.screens} Cupos</span></div>)} />
      <SearchListModal isOpen={modalSearch === 'account'} onClose={() => setModalSearch(null)} items={availableAccounts} onSelect={(a: Account) => setTempAccountId(a.id)} title="Seleccionar Stock" filterFn={(a, q) => a.email.toLowerCase().includes(q)} zIndex={zIndex ? zIndex + 200 : undefined} renderItem={(a: Account) => (<div className="p-4 rounded-xl bg-surface-1 border border-[rgb(var(--fg-rgb))]/5 mb-1 flex justify-between items-center hover:border-brand-primary/40 transition-all"><div className="flex flex-col min-w-0 pr-3"><span className="text-sm font-bold text-text-primary truncate max-w-[200px] leading-tight">{a.email}</span><span className="text-[10px] font-mono text-text-disabled mt-1">Expira: {a.endDate}</span></div><div className="flex flex-col items-end"><span className={`text-[9px] font-black text-status-success-soft uppercase bg-status-success/10 px-2 py-1 rounded-xl border border-status-success/20 tracking-widest`}>Disponible</span><span className="text-[8px] text-text-faint font-bold mt-1">{a.maxScreens - calculateOccupancy(a)} LIBRES</span></div></div>)} />
      <SearchListModal isOpen={modalSearch === 'wallet'} onClose={() => setModalSearch(null)} items={financialAccounts.filter(f => f.isActive !== false)} onSelect={(w: FinancialAccount) => setWalletId(w.id)} title="Billetera de Cobro" filterFn={(w, q) => w.name.toLowerCase().includes(q)} zIndex={zIndex ? zIndex + 200 : undefined} renderItem={(w: FinancialAccount) => (<div className="p-4 rounded-xl bg-surface-1 border border-[rgb(var(--fg-rgb))]/5 mb-1 flex justify-between items-center hover:border-brand-primary/40 transition-all"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 shadow-sm"><Wallet size={18} /></div><span className="text-sm font-bold text-text-primary">{w.name}</span></div><span className="text-[10px] font-bold text-text-disabled font-mono tracking-widest bg-[rgb(var(--fg-rgb))]/5 px-2 py-1 rounded-xl">{w.currency}</span></div>)} />
    </>
  );
};
export default SaleModal;
