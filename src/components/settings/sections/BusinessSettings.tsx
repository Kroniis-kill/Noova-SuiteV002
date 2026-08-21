import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Activity, CreditCard, ShoppingCart, Tag, Plus, Trash2 } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { generateUUID } from '../../../utils/uuid';
import { styles, ToggleSwitch } from './_shared';

export const BusinessSettings = () => {
    const { settings, updateSettings, expenseCategories, addCategory, deleteCategory } = useData();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<'finances' | 'sales' | 'categories'>('finances');

    const [currency, setCurrency] = useState(settings.currency || 'USD');
    const [subCurrency, setSubCurrency] = useState(settings.subCurrency || '');
    const [exchangeRate, setExchangeRate] = useState(settings.exchangeRate?.toString() || '0');
    const [dailyGoal, setDailyGoal] = useState(settings.analyticsPreferences?.dailyGoal?.toString() || '0');
    const [monthlyGoal, setDailyGoalMonthly] = useState(settings.analyticsPreferences?.monthlyGoal?.toString() || '0');
    const [purchaseAsCost, setPurchaseAsCost] = useState(settings.analyticsPreferences?.includeSuppliesAsCost || false);

    const [warningDays, setWarningDays] = useState(settings.salesPreferences?.warningDays || 2);
    const [autoPin, setAutoPin] = useState(settings.salesPreferences?.autoPin || false);

    const [newCatName, setNewCatName] = useState('');

    const handleSave = () => {
        updateSettings({
            ...settings,
            currency: currency.toUpperCase(),
            subCurrency: subCurrency.toUpperCase(),
            exchangeRate: parseFloat(exchangeRate) || 0,
            salesPreferences: {
                ...settings.salesPreferences,
                warningDays: warningDays,
                autoPin: autoPin,
                defaultMode: settings.salesPreferences?.defaultMode || 'screen',
                defaultDuration: settings.salesPreferences?.defaultDuration || 1
            },
            analyticsPreferences: {
                ...settings.analyticsPreferences,
                dailyGoal: parseFloat(dailyGoal) || 0,
                monthlyGoal: parseFloat(monthlyGoal) || 0,
                includeSuppliesAsCost: purchaseAsCost
            }
        });
        showToast('Configuración guardada', 'success');
    };

    const handleAddCategory = async () => {
        if (!newCatName.trim()) return;
        const colors = ['#6A2CFF', '#FF1493', '#10b981', '#f59e0b', '#3b82f6'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        await addCategory({
            id: generateUUID(),
            name: newCatName.trim(),
            color: randomColor
        });
        setNewCatName('');
        showToast('Categoría agregada', 'success');
    };

    const tabs = [
        { id: 'finances', label: 'Finanzas' },
        { id: 'sales', label: 'Ventas' },
        { id: 'categories', label: 'Categorías' },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex bg-surface-1 p-1.5 rounded-lg border border-[rgb(var(--fg-rgb))]/[0.08] w-full mb-4 shadow-sm">
                 {tabs.map(tab => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 px-4 py-2.5 rounded-md text-xs font-semibold transition-all text-center ${
                            activeTab === tab.id
                            ? 'bg-surface-4 text-text-primary shadow-sm border border-[rgb(var(--fg-rgb))]/5'
                            : 'text-text-disabled hover:text-text-primary'
                        }`}
                     >
                        {tab.label}
                     </button>
                 ))}
             </div>

             <div className={styles.card}>
                <AnimatePresence mode="wait">
                    {activeTab === 'finances' && (
                        <motion.div key="finances" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                            <div className="flex items-center gap-2 mb-2 text-brand-primary">
                                <CreditCard size={18} />
                                <h3 className="font-bold text-text-primary text-sm">Configuración de Moneda</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className={styles.label}>Moneda Principal</label>
                                    <input value={currency} onChange={e => setCurrency(e.target.value)} className={`${styles.input} uppercase`} placeholder="USD" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={styles.label}>Secundaria</label>
                                        <input value={subCurrency} onChange={e => setSubCurrency(e.target.value)} className={`${styles.input} uppercase`} placeholder="BS" />
                                    </div>
                                    <div>
                                        <label className={styles.label}>Tasa Cambio</label>
                                        <input type="number" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} className={styles.input} />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8">
                                <h3 className="text-text-primary font-bold text-sm mb-4 flex items-center gap-2">
                                    <Activity size={16} className="text-status-success-soft" /> Metas Financieras
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={styles.label}>Meta Diaria ({currency})</label>
                                        <input type="number" value={dailyGoal} onChange={e => setDailyGoal(e.target.value)} className={styles.input} />
                                    </div>
                                    <div>
                                        <label className={styles.label}>Meta Mensual ({currency})</label>
                                        <input type="number" value={monthlyGoal} onChange={e => setDailyGoalMonthly(e.target.value)} className={styles.input} />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2 pt-4 border-t border-[rgb(var(--fg-rgb))]/5">
                                <div className={styles.toggleContainer}>
                                    <div>
                                        <p className="text-sm font-bold text-text-primary">Compras como Costo</p>
                                        <p className="text-[10px] text-text-disabled">Restar stock de la ganancia</p>
                                    </div>
                                    <ToggleSwitch checked={purchaseAsCost} onChange={() => setPurchaseAsCost(!purchaseAsCost)} />
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'sales' && (
                        <motion.div key="sales" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                            <div className="flex items-center gap-2 mb-2 text-brand-accent">
                                <ShoppingCart size={18} />
                                <h3 className="font-bold text-text-primary text-sm">Preferencias de Venta</h3>
                            </div>

                            <div>
                                <label className={styles.label}>DÍAS DE ANTICIPACIÓN PARA ALERTA</label>
                                <div className="grid grid-cols-4 gap-3 mt-2">
                                    {[1, 2, 3, 5].map(day => (
                                        <button
                                            key={day}
                                            onClick={() => setWarningDays(day)}
                                            className={`h-12 rounded-md font-bold text-sm border transition-all ${
                                                warningDays === day
                                                ? 'bg-brand-primary/20 border-brand-primary text-brand-primary'
                                                : 'bg-surface-sunken border-[rgb(var(--fg-rgb))]/10 text-text-disabled hover:border-[rgb(var(--fg-rgb))]/20'
                                            }`}
                                        >
                                            {day} Días
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.toggleContainer}>
                                <div>
                                    <p className="text-sm font-bold text-text-primary">Generar PIN Automático</p>
                                    <p className="text-[10px] text-text-disabled">Asignar PIN aleatorio al vender</p>
                                </div>
                                <ToggleSwitch checked={autoPin} onChange={() => setAutoPin(!autoPin)} />
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'categories' && (
                        <motion.div key="categories" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
                            <div className="flex items-center gap-2 mb-2 text-status-success-soft">
                                <Tag size={18} />
                                <h3 className="font-bold text-text-primary text-sm">Gestión de Categorías</h3>
                            </div>

                            <div className="flex gap-2">
                                <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Nueva categoría..." className={styles.input} />
                                <button onClick={handleAddCategory} className="w-[52px] h-[52px] rounded-md bg-surface-4 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-primary hover:bg-[rgb(var(--fg-rgb))]/10 transition-colors shrink-0">
                                    <Plus size={20} />
                                </button>
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                {expenseCategories.length === 0 && (
                                    <p className="text-center text-text-disabled text-xs py-8">No hay categorías personalizadas.</p>
                                )}
                                {expenseCategories.map(cat => (
                                    <div key={cat.id} className="flex items-center justify-between p-4 bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 rounded-md group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                            <span className="text-sm font-bold text-text-primary">{cat.name}</span>
                                        </div>
                                        <button onClick={() => deleteCategory(cat.id)} className="text-text-faint hover:text-status-danger-soft transition-colors p-2">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
             </div>

             {activeTab !== 'categories' && (
                 <button onClick={handleSave} className={styles.buttonPrimary}>
                     <Save size={18} /> Guardar Configuración
                 </button>
             )}
        </div>
    );
};
