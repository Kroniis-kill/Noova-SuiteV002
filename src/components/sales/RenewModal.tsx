import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Sale, FinancialAccount } from '../../types';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Calendar, Wallet, RefreshCw, MessageCircle, ChevronDown, Search, X, Check, DollarSign, RefreshCcw, TrendingUp, Minus, Plus } from 'lucide-react';
import { sendWhatsAppMessage, addTime, parseLocalISO } from '../../utils/contactosUtils';
import { getCombinedWhatsAppTemplate } from '../../utils/salesUtils';
import { generateUUID } from '../../utils/uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { useHaptic } from '../../hooks/useHaptic';

interface WalletSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: FinancialAccount[];
  onSelect: (account: FinancialAccount | null) => void;
  zIndex?: number;
}

const WalletSearchModal: React.FC<WalletSearchModalProps> = ({ isOpen, onClose, accounts, onSelect, zIndex }) => {
  const [search, setSearch] = useState('');
  const filtered = accounts.filter(a => a.isActive !== false && a.name.toLowerCase().includes(search.toLowerCase()));

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end lg:items-center justify-center p-4" style={{ zIndex: zIndex || 10000 }} onClick={onClose}>
       <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="bg-surface-1 border border-border-subtle rounded-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] shadow-modal" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b border-[rgb(var(--fg-rgb))]/5 flex items-center justify-between">
              <div>
                  <h3 className="text-text-primary font-black text-lg">Billetera</h3>
                  <p className="text-[11px] text-text-disabled font-medium">Selecciona cuenta de ingreso</p>
              </div>
              <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-pill bg-surface-3 hover:bg-surface-4 text-text-muted hover:text-text-primary transition-all duration-150 ease-out-soft active:scale-90"><X size={18} /></button>
          </div>
          <div className="p-4 space-y-3">
             <div className="relative">
                 <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled" />
                 <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cuenta..." className="w-full bg-surface-sunken rounded-md pl-11 pr-4 h-[52px] text-sm text-text-primary outline-none border border-[rgb(var(--fg-rgb))]/10 focus:border-brand-primary/50 transition-all placeholder:text-text-faint font-medium" />
             </div>
             <div className="space-y-2 overflow-y-auto max-h-[300px] custom-scrollbar pr-1">
                <button onClick={() => { onSelect(null); onClose(); }} className="w-full text-left p-3 rounded-xl hover:bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/5 flex items-center gap-3 transition-colors group active:scale-[0.98]">
                    <div className="w-10 h-10 rounded-sm bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-muted group-hover:text-text-primary transition-colors border border-[rgb(var(--fg-rgb))]/5 shrink-0"><X size={18} /></div>
                    <span className="text-sm font-bold text-text-muted group-hover:text-text-primary">No registrar pago</span>
                </button>
                {filtered.map(acc => (
                    <button key={acc.id} onClick={() => { onSelect(acc); onClose(); }} className="w-full text-left p-3 rounded-xl hover:bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/5 flex items-center gap-3 transition-colors group active:scale-[0.98]">
                        <div className="w-10 h-10 rounded-sm bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 shrink-0"><Wallet size={18} /></div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-bold text-text-primary group-hover:text-brand-primary transition-colors truncate">
                                    <span className="text-[10px] text-text-disabled mr-1">{acc.currency}</span>
                                    {acc.name}
                                </p>
                            </div>
                            <p className="text-[11px] text-text-disabled font-mono mt-0.5">Saldo: {acc.balance.toLocaleString()}</p>
                        </div>
                    </button>
                ))}
             </div>
          </div>
       </motion.div>
    </div>,
    document.body
  );
};

// --- HELPERS ---

const QUICK_MONTHS = [1, 2, 3, 6];

// index.css aplica a TODOS los inputs fondo, borde, radio de 16px, anillo de foco y
// font-size: 16px !important. Esta clase los neutraliza para inputs que viven dentro
// de un contenedor con su propio estilo (el contenedor dibuja el borde y el foco).
const CLEAN_INPUT = "w-full min-w-0 !bg-transparent !border-0 !ring-0 focus:!ring-0 !rounded-none !p-0 !m-0 outline-none appearance-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0";

const formatLongDate = (dateStr?: string | null): string => {
  if (!dateStr) return '---';
  const d = parseLocalISO(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

const getDaysUntil = (dateStr?: string | null): number => {
  if (!dateStr) return 0;
  const target = parseLocalISO(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 3600 * 24));
};

const getExpiryBadge = (days: number) => {
  if (days < 0) return { label: 'Vencido', cls: 'bg-status-danger/10 text-status-danger-soft border-status-danger/20' };
  if (days === 0) return { label: 'Vence hoy', cls: 'bg-status-warning/10 text-status-warning-soft border-status-warning/20' };
  if (days <= 5) return { label: `Vence en ${days} d`, cls: 'bg-status-warning/10 text-status-warning-soft border-status-warning/20' };
  return { label: `Vence en ${days} d`, cls: 'bg-status-success/10 text-status-success-soft border-status-success/20' };
};

const getExtensionLabel = (months: number, days: number): string => {
  const parts: string[] = [];
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);
  return parts.length ? `+${parts.join(' ')}` : 'Sin cambios';
};

// --- SUB-COMPONENTE: STEPPER (fuera del modal para no remontarse en cada render) ---

interface StepperControlProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
}

const StepperControl: React.FC<StepperControlProps> = ({ value, onChange, label, min = 0 }) => (
  <div className="bg-surface-sunken rounded-md border border-[rgb(var(--fg-rgb))]/10 p-1 flex items-center justify-between h-[52px] w-full focus-within:border-[rgb(var(--fg-rgb))]/20 transition-colors">
    <button type="button" aria-label={`Menos ${label}`} onClick={() => onChange(Math.max(min, value - 1))} className="w-10 h-full shrink-0 rounded-sm bg-[rgb(var(--fg-rgb))]/5 text-text-muted hover:text-text-primary flex items-center justify-center active:scale-90 transition-all"><Minus size={16} /></button>
    <div className="flex-1 min-w-0 flex flex-col items-center justify-center h-full gap-0.5">
      <input
        type="number"
        inputMode="numeric"
        min={min}
        value={value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const val = parseInt(e.target.value);
          onChange(isNaN(val) ? 0 : Math.max(min, val));
        }}
        className={`${CLEAN_INPUT} h-6 text-center !text-lg font-bold leading-none text-text-primary`}
      />
      <span className="text-[9px] font-bold text-text-faint uppercase tracking-wide leading-none">{label}</span>
    </div>
    <button type="button" aria-label={`Más ${label}`} onClick={() => onChange(value + 1)} className="w-10 h-full shrink-0 rounded-sm bg-[rgb(var(--fg-rgb))]/5 text-text-muted hover:text-text-primary flex items-center justify-center active:scale-90 transition-all"><Plus size={16} /></button>
  </div>
);

interface RenewModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesToRenew: Sale[];
  zIndex?: number;
}

const RenewModal: React.FC<RenewModalProps> = ({ isOpen, onClose, salesToRenew, zIndex }) => {
  const { addSale, updateSale, settings, financialAccounts, executeTransaction, clients, logAction, services, accounts } = useData();
  const { showToast } = useToast();
  const haptic = useHaptic();
  
  const [months, setMonths] = useState(1);
  const [days, setDays] = useState(0);
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [isWalletSearchOpen, setIsWalletSearchOpen] = useState(false);
  const [newDateStr, setNewDateStr] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMonths(1);
      setDays(0);
      const defaultWallet = financialAccounts.find(f => f.currency === settings.currency && f.isActive !== false) || financialAccounts.find(f => f.isActive !== false);
      if (defaultWallet) setWalletId(defaultWallet.id);
      else setWalletId('');
    }
  }, [isOpen, financialAccounts, settings.currency]);

  useEffect(() => {
    if (salesToRenew.length > 0) {
      const baseDate = salesToRenew[0].expiryDate;
      const calculatedDate = addTime(baseDate, months, days);
      setNewDateStr(calculatedDate);
    }
  }, [months, days, salesToRenew]);

  const selectedWallet = useMemo(() => financialAccounts.find(f => f.id === walletId), [walletId, financialAccounts]);

  useEffect(() => {
    if (!isOpen) return;
    
    // Calculamos el monto base (suma de los montos de las ventas seleccionadas)
    const baseTotal = salesToRenew.reduce((acc, s) => acc + s.amount, 0);
    
    // Calculamos el factor de tiempo para escalar el precio
    const timeFactor = months + (days / 30);
    const scaledTotal = baseTotal * timeFactor;
    
    if (selectedWallet) {
        const walletCurrency = selectedWallet.currency;
        const systemCurrency = settings.currency;
        const rate = settings.exchangeRate || 1;
        const strongCurrencies = ['USD', 'USDT', 'USDC', 'EUR'];
        const isWalletStrong = strongCurrencies.includes(walletCurrency);
        const isSystemStrong = strongCurrencies.includes(systemCurrency);

        if (!isWalletStrong && isSystemStrong) {
            const converted = scaledTotal * rate;
            setAmount(converted.toFixed(2));
        } else if (isWalletStrong && !isSystemStrong) {
            const converted = rate > 0 ? scaledTotal / rate : scaledTotal;
            setAmount(converted.toFixed(2));
        } else {
            setAmount(scaledTotal.toFixed(2));
        }
    } else {
        setAmount(scaledTotal.toFixed(2));
    }
  }, [walletId, salesToRenew, settings.currency, settings.exchangeRate, isOpen, months, days]);

  const estimatedProfit = useMemo(() => {
    if (salesToRenew.length === 0) return 0;
    const revenue = parseFloat(amount) || 0;
    let revenueInSystemCurrency = revenue;
    if (selectedWallet) {
        const walletCurrency = selectedWallet.currency;
        const systemCurrency = settings.currency;
        const rate = settings.exchangeRate || 1;
        const strongCurrencies = ['USD', 'USDT', 'USDC', 'EUR'];
        const isWalletStrong = strongCurrencies.includes(walletCurrency);
        const isSystemStrong = strongCurrencies.includes(systemCurrency);

        if (!isWalletStrong && isSystemStrong && rate > 0) {
            revenueInSystemCurrency = revenue / rate;
        } else if (isWalletStrong && !isSystemStrong) {
            revenueInSystemCurrency = revenue * rate;
        }
    }

    let totalCost = 0;
    salesToRenew.forEach(sale => {
        const svc = services.find(s => s.name === sale.serviceName);
        if (svc) {
            const totalAccountCost = svc.investmentPrice > 0 ? svc.investmentPrice : (svc.cost * (svc.screens || 1));
            let saleCostPerMonth = 0;
            if (sale.saleType === 'cuenta_completa') {
                saleCostPerMonth = totalAccountCost;
            } else {
                const realUnitCost = svc.screens > 0 ? totalAccountCost / svc.screens : 0;
                const soldScreens = sale.screensCount || 1;
                saleCostPerMonth = realUnitCost * soldScreens;
            }
            const timeFactor = months + (days / 30);
            totalCost += saleCostPerMonth * timeFactor;
        }
    });
    return revenueInSystemCurrency - totalCost;
  }, [amount, salesToRenew, services, months, days, selectedWallet, settings.currency, settings.exchangeRate]);


  const handleRenew = async (notify: boolean) => {
    haptic('success');
    const targetDate = newDateStr;

    const processRenewals = async () => {
      // 1. Calcular el monto total en moneda del sistema para guardar en las ventas
      const numAmount = parseFloat(amount) || 0;
      let amountInSystemCurrency = numAmount;
      
      if (selectedWallet) {
          const walletCurrency = selectedWallet.currency;
          const systemCurrency = settings.currency;
          const rate = settings.exchangeRate || 1;
          const strongCurrencies = ['USD', 'USDT', 'USDC', 'EUR'];
          const isWalletStrong = strongCurrencies.includes(walletCurrency);
          const isSystemStrong = strongCurrencies.includes(systemCurrency);

          if (!isWalletStrong && isSystemStrong && rate > 0) {
              amountInSystemCurrency = numAmount / rate;
          } else if (isWalletStrong && !isSystemStrong) {
              amountInSystemCurrency = numAmount * rate;
          }
      }

      const saleAmountInSystemCurrency = amountInSystemCurrency / salesToRenew.length;

      for (const sale of salesToRenew) {
        const targetDate = newDateStr;
        
        // 2. Actualizar la venta EXISTENTE para evitar duplicados
        // Esto renueva el registro actual con la nueva fecha y monto en moneda del sistema
        await updateSale({
            ...sale,
            date: new Date().toISOString(), // Fecha de la renovación (pago)
            expiryDate: targetDate,         // Nueva fecha de vencimiento
            amount: saleAmountInSystemCurrency,
            exchangeRate: settings.exchangeRate,
            notes: (sale.notes || '') + `\n[RENOVADO el ${new Date().toLocaleDateString()}]`
        });

        // NOTA: La renovación de una venta (cliente) es independiente de la cuenta en Inventario.
        // account.endDate solo debe modificarse desde AccountRenewModal.tsx (renovación con el proveedor),
        // ya que una misma cuenta puede tener varios clientes con fechas de vencimiento distintas.

        const client = clients.find(c => c.id === sale.clientId);
        const clientName = client ? client.name : 'Cliente';
        logAction('UPDATE', 'SALE', `Servicio renovado: ${sale.serviceName} para ${clientName} (${months}m ${days}d)`);
      }
    };

    await processRenewals();

    const numAmount = parseFloat(amount);
    if (numAmount > 0 && selectedWallet) {
       let usdEquivalent = numAmount;
       const rate = settings.exchangeRate || 1;
       const strongCurrencies = ['USD', 'USDT', 'USDC', 'EUR'];
       const isWalletStrong = strongCurrencies.includes(selectedWallet.currency);
       const isSystemStrong = strongCurrencies.includes(settings.currency);

       if (!isWalletStrong && isSystemStrong) {
           usdEquivalent = rate > 0 ? numAmount / rate : 0;
       } else if (isWalletStrong && !isSystemStrong) {
           usdEquivalent = numAmount * rate;
       }
       
       const serviceNames = salesToRenew.map(s => s.serviceName).join(', ');
       const description = `Renovación: ${serviceNames} (${months} Meses)`;

       await executeTransaction({
          id: generateUUID(),
          accountId: selectedWallet.id,
          type: 'funding',
          amount: numAmount,
          currency: selectedWallet.currency,
          exchangeRate: rate, 
          usdEquivalent: usdEquivalent, 
          date: new Date().toISOString(),
          description: description,
          paymentMethod: 'Renovación'
       });
    }

    if (notify && salesToRenew.length > 0) {
       const client = clients.find(c => c.id === salesToRenew[0].clientId);
       if (client) {
          const message = getCombinedWhatsAppTemplate(
            'renewal_success',
            salesToRenew,
            client.name,
            accounts,
            settings,
            'whatsapp',
            selectedWallet?.currency === settings.subCurrency,
            false,
            numAmount
          );
          
          sendWhatsAppMessage(client.phone ?? '', message);
       }
    }

    showToast(`Renovación completada exitosamente`, 'success');
    onClose();
  };

  const isConversionActive = selectedWallet && selectedWallet.currency !== settings.currency && !(['USD','USDT','USDC'].includes(selectedWallet.currency) && ['USD','USDT','USDC'].includes(settings.currency));

  // --- DATOS DERIVADOS PARA LA UI ---
  const renewClient = clients.find(c => c.id === salesToRenew[0]?.clientId);
  const currentExpiry = salesToRenew[0]?.expiryDate;
  const daysLeft = getDaysUntil(currentExpiry);
  const expiryBadge = getExpiryBadge(daysLeft);
  const serviceLabel = salesToRenew.length === 1 ? salesToRenew[0].serviceName : `${salesToRenew.length} servicios`;
  const subtitle = [`${salesToRenew.length} ${salesToRenew.length === 1 ? 'servicio' : 'servicios'}`, renewClient?.name].filter(Boolean).join(' · ');

  if (!isOpen) return null;

  return createPortal(
    <>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" style={{ zIndex: (zIndex || 10020) - 1 }} onClick={onClose} />
        <div className="fixed inset-0 flex items-end lg:items-center justify-center p-0 lg:p-4 pointer-events-none" style={{ zIndex: zIndex || 10020 }}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 32, mass: 0.8 }} className="pointer-events-auto w-full lg:max-w-lg bg-surface-1 rounded-t-xl lg:rounded-xl border-t border-border-subtle lg:border shadow-modal flex flex-col h-auto max-h-[90dvh] overflow-hidden">

                {/* ───────── HEADER ───────── */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 bg-surface-1">
                    <div className="min-w-0">
                        <h3 className="text-lg font-black text-text-primary leading-tight">Renovar servicio</h3>
                        <p className="text-[11px] text-text-disabled font-medium truncate">{subtitle}</p>
                    </div>
                    <button onClick={() => { haptic('nav'); onClose(); }} className="w-9 h-9 flex items-center justify-center rounded-pill bg-surface-3 hover:bg-surface-4 text-text-muted hover:text-text-primary transition-all duration-150 ease-out-soft active:scale-90 shrink-0"><X size={18} /></button>
                </div>

                {/* ───────── CONTENIDO ───────── */}
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 pt-2 flex flex-col gap-5">

                    {/* 1. SERVICIO A RENOVAR */}
                    <div className="bg-surface-zinc rounded-xl p-4 border border-[rgb(var(--fg-rgb))]/5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-brand-primary/15 flex items-center justify-center shrink-0 text-brand-primary-hi border border-brand-primary/20">
                            <RefreshCw size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-text-primary truncate">{serviceLabel}</p>
                            <p className="text-[11px] text-text-muted font-medium mt-0.5">Vence el {formatLongDate(currentExpiry)}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${expiryBadge.cls}`}>{expiryBadge.label}</span>
                    </div>

                    {/* 2. DURACIÓN */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-text-disabled uppercase tracking-widest ml-1 block">Duración</label>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_MONTHS.map(m => {
                                const active = days === 0 && months === m;
                                return (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => { haptic('nav'); setMonths(m); setDays(0); }}
                                        className={`h-9 px-4 rounded-full border text-[13px] font-semibold transition-all active:scale-95 ${active ? 'bg-brand-primary/20 border-brand-primary text-text-primary' : 'bg-surface-sunken border-[rgb(var(--fg-rgb))]/10 text-text-muted hover:text-text-primary'}`}
                                    >
                                        {m} {m === 1 ? 'mes' : 'meses'}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <StepperControl value={months} onChange={setMonths} label="MESES" />
                            <StepperControl value={days} onChange={setDays} label="DÍAS" />
                        </div>
                    </div>

                    {/* 3. NUEVO VENCIMIENTO */}
                    <div className="bg-surface-zinc rounded-xl p-4 border border-[rgb(var(--fg-rgb))]/5 focus-within:border-brand-primary/40 flex items-center justify-between gap-3 transition-colors">
                        <div className="min-w-0 flex-1">
                            <label className="text-[10px] font-bold text-text-disabled uppercase tracking-widest flex items-center gap-1.5">
                                <Calendar size={12} /> Nuevo vencimiento
                            </label>
                            <input
                                type="date"
                                value={newDateStr}
                                onChange={e => setNewDateStr(e.target.value)}
                                className={`${CLEAN_INPUT} h-8 mt-1 text-left !text-xl font-bold text-text-primary [&::-webkit-date-and-time-value]:text-left`}
                            />
                        </div>
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-brand-primary/15 text-brand-primary-hi shrink-0">{getExtensionLabel(months, days)}</span>
                    </div>

                    {/* 4. PAGO Y BILLETERA */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-bold text-text-disabled uppercase tracking-widest">Pago y billetera</label>
                            {isConversionActive && (<span className="text-[9px] bg-status-warning/10 text-status-warning px-2 py-0.5 rounded border border-status-warning/20 font-bold uppercase flex items-center gap-1"><RefreshCcw size={10} /> Tasa: {settings.exchangeRate}</span>)}
                        </div>

                        <div className="bg-surface-zinc rounded-xl p-4 border border-[rgb(var(--fg-rgb))]/5 space-y-3">
                            {/* Selector de billetera */}
                            <button type="button" onClick={() => setIsWalletSearchOpen(true)} className="w-full bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 rounded-md h-[52px] px-4 flex items-center justify-between active:scale-[0.98] transition-all hover:border-[rgb(var(--fg-rgb))]/20 group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {selectedWallet ? (
                                        <>
                                            <div className="w-8 h-8 rounded-sm bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 shrink-0"><Wallet size={14} /></div>
                                            <span className="text-[12px] font-bold text-text-primary truncate">
                                                <span className="text-[10px] text-text-disabled mr-1">{selectedWallet.currency}</span>
                                                {selectedWallet.name}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-8 h-8 rounded-sm bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-disabled shrink-0"><X size={14} /></div>
                                            <span className="text-[12px] font-medium text-text-disabled">No registrar pago</span>
                                        </>
                                    )}
                                </div>
                                <ChevronDown size={16} className="text-text-disabled shrink-0 group-hover:text-text-primary transition-colors" />
                            </button>

                            {/* Monto */}
                            <div className="h-[60px] bg-surface-sunken rounded-md border border-[rgb(var(--fg-rgb))]/10 flex items-center px-5 focus-within:border-brand-primary/50 focus-within:ring-1 focus-within:ring-brand-primary/20 transition-all">
                                <DollarSign size={24} className="text-status-success mr-2 shrink-0" />
                                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={`${CLEAN_INPUT} h-full !text-2xl font-black text-text-primary placeholder:text-text-faint`} placeholder="0.00" inputMode="decimal" />
                                {selectedWallet && <span className="text-xs font-semibold text-text-disabled shrink-0 ml-3">{selectedWallet.currency}</span>}
                            </div>

                            {/* Ganancia estimada */}
                            {estimatedProfit !== 0 && (
                                <div className="flex items-center justify-between px-1 text-[12px]">
                                    <span className="text-text-disabled font-medium">Ganancia estimada</span>
                                    <span className={`font-bold flex items-center gap-1.5 ${estimatedProfit > 0 ? 'text-status-success-soft' : 'text-status-danger-soft'}`}>
                                        <TrendingUp size={14} /> {settings.currency} {estimatedProfit.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* ───────── FOOTER ───────── */}
                <div className="px-6 py-5 bg-surface-1 border-t border-[rgb(var(--fg-rgb))]/5 shrink-0 flex gap-3">
                    <button onClick={() => handleRenew(false)} className="flex-1 h-[52px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-4 text-text-secondary hover:text-text-primary rounded-md font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                        <Check size={18} /> Guardar
                    </button>
                    <button onClick={() => handleRenew(true)} className="btn-primary flex-[2] h-[52px] rounded-md text-sm flex items-center justify-center gap-2">
                        <MessageCircle size={18} strokeWidth={2.5} /> Renovar y notificar
                    </button>
                </div>

            </motion.div>
        </div>
        <WalletSearchModal isOpen={isWalletSearchOpen} onClose={() => setIsWalletSearchOpen(false)} accounts={financialAccounts} onSelect={(acc) => setWalletId(acc?.id || '')} zIndex={zIndex ? zIndex + 50 : 10050} />
    </>,
    document.body
  );
};

export default RenewModal;
