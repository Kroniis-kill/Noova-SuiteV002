import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, AlertTriangle, AlertOctagon, ArrowUpRight, Search,
  ClipboardList, BarChart3, RefreshCw, Pencil, Check, X
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useDashboardWidgets } from '../../hooks/useDashboardWidgets';
import { DashboardWidgets } from '../../types';

interface PersonalizeHomePageProps {
  onBack?: () => void;
}

const WIDGET_OPTIONS: { key: keyof DashboardWidgets; label: string; desc: string; icon: React.ElementType; color: string; bg: string }[] = [
  { key: 'showExpiringSales', label: 'Vencimientos · Ventas', desc: 'Clientes vencidos y por vencer', icon: AlertTriangle, color: 'text-status-danger-soft', bg: 'bg-status-danger/10' },
  { key: 'showExpiringAccounts', label: 'Vencimientos · Cuentas', desc: 'Cuentas / inventario por vencer', icon: AlertOctagon, color: 'text-status-warning-soft', bg: 'bg-status-warning/10' },
  { key: 'showMovements', label: 'Últimos movimientos', desc: 'Ingresos y egresos recientes', icon: ArrowUpRight, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  { key: 'showStock', label: 'Stock', desc: 'Disponibilidad de cuentas por servicio', icon: Search, color: 'text-status-success-soft', bg: 'bg-status-success/10' },
  { key: 'showAgenda', label: 'Agenda', desc: 'Seguimiento de fallas pendientes', icon: ClipboardList, color: 'text-brand-primary', bg: 'bg-brand-primary/10' },
  { key: 'showProfit', label: 'Ventas y gastos', desc: 'Resumen del mes', icon: BarChart3, color: 'text-status-success-soft', bg: 'bg-status-success/10' },
  { key: 'showExchangeRate', label: 'Tasa de cambio', desc: '', icon: RefreshCw, color: 'text-text-muted', bg: 'bg-[rgb(var(--fg-rgb))]/5' },
];

const PersonalizeHomePage: React.FC<PersonalizeHomePageProps> = ({ onBack }) => {
  const { settings, updateSettings } = useData();
  const { showToast } = useToast();
  const { widgets, toggleWidget } = useDashboardWidgets();

  const [isEditingRate, setIsEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState(String(settings.exchangeRate || ''));

  const handleSaveRate = () => {
    const value = parseFloat(rateInput.replace(',', '.'));
    if (isNaN(value) || value <= 0) {
      showToast('Ingresa una tasa válida', 'error');
      return;
    }
    updateSettings({ ...settings, exchangeRate: value });
    setIsEditingRate(false);
    showToast('Tasa de cambio actualizada', 'success');
  };

  return (
    <div className="pb-32 pt-2 px-4 font-sans text-text-primary min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-sm bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-primary active:scale-95 transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-black text-text-primary tracking-tight">Personaliza tu inicio</h1>
          <p className="text-text-muted text-tiny font-semibold uppercase tracking-[0.15em] mt-0.5">Elige qué quieres ver en tu dashboard</p>
        </div>
      </div>

      <p className="text-tiny font-semibold text-text-disabled uppercase tracking-wider mb-3 ml-1">Tarjetas visibles</p>

      <div className="flex flex-col gap-2">
        {WIDGET_OPTIONS.map((opt, idx) => {
          const isRateRow = opt.key === 'showExchangeRate';
          return (
            <motion.div
              key={opt.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-3 flex items-center gap-3"
            >
              <div className={`w-9 h-9 rounded-lg ${opt.bg} ${opt.color} flex items-center justify-center shrink-0`}>
                <opt.icon size={17} />
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-[12.5px] font-semibold truncate ${widgets[opt.key] ? 'text-text-primary' : 'text-text-disabled'}`}>
                  {opt.label}
                </p>
                {isRateRow ? (
                  isEditingRate ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        autoFocus
                        type="number"
                        inputMode="decimal"
                        value={rateInput}
                        onChange={(e) => setRateInput(e.target.value)}
                        className="w-24 h-7 px-2 rounded-md bg-surface-sunken border border-brand-primary/30 text-caption text-text-primary outline-none focus:ring-2 focus:ring-brand-primary/40"
                      />
                      <span className="text-tiny text-text-muted">{settings.subCurrency || 'Bs'}</span>
                      <button onClick={handleSaveRate} className="w-6 h-6 rounded-md bg-status-success/15 text-status-success-soft flex items-center justify-center active:scale-90">
                        <Check size={12} />
                      </button>
                      <button onClick={() => { setIsEditingRate(false); setRateInput(String(settings.exchangeRate || '')); }} className="w-6 h-6 rounded-md bg-[rgb(var(--fg-rgb))]/5 text-text-disabled flex items-center justify-center active:scale-90">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setRateInput(String(settings.exchangeRate || '')); setIsEditingRate(true); }} className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10.5px] text-text-muted">
                        1 {settings.currency || 'USD'} = {(settings.exchangeRate || 0).toLocaleString()} {settings.subCurrency || 'Bs'}
                      </span>
                      <Pencil size={10} className="text-brand-primary" />
                    </button>
                  )
                ) : (
                  <p className="text-[10.5px] text-text-muted truncate">{opt.desc}</p>
                )}
              </div>

              <button
                onClick={() => toggleWidget(opt.key)}
                className={`w-10 h-6 rounded-full p-1 shrink-0 transition-colors duration-300 ${widgets[opt.key] ? 'bg-gradient-to-r from-brand-primary to-brand-accent' : 'bg-zinc-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${widgets[opt.key] ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </motion.div>
          );
        })}
      </div>

      <button
        onClick={onBack}
        className="mt-6 w-full py-3.5 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-md text-xs font-semibold shadow-[0_0_20px_-5px_rgba(106,44,255,0.4)] active:scale-95 transition-all hover:brightness-110"
      >
        Guardar cambios
      </button>
    </div>
  );
};

export default PersonalizeHomePage;
