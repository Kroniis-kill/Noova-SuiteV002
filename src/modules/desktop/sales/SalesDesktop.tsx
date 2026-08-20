
import React, { useRef, useState, useCallback } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { useSalesLogic } from '../../../hooks/useSalesLogic';
import SaleCard from '../../../components/sales/SaleCard';
import SaleModal from '../../../components/sales/SaleModal';
import EditSaleModal from '../../../components/sales/EditSaleModal';
import SaleDetailPage from '../../../components/sales/SaleDetailPage';
import ImportGuideModal from '../../../components/ui/ImportGuideModal';
import { 
  Search, Plus, Upload, Filter, ClipboardList, CheckCircle, 
  MonitorPlay, ShoppingCart, MessageCircle, 
  Monitor, Trash2, Check, Clock, User, FileText, Send, Database, ShieldCheck, Key, Copy,
  Lock, ChevronDown, CheckCircle2, AlertCircle, AlertTriangle, Layers, Users, Mail, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from '../../../components/ui/EmptyState';
import Avatar from '../../../components/ui/Avatar';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { useHaptic } from '../../../hooks/useHaptic';
import { ServiceFailure } from '../../../types';
import Modal from '../../../components/ui/Modal';
import { sendWhatsAppMessage } from '../../../utils/contactosUtils';
import { getCombinedWhatsAppTemplate } from '../../../utils/salesUtils';
import { useUIStore } from '../../../store/uiStore';

const SalesDesktop: React.FC = () => {
  const {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    isImportModalOpen, setIsImportModalOpen,
    isFilterModalOpen, setIsFilterModalOpen,
    isDetailOpen, setIsDetailOpen,
    isDeleteModalOpen, setIsDeleteModalOpen,
    isModalOpen, setIsModalOpen,
    isEditModalOpen, setIsEditModalOpen,
    mobileSelectedGroup,
    filteredGroups,
    editingSale, setEditingSale,
    fileInputRef,
    handleFileUpload,
    handleDeleteSingleSale, handleDeleteGroup, confirmDelete,
    selectGroupMobile,
    handleNewSale, handleEditSale
  } = useSalesLogic();

  const { settings, clients, services, serviceFailures, deleteFailure, sales, accounts } = useData();
  const { showToast } = useToast();
  const haptic = useHaptic();

  const [viewFails, setViewFails] = useState(false);
  const [failsSubView, setFailsSubView] = useState<'clients' | 'accounts'>('clients');
  const [selectedFailure, setSelectedFailure] = useState<ServiceFailure | null>(null);
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);

  const { updateAccount } = useData();

  const onHandleNotifyFailure = useCallback((failure: ServiceFailure) => {
    haptic('nav');
    const sale = sales.find(s => s.id === failure.saleId);
    const client = clients.find(c => c.id === sale?.clientId);
    if (sale && client) {
        const msg = getCombinedWhatsAppTemplate('failure', [sale], client.name, accounts, settings, 'whatsapp', false);
        sendWhatsAppMessage(client.phone || '', msg);
        showToast('Notificación enviada', 'info');
    }
  }, [sales, clients, accounts, settings, haptic, showToast]);

  const onHandleSolveFailure = useCallback(async (failure: ServiceFailure, notify: boolean) => {
      haptic('success');
      if (notify) {
          const sale = sales.find(s => s.id === failure.saleId);
          const client = clients.find(c => c.id === sale?.clientId);
          if (sale && client) {
              const msg = getCombinedWhatsAppTemplate('failureSolved', [sale], client.name, accounts, settings, 'whatsapp', false);
              sendWhatsAppMessage(client.phone || '', msg);
          }
      }
      await deleteFailure(failure.id);
      showToast(notify ? 'Resuelto y notificado' : 'Resuelto', 'success');
      setSelectedFailure(null);
  }, [deleteFailure, haptic, showToast, sales, clients, accounts, settings]);

  const onHandleSolveAccountFailure = useCallback(async (account: any) => {
      haptic('success');
      await updateAccount({
          ...account,
          status: 'activa',
          failure_started_at: undefined
      });
      showToast('Cuenta restablecida a activa', 'success');
  }, [updateAccount, haptic, showToast]);

  const filterOptions = [
    { id: 'all', label: 'Todas las Ventas' },
    { id: 'active', label: 'Vigentes' },
    { id: 'warning', label: 'Próximas a vencer' },
    { id: 'expired', label: 'Ya vencidas' }
  ];

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-fade-in relative">
      <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-brand-primary/10 to-transparent pointer-events-none z-0" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
              <h1 className="text-3xl font-black text-white tracking-tight">{viewFails ? 'Agenda de Fallas' : 'Ventas'}</h1>
              <p className="text-zinc-500 text-sm font-medium mt-1">{viewFails ? 'Seguimiento de incidencias técnicas' : 'Gestión y administración de servicios'}</p>
          </div>

          <div className="flex items-center gap-2">
              <div className="relative group mr-2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-brand-primary" size={18} />
                <input placeholder="Buscar cliente o servicio..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-72 bg-white/[0.02] border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-brand-primary/50 transition-all" />
              </div>

              {!viewFails && (
                <>
                  <button onClick={() => setIsImportModalOpen(true)} className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white active:scale-95 transition-all shadow-sm" title="Importar Ventas desde Excel"><Upload size={20} /></button>
                  <button onClick={() => setIsFilterModalOpen(true)} className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all active:scale-95 shadow-sm relative ${statusFilter !== 'all' ? 'bg-brand-primary/20 border-brand-primary text-brand-primary' : 'bg-white/[0.02] border border-white/5 text-zinc-400 hover:text-white'}`} title="Filtrar por estado"><Filter size={20} />{statusFilter !== 'all' && <div className="absolute top-3 right-3 w-2 h-2 bg-brand-accent rounded-full" />}</button>
                </>
              )}

              <button onClick={() => setViewFails(!viewFails)} className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all shadow-sm ${viewFails ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'bg-white/[0.02] border border-white/5 text-zinc-400 hover:text-white'}`}><ClipboardList size={20} /></button>
              <button onClick={handleNewSale} className="h-12 px-6 bg-gradient-to-r from-brand-primary to-brand-accent rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-sm shadow-glow active:scale-95"><Plus size={20} strokeWidth={2.5} /> Nueva Venta</button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative z-10">
        {viewFails && (
            <div className="space-y-8 mb-8 relative z-10">
                {/* Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex items-center gap-5 shadow-sm group hover:bg-white/[0.04] transition-all">
                        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 shadow-inner">
                            <AlertCircle size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-[0.2em]">Fallas de Clientes</p>
                            <h4 className="text-3xl font-black text-white mt-1 tabular-nums">{serviceFailures.length}</h4>
                        </div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex items-center gap-5 shadow-sm group hover:bg-white/[0.04] transition-all">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-inner">
                            <AlertTriangle size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-[0.2em]">Cuentas en Falla</p>
                            <h4 className="text-3xl font-black text-white mt-1 tabular-nums">{accounts.filter(a => a.status === 'fallando').length}</h4>
                        </div>
                    </div>
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex items-center gap-5 shadow-sm group hover:bg-white/[0.04] transition-all">
                        <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-inner">
                            <CheckCircle2 size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-[0.2em]">Tasa de Resolución</p>
                            <h4 className="text-3xl font-black text-white mt-1 tabular-nums">98.4%</h4>
                        </div>
                    </div>
                </div>

                {/* Sub-navigation Tabs */}
                <div className="flex items-center justify-between">
                    <div className="flex p-1 bg-white/[0.02] border border-white/5 rounded-md w-fit">
                        <button 
                            onClick={() => { haptic('nav'); setFailsSubView('clients'); }}
                            className={`flex items-center gap-2 py-3 px-8 rounded-sm text-xs font-semibold uppercase tracking-widest transition-all ${failsSubView === 'clients' ? 'bg-brand-primary text-white shadow-glow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <User size={14} />
                            Clientes
                        </button>
                        <button 
                            onClick={() => { haptic('nav'); setFailsSubView('accounts'); }}
                            className={`flex items-center gap-2 py-3 px-8 rounded-sm text-xs font-normal uppercase tracking-widest transition-all ${failsSubView === 'accounts' ? 'bg-brand-primary text-white shadow-glow-sm' : 'bg-bg text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <Database size={14} />
                            Cuentas Maestras
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-zinc-500 text-[10px] font-semibold uppercase tracking-widest">Ordenar por:</span>
                        <select className="bg-transparent border-none text-white text-xs font-semibold outline-none cursor-pointer hover:text-brand-primary transition-colors">
                            <option value="recent">Más Recientes</option>
                            <option value="oldest">Más Antiguos</option>
                            <option value="priority">Prioridad Alta</option>
                        </select>
                    </div>
                </div>
            </div>
        )}

        <AnimatePresence mode='wait'>
          {viewFails ? (
            <motion.div key="fails-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {failsSubView === 'clients' ? (
                    serviceFailures.length === 0 ? (
                        <div className="col-span-full py-20 text-center"><EmptyState title="Sin fallas activas" description="Todo está funcionando correctamente." icon={CheckCircle} /></div>
                    ) : (
                        serviceFailures.map(failure => {
                            const sale = sales.find(s => s.id === failure.saleId);
                            const client = clients.find(c => c.id === sale?.clientId);
                            const service = services.find(s => s.name === sale?.serviceName);
                            const timeElapsed = Math.floor((new Date().getTime() - new Date(failure.createdAt).getTime()) / (1000 * 60 * 60));
                            const isUrgent = timeElapsed >= 24;
                            
                            return (
                                <div 
                                    key={failure.id} 
                                    onClick={() => setSelectedFailure(failure)} 
                                    className="relative bg-surface-1 border border-white/[0.08] rounded-xl p-4 h-[150px] cursor-pointer flex flex-col justify-between group active:scale-95 transition-all duration-300 overflow-hidden hover:border-white/[0.15] shadow-sm"
                                >
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
                                    
                                    <div className="flex justify-between items-center w-full z-10 pl-2">
                                        <div className="flex items-center gap-1 text-[9px] text-zinc-500 font-medium bg-white/[0.03] px-1.5 py-0.5 rounded-md -mt-[2px]">
                                            <Layers size={10} strokeWidth={3} />
                                            <span>{sale?.screensCount || 1}</span>
                                        </div>

                                        <div className="flex gap-1">
                                            <div className="text-red-500 bg-red-500/10 p-0.5 rounded-md" title="Falla Reportada">
                                                <AlertCircle size={10} strokeWidth={3} className={`${isUrgent ? 'animate-pulse' : ''} -mt-[2px]`} />
                                            </div>
                                            {isUrgent && (
                                                <div className="text-red-500 bg-red-500/20 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter border border-red-500/30 -mt-[2px]">
                                                    Urgente
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Central Identity Section */}
                                    <div className="flex-1 flex flex-col items-center justify-center gap-2 mt-1 pl-2">
                                        <div className="relative">
                                           <Avatar name={client?.name || 'Cliente'} image={service?.image_url} size={44} className="rounded-full shadow-md border border-white/5" />
                                        </div>
                                        
                                        <div className="text-center w-full space-y-1">
                                            <p className="text-[10px] text-zinc-500 font-medium truncate px-2">
                                                {client?.name || 'Cliente'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Quick Actions Bottom */}
                                    <div className="mt-2 w-full shrink-0 pl-2">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); deleteFailure(failure.id); }} 
                                          className="w-full h-[31px] rounded-md bg-white/5 text-zinc-500 border border-white/[0.05] flex items-center justify-center gap-2 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 transition-all active:scale-95 text-[11px]"
                                        >
                                           <Trash2 size={11} />
                                           <span className="text-[8px] font-black uppercase tracking-widest">Eliminar Reporte</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )
                ) : (
                    <div className="col-span-full flex flex-col gap-4">
                        {accounts.filter(a => a.status === 'fallando').length === 0 ? (
                            <div className="col-span-full py-20 text-center">
                                <EmptyState title="Sin cuentas en falla" description="No hay cuentas maestras reportadas con problemas." icon={ShieldCheck} />
                            </div>
                        ) : (
                            accounts.filter(a => a.status === 'fallando').map(account => {
                                const service = services.find(s => s.id === account.serviceId);
                                const isExpanded = expandedAccountId === account.id;
                                const occupancy = Math.min(100, ((account.usedScreens || 0) / (account.maxScreens || 1)) * 100);
                                const daysLeft = Math.floor((new Date(account.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                                return (
                                    <div 
                                        key={account.id} 
                                        className={`relative w-full p-4 rounded-xl border transition-all duration-300 cursor-pointer group overflow-hidden shadow-sm bg-surface-1 border-white/[0.08] hover:border-white/[0.15] active:scale-[0.99]`}
                                    >
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />

                                        <div className="flex flex-col gap-4 pl-3">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                    <div className="w-10 h-10 rounded-xl bg-surface-sunken flex items-center justify-center border border-white/5 overflow-hidden shrink-0 shadow-lg">
                                                        {service?.image_url ? <img src={service.image_url} className="w-full h-full object-cover" /> : <Database size={16} className="text-orange-400" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <h4 className="text-[13px] font-bold truncate text-white tracking-tight font-sans">
                                                                {account.email}
                                                            </h4>
                                                            <AlertTriangle size={14} className="text-orange-500 animate-pulse shrink-0" />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-sunken border border-white/[0.08]">
                                                                <Lock size={10} className="text-zinc-600" />
                                                                <span className="text-[11px] font-mono text-zinc-400 truncate">{account.password}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6 shrink-0">
                                                    <div className="flex flex-col items-end gap-1 min-w-[100px] h-[52px] justify-center bg-surface-sunken/50 px-4 rounded-md border border-white/[0.03]">
                                                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                                                            <Users size={12} />
                                                            <span className="font-medium">{account.usedScreens} / {account.maxScreens}</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-surface-sunken rounded-full overflow-hidden border border-white/[0.08]">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-500 ${occupancy >= 100 ? 'bg-red-500' : 'bg-orange-500'}`} 
                                                                style={{ width: `${occupancy}%` }} 
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); haptic('nav'); setExpandedAccountId(isExpanded ? null : account.id); }}
                                                        className={`h-[35px] px-4 rounded-md border flex items-center justify-center gap-2 transition-all active:scale-90 ${isExpanded ? 'bg-white text-black font-bold' : 'bg-white/5 border-white/[0.05] text-zinc-400 hover:text-white'}`}
                                                    >
                                                        <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                        <span className="text-[10px] font-semibold uppercase tracking-widest">{isExpanded ? 'Cerrar' : 'Detalles'}</span>
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); onHandleSolveAccountFailure(account); }} 
                                                        className="h-[35px] px-4 rounded-md bg-emerald-500 text-white shadow-glow-sm flex items-center justify-center gap-2 hover:brightness-110 transition-all active:scale-90"
                                                    >
                                                        <CheckCircle2 size={14} strokeWidth={3} />
                                                        <span className="text-[10px] font-semibold uppercase tracking-widest">Resolver</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expanded Content */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div 
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="pt-2 border-t border-white/[0.05]">
                                                            <div className="bg-orange-500/5 rounded-md p-4 border border-orange-500/10">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <AlertCircle size={14} className="text-orange-500" />
                                                                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Reporte de Falla Crítico</span>
                                                                </div>
                                                                <p className="text-[12px] text-zinc-400 italic leading-relaxed">
                                                                    Esta cuenta maestra ha sido reportada con fallas técnicas. Es necesario verificar el acceso y el estado de la suscripción. Una vez solucionado, presione el botón "Resolver" para limpiar el estado de la cuenta.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-12">
                {filteredGroups.map((group) => {
                    const allSales = group.renewalGroups.flatMap(g => g.sales);
                    const hasFailingAccount = allSales.some(sale => accounts.find(a => a.id === sale.accountId)?.status === 'fallando');
                    const hasPendingFailInAgenda = allSales.some(sale => serviceFailures.some(f => f.saleId === sale.id));
                    const warningThreshold = settings.salesPreferences?.warningDays || 2;
                    
                    return (
                        <SaleCard 
                            key={group.clientId} 
                            group={group} 
                            onClick={selectGroupMobile} 
                            onWhatsApp={() => {}} 
                            onDelete={handleDeleteGroup} 
                            compact={true}
                            warningThreshold={warningThreshold}
                            hasFailingAccount={hasFailingAccount}
                            hasPendingFailInAgenda={hasPendingFailInAgenda}
                            settings={settings}
                            accounts={accounts}
                        />
                    );
                })}
                {filteredGroups.length === 0 && (
                    <div className="col-span-full py-20"><EmptyState title="Sin resultados" description="No hay ventas que coincidan con los filtros aplicados." icon={ShoppingCart} /></div>
                )}
            </div>
          )}
        </AnimatePresence>
      </div>

      <Modal isOpen={!!selectedFailure} onClose={() => setSelectedFailure(null)} title="Detalle de Incidencia" zIndex={60000}>
         {/* ... (Existing modal content logic remains unchanged, omitted for brevity as it is just display logic) ... */}
         {/* Ensuring functionality remains consistent */}
         {selectedFailure && (() => {
             // ... Logic to find data ...
             const sale = sales.find(s => s.id === selectedFailure.saleId);
             const client = clients.find(c => c.id === sale?.clientId);
             const account = accounts.find(a => a.id === sale?.accountId);
             const service = services.find(s => s.name === sale?.serviceName);
             const isUnique = sale?.saleType === 'usuario_unico';
             
             return (
                <div className="pt-2 pb-4 space-y-8">
                     <div className="flex items-center gap-6 bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                         {/* ... Display Code ... */}
                         <div className="w-20 h-20 rounded-xl bg-surface-sunken flex items-center justify-center border border-white/5 overflow-hidden shrink-0 shadow-lg">
                            {service?.image_url ? <img src={service.image_url} className="w-full h-full object-cover" /> : <MonitorPlay size={32} className="text-emerald-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-2xl font-black text-white truncate uppercase tracking-tight">{sale?.serviceName}</h4>
                            <div className="flex items-center gap-4 mt-2">
                                <p className="text-base text-zinc-400 flex items-center gap-2 truncate max-w-[300px]"><User size={18} className="text-zinc-600" /> {client?.name}</p>
                            </div>
                        </div>
                     </div>
                     {/* ... Rest of the modal (Credentials, Note, Buttons) same as previous version ... */}
                      <div className="bg-amber-500/[0.03] border border-amber-500/10 rounded-2xl p-8 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-amber-500">
                                <FileText size={20} />
                                <span className="text-xs font-semibold uppercase tracking-[0.2em]">Nota del Problema</span>
                            </div>
                        </div>
                        <p className="text-lg text-zinc-200 leading-relaxed font-medium pl-1 italic">"{selectedFailure.notes || 'Sin descripción detallada'}"</p>
                        <div className="pt-4 border-t border-white/[0.05] flex items-center gap-2 text-xs text-zinc-500 font-bold">
                            <Clock size={16} /> Reportado el {new Date(selectedFailure.createdAt).toLocaleString()}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button onClick={() => onHandleNotifyFailure(selectedFailure)} className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-lg font-bold text-sm flex-1 hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                            <Send size={18} className="text-brand-primary" /> Avisar Falla
                        </button>
                        <button onClick={() => onHandleSolveFailure(selectedFailure, false)} className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-lg font-bold text-sm flex-1 hover:bg-white/10 transition-all">Solo Resolver</button>
                        <button onClick={() => onHandleSolveFailure(selectedFailure, true)} className="flex-[2] py-4 bg-status-success text-bg rounded-lg font-bold text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all">
                            <MessageCircle size={20} fill="currentColor" /> Resolver y Notificar vía WhatsApp
                        </button>
                    </div>
                </div>
             )
         })()}
      </Modal>

      <SaleDetailPage isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} group={mobileSelectedGroup} onEdit={handleEditSale} onDelete={handleDeleteSingleSale} />
      <ImportGuideModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onConfirm={() => fileInputRef.current?.click()} title="Importar Ventas" type="sales" />
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx,.xls,.csv" />
      <Modal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} title="Filtrar Ventas"><div className="space-y-3 pt-2">{filterOptions.map(opt => (<button key={opt.id} onClick={() => { haptic('nav'); setStatusFilter(opt.id as any); setIsFilterModalOpen(false); }} className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all group ${statusFilter === opt.id ? 'bg-brand-primary/10 border-brand-primary/40' : 'bg-transparent border border-white/5 hover:bg-white/5'}`}><span className={`text-sm font-bold ${statusFilter === opt.id ? 'text-white' : 'text-zinc-400 group-hover:text-white'}`}>{opt.label}</span>{statusFilter === opt.id && <Check size={18} className="text-brand-primary" strokeWidth={3} />}</button>))}</div></Modal>
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Eliminar Venta" zIndex={60000}><div className="pt-2 pb-4 space-y-6"><div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex gap-5 items-start"><div className="bg-red-500/20 p-4 rounded-lg shrink-0 text-red-500"><Trash2 size={28} /></div><div><h4 className="text-white font-bold text-lg">¿Confirmar eliminación?</h4><p className="text-zinc-400 text-sm">Se eliminarán todos los servicios vinculados a este cliente. Los cupos en las cuentas maestras se liberarán automáticamente.</p></div></div><div className="flex justify-end gap-3"><button onClick={() => setIsDeleteModalOpen(false)} className="px-8 py-3 bg-white/5 border border-white/10 text-zinc-400 rounded-lg font-bold text-sm">Cancelar</button><button onClick={confirmDelete} className="px-8 py-3 bg-red-500 text-white rounded-lg font-bold text-sm shadow-glow active:scale-95">Confirmar Eliminación</button></div></div></Modal>
      <SaleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={editingSale} zIndex={60000} />
      <EditSaleModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} sale={editingSale} zIndex={60000} />
    </div>
  );
};

export default SalesDesktop;
