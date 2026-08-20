import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Sale, FinancialAccount } from '../../types';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { Calendar, Wallet, RefreshCw, MessageCircle, ChevronDown, Search, X, Check, DollarSign, RefreshCcw, TrendingUp, Loader2, Minus, Plus } from 'lucide-react';
import { sendWhatsAppMessage, formatDate, addTime } from '../../utils/contactosUtils';
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4" style={{ zIndex: zIndex || 10000 }} onClick={onClose}>
       <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="bg-surface-1 border border-border-subtle rounded-lg w-full max-w-md overflow-hidden flex flex-col max-h-[80vh] shadow-modal" onClick={(e) => e.stopPropagation()}>
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                  <h3 className="text-white font-black text-lg">Billetera</h3>
                  <p className="text-[11px] text-zinc-500 font-medium">Selecciona cuenta de ingreso</p>
              </div>
              <button onClick={onClose} className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors active:scale-90"><X size={18} /></button>
          </div>
          <div className="p-4 space-y-3">
             <div className="relative">
                 <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                 <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cuenta..." className="w-full bg-surface-sunken rounded-md pl-11 pr-4 h-[52px] text-sm text-white outline-none border border-white/10 focus:border-brand-primary/50 transition-all placeholder:text-zinc-600 font-medium" />
             </div>
             <div className="space-y-2 overflow-y-auto max-h-[300px] custom-scrollbar pr-1">
                <button onClick={() => { onSelect(null); onClose(); }} className="w-full text-left p-3 rounded-lg hover:bg-white/5 border border-white/5 flex items-center gap-3 transition-colors group active:scale-[0.98]">
                    <div className="w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center text-zinc-400 group-hover:text-white transition-colors border border-white/5 shrink-0"><X size={18} /></div>
                    <span className="text-sm font-bold text-zinc-400 group-hover:text-white">No registrar pago</span>
                </button>
                {filtered.map(acc => (
                    <button key={acc.id} onClick={() => { onSelect(acc); onClose(); }} className="w-full text-left p-3 rounded-lg hover:bg-white/5 border border-white/5 flex items-center gap-3 transition-colors group active:scale-[0.98]">
                        <div className="w-10 h-10 rounded-sm bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 shrink-0"><Wallet size={18} /></div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                                <p className="text-sm font-bold text-white group-hover:text-brand-primary transition-colors truncate">
                                    <span className="text-[10px] text-zinc-500 mr-1">{acc.currency}</span>
                                    {acc.name}
                                </p>
                            </div>
                            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">Saldo: {acc.balance.toLocaleString()}</p>
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

interface RenewModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesToRenew: Sale[];
  zIndex?: number;
}

const RenewModal: React.FC<RenewModalProps> = ({ isOpen, onClose, salesToRenew, zIndex }) => {
  const { addSale, updateSale, updateAccount, settings, financialAccounts, executeTransaction, clients, logAction, services, accounts } = useData();
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

        // 3. Actualizar la fecha de vencimiento de la CUENTA en el inventario
        if (sale.accountId) {
            const account = accounts.find(a => a.id === sale.accountId);
            if (account) {
              await updateAccount({
                  ...account,
                  endDate: targetDate, // En la tabla accounts es endDate
                  status: 'activa' // Aseguramos que esté activa
              });
            }
        }

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

  // Helper para botones stepper
  const StepperControl = ({ value, onChange, label, min = 0 }: any) => (
      <div className="bg-surface-sunken rounded-md border border-white/10 p-1 flex items-center justify-between h-[52px] w-full focus-within:border-white/20 transition-colors">
          <button onClick={() => onChange(Math.max(min, value - 1))} className="w-10 h-full rounded-sm bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center active:scale-90 transition-all"><Minus size={16} /></button>
          <div className="flex-1 flex flex-col items-center justify-center h-full">
              <input 
                type="number" 
                value={value} 
                onChange={(e) => {
                    const val = parseInt(e.target.value);
                    onChange(isNaN(val) ? 0 : Math.max(min, val));
                }}
                className="bg-transparent text-center text-lg font-bold text-white w-full outline-none appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-wide -mt-1">{label}</span>
          </div>
          <button onClick={() => onChange(value + 1)} className="w-10 h-full rounded-sm bg-white/5 text-zinc-400 hover:text-white flex items-center justify-center active:scale-90 transition-all"><Plus size={16} /></button>
      </div>
  );

  if (!isOpen) return null;

  return createPortal(
    <>
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" style={{ zIndex: (zIndex || 10020) - 1 }} onClick={onClose} />
        <div className="fixed inset-0 flex items-end lg:items-center justify-center p-0 lg:p-4 pointer-events-none" style={{ zIndex: zIndex || 10020 }}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 32, mass: 0.8 }} className="pointer-events-auto w-full lg:max-w-lg bg-surface-1 rounded-t-xl lg:rounded-lg border-t border-border-subtle lg:border shadow-modal flex flex-col h-auto max-h-[90dvh] overflow-hidden">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 bg-surface-1">
                    <div>
                        <h3 className="text-lg font-black text-white leading-tight">Renovar Servicio</h3>
                        <p className="text-[11px] text-zinc-500 font-medium">Extender vigencia de {salesToRenew.length} servicio(s)</p>
                    </div>
                    <button onClick={() => { haptic('nav'); onClose(); }} className="w-9 h-9 bg-white/5 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors active:scale-90"><X size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    
                    {/* INFO CARD */}
                    <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-xl p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-md bg-brand-primary/20 flex items-center justify-center shrink-0 text-brand-primary border border-brand-primary/20">
                            <RefreshCw size={22} />
                        </div>
                        <div>
                            <h4 className="text-brand-primary font-bold text-sm uppercase tracking-wide">Renovación Activa</h4>
                            <p className="text-zinc-400 text-[11px] leading-tight mt-1 font-medium">Vencimiento actual: <span className="text-white font-bold">{formatDate(salesToRenew[0]?.expiryDate)}</span></p>
                        </div>
                    </div>

                    {/* 1. TIEMPO Y DURACIÓN */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Vigencia y Tiempo</label>
                        <div className="bg-surface-zinc rounded-xl p-4 border border-white/5 space-y-4">
                            <div className="flex items-center bg-surface-sunken rounded-md px-4 h-[52px] border border-white/10">
                                <Calendar size={18} className="text-zinc-500 mr-3" />
                                <input type="date" value={newDateStr} onChange={e => setNewDateStr(e.target.value)} className="bg-transparent text-sm text-white font-bold w-full outline-none uppercase tracking-wider" />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1"><StepperControl value={months} onChange={setMonths} label="MESES" /></div>
                                <div className="flex-1"><StepperControl value={days} onChange={setDays} label="DÍAS" /></div>
                            </div>
                        </div>
                    </div>

                    {/* 2. PAGO Y BILLETERA */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pago y Billetera</label>
                            {isConversionActive && (<span className="text-[9px] bg-status-warning/10 text-status-warning px-2 py-0.5 rounded border border-status-warning/20 font-bold uppercase flex items-center gap-1"><RefreshCcw size={10} /> Tasa: {settings.exchangeRate}</span>)}
                        </div>
                        
                        <div className="bg-surface-zinc rounded-xl p-4 border border-white/5 space-y-4">
                            {/* Selector de Billetera */}
                            <button type="button" onClick={() => setIsWalletSearchOpen(true)} className="w-full bg-surface-sunken border border-white/10 rounded-md h-[52px] px-4 flex items-center justify-between active:scale-[0.98] transition-all hover:border-white/20 group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {selectedWallet ? (
                                        <>
                                            <div className="w-8 h-8 rounded-sm bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 shrink-0"><Wallet size={14} /></div>
                                            <div className="text-left">
                                                <span className="block text-[12px] font-bold text-white truncate leading-none mb-0.5">
                                                    <span className="text-[9px] text-zinc-500 mr-1">{selectedWallet.currency}</span>
                                                    {selectedWallet.name}
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-8 h-8 rounded-sm bg-white/5 flex items-center justify-center text-zinc-500 shrink-0"><X size={14} /></div>
                                            <span className="text-[12px] font-medium text-zinc-500">No registrar pago</span>
                                        </>
                                    )}
                                </div>
                                <ChevronDown size={16} className="text-zinc-500 shrink-0 group-hover:text-white transition-colors" />
                            </button>

                            {/* Input de Monto */}
                            <div className="relative h-[60px] bg-surface-sunken rounded-lg border border-white/10 flex items-center px-5 focus-within:border-brand-primary/50 focus-within:ring-1 focus-within:ring-brand-primary/20 transition-all">
                                <DollarSign size={24} className="text-status-success mr-2" />
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-transparent text-2xl font-black text-white outline-none placeholder:text-zinc-700" placeholder="0.00" inputMode="decimal" />
                                {selectedWallet && <span className="text-xs font-semibold text-zinc-500 absolute right-5 top-1/2 -translate-y-1/2">{selectedWallet.currency}</span>}
                            </div>
                        </div>
                    </div>

                    {estimatedProfit !== 0 && (
                        <div className="flex justify-center">
                            <span className={`text-[10px] font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${estimatedProfit > 0 ? 'bg-status-success/10 text-status-success-soft border-status-success/20' : 'bg-status-danger/10 text-status-danger-soft border-status-danger/20'}`}>
                                <TrendingUp size={12} /> Ganancia Est.: {settings.currency} {estimatedProfit.toFixed(2)}
                            </span>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-surface-1 border-t border-white/5 shrink-0 flex gap-3">
                    <button onClick={() => handleRenew(false)} className="flex-1 h-[56px] bg-surface-3 border border-white/5 hover:bg-surface-4 text-zinc-300 rounded-lg font-semibold text-xs uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2 hover:text-white">
                        <Check size={18} /> Guardar
                    </button>
                    <button onClick={() => handleRenew(true)} className="flex-[2] h-[56px] bg-gradient-to-r from-brand-primary to-brand-accent hover:brightness-110 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-glow flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                        <MessageCircle size={18} strokeWidth={2.5} /> Renovar y Notificar
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