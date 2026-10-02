import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, User, Package, Calendar, DollarSign,
  AlertTriangle, RotateCcw, Check, ChevronDown, ChevronRight, Layers, Box
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useCurrency } from '../../hooks/useCurrency';
import { useHaptic } from '../../hooks/useHaptic';
import { parseLocalISO } from '../../utils/contactosUtils';
import SearchListModal from '../../components/sales/SearchListModal';

import { Sale, Client } from '../../types';

interface RefundPageProps {
  onBack?: () => void;
}

const DAY_MS = 86400000;

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Misma regla de duración que usaba la calculadora: días entre la compra y el vencimiento (mínimo 1).
const daysBetween = (a: string, b: string) => {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.max(1, Math.round((d2 - d1) / DAY_MS));
};

const dayKey = (v: string) => (v || '').split('T')[0];

const shortDate = (v: string) =>
  parseLocalISO(dayKey(v)).toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '');

const elapsedDays = (saleDate: string) =>
  Math.max(0, Math.round((Date.now() - new Date(saleDate).getTime()) / DAY_MS));

// Estilos que ya usa esta página (para que los campos nuevos se vean igual que los existentes)
const INPUT =
  'w-full bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 rounded-md px-3 py-2.5 text-sm text-text-primary placeholder:text-text-faint outline-none focus:border-brand-primary/50';

const TAG_BRAND = 'bg-brand-primary/10 text-brand-primary border-brand-primary/20';
const TAG_WARN = 'bg-status-warning/10 text-status-warning-soft border-status-warning/20';
const TAG_NEUTRAL = 'bg-[rgb(var(--fg-rgb))]/5 text-text-muted border-[rgb(var(--fg-rgb))]/10';

interface Combo {
  key: string;
  expiry: string;
  items: Sale[];
}

interface PaidValue { m: string; s: string; }

interface ResultRowData {
  name: string;
  duration: number;
  used: number;
  remaining: number;
  total: number;
  totalSub: number;
  usedValue: number;
  usedValueSub: number;
  refund: number;
  refundSub: number;
}

interface RefundResult {
  rows: ResultRowData[];
  label: string;
  total: number;
  totalSub: number;
  usedValue: number;
  usedValueSub: number;
  refund: number;
  refundSub: number;
}

const RefundPage: React.FC<RefundPageProps> = ({ onBack }) => {
  const { clients, sales } = useData();
  const { mainCurrency, subCurrency, exchangeRate } = useCurrency();
  const haptic = useHaptic();

  const [clientId, setClientId] = useState<string>('');
  const [isClientPickerOpen, setIsClientPickerOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [usedByCombo, setUsedByCombo] = useState<Record<string, string>>({});
  const [paid, setPaid] = useState<Record<string, PaidValue>>({});
  const [error, setError] = useState('');
  const [result, setResult] = useState<RefundResult | null>(null);

  // Servicios activos = aún no vencen (misma regla que tenía la página).
  const activeSalesAll = useMemo<Sale[]>(() => {
    const now = Date.now();
    return sales.filter(s => new Date(s.expiryDate).getTime() > now);
  }, [sales]);

  // Solo clientes que tienen al menos un servicio activo, con su próximo vencimiento.
  const refundableClients = useMemo(() => {
    const byClient = new Map<string, { count: number; nearest: number }>();
    const now = Date.now();
    activeSalesAll.forEach(s => {
      const days = Math.max(0, Math.ceil((new Date(s.expiryDate).getTime() - now) / DAY_MS));
      const cur = byClient.get(s.clientId);
      if (!cur) byClient.set(s.clientId, { count: 1, nearest: days });
      else byClient.set(s.clientId, { count: cur.count + 1, nearest: Math.min(cur.nearest, days) });
    });
    return clients
      .filter(c => byClient.has(c.id))
      .map(c => ({ client: c, ...byClient.get(c.id)! }))
      .sort((a, b) => a.client.name.localeCompare(b.client.name));
  }, [clients, activeSalesAll]);

  const selectedClient: Client | undefined = clients.find(c => c.id === clientId);
  const clientInfo = refundableClients.find(r => r.client.id === clientId);

  const activeSales = useMemo<Sale[]>(
    () => (clientId ? activeSalesAll.filter(s => s.clientId === clientId) : []),
    [activeSalesAll, clientId]
  );

  // Combo = servicios del cliente que vencen el mismo día.
  const combos = useMemo<Combo[]>(() => {
    const groups = new Map<string, Sale[]>();
    activeSales.forEach(s => {
      const k = dayKey(s.expiryDate);
      groups.set(k, [...(groups.get(k) || []), s]);
    });
    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, items]) => ({
        key,
        expiry: items[0].expiryDate,
        items: items.sort((a, b) => a.serviceName.localeCompare(b.serviceName)),
      }));
  }, [activeSales]);

  const selectedSales = useMemo(() => activeSales.filter(s => selected[s.id]), [activeSales, selected]);
  const selectedTotal = selectedSales.reduce((acc, s) => acc + (s.amount || 0), 0);

  const getPaid = (s: Sale): PaidValue =>
    paid[s.id] ?? {
      m: (s.amount || 0).toFixed(2),
      s: ((s.amount || 0) * (s.exchangeRate || exchangeRate || 1)).toFixed(2),
    };

  const usedFor = (s: Sale) => {
    const dur = daysBetween(s.date, s.expiryDate);
    const n = parseFloat(usedByCombo[dayKey(s.expiryDate)]);
    return Math.max(0, Math.min(isNaN(n) ? 0 : n, dur));
  };

  const touch = () => { setResult(null); setError(''); };

  const handlePickClient = (c: Client) => {
    haptic('nav');
    setClientId(c.id);
    setSelected({});
    setUsedByCombo({});
    setPaid({});
    touch();
  };

  const toggleSale = (s: Sale) => {
    haptic('nav');
    setSelected(prev => ({ ...prev, [s.id]: !prev[s.id] }));
    touch();
  };

  const toggleCombo = (combo: Combo) => {
    haptic('nav');
    const all = combo.items.every(s => selected[s.id]);
    setSelected(prev => {
      const next = { ...prev };
      combo.items.forEach(s => { next[s.id] = !all; });
      return next;
    });
    touch();
  };

  const setPaidMain = (s: Sale, value: string) => {
    const rate = s.exchangeRate || exchangeRate || 1;
    setPaid(prev => ({ ...prev, [s.id]: { m: value, s: ((parseFloat(value) || 0) * rate).toFixed(2) } }));
    touch();
  };

  const setPaidSub = (s: Sale, value: string) => {
    setPaid(prev => ({ ...prev, [s.id]: { m: getPaid(s).m, s: value } }));
    touch();
  };

  const handleCalculate = () => {
    if (selectedSales.length === 0) { setError('Selecciona al menos un servicio.'); return; }
    if (selectedSales.some(s => !(parseFloat(getPaid(s).m) > 0))) {
      setError('Indica el precio pagado de cada servicio seleccionado.');
      return;
    }
    setError('');

    const rows: ResultRowData[] = selectedSales.map(s => {
      const duration = daysBetween(s.date, s.expiryDate);
      const used = usedFor(s);
      const total = parseFloat(getPaid(s).m) || 0;
      const totalSub = parseFloat(getPaid(s).s) || 0;
      const usedValue = (total / duration) * used;
      const usedValueSub = (totalSub / duration) * used;
      return {
        name: s.serviceName, duration, used, remaining: Math.max(0, duration - used),
        total, totalSub, usedValue, usedValueSub,
        refund: total - usedValue, refundSub: totalSub - usedValueSub,
      };
    });

    const sum = (pick: (r: ResultRowData) => number) => rows.reduce((a, r) => a + pick(r), 0);

    const fullCombos = combos.filter(c => c.items.length > 1 && c.items.every(s => selected[s.id]));
    const partial = combos
      .filter(c => c.items.length > 1 && c.items.some(s => selected[s.id]) && !c.items.every(s => selected[s.id]))
      .map(c => `${c.items.filter(s => selected[s.id]).length} de ${c.items.length}`);

    let label: string;
    if (fullCombos.length && !partial.length) label = fullCombos.length === 1 ? 'Combo completo' : `${fullCombos.length} combos completos`;
    else if (partial.length) label = `Parte de un combo (${partial.join(', ')})`;
    else label = rows.length === 1 ? 'Servicio individual' : `${rows.length} servicios`;

    setResult({
      rows, label,
      total: sum(r => r.total), totalSub: sum(r => r.totalSub),
      usedValue: sum(r => r.usedValue), usedValueSub: sum(r => r.usedValueSub),
      refund: sum(r => r.refund), refundSub: sum(r => r.refundSub),
    });
    haptic('success');
  };

  const handleReset = () => {
    setClientId('');
    setSelected({});
    setUsedByCombo({});
    setPaid({});
    setError('');
    setResult(null);
  };

  return (
    <div className="pb-32 font-sans text-text-primary min-h-screen">
      <div className="px-[var(--mobile-side-pad)] pt-4 space-y-5 max-w-3xl mx-auto">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-brand-primary/15 via-surface-3 to-surface-3 border border-[rgb(var(--fg-rgb))]/[0.08]"
        >
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-glow-sm">
              <Calculator size={20} className="text-text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-text-primary tracking-tight">Calculadora de Reembolso</h2>
              <p className="text-[12px] text-text-muted leading-tight mt-0.5">
                Calcula el reembolso exacto según los días realmente usados.
              </p>
            </div>
          </div>
        </motion.div>

        {/* PASO 1: Cliente */}
        <Section icon={<User size={14} />} title="1. Cliente">
          {!clientId ? (
            <>
              <button
                type="button"
                onClick={() => { haptic('nav'); setIsClientPickerOpen(true); }}
                className="w-full h-[60px] px-3 bg-surface-sunken rounded-xl border border-[rgb(var(--fg-rgb))]/10 flex items-center gap-3 text-left active:scale-[0.99] transition-all group hover:border-[rgb(var(--fg-rgb))]/20"
              >
                <div className="w-9 h-9 rounded-md bg-brand-primary/15 flex items-center justify-center text-brand-primary shrink-0 border border-brand-primary/20">
                  <User size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[10px] font-semibold text-text-disabled uppercase">Cliente</span>
                  <span className="block text-[13px] font-bold truncate text-text-faint">Seleccionar cliente...</span>
                </div>
                <ChevronDown size={16} className="text-text-faint group-hover:text-text-primary shrink-0" />
              </button>
              <p className="text-[11px] text-text-disabled mt-2 ml-1">
                {refundableClients.length} {refundableClients.length === 1 ? 'cliente con servicios activos' : 'clientes con servicios activos'}
              </p>
            </>
          ) : (
            <div className="flex items-start justify-between gap-3 bg-surface-sunken border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl px-3 py-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-[14px] font-bold shrink-0">
                  {selectedClient?.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-text-primary leading-tight truncate">{selectedClient?.name}</p>
                  {selectedClient?.phone && <p className="text-[11px] text-text-disabled mt-0.5">{selectedClient.phone}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TAG_BRAND}`}>
                      {clientInfo?.count} {clientInfo?.count === 1 ? 'servicio activo' : 'servicios activos'}
                    </span>
                    {clientInfo && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${clientInfo.nearest <= 7 ? TAG_WARN : TAG_NEUTRAL}`}>
                        Próximo vence en {clientInfo.nearest} d
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-[11px] text-text-muted hover:text-text-primary px-2.5 py-1.5 rounded-md border border-[rgb(var(--fg-rgb))]/10 shrink-0"
              >
                Cambiar
              </button>
            </div>
          )}
        </Section>

        {/* PASO 2: Qué reembolsar (combos y servicios) */}
        {clientId && (
          <Section icon={<Package size={14} />} title="2. Qué reembolsar">
            {activeSales.length === 0 ? (
              <div className="text-center py-6 px-3 rounded-xl bg-surface-sunken border border-[rgb(var(--fg-rgb))]/[0.06]">
                <AlertTriangle size={20} className="mx-auto text-status-warning-soft mb-2" />
                <p className="text-xs text-text-muted">Este cliente no tiene servicios activos.</p>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-text-disabled mb-3 leading-relaxed">
                  Los servicios que vencen el mismo día forman un combo. Reembolsa el combo completo o elige solo los que necesites.
                </p>
                <div className="space-y-3">
                  {combos.map(combo => {
                    const multi = combo.items.length > 1;
                    const count = combo.items.filter(s => selected[s.id]).length;
                    const all = count === combo.items.length;
                    const comboTotal = combo.items.reduce((a, s) => a + (s.amount || 0), 0);
                    return (
                      <div
                        key={combo.key}
                        className={`rounded-xl border overflow-hidden transition-colors ${count > 0 ? 'border-brand-primary/40' : 'border-[rgb(var(--fg-rgb))]/[0.06]'} bg-surface-sunken`}
                      >
                        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-md bg-brand-primary/15 text-brand-primary border border-brand-primary/20 flex items-center justify-center shrink-0">
                              {multi ? <Layers size={15} /> : <Box size={15} />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-bold text-text-primary leading-tight">{multi ? 'Combo' : 'Servicio individual'}</p>
                              <p className="text-[10px] text-text-disabled mt-0.5 truncate">
                                Vence el {shortDate(combo.expiry)} · ${fmt(comboTotal)} pagado{multi && count > 0 && !all ? ` · ${count} de ${combo.items.length}` : ''}
                              </p>
                            </div>
                          </div>
                          {multi && (
                            <button
                              type="button"
                              onClick={() => toggleCombo(combo)}
                              className={`h-8 px-3 rounded-full border text-[11px] font-bold flex items-center gap-1 shrink-0 transition-all active:scale-95 ${all ? 'bg-brand-primary/20 border-brand-primary text-text-primary' : 'bg-surface-3 border-[rgb(var(--fg-rgb))]/10 text-text-muted hover:text-text-primary'}`}
                            >
                              {all && <Check size={12} strokeWidth={3} />} Combo completo
                            </button>
                          )}
                        </div>
                        {combo.items.map(s => {
                          const on = !!selected[s.id];
                          const dur = daysBetween(s.date, s.expiryDate);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleSale(s)}
                              className="w-full flex items-center gap-3 px-3 py-3 border-t border-[rgb(var(--fg-rgb))]/[0.06] text-left active:bg-[rgb(var(--fg-rgb))]/5 transition-colors"
                            >
                              <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${on ? 'bg-brand-primary border-brand-primary text-white' : 'border-zinc-600'}`}>
                                {on && <Check size={12} strokeWidth={3} />}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-sm font-bold text-text-primary truncate">{s.serviceName}</span>
                                <span className="block text-[10px] text-text-disabled">{dur} días · comprado {shortDate(s.date)}</span>
                              </span>
                              <span className="text-sm font-bold text-text-primary">${fmt(s.amount)}</span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[11px] text-text-disabled mt-3 px-1">
                  <span>
                    {selectedSales.length === 0
                      ? 'Nada seleccionado'
                      : `${selectedSales.length} ${selectedSales.length === 1 ? 'servicio seleccionado' : 'servicios seleccionados'}`}
                  </span>
                  {selectedSales.length > 0 && <span>${fmt(selectedTotal)} pagado</span>}
                </div>
              </>
            )}
          </Section>
        )}

        {/* PASO 3: Datos de la suscripción */}
        {selectedSales.length > 0 && (
          <Section icon={<DollarSign size={14} />} title="3. Datos de la suscripción">
            <div className="space-y-4">
              {combos.map(combo => {
                const items = combo.items.filter(s => selected[s.id]);
                if (items.length === 0) return null;
                return (
                  <div key={combo.key} className="rounded-xl border border-[rgb(var(--fg-rgb))]/[0.06] bg-surface-sunken p-3">
                    <p className="text-[13px] font-bold text-text-primary mb-3">
                      {combo.items.length > 1 ? `Combo · vence el ${shortDate(combo.expiry)}` : items[0].serviceName}
                    </p>

                    <Field label="Días utilizados">
                      <div className="flex gap-2">
                        <input
                          type="number" inputMode="numeric" min={0}
                          value={usedByCombo[combo.key] ?? ''}
                          onChange={(e) => { setUsedByCombo(p => ({ ...p, [combo.key]: e.target.value })); touch(); }}
                          placeholder="0"
                          className={`${INPUT} flex-1 min-w-0`}
                        />
                        <button
                          type="button"
                          onClick={() => { haptic('nav'); setUsedByCombo(p => ({ ...p, [combo.key]: String(elapsedDays(items[0].date)) })); touch(); }}
                          className="h-[44px] px-3 rounded-md border border-[rgb(var(--fg-rgb))]/10 bg-surface-3 text-[11px] font-bold text-text-muted hover:text-text-primary flex items-center gap-1.5 shrink-0 active:scale-95 transition-all"
                        >
                          <Calendar size={12} /> Transcurridos: {elapsedDays(items[0].date)} d
                        </button>
                      </div>
                    </Field>

                    {items.map(s => {
                      const p = getPaid(s);
                      const dur = daysBetween(s.date, s.expiryDate);
                      return (
                        <div key={s.id} className="mt-3 pt-3 border-t border-[rgb(var(--fg-rgb))]/[0.06]">
                          <div className="flex justify-between items-baseline gap-2 mb-2">
                            <span className="text-[13px] font-semibold text-text-primary truncate">{s.serviceName}</span>
                            <span className="text-[10px] text-text-disabled shrink-0">
                              Plan {dur} d · restan {Math.max(0, dur - usedFor(s))} d
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Field label={`Pagado (${mainCurrency})`}>
                              <input
                                type="number" inputMode="decimal" step="0.01"
                                value={p.m}
                                onChange={(e) => setPaidMain(s, e.target.value)}
                                className={INPUT}
                              />
                            </Field>
                            <Field label={`Pagado (${subCurrency})`}>
                              <input
                                type="number" inputMode="decimal" step="0.01"
                                value={p.s}
                                onChange={(e) => setPaidSub(s, e.target.value)}
                                className={INPUT}
                              />
                            </Field>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {error && <p className="text-[12px] font-medium text-status-danger-soft mt-3">{error}</p>}

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCalculate}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent text-white font-bold text-sm shadow-glow-sm active:scale-[0.98] transition"
              >
                Calcular reembolso
              </button>
              <button
                onClick={handleReset}
                className="px-3 rounded-xl bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 text-text-muted hover:text-text-primary"
                title="Reiniciar"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </Section>
        )}

        {/* RESULTADO */}
        <AnimatePresence>
          {result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 240, damping: 24 }}
              className="relative overflow-hidden rounded-2xl border border-status-success/30 bg-gradient-to-br from-status-success/[0.08] via-surface-3 to-surface-3 p-5"
            >
              <div className="relative z-10 text-center mb-5">
                <p className="text-[11px] uppercase tracking-widest text-status-success-soft font-bold mb-1">Reembolso de</p>
                <p className="text-4xl font-black text-text-primary tracking-tight">
                  ${fmt(result.refund)} <span className="text-base font-bold text-text-muted">{mainCurrency}</span>
                </p>
                <p className="text-[11px] text-text-muted mt-1">≈ ${fmt(result.refundSub)} {subCurrency}</p>
                <span className="inline-block mt-3 text-[11px] font-bold px-3 py-1 rounded-full border bg-status-success/10 text-status-success-soft border-status-success/20">
                  {result.label}
                </span>
              </div>

              <div className="relative z-10 space-y-1.5">
                {result.rows.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-surface-sunken/60 border border-[rgb(var(--fg-rgb))]/[0.05]">
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-text-primary truncate">{r.name}</p>
                      <p className="text-[10px] text-text-disabled">{r.used} usados · {r.remaining} restantes de {r.duration} d</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[13px] font-black text-emerald-300">${fmt(r.refund)} {mainCurrency}</p>
                      <p className="text-[10px] text-text-disabled">${fmt(r.refundSub)} {subCurrency}</p>
                    </div>
                  </div>
                ))}

                <div className="pt-1.5 space-y-1.5">
                  <ResultRow icon="💰" label="Total pagado" value={`$${fmt(result.total)} ${mainCurrency}`} sub={`$${fmt(result.totalSub)} ${subCurrency}`} />
                  <ResultRow icon="🔴" label="Valor de días usados" value={`$${fmt(result.usedValue)} ${mainCurrency}`} sub={`$${fmt(result.usedValueSub)} ${subCurrency}`} tone="red" />
                  <ResultRow icon="💚" label="Reembolso estimado" value={`$${fmt(result.refund)} ${mainCurrency}`} sub={`$${fmt(result.refundSub)} ${subCurrency}`} tone="emerald" bold />
                </div>
              </div>

              <div className="relative z-10 flex gap-2 mt-4">
                <button
                  onClick={() => setResult(null)}
                  className="flex-1 h-11 rounded-xl bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 text-text-muted hover:text-text-primary text-sm font-semibold active:scale-[0.98] transition"
                >
                  Ajustar datos
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 h-11 rounded-xl bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 text-text-muted hover:text-text-primary text-sm font-semibold active:scale-[0.98] transition"
                >
                  Nuevo cálculo
                </button>
              </div>

              <div className="relative z-10 mt-5 p-3 rounded-md bg-status-warning/5 border border-status-warning/20 flex gap-2.5">
                <AlertTriangle size={14} className="text-status-warning-soft shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-text-muted">
                  Este cálculo es una <span className="text-amber-300">estimación basada en el costo diario proporcional</span>. El monto real puede variar según las políticas de reembolso de cada servicio.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* SELECTOR DE CLIENTE (mismo componente que usa Nueva venta) */}
      <SearchListModal
        isOpen={isClientPickerOpen}
        onClose={() => setIsClientPickerOpen(false)}
        items={refundableClients}
        onSelect={(r: { client: Client }) => handlePickClient(r.client)}
        title="Seleccionar Cliente"
        filterFn={(r: { client: Client }, q: string) =>
          r.client.name.toLowerCase().includes(q) || (r.client.phone || '').toLowerCase().includes(q)
        }
        renderItem={(r: { client: Client; count: number; nearest: number }) => (
          <div className="p-4 rounded-xl border mb-2 flex items-center justify-between gap-3 transition-all bg-surface-1 border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-zinc active:scale-[0.98]">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white text-sm font-bold shadow-lg border border-[rgb(var(--fg-rgb))]/10 shrink-0">
                {r.client.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-text-primary leading-tight truncate">{r.client.name}</p>
                <p className="text-[11px] text-text-disabled font-mono mt-0.5">{r.client.phone}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TAG_BRAND}`}>
                {r.count} {r.count === 1 ? 'servicio' : 'servicios'}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${r.nearest <= 7 ? TAG_WARN : TAG_NEUTRAL}`}>
                vence en {r.nearest} d
              </span>
            </div>
          </div>
        )}
      />
    </div>
  );
};

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-2xl p-4"
  >
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-md bg-brand-primary/15 text-brand-primary flex items-center justify-center">{icon}</div>
      <h3 className="text-[12px] font-bold text-text-primary uppercase tracking-wider">{title}</h3>
    </div>
    {children}
  </motion.div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-[10px] font-semibold text-text-disabled uppercase tracking-wider mb-1.5">{label}</span>
    {children}
  </label>
);

const ResultRow: React.FC<{
  icon: string; label: string; value: string; sub?: string;
  tone?: 'red' | 'emerald'; bold?: boolean;
}> = ({ icon, label, value, sub, tone, bold }) => {
  const valueColor = tone === 'red' ? 'text-red-300' : tone === 'emerald' ? 'text-emerald-300' : 'text-text-primary';
  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-surface-sunken/60 border border-[rgb(var(--fg-rgb))]/[0.05] ${bold ? 'border-status-success/30' : ''}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-base">{icon}</span>
        <span className="text-[12px] text-text-secondary font-medium truncate">{label}</span>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-[13px] ${bold ? 'font-black' : 'font-bold'} ${valueColor}`}>{value}</p>
        {sub && <p className="text-[10px] text-text-disabled">{sub}</p>}
      </div>
    </div>
  );
};

export default RefundPage;
