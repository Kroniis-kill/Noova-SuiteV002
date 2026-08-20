import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator, User, Package, Calendar, DollarSign, Clock,
  CheckCircle2, AlertTriangle, ChevronLeft, Search, RotateCcw,
  Wallet, Zap, XCircle, Heart
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useCurrency } from '../../hooks/useCurrency';

import { Sale, Client } from '../../types';

interface RefundPageProps {
  onBack?: () => void;
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const daysBetween = (a: string, b: string) => {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.max(1, Math.round((d2 - d1) / 86400000));
};

const RefundPage: React.FC<RefundPageProps> = ({ onBack }) => {
  const { clients, sales } = useData();
  const { mainCurrency, subCurrency, exchangeRate } = useCurrency();

  const [clientId, setClientId] = useState<string>('');
  const [saleId, setSaleId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [pricePaid, setPricePaid] = useState<string>('');
  const [pricePaidSub, setPricePaidSub] = useState<string>('');
  const [daysUsed, setDaysUsed] = useState<string>('');
  const [result, setResult] = useState<null | {
    saleName: string;
    duration: number;
    used: number;
    remaining: number;
    perDay: number;
    usedValue: number;
    refund: number;
    perDaySub: number;
    usedValueSub: number;
    refundSub: number;
    total: number;
    totalSub: number;
  }>(null);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...clients].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q)
    );
  }, [clients, search]);

  const activeSales = useMemo<Sale[]>(() => {
    if (!clientId) return [];
    const now = Date.now();
    return sales
      .filter(s => s.clientId === clientId && new Date(s.expiryDate).getTime() > now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, clientId]);

  const selectedSale = useMemo(
    () => activeSales.find(s => s.id === saleId) || null,
    [activeSales, saleId]
  );

  // Auto-fill on sale select
  React.useEffect(() => {
    if (!selectedSale) {
      setPricePaid('');
      setPricePaidSub('');
      setDaysUsed('');
      setResult(null);
      return;
    }
    const main = selectedSale.amount || 0;
    const sub = main * (selectedSale.exchangeRate || exchangeRate || 1);
    setPricePaid(main.toFixed(2));
    setPricePaidSub(sub.toFixed(2));
    setDaysUsed('');
    setResult(null);
  }, [selectedSale, exchangeRate]);

  const duration = selectedSale ? daysBetween(selectedSale.date, selectedSale.expiryDate) : 0;
  const usedNum = Math.max(0, Math.min(Number(daysUsed) || 0, duration));
  const remaining = duration ? Math.max(0, duration - usedNum) : 0;

  const handleCalculate = () => {
    if (!selectedSale) return;
    const total = Number(pricePaid) || 0;
    const totalSub = Number(pricePaidSub) || 0;
    const perDay = total / duration;
    const perDaySub = totalSub / duration;
    const usedValue = perDay * usedNum;
    const usedValueSub = perDaySub * usedNum;
    setResult({
      saleName: selectedSale.serviceName,
      duration,
      used: usedNum,
      remaining,
      perDay,
      usedValue,
      refund: total - usedValue,
      perDaySub,
      usedValueSub,
      refundSub: totalSub - usedValueSub,
      total,
      totalSub,
    });
  };

  const handleReset = () => {
    setClientId('');
    setSaleId('');
    setSearch('');
    setPricePaid('');
    setPricePaidSub('');
    setDaysUsed('');
    setResult(null);
  };

  const selectedClient: Client | undefined = clients.find(c => c.id === clientId);

  return (
    <div className="pb-32 font-sans text-zinc-100 min-h-screen">
      <div className="px-[var(--mobile-side-pad)] pt-4 space-y-5 max-w-3xl mx-auto">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-brand-primary/15 via-surface-3 to-surface-3 border border-white/[0.08]"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-brand-primary/15 blur-2xl" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-glow-sm">
              <Calculator size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Calculadora de Reembolso</h2>
              <p className="text-[12px] text-zinc-400 leading-tight mt-0.5">
                Calcula el reembolso exacto según los días realmente usados.
              </p>
            </div>
          </div>
        </motion.div>

        {/* STEP 1: Cliente */}
        <Section icon={<User size={14} />} title="1. Selecciona el cliente">
          {!clientId ? (
            <>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full bg-surface-sunken border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-brand-primary/50"
                />
              </div>
              <div className="max-h-56 overflow-y-auto no-scrollbar space-y-1.5">
                {filteredClients.length === 0 && (
                  <div className="text-center py-6 text-xs text-zinc-500">Sin clientes</div>
                )}
                {filteredClients.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setClientId(c.id); setSearch(''); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-surface-sunken border border-white/[0.06] hover:border-brand-primary/40 transition active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-brand-primary/15 flex items-center justify-center text-brand-primary text-[11px] font-bold">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-white">{c.name}</span>
                    </div>
                    {c.phone && <span className="text-[10px] text-zinc-500">{c.phone}</span>}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between bg-surface-sunken border border-white/[0.08] rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-[12px] font-bold">
                  {selectedClient?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-tight">{selectedClient?.name}</p>
                  <p className="text-[10px] text-zinc-500">{activeSales.length} servicio(s) activo(s)</p>
                </div>
              </div>
              <button
                onClick={() => { setClientId(''); setSaleId(''); }}
                className="text-[11px] text-zinc-400 hover:text-white px-2 py-1 rounded-md border border-white/10"
              >
                Cambiar
              </button>
            </div>
          )}
        </Section>

        {/* STEP 2: Servicio activo */}
        {clientId && (
          <Section icon={<Package size={14} />} title="2. Servicio activo">
            {activeSales.length === 0 ? (
              <div className="text-center py-6 px-3 rounded-xl bg-surface-sunken border border-white/[0.06]">
                <AlertTriangle size={20} className="mx-auto text-status-warning-soft mb-2" />
                <p className="text-xs text-zinc-400">Este cliente no tiene servicios activos.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeSales.map(s => {
                  const dur = daysBetween(s.date, s.expiryDate);
                  const isActive = saleId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSaleId(s.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition active:scale-[0.98] ${
                        isActive
                          ? 'bg-brand-primary/10 border-brand-primary/50'
                          : 'bg-surface-sunken border-white/[0.06] hover:border-white/20'
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold text-white">{s.serviceName}</p>
                        <p className="text-[10px] text-zinc-500">{dur} días · vence {new Date(s.expiryDate).toLocaleDateString()}</p>
                      </div>
                      <span className="text-sm font-bold text-white">${fmt(s.amount)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </Section>
        )}

        {/* STEP 3: Datos */}
        {selectedSale && (
          <Section icon={<DollarSign size={14} />} title="3. Datos de la suscripción">
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Precio pagado (${mainCurrency})`}>
                <input
                  type="number" inputMode="decimal" step="0.01"
                  value={pricePaid}
                  onChange={(e) => setPricePaid(e.target.value)}
                  className="w-full bg-surface-sunken border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-brand-primary/50"
                />
              </Field>
              <Field label={`Precio pagado (${subCurrency})`}>
                <input
                  type="number" inputMode="decimal" step="0.01"
                  value={pricePaidSub}
                  onChange={(e) => setPricePaidSub(e.target.value)}
                  className="w-full bg-surface-sunken border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-brand-primary/50"
                />
              </Field>
              <Field label="Duración del plan">
                <div className="w-full bg-surface-sunken border border-white/[0.06] rounded-xl px-3 py-2.5 text-sm text-zinc-300 flex items-center gap-1.5">
                  <Calendar size={13} className="text-zinc-500" /> {duration} días
                </div>
              </Field>
              <Field label="Días utilizados">
                <input
                  type="number" inputMode="numeric" min={0} max={duration}
                  value={daysUsed}
                  onChange={(e) => setDaysUsed(e.target.value)}
                  placeholder="0"
                  className="w-full bg-surface-sunken border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-brand-primary/50"
                />
              </Field>
            </div>

            {/* Quick summary */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Mini icon={<Clock size={12} />} label="Días usados" value={`${usedNum}`} tone="amber" />
              <Mini icon={<CheckCircle2 size={12} />} label="Días restantes" value={`${remaining}`} tone="emerald" />
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCalculate}
                disabled={!pricePaid || Number(pricePaid) <= 0}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent text-white font-bold text-sm shadow-glow-sm disabled:opacity-40 disabled:grayscale active:scale-[0.98] transition"
              >
                Calcular reembolso
              </button>
              <button
                onClick={handleReset}
                className="px-3 rounded-xl bg-surface-sunken border border-white/10 text-zinc-400 hover:text-white"
                title="Reiniciar"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </Section>
        )}

        {/* RESULT */}
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
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-status-success/20 blur-3xl" />

              <div className="relative z-10 text-center mb-5">
                <p className="text-[11px] uppercase tracking-widest text-status-success-soft font-bold mb-1">Reembolso de</p>
                <p className="text-4xl font-black text-white tracking-tight">
                  ${fmt(result.refund)} <span className="text-base font-bold text-zinc-400">{mainCurrency}</span>
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  ≈ ${fmt(result.refundSub)} {subCurrency}
                </p>
                <p className="text-[12px] text-zinc-300 mt-2">
                  por <span className="font-bold text-white">{result.remaining}</span> días no utilizados de <span className="font-bold text-white">{result.saleName}</span>
                </p>
              </div>

              <div className="relative z-10 space-y-1.5">
                <ResultRow icon="💰" label="Precio total pagado" value={`$${fmt(result.total)} ${mainCurrency}`} sub={`$${fmt(result.totalSub)} ${subCurrency}`} />
                <ResultRow icon="📅" label="Duración del plan" value={`${result.duration} días`} />
                <ResultRow icon="⚡" label="Costo por día" value={`$${fmt(result.perDay)} ${mainCurrency}`} sub={`$${fmt(result.perDaySub)} ${subCurrency}`} />
                <ResultRow icon="✅" label="Días utilizados" value={`${result.used} días`} />
                <ResultRow icon="🔴" label="Valor de días usados" value={`$${fmt(result.usedValue)} ${mainCurrency}`} sub={`$${fmt(result.usedValueSub)} ${subCurrency}`} tone="red" />
                <ResultRow icon="💚" label="Reembolso estimado" value={`$${fmt(result.refund)} ${mainCurrency}`} sub={`$${fmt(result.refundSub)} ${subCurrency}`} tone="emerald" bold />
              </div>

              <div className="relative z-10 mt-5 p-3 rounded-xl bg-status-warning/5 border border-status-warning/20 flex gap-2.5">
                <AlertTriangle size={14} className="text-status-warning-soft shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  Este cálculo es una <span className="text-amber-300">estimación basada en el costo diario proporcional</span>. El monto real puede variar según las políticas de reembolso de <span className="font-bold text-white">{result.saleName}</span>. Te recomendamos contactar directamente con el servicio para gestionar la devolución.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
    className="bg-surface-3 border border-white/[0.08] rounded-2xl p-4"
  >
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-md bg-brand-primary/15 text-brand-primary flex items-center justify-center">{icon}</div>
      <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">{title}</h3>
    </div>
    {children}
  </motion.div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{label}</span>
    {children}
  </label>
);

const Mini: React.FC<{ icon: React.ReactNode; label: string; value: string; tone: 'amber' | 'emerald' }> = ({ icon, label, value, tone }) => {
  const colors = tone === 'amber'
    ? 'bg-status-warning/10 border-status-warning/20 text-amber-300'
    : 'bg-status-success/10 border-status-success/20 text-emerald-300';
  return (
    <div className={`rounded-xl border px-3 py-2 ${colors}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold opacity-80">
        {icon} {label}
      </div>
      <p className="text-base font-black text-white mt-0.5">{value}</p>
    </div>
  );
};

const ResultRow: React.FC<{
  icon: string; label: string; value: string; sub?: string;
  tone?: 'red' | 'emerald'; bold?: boolean;
}> = ({ icon, label, value, sub, tone, bold }) => {
  const valueColor = tone === 'red' ? 'text-red-300' : tone === 'emerald' ? 'text-emerald-300' : 'text-white';
  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-surface-sunken/60 border border-white/[0.05] ${bold ? 'border-status-success/30' : ''}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-base">{icon}</span>
        <span className="text-[12px] text-zinc-300 font-medium truncate">{label}</span>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-[13px] ${bold ? 'font-black' : 'font-bold'} ${valueColor}`}>{value}</p>
        {sub && <p className="text-[10px] text-zinc-500">{sub}</p>}
      </div>
    </div>
  );
};

export default RefundPage;
