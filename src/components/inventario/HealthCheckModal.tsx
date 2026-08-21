import React, { useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import { useData } from '../../context/DataContext';
import { calculateAccountHealth, HealthStatus, AccountHealth } from '../../utils/healthCheckUtils';
import { Activity, AlertTriangle, CheckCircle2, XCircle, TrendingUp, DollarSign, Calendar, Users, ChevronRight, Filter, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Account, Sale } from '../../types';
import { useToast } from '../../context/ToastContext';
import { getDaysRemaining } from '../../utils/inventarioUtils';

interface HealthCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HealthCheckModal: React.FC<HealthCheckModalProps> = ({ isOpen, onClose }) => {
  const { accounts, sales, services, settings, updateAccount, clients } = useData();
  const [filter, setFilter] = useState<'todos' | HealthStatus>('todos');
  const [selectedHealth, setSelectedHealth] = useState<AccountHealth | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { showToast } = useToast();

  // Calcular salud de todas las cuentas activas
  const healthData = useMemo(() => {
    return accounts
      .filter(acc => acc.status !== 'inactiva') 
      .map(acc => {
        const svc = services.find(s => s.id === acc.serviceId);
        return calculateAccountHealth(acc, sales, svc);
      })
      .sort((a, b) => {
          const score = (s: HealthStatus) => s === 'rojo' ? 3 : s === 'amarillo' ? 2 : 1;
          return score(b.status) - score(a.status);
      });
  }, [accounts, sales, services]);

  const filteredData = useMemo(() => {
      if (filter === 'todos') return healthData;
      return healthData.filter(h => h.status === filter);
  }, [healthData, filter]);

  const stats = useMemo(() => ({
      rojo: healthData.filter(h => h.status === 'rojo').length,
      amarillo: healthData.filter(h => h.status === 'amarillo').length,
      verde: healthData.filter(h => h.status === 'verde').length,
      totalLoss: healthData.reduce((acc, curr) => curr.profit < 0 ? acc + curr.profit : acc, 0),
      totalProfit: healthData.reduce((acc, curr) => curr.profit > 0 ? acc + curr.profit : acc, 0),
  }), [healthData]);

  const getStatusColor = (status: HealthStatus) => {
      switch(status) {
          case 'verde': return 'text-status-success-soft bg-status-success/10 border-status-success/20';
          case 'amarillo': return 'text-status-warning-soft bg-status-warning/10 border-status-warning/20';
          case 'rojo': return 'text-status-danger-soft bg-status-danger/10 border-status-danger/20';
      }
  };

  const formatMoney = (val: number) => val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // --- LÓGICA DE SINCRONIZACIÓN OPTIMIZADA ---
  const handleSyncStock = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    
    try {
        let accountsFixed = 0;
        let profilesCleaned = 0;
        const updates = [];

        // Fecha de referencia: Hoy (YYYY-MM-DD)
        const todayStr = new Date().toISOString().split('T')[0];

        for (const acc of accounts) {
             // 1. Obtener ventas REALMENTE activas para esta cuenta (vigentes o vencen hoy)
             const activeSales = sales.filter(s => 
                s.accountId === acc.id && 
                s.expiryDate >= todayStr
             );

             // 2. Reconstruir perfiles desde cero (Base limpia según maxScreens)
             let reconstructedProfiles = Array.from({ length: acc.maxScreens }, () => ({
                 name: 'Disponible',
                 pin: ''
             }));

             let newUsedScreens = 0;

             // 3. Diferenciar por tipo de cuenta
             if (acc.account_type === 'cuenta_completa') {
                 if (activeSales.length > 0) {
                     newUsedScreens = acc.maxScreens;
                     const mainSale = activeSales[0];
                     const client = clients.find(c => c.id === mainSale.clientId);
                     reconstructedProfiles[0] = {
                         name: client?.name || 'Cliente (Cuenta Completa)',
                         pin: mainSale.assignedProfiles?.[0]?.pin || ''
                     };
                 }
             } else {
                 let currentSlot = 0;
                 // Procesar ventas activas secuencialmente llenando slots
                 activeSales.forEach(sale => {
                     const client = clients.find(c => c.id === sale.clientId);
                     const clientName = client?.name || 'Cliente';
                     const numScreens = sale.screensCount || 1;

                     for (let i = 0; i < numScreens; i++) {
                         if (currentSlot < acc.maxScreens) {
                             // Intentar recuperar PIN de la venta si existe
                             const saleProfile = sale.assignedProfiles?.[i];
                             reconstructedProfiles[currentSlot] = {
                                 name: saleProfile?.name || clientName,
                                 pin: saleProfile?.pin || ''
                             };
                             currentSlot++;
                         }
                     }
                 });
                 newUsedScreens = currentSlot;
             }

             // 4. Comparar estado actual vs reconstruido
             const profilesMatch = JSON.stringify(acc.profiles) === JSON.stringify(reconstructedProfiles);
             const usedScreensMatch = acc.usedScreens === newUsedScreens;

             if (!profilesMatch || !usedScreensMatch) {
                 // Detectar cuántos se liberaron para métricas visuales
                 const oldEmpty = (acc.profiles || []).filter(p => !p.name || p.name.toLowerCase() === 'disponible').length;
                 const newEmpty = reconstructedProfiles.filter(p => p.name.toLowerCase() === 'disponible').length;
                 if (newEmpty > oldEmpty) profilesCleaned += (newEmpty - oldEmpty);

                 updates.push(updateAccount({ 
                     ...acc, 
                     usedScreens: newUsedScreens, 
                     profiles: reconstructedProfiles 
                 }));
                 accountsFixed++;
             }
        }
        
        if (updates.length > 0) {
            await Promise.all(updates);
            showToast(`Sincronización exitosa: ${accountsFixed} cuentas corregidas.`, 'success');
        } else {
            showToast('El inventario ya se encuentra al día.', 'info');
        }
    } catch (e) {
        console.error("Sync Error:", e);
        showToast('Error técnico al sincronizar. Revisa la consola.', 'error');
    } finally {
        setIsSyncing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Auditoría de Salud" zIndex={20000}>
       <div className="flex flex-col h-[80vh] md:h-[600px] pt-1">
          
          <div className="flex items-center justify-between mb-4 bg-status-info/10 border border-status-info/20 p-3 rounded-md">
              <div className="flex items-center gap-2">
                  <div className="bg-status-info/20 p-1.5 rounded-full text-status-info-soft"><Activity size={16} /></div>
                  <div className="flex flex-col">
                      <span className="text-xs font-semibold text-blue-300">Corrector de Inventario</span>
                      <span className="text-[9px] text-status-info-soft/80">Sincroniza ventas vs stock automáticamente</span>
                  </div>
              </div>
              <button 
                onClick={handleSyncStock} 
                disabled={isSyncing}
                className="px-4 py-2 bg-status-info hover:bg-blue-600 text-white rounded-xl text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-status-info/20 active:scale-95 disabled:opacity-50 min-w-[120px]"
              >
                 {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                 {isSyncing ? 'Procesando...' : 'Corregir Stock'}
              </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4 shrink-0">
              <div className="bg-surface-zinc border border-[rgb(var(--fg-rgb))]/10 p-3 rounded-md text-center">
                  <div className="flex justify-center mb-1"><CheckCircle2 size={18} className="text-status-success-soft" /></div>
                  <p className="text-[10px] text-disabled font-bold uppercase">Rentables</p>
                  <p className="text-lg font-bold text-primary">{stats.verde}</p>
              </div>
              <div className="bg-surface-zinc border border-[rgb(var(--fg-rgb))]/10 p-3 rounded-md text-center">
                  <div className="flex justify-center mb-1"><AlertTriangle size={18} className="text-status-warning-soft" /></div>
                  <p className="text-[10px] text-disabled font-bold uppercase">En Riesgo</p>
                  <p className="text-lg font-bold text-primary">{stats.amarillo}</p>
              </div>
              <div className="bg-surface-zinc border border-[rgb(var(--fg-rgb))]/10 p-3 rounded-md text-center">
                  <div className="flex justify-center mb-1"><XCircle size={18} className="text-status-danger-soft" /></div>
                  <p className="text-[10px] text-disabled font-bold uppercase">Pérdida</p>
                  <p className="text-lg font-bold text-primary">{stats.rojo}</p>
              </div>
          </div>

          <div className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 rounded-lg p-4 mb-4 flex justify-between items-center shrink-0">
              <div>
                  <p className="text-[10px] text-disabled font-bold uppercase">Balance Estimado</p>
                  <p className={`text-xl font-bold ${stats.totalProfit + stats.totalLoss >= 0 ? 'text-status-success-soft' : 'text-status-danger-soft'}`}>
                      {settings.currency} {formatMoney(stats.totalProfit + stats.totalLoss)}
                  </p>
              </div>
              <div className="text-right">
                  <p className="text-[10px] text-disabled font-bold uppercase">Rentabilidad Bruta</p>
                  <p className="text-sm font-mono text-secondary">{settings.currency} {formatMoney(stats.totalProfit)}</p>
              </div>
          </div>

          <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar shrink-0">
              {['todos', 'verde', 'amarillo', 'rojo'].map((f) => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-4 py-2 rounded-full text-[11px] font-semibold uppercase border transition-all ${
                        filter === f 
                        ? 'bg-white text-black border-white' 
                        : 'bg-surface-zinc text-disabled border-[rgb(var(--fg-rgb))]/10 hover:text-primary'
                    }`}
                  >
                      {f}
                  </button>
              ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {filteredData.map((item) => (
                  <motion.div 
                    layout
                    key={item.accountId}
                    onClick={() => setSelectedHealth(item)}
                    className="bg-surface-zinc border border-[rgb(var(--fg-rgb))]/5 p-4 rounded-lg flex justify-between items-center cursor-pointer hover:bg-surface-3 transition-colors group"
                  >
                      <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                              <span className={`w-2 h-2 rounded-full ${
                                  item.status === 'verde' ? 'bg-status-success shadow-[0_0_5px_#10b981]' : 
                                  item.status === 'amarillo' ? 'bg-status-warning shadow-[0_0_5px_#f59e0b]' : 
                                  'bg-status-danger shadow-[0_0_5px_#ef4444]'
                              }`} />
                              <h4 className="text-sm font-bold text-primary truncate">{item.accountEmail}</h4>
                          </div>
                          <p className="text-[10px] text-disabled truncate">{item.suggestion}</p>
                      </div>
                      
                      <div className="flex flex-col items-end ml-4">
                          <span className={`font-mono font-bold text-sm ${item.profit >= 0 ? 'text-status-success-soft' : 'text-status-danger-soft'}`}>
                              {item.profit >= 0 ? '+' : ''}{formatMoney(item.profit)}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-faint">
                              <span>ROI: {item.roi.toFixed(0)}%</span>
                              <ChevronRight size={12} />
                          </div>
                      </div>
                  </motion.div>
              ))}
              {filteredData.length === 0 && (
                  <div className="py-20 text-center opacity-40">
                      <CheckCircle2 size={32} className="mx-auto mb-2 text-faint" />
                      <p className="text-xs">No hay datos para mostrar</p>
                  </div>
              )}
          </div>
       </div>

       <AnimatePresence>
           {selectedHealth && (
               <motion.div 
                 initial={{ opacity: 0, y: 50 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 50 }}
                 className="absolute inset-0 bg-surface-1 z-20 p-6 flex flex-col"
               >
                   <div className="flex items-center justify-between mb-8">
                       <button onClick={() => setSelectedHealth(null)} className="p-2 bg-[rgb(var(--fg-rgb))]/5 rounded-full text-muted hover:text-primary"><ChevronRight className="rotate-180" size={20} /></button>
                       <h3 className="text-lg font-bold text-primary">Detalle de Salud</h3>
                       <div className="w-10" />
                   </div>

                   <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                       <div className="text-center">
                           <div className={`inline-flex p-4 rounded-full mb-4 border ${getStatusColor(selectedHealth.status)}`}>
                               {selectedHealth.status === 'verde' && <TrendingUp size={32} />}
                               {selectedHealth.status === 'amarillo' && <AlertTriangle size={32} />}
                               {selectedHealth.status === 'rojo' && <Activity size={32} />}
                           </div>
                           <h2 className="text-2xl font-bold text-primary mb-1">{selectedHealth.accountEmail}</h2>
                           <span className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase border ${getStatusColor(selectedHealth.status)}`}>
                               Estado: {selectedHealth.status}
                           </span>
                       </div>

                       <div className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 p-5 rounded-xl">
                           <h4 className="text-muted text-xs font-semibold uppercase mb-2 flex items-center gap-2">
                               <Activity size={14} /> Diagnóstico Inteligente
                           </h4>
                           <p className="text-sm text-primary leading-relaxed font-medium">
                               "{selectedHealth.suggestion}"
                           </p>
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                           <div className="bg-surface-zinc p-4 rounded-lg border border-[rgb(var(--fg-rgb))]/5">
                               <p className="text-[10px] text-disabled font-bold uppercase mb-1">Ingresos</p>
                               <p className="text-lg font-bold text-status-success-soft">{settings.currency} {formatMoney(selectedHealth.revenue)}</p>
                           </div>
                           <div className="bg-surface-zinc p-4 rounded-lg border border-[rgb(var(--fg-rgb))]/5">
                               <p className="text-[10px] text-disabled font-bold uppercase mb-1">Costo Base</p>
                               <p className="text-lg font-bold text-status-danger-soft">{settings.currency} {formatMoney(selectedHealth.cost)}</p>
                           </div>
                           <div className="bg-surface-zinc p-4 rounded-lg border border-[rgb(var(--fg-rgb))]/5">
                               <p className="text-[10px] text-disabled font-bold uppercase mb-1">Días Activos</p>
                               <div className="flex items-center gap-2 text-primary font-bold">
                                   <Calendar size={16} className="text-status-info-soft" /> {selectedHealth.daysActive}d
                               </div>
                           </div>
                           <div className="bg-surface-zinc p-4 rounded-lg border border-[rgb(var(--fg-rgb))]/5">
                               <p className="text-[10px] text-disabled font-bold uppercase mb-1">Ocupación</p>
                               <div className="flex items-center gap-2 text-primary font-bold">
                                   <Users size={16} className="text-purple-400" /> {selectedHealth.occupancy}
                               </div>
                           </div>
                       </div>

                       <div className="bg-surface-zinc p-5 rounded-xl border border-[rgb(var(--fg-rgb))]/5">
                           <div className="flex justify-between mb-2">
                               <span className="text-xs font-semibold text-muted">Retorno de Inversión (ROI)</span>
                               <span className={`text-xs font-semibold ${selectedHealth.roi >= 0 ? 'text-status-success-soft' : 'text-status-danger-soft'}`}>{selectedHealth.roi.toFixed(1)}%</span>
                           </div>
                           <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                               <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${Math.min(100, Math.max(0, selectedHealth.roi + 100))}%` }} 
                                 className={`h-full rounded-full ${selectedHealth.roi >= 0 ? 'bg-status-success' : 'bg-status-danger'}`}
                               />
                           </div>
                       </div>
                   </div>
               </motion.div>
           )}
       </AnimatePresence>
    </Modal>
  );
};

export default HealthCheckModal;