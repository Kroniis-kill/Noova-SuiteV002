import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Sale } from '../../types';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useHaptic } from '../../hooks/useHaptic';
import { sendWhatsAppMessage, addTime, parseLocalISO } from '../../utils/contactosUtils';
import { getCombinedWhatsAppTemplate } from '../../utils/salesUtils';
import { generateUUID } from '../../utils/uuid';
import { X, Check, RefreshCw, Wallet, ChevronDown, DollarSign, RefreshCcw, Minus, Plus, MessageCircle, ArrowRight } from 'lucide-react';
import { WalletSearchModal } from './RenewModal';

// ─────────────────────────────────────────────────────────────
// Renovación rápida desde la tarjeta de venta.
// Misma lógica de guardado que RenewModal (updateSale + executeTransaction + WhatsApp)
// pero con selección de servicios por cliente y solo los datos necesarios.
// No requiere cambios en la base de datos: usa los mismos campos de `sales` y `transactions`.
// ─────────────────────────────────────────────────────────────

const QUICK_MONTHS = [1, 2, 3, 6];
const STRONG_CURRENCIES = ['USD', 'USDT', 'USDC', 'EUR'];

// Neutraliza los estilos globales de inputs (ver index.css), igual que en RenewModal.
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
  if (days < 0) return { label: `Vencido ${Math.abs(days)} d`, cls: 'bg-status-danger/10 text-status-danger-soft border-status-danger/20' };
  if (days === 0) return { label: 'Vence hoy', cls: 'bg-status-warning/10 text-status-warning-soft border-status-warning/20' };
  if (days <= 5) return { label: `Vence en ${days} d`, cls: 'bg-status-warning/10 text-status-warning-soft border-status-warning/20' };
  return { label: `Vence en ${days} d`, cls: 'bg-status-success/10 text-status-success-soft border-status-success/20' };
};

const getPeriodLabel = (months: number, days: number): string => {
  const parts: string[] = [];
  if (months > 0) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);
  return parts.length ? parts.join(' y ') : 'Sin cambios';
};

interface StepperControlProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
}

const StepperControl: React.FC<StepperControlProps> = ({ value, onChange, label }) => (
  <div className="bg-surface-sunken rounded-md border border-border-subtle p-1 flex items-center justify-between h-[52px] w-full focus-within:border-border-strong transition-colors">
    <button type="button" aria-label={`Menos ${label}`} onClick={() => onChange(Math.max(0, value - 1))} className="w-10 h-full shrink-0 rounded-sm bg-[rgb(var(--fg-rgb))]/5 text-text-muted hover:text-text-primary flex items-center justify-center active:scale-90 transition-all"><Minus size={16} /></button>
    <div className="flex-1 min-w-0 flex flex-col items-center justify-center h-full gap-0.5">
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const val = parseInt(e.target.value);
          onChange(isNaN(val) ? 0 : Math.max(0, val));
        }}
        className={`${CLEAN_INPUT} h-6 text-center !text-lg font-bold leading-none text-text-primary`}
      />
      <span className="text-micro font-bold text-text-faint uppercase tracking-wide leading-none">{label}</span>
    </div>
    <button type="button" aria-label={`Más ${label}`} onClick={() => onChange(value + 1)} className="w-10 h-full shrink-0 rounded-sm bg-[rgb(var(--fg-rgb))]/5 text-text-muted hover:text-text-primary flex items-center justify-center active:scale-90 transition-all"><Plus size={16} /></button>
  </div>
);

interface QuickRenewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  clientName: string;
  clientPhone?: string;
  warningThreshold: number;
  zIndex?: number;
}

const QuickRenewModal: React.FC<QuickRenewModalProps> = ({ isOpen, onClose, sales, clientName, clientPhone, warningThreshold, zIndex }) => {
  const { updateSale, settings, financialAccounts, executeTransaction, logAction, accounts } = useData();
  const { showToast } = useToast();
  const haptic = useHaptic();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [months, setMonths] = useState(1);
  const [days, setDays] = useState(0);
  const [amount, setAmount] = useState('');
  const [walletId, setWalletId] = useState('');
  const [isWalletSearchOpen, setIsWalletSearchOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Orden: primero lo que vence antes
  const orderedSales = useMemo(
    () => [...sales].sort((a, b) => parseLocalISO(a.expiryDate).getTime() - parseLocalISO(b.expiryDate).getTime()),
    [sales]
  );

  // Al abrir: preselecciona lo que corresponde renovar (vencido o dentro del umbral de aviso).
  // Si nada está por vencer, preselecciona solo el que vence primero.
  useEffect(() => {
    if (!isOpen) return;
    const due = orderedSales.filter(s => getDaysUntil(s.expiryDate) <= warningThreshold).map(s => s.id);
    setSelectedIds(due.length > 0 ? due : orderedSales.slice(0, 1).map(s => s.id));
    setMonths(1);
    setDays(0);
    setSaving(false);
    const defaultWallet =
      financialAccounts.find(f => f.currency === settings.currency && f.isActive !== false) ||
      financialAccounts.find(f => f.isActive !== false);
    setWalletId(defaultWallet ? defaultWallet.id : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const selectedWallet = useMemo(() => financialAccounts.find(f => f.id === walletId), [walletId, financialAccounts]);
  const selectedSales = useMemo(() => orderedSales.filter(s => selectedIds.includes(s.id)), [orderedSales, selectedIds]);

  // Monto sugerido: suma de lo seleccionado × periodo, convertido a la moneda de la billetera.
  // Depende de una clave estable (no de arrays recreados) para no pisar el monto que el usuario edita.
  const selectedKey = selectedIds.join('|');
  useEffect(() => {
    if (!isOpen) return;
    const baseTotal = orderedSales.filter(s => selectedIds.includes(s.id)).reduce((acc, s) => acc + s.amount, 0);
    const scaledTotal = baseTotal * (months + days / 30);
    let value = scaledTotal;
    const wallet = financialAccounts.find(f => f.id === walletId);
    if (wallet) {
      const rate = settings.exchangeRate || 1;
      const isWalletStrong = STRONG_CURRENCIES.includes(wallet.currency);
      const isSystemStrong = STRONG_CURRENCIES.includes(settings.currency);
      if (!isWalletStrong && isSystemStrong) value = scaledTotal * rate;
      else if (isWalletStrong && !isSystemStrong) value = rate > 0 ? scaledTotal / rate : scaledTotal;
    }
    setAmount(value.toFixed(2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedKey, months, days, walletId, settings.currency, settings.exchangeRate]);

  const isConversionActive =
    !!selectedWallet &&
    selectedWallet.currency !== settings.currency &&
    !(['USD', 'USDT', 'USDC'].includes(selectedWallet.currency) && ['USD', 'USDT', 'USDC'].includes(settings.currency));

  const toggleSale = (id: string) => {
    haptic('nav');
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleRenew = async (notify: boolean) => {
    if (saving || selectedSales.length === 0) return;
    setSaving(true);
    haptic('success');

    try {
      const numAmount = parseFloat(amount) || 0;
      const rate = settings.exchangeRate || 1;

      // 1. Monto en la moneda del sistema (para guardarlo en las ventas)
      let amountInSystemCurrency = numAmount;
      if (selectedWallet) {
        const isWalletStrong = STRONG_CURRENCIES.includes(selectedWallet.currency);
        const isSystemStrong = STRONG_CURRENCIES.includes(settings.currency);
        if (!isWalletStrong && isSystemStrong && rate > 0) amountInSystemCurrency = numAmount / rate;
        else if (isWalletStrong && !isSystemStrong) amountInSystemCurrency = numAmount * rate;
      }

      // 2. Reparto del monto entre los servicios, proporcional al precio de cada uno
      const baseTotal = selectedSales.reduce((acc, s) => acc + s.amount, 0);
      const weightOf = (s: Sale) => (baseTotal > 0 ? s.amount / baseTotal : 1 / selectedSales.length);

      // 3. Actualizar cada venta EXISTENTE (sin crear duplicados), desde su propio vencimiento
      const updatedSales: Sale[] = [];
      const nowISO = new Date().toISOString();
      for (const sale of selectedSales) {
        const updated: Sale = {
          ...sale,
          date: nowISO,
          expiryDate: addTime(sale.expiryDate, months, days),
          amount: amountInSystemCurrency * weightOf(sale),
          exchangeRate: settings.exchangeRate,
          notes: (sale.notes || '') + `\n[RENOVADO el ${new Date().toLocaleDateString()}]`,
        };
        await updateSale(updated);
        updatedSales.push(updated);
        logAction('UPDATE', 'SALE', `Servicio renovado: ${sale.serviceName} para ${clientName} (${months}m ${days}d)`);
      }

      // 4. Registrar el pago en la billetera elegida
      if (numAmount > 0 && selectedWallet) {
        let usdEquivalent = numAmount;
        const isWalletStrong = STRONG_CURRENCIES.includes(selectedWallet.currency);
        const isSystemStrong = STRONG_CURRENCIES.includes(settings.currency);
        if (!isWalletStrong && isSystemStrong) usdEquivalent = rate > 0 ? numAmount / rate : 0;
        else if (isWalletStrong && !isSystemStrong) usdEquivalent = numAmount * rate;

        const serviceNames = selectedSales.map(s => s.serviceName).join(', ');
        await executeTransaction({
          id: generateUUID(),
          accountId: selectedWallet.id,
          type: 'funding',
          amount: numAmount,
          currency: selectedWallet.currency,
          exchangeRate: rate,
          usdEquivalent,
          date: nowISO,
          description: `Renovación: ${serviceNames} (${getPeriodLabel(months, days)})`,
          paymentMethod: 'Renovación',
        });
      }

      // 5. Notificar con las fechas ya actualizadas
      if (notify && updatedSales.length > 0 && clientPhone) {
        const message = getCombinedWhatsAppTemplate(
          'renewal_success',
          updatedSales,
          clientName,
          accounts,
          settings,
          'whatsapp',
          selectedWallet?.currency === settings.subCurrency,
          false,
          numAmount
        );
        sendWhatsAppMessage(clientPhone, message);
      }

      showToast('Renovación completada exitosamente', 'success');
      onClose();
    } catch (error) {
      console.error('Error al renovar:', error);
      showToast('No se pudo completar la renovación. Intenta de nuevo.', 'error');
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const subtitle = [clientName, `${sales.length} ${sales.length === 1 ? 'servicio' : 'servicios'}`].filter(Boolean).join(' · ');
  const noneSelected = selectedSales.length === 0;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" style={{ zIndex: (zIndex || 20000) - 1 }} onClick={onClose} />
      <div className="fixed inset-0 flex items-end lg:items-center justify-center p-0 lg:p-4 pointer-events-none" style={{ zIndex: zIndex || 20000 }}>
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 32, mass: 0.8 }}
          className="pointer-events-auto w-full lg:max-w-lg bg-surface-1 rounded-t-xl lg:rounded-xl border-t border-border-subtle lg:border shadow-modal flex flex-col h-auto max-h-[90dvh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ───────── HEADER ───────── */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0 bg-surface-1">
            <div className="min-w-0">
              <h3 className="text-lg font-black text-text-primary leading-tight">Renovar servicios</h3>
              <p className="text-caption text-text-disabled font-medium truncate">{subtitle}</p>
            </div>
            <button aria-label="Cerrar" onClick={() => { haptic('nav'); onClose(); }} className="tap-44 w-9 h-9 flex items-center justify-center rounded-pill bg-surface-3 hover:bg-surface-4 text-text-muted hover:text-text-primary transition-all duration-150 ease-out-soft active:scale-90 shrink-0"><X size={18} /></button>
          </div>

          {/* ───────── CONTENIDO ───────── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 pt-2 flex flex-col gap-5">

            {/* 1. SERVICIOS A RENOVAR */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-tiny font-bold text-text-disabled uppercase tracking-widest">Servicios a renovar</label>
                <span className="text-tiny font-semibold text-text-disabled">{selectedSales.length} de {sales.length}</span>
              </div>
              <div className="space-y-2">
                {orderedSales.map(s => {
                  const active = selectedIds.includes(s.id);
                  const daysLeft = getDaysUntil(s.expiryDate);
                  const badge = getExpiryBadge(daysLeft);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSale(s.id)}
                      className={`w-full text-left bg-surface-zinc rounded-xl p-4 border flex items-center gap-3 transition-all active:scale-[0.98] ${active ? 'border-brand-primary/40' : 'border-hairline opacity-60'}`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${active ? 'bg-brand-primary border-brand-primary text-white' : 'border-zinc-600'}`}>
                        {active && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">{s.serviceName}</p>
                        {active ? (
                          <p className="text-caption text-status-success-soft font-medium mt-0.5 flex items-center gap-1 truncate">
                            {formatLongDate(s.expiryDate)} <ArrowRight size={11} /> {formatLongDate(addTime(s.expiryDate, months, days))}
                          </p>
                        ) : (
                          <p className="text-caption text-text-muted font-medium mt-0.5">Vence el {formatLongDate(s.expiryDate)}</p>
                        )}
                      </div>
                      <span className={`text-tiny font-bold px-2.5 py-1 rounded-full border shrink-0 ${badge.cls}`}>{badge.label}</span>
                    </button>
                  );
                })}
              </div>
              {noneSelected && (
                <p className="text-caption font-medium text-status-danger-soft px-1">Selecciona al menos un servicio para renovar.</p>
              )}
            </div>

            {/* 2. DURACIÓN */}
            <div className="space-y-3">
              <label className="text-tiny font-bold text-text-disabled uppercase tracking-widest ml-1 block">Duración</label>
              <div className="flex flex-wrap gap-2">
                {QUICK_MONTHS.map(m => {
                  const active = days === 0 && months === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { haptic('nav'); setMonths(m); setDays(0); }}
                      className={`h-9 px-4 rounded-full border text-body-sm font-semibold transition-all active:scale-95 ${active ? 'bg-brand-primary/20 border-brand-primary text-text-primary' : 'bg-surface-sunken border-border-subtle text-text-muted hover:text-text-primary'}`}
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

            {/* 3. PAGO Y BILLETERA */}
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-tiny font-bold text-text-disabled uppercase tracking-widest">Pago y billetera</label>
                {isConversionActive && (
                  <span className="text-micro bg-status-warning/10 text-status-warning px-2 py-0.5 rounded border border-status-warning/20 font-bold uppercase flex items-center gap-1"><RefreshCcw size={10} /> Tasa: {settings.exchangeRate}</span>
                )}
              </div>

              <div className="bg-surface-zinc rounded-xl p-4 border border-hairline space-y-3">
                <button type="button" onClick={() => setIsWalletSearchOpen(true)} className="w-full bg-surface-sunken border border-border-subtle rounded-md h-[52px] px-4 flex items-center justify-between active:scale-[0.98] transition-all hover:border-border-strong group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {selectedWallet ? (
                      <>
                        <div className="w-8 h-8 rounded-sm bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 shrink-0"><Wallet size={14} /></div>
                        <span className="text-label font-bold text-text-primary truncate">
                          <span className="text-tiny text-text-disabled mr-1">{selectedWallet.currency}</span>
                          {selectedWallet.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-sm bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-disabled shrink-0"><X size={14} /></div>
                        <span className="text-label font-medium text-text-disabled">No registrar pago</span>
                      </>
                    )}
                  </div>
                  <ChevronDown size={16} className="text-text-disabled shrink-0 group-hover:text-text-primary transition-colors" />
                </button>

                <div className="h-[60px] bg-surface-sunken rounded-md border border-border-subtle flex items-center px-5 focus-within:border-brand-primary/50 focus-within:ring-1 focus-within:ring-brand-primary/20 transition-all">
                  <DollarSign size={24} className="text-status-success mr-2 shrink-0" />
                  <input aria-label="0.00" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={`${CLEAN_INPUT} h-full !text-2xl font-black text-text-primary placeholder:text-text-disabled`} placeholder="0.00" inputMode="decimal" />
                  {selectedWallet && <span className="text-xs font-semibold text-text-disabled shrink-0 ml-3">{selectedWallet.currency}</span>}
                </div>

                <div className="flex items-center justify-between px-1 text-label">
                  <span className="text-text-disabled font-medium">Periodo a renovar</span>
                  <span className="font-bold text-text-primary">{getPeriodLabel(months, days)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ───────── FOOTER ───────── */}
          <div className="px-6 py-5 bg-surface-1 border-t border-hairline shrink-0 flex gap-3">
            <button onClick={() => handleRenew(false)} disabled={noneSelected || saving} className="flex-1 h-[52px] bg-surface-3 border border-hairline hover:bg-surface-4 text-text-secondary hover:text-text-primary rounded-md font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40">
              <RefreshCw size={18} /> Renovar
            </button>
            <button onClick={() => handleRenew(true)} disabled={noneSelected || saving} className="btn-primary flex-[2] h-[52px] rounded-md text-sm flex items-center justify-center gap-2 disabled:opacity-40">
              <MessageCircle size={18} strokeWidth={2.5} /> Renovar y notificar
            </button>
          </div>
        </motion.div>
      </div>
      <WalletSearchModal
        isOpen={isWalletSearchOpen}
        onClose={() => setIsWalletSearchOpen(false)}
        accounts={financialAccounts}
        onSelect={(acc) => setWalletId(acc?.id || '')}
        zIndex={(zIndex || 20000) + 50}
      />
    </>,
    document.body
  );
};

export default QuickRenewModal;
