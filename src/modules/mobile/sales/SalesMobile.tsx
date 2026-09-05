
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSalesLogic } from '../../../hooks/useSalesLogic';
import SaleCard from '../../../components/sales/SaleCard';
import SaleModal from '../../../components/sales/SaleModal';
import EditSaleModal from '../../../components/sales/EditSaleModal';
import SaleDetailPage from '../../../components/sales/SaleDetailPage';
import ScrollFloatingActions from '../../../components/ui/ScrollFloatingActions'; 
import ImportGuideModal from '../../../components/ui/ImportGuideModal';
import { 
  Search, Plus, Upload, X, Filter, ClipboardList, CheckCircle, 
  MonitorPlay, ShoppingCart, MessageCircle, 
  AlertTriangle, Mail, Lock, Copy, 
  Database, Monitor, AlertCircle, Trash2, Check, Clock, Zap,
  ChevronRight, Key, LayoutTemplate, CheckCircle2, User, FileText, Send,
  ShieldCheck, ChevronDown, Layers, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { VirtuosoGrid } from 'react-virtuoso';
import { useHighlightAction } from '../../../hooks/useHighlightAction';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { useHaptic } from '../../../hooks/useHaptic';
import { useUIStore } from '../../../store/uiStore';
import { ServiceFailure } from '../../../types';
import Modal from '../../../components/ui/Modal';
import Avatar from '../../../components/ui/Avatar';
import { formatDate, sendWhatsAppMessage } from '../../../utils/contactosUtils';
import { getCombinedWhatsAppTemplate, SalesGroup } from '../../../utils/salesUtils';

const SaleSkeleton = () => (
  <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/5 rounded-xl p-4 h-[132px] flex flex-col justify-between">
    <div className="flex flex-col items-center gap-2 mt-2">
      <Skeleton variant="circle" className="w-12 h-12" />
      <Skeleton variant="text" className="w-20 h-3" />
    </div>
    <div className="flex justify-between items-center mt-auto">
      <Skeleton className="w-8 h-8 rounded-full" />
      <Skeleton className="w-8 h-8 rounded-full" />
    </div>
  </div>
);

interface SalesMobileProps {
  onBack?: () => void;
  initialView?: 'sales' | 'agenda';
}

const SalesMobile: React.FC<SalesMobileProps> = ({ onBack, initialView = 'sales' }) => {
  const {
    searchQuery, setSearchQuery,
    statusFilter, setStatusFilter,
    isDeleteModalOpen, setIsDeleteModalOpen,
    isModalOpen, setIsModalOpen,
    isEditModalOpen, setIsEditModalOpen,
    isImportModalOpen, setIsImportModalOpen,
    isFilterModalOpen, setIsFilterModalOpen,
    isDetailOpen, setIsDetailOpen,
    editingSale, setEditingSale,
    mobileSelectedGroup, setMobileSelectedGroup,
    filteredGroups,
    fileInputRef,
    handleFileUpload,
    loadMoreSales, hasMoreSales, isSalesLoading,
    handleNewSale, handleEditSale, handleDeleteSingleSale, handleDeleteGroup, confirmDelete,
    selectGroupMobile
  } = useSalesLogic();

  const { isLoading, clients, services, serviceFailures, deleteFailure, sales, accounts, settings, resellers, updateAccount, pendingAction, setPendingAction } = useData();
  const { showToast } = useToast();
  const isHighlighted = useHighlightAction('sales');
  const haptic = useHaptic();
  const setBackAction = useUIStore(state => state.setBackAction);

  const [viewFails, setViewFails] = useState(initialView === 'agenda');
  const [failsSubView, setFailsSubView] = useState<'clients' | 'accounts'>('clients');
  const [selectedFailure, setSelectedFailure] = useState<ServiceFailure | null>(null);
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);

  // Handle Notifications Deep Links
  useEffect(() => {
    if (pendingAction?.type === 'OPEN_RENEWAL') {
      const clientId = pendingAction.targetId;
      const group = filteredGroups.find(g => g.clientId === clientId);
      if (group) {
        setMobileSelectedGroup(group);
        setIsDetailOpen(true);
        setPendingAction(null);
      }
    }
  }, [pendingAction, filteredGroups, setPendingAction]);
  
  const loaderRef = useRef<HTMLDivElement>(null);

  const filterOptions = [
    { id: 'all', label: 'Todas las Ventas', color: 'text-text-muted' },
    { id: 'active', label: 'Vigentes', color: 'text-status-success-soft' },
    { id: 'warning', label: 'Próximas a vencer', color: 'text-status-warning-soft' },
    { id: 'expired', label: 'Ya vencidas', color: 'text-status-danger-soft' }
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreSales && !isSalesLoading) {
          loadMoreSales();
        }
      },
      { threshold: 0.1, rootMargin: '500px' }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMoreSales, isSalesLoading, loadMoreSales]);

  const onHandleNotifyFailure = useCallback((failure: ServiceFailure) => {
    haptic('nav');
    const sale = sales.find(s => s.id === failure.saleId);
    const client = clients.find(c => c.id === sale?.clientId);
    if (sale && client) {
        const msg = getCombinedWhatsAppTemplate('failure', [sale], client.name, accounts, settings, 'whatsapp', false);
        sendWhatsAppMessage(client.phone || '', msg);
        showToast('Notificación de falla enviada', 'info');
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
      showToast(notify ? 'Resuelto y notificado' : 'Incidencia resuelta', 'success');
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

  const handleFailureClick = (failure: ServiceFailure) => {
      haptic('nav');
      setSelectedFailure(failure);
  };

  useEffect(() => {
      if (selectedFailure) setBackAction(() => setSelectedFailure(null));
      else if (isDetailOpen) setBackAction(() => setIsDetailOpen(false));
      else if (isDeleteModalOpen) setBackAction(() => setIsDeleteModalOpen(false));
      else if (viewFails) setBackAction(() => setViewFails(false));
      else setBackAction(null);
      return () => setBackAction(null);
  }, [isDetailOpen, isDeleteModalOpen, viewFails, selectedFailure, setBackAction]);

  return (
    <div className="min-h-screen pb-32 pt-0 font-sans text-text-primary relative bg-bg flex flex-col overflow-x-hidden">

      <div className="relative z-20 pt-safe px-4 mt-4">
         <div className="relative z-20 flex items-center justify-between mb-6">
            <div>
               <h1 className="text-2xl font-black text-text-primary tracking-tight">{viewFails ? 'Agenda de Fallas' : 'Ventas'}</h1>
               <p className="text-text-muted text-[10px] font-semibold uppercase tracking-[0.15em] mt-1">{viewFails ? 'Seguimiento de incidencias' : 'Gestión de servicios'}</p>
            </div>
            <div className="flex gap-2">
                {!viewFails && (
                    <>
                        <button onClick={() => setIsImportModalOpen(true)} className="w-10 h-10 rounded-md bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-muted active:scale-95 transition-all shadow-sm"><Upload size={16} /></button>
                        <button onClick={() => setIsFilterModalOpen(true)} className={`w-10 h-10 rounded-md flex items-center justify-center border transition-all active:scale-95 shadow-sm relative ${statusFilter !== 'all' ? 'bg-brand-primary/20 border-brand-primary text-brand-primary' : 'bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 text-text-muted'}`}><Filter size={16} />{statusFilter !== 'all' && <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-accent rounded-full shadow-[0_0_8px_#FF1493]" />}</button>
                        <button onClick={() => setViewFails(true)} className="w-10 h-10 rounded-md bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-muted active:scale-95 transition-all shadow-sm"><ClipboardList size={16} /></button>
                        <button onClick={handleNewSale} className={`w-10 h-10 bg-gradient-to-r from-brand-primary to-brand-accent rounded-md flex items-center justify-center text-white shadow-glow active:scale-95 transition-all mt-0 ${isHighlighted ? 'ring-4 ring-white animate-pulse' : ''}`}><Plus size={18} strokeWidth={2.5} /></button>
                    </>
                )}
                {viewFails && <button onClick={() => setViewFails(false)} className="w-10 h-10 rounded-md bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-primary active:scale-95"><X size={16} /></button>}
            </div>
         </div>

         {!viewFails && (
            <div className="mb-6 relative z-20">
                <div className="relative h-[43px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 rounded-md flex items-center px-5 transition-all focus-within:border-brand-primary/50 shadow-sm pt-0 pl-2.5 pr-5">
                    <Search size={20} className="text-text-disabled shrink-0" />
                    <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar cliente o servicio..." className="bg-transparent border-none outline-none text-[12px] text-text-primary w-full ml-3 placeholder:text-text-faint font-normal" />
                    {searchQuery && <button onClick={() => setSearchQuery('')} className="p-1"><X size={16} className="text-text-disabled" /></button>}
                </div>
            </div>
         )}

         {viewFails && (
            <div className="flex p-1 bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 rounded-md mb-6 relative z-20">
                <button 
                    onClick={() => { haptic('nav'); setFailsSubView('clients'); }}
                    className={`flex-1 py-3 rounded-md text-[10px] font-semibold uppercase tracking-widest transition-all ${failsSubView === 'clients' ? 'bg-bg text-text-primary' : 'bg-surface-3 text-text-disabled'}`}
                >
                    Fallas de Clientes
                </button>
                <button 
                    onClick={() => { haptic('nav'); setFailsSubView('accounts'); }}
                    className={`flex-1 py-3 rounded-md text-[10px] font-semibold uppercase tracking-widest transition-all ${failsSubView === 'accounts' ? 'bg-bg text-text-primary' : 'bg-surface-3 text-text-disabled'}`}
                >
                    Cuentas en Falla
                </button>
            </div>
         )}
      </div>

      <div className="pb-24 relative z-10 flex-1 overflow-y-auto">
         <AnimatePresence mode='wait'>
            {!viewFails ? (
                <motion.div key="sales-list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="h-full">
                    {isLoading && filteredGroups.length === 0 ? (
                        <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
                           {Array.from({ length: 12 }).map((_, i) => <SaleSkeleton key={i} />)}
                        </div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="flex justify-center mt-10"><EmptyState title="Sin resultados" description={statusFilter !== 'all' ? "No hay ventas con este estado." : "Registra tu primera venta."} icon={ShoppingCart} actionLabel={statusFilter !== 'all' ? "Quitar Filtros" : "Nueva Venta"} onAction={statusFilter !== 'all' ? () => setStatusFilter('all') : handleNewSale} /></div>
                    ) : (
                        <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 pb-24">
                             {filteredGroups.map(group => {
                                 const allSales = group.renewalGroups.flatMap(g => g.sales);
                                 const hasFailingAccount = allSales.some(sale => accounts.find(a => a.id === sale.accountId)?.status === 'fallando');
                                 const hasPendingFailInAgenda = allSales.some(sale => serviceFailures.some(f => f.saleId === sale.id));
                                 const warningThreshold = settings.salesPreferences?.warningDays || 2;
                                 
                                 return (
                                     <SaleCard 
                                         key={group.clientId} 
                                         group={group} 
                                         onClick={selectGroupMobile} 
                                         onWhatsApp={(g) => { }} 
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
                             {!isLoading && hasMoreSales && <div ref={loaderRef} className="col-span-3 lg:col-span-4 h-20" />}
                        </div>
                    )}
                </motion.div>
            ) : (
                <motion.div key="fails-list" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className={`${failsSubView === 'clients' ? "grid grid-cols-3 gap-2" : "flex flex-col gap-4"} mt-0`}>
                    {failsSubView === 'clients' ? (
                        serviceFailures.length === 0 ? (
                            <div className="col-span-3 py-20 text-center"><EmptyState title="Sin fallas activas" description="Todo está funcionando correctamente." icon={CheckCircle} /></div>
                        ) : (
                            serviceFailures.map(failure => {
                                const sale = sales.find(s => s.id === failure.saleId);
                                const client = clients.find(c => c.id === sale?.clientId);
                                const service = services.find(s => s.name === sale?.serviceName);
                                return (
                                    <div 
                                        key={failure.id} 
                                        onClick={() => handleFailureClick(failure)} 
                                        className="relative bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-md p-3 h-[150px] flex flex-col justify-between active:scale-95 transition-all overflow-hidden shadow-sm"
                                    >
                                        
                                        <div className="flex justify-between items-center w-full">
                                            <div className="flex items-center gap-1 text-[8px] text-text-disabled font-bold bg-[rgb(var(--fg-rgb))]/5 px-1.5 py-0.5 rounded-md -mt-[7px]">
                                                <Layers size={10} strokeWidth={3} />
                                                <span>{sale?.screensCount || 1}</span>
                                            </div>
                                            <div className="text-status-danger -mt-[7px]">
                                                <AlertCircle size={10} strokeWidth={3} />
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center gap-1.5 mt-1">
                                            <div className="relative">
                                                <Avatar name={client?.name || 'Cliente'} image={service?.image_url} size={44} className="rounded-full border border-[rgb(var(--fg-rgb))]/5 shadow-md" />
                                            </div>
                                            <div className="text-center w-full">
                                                <p className="text-[9px] text-text-disabled font-medium truncate px-1 not-italic">{client?.name || 'Cliente'}</p>
                                                <div className="flex items-center justify-center gap-1 text-[7px] text-status-danger font-black uppercase mt-0.5">
                                                    <AlertCircle size={7} strokeWidth={3} />
                                                    <span>En Falla</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-2 w-full flex justify-between gap-1.5 px-1">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onHandleNotifyFailure(failure); }} 
                                                className="w-8 h-8 rounded-full bg-[rgb(var(--fg-rgb))]/5 text-text-muted flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 active:bg-brand-primary/20 active:text-brand-primary transition-all"
                                                title="Notificar Falla"
                                            >
                                                <MessageCircle size={14} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); deleteFailure(failure.id); }} 
                                                className="w-8 h-8 rounded-full bg-[rgb(var(--fg-rgb))]/5 text-text-disabled flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 active:bg-status-danger/10 active:text-status-danger transition-all"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )) : (
                        <>
                            {accounts.filter(a => a.status === 'fallando').length === 0 ? (
                                <div className="w-full py-20 text-center"><EmptyState title="Sin cuentas en falla" description="No hay cuentas maestras reportadas con problemas." icon={ShieldCheck} /></div>
                            ) : (
                                accounts.filter(a => a.status === 'fallando').map(account => {
                                    const service = services.find(s => s.id === account.serviceId);
                                    const isExpanded = expandedAccountId === account.id;
                                    
                                    return (
                                        <div 
                                            key={account.id} 
                                            onClick={() => { haptic('nav'); setExpandedAccountId(isExpanded ? null : account.id); }}
                                            className="relative w-full bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-4 transition-all duration-300 overflow-hidden cursor-pointer active:bg-[rgb(var(--fg-rgb))]/[0.02]"
                                        >
                                            
                                            <div className="flex flex-col gap-4">
                                                {/* Main Row - Always Visible (Icon, Name, Email) */}
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="w-12 h-12 rounded-sm bg-surface-sunken flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 overflow-hidden shrink-0 shadow-sm">
                                                            {service?.image_url ? <img src={service.image_url} className="w-full h-full object-cover" /> : <Database size={20} className="text-status-expiring-soft" />}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <h4 className="text-sm font-bold text-text-primary truncate uppercase tracking-tight">
                                                                {service?.name || 'Cuenta'}
                                                            </h4>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <Mail size={10} className="text-text-disabled" />
                                                                <p className="text-[11px] text-text-disabled truncate font-medium">{account.email}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Right side info - Only visible when expanded */}
                                                    {isExpanded && (
                                                        <div className="flex flex-col items-end gap-1.5">
                                                            <div className="text-status-expiring bg-status-expiring/10 p-2 rounded-xl border border-status-expiring/10">
                                                                <AlertTriangle size={16} strokeWidth={2.5} className="animate-pulse" />
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[10px] font-semibold text-text-disabled bg-[rgb(var(--fg-rgb))]/5 px-2 py-0.5 rounded-lg">
                                                                <Users size={10} />
                                                                <span>{account.usedScreens}/{account.maxScreens}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div 
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="pt-4 border-t border-[rgb(var(--fg-rgb))]/5 space-y-4">
                                                                {/* Info Row (Password & Status) */}
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div className="bg-surface-sunken rounded-sm p-3 border border-[rgb(var(--fg-rgb))]/5">
                                                                        <span className="text-[8px] font-bold text-text-faint uppercase tracking-widest block mb-1">Contraseña</span>
                                                                        <div className="flex items-center gap-2 text-xs font-mono font-bold text-text-secondary">
                                                                            <Lock size={10} className="text-text-faint" />
                                                                            <span className="truncate">{account.password}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="bg-surface-sunken rounded-sm p-3 border border-[rgb(var(--fg-rgb))]/5">
                                                                        <span className="text-[8px] font-bold text-text-faint uppercase tracking-widest block mb-1">Estado</span>
                                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-status-expiring uppercase">
                                                                            <AlertCircle size={10} />
                                                                            <span>Falla Crítica</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Affected Clients List */}
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center justify-between px-1">
                                                                        <span className="text-[9px] font-bold text-text-disabled uppercase tracking-widest">Clientes Afectados</span>
                                                                        <span className="text-[9px] font-black text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-full">
                                                                            {serviceFailures.filter(f => sales.find(s => s.id === f.saleId)?.accountId === account.id).length} en Agenda
                                                                        </span>
                                                                    </div>
                                                                    <div className="bg-surface-sunken rounded-md p-2 border border-[rgb(var(--fg-rgb))]/5 space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar">
                                                                        {(() => {
                                                                            const affectedFailures = serviceFailures.filter(f => {
                                                                                const s = sales.find(sale => sale.id === f.saleId);
                                                                                return s?.accountId === account.id;
                                                                            });

                                                                            if (affectedFailures.length === 0) {
                                                                                return (
                                                                                    <div className="py-4 text-center">
                                                                                        <p className="text-[10px] text-text-faint italic">No hay clientes individuales reportados para esta cuenta.</p>
                                                                                    </div>
                                                                                );
                                                                            }

                                                                            return affectedFailures.map(f => {
                                                                                const s = sales.find(sale => sale.id === f.saleId);
                                                                                const c = clients.find(client => client.id === s?.clientId);
                                                                                return (
                                                                                    <div key={f.id} className="flex items-center justify-between gap-2 bg-[rgb(var(--fg-rgb))]/5 p-2 rounded-xl border border-[rgb(var(--fg-rgb))]/5">
                                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                                            <Avatar name={c?.name || 'Cliente'} size={24} className="rounded-full border border-[rgb(var(--fg-rgb))]/10" />
                                                                                            <div className="min-w-0">
                                                                                                <p className="text-[10px] font-semibold text-text-primary truncate">{c?.name || 'Cliente'}</p>
                                                                                                <p className="text-[8px] text-text-disabled font-medium truncate">Perfil {s?.assignedProfiles?.[0]?.name || '1'}</p>
                                                                                            </div>
                                                                                        </div>
                                                                                        <button 
                                                                                            onClick={(e) => { e.stopPropagation(); onHandleNotifyFailure(f); }}
                                                                                            className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center border border-brand-primary/20 active:scale-90 transition-all"
                                                                                        >
                                                                                            <MessageCircle size={14} />
                                                                                        </button>
                                                                                    </div>
                                                                                );
                                                                            });
                                                                        })()}
                                                                    </div>
                                                                </div>

                                                                <div className="bg-status-danger/5 rounded-sm p-4 border border-status-danger/10">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <AlertCircle size={14} className="text-status-danger" />
                                                                        <span className="text-[10px] font-bold text-status-danger uppercase tracking-widest">Reporte de Falla Crítico</span>
                                                                    </div>
                                                                    <p className="text-[11px] text-text-muted leading-relaxed font-medium">
                                                                        Esta cuenta maestra ha sido reportada con problemas técnicos. Se recomienda verificar las credenciales de acceso y el estado del servicio directamente en el proveedor.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {/* Actions */}
                                                {isExpanded && (
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onHandleSolveAccountFailure(account); }} 
                                                            className="flex-1 h-12 rounded-md bg-status-success text-black flex items-center justify-center gap-2 shadow-glow-sm active:scale-95 transition-all"
                                                        >
                                                            <CheckCircle2 size={16} strokeWidth={2.5} />
                                                            <span className="text-[10px] font-semibold uppercase tracking-widest">Resolver</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </>
                    )}
                </motion.div>
            )}
         </AnimatePresence>
      </div>

      {/* MODAL DETALLE DE FALLA */}
      <Modal isOpen={!!selectedFailure} onClose={() => setSelectedFailure(null)} title="Gestionar Incidencia" zIndex={60000}>
         {selectedFailure && (() => {
            const sale = sales.find(s => s.id === selectedFailure.saleId);
            const client = clients.find(c => c.id === sale?.clientId);
            const account = accounts.find(a => a.id === sale?.accountId);
            const service = services.find(s => s.name === sale?.serviceName);
            const isUnique = sale?.saleType === 'usuario_unico';

            return (
                <div className="pt-0 pb-4 space-y-5">
                    {/* Header Info */}
                    <div className="flex items-center gap-4 px-1">
                         <div className="w-16 h-16 rounded-full bg-surface-zinc flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 overflow-hidden shrink-0 shadow-lg">
                            {service?.image_url ? <img src={service.image_url} className="w-full h-full object-cover" /> : <MonitorPlay size={28} className="text-text-disabled" />}
                        </div>
                        <div>
                            <h4 className="text-xl font-black text-text-primary truncate uppercase tracking-tight">{sale?.serviceName}</h4>
                            <p className="text-sm font-medium text-text-disabled flex items-center gap-1.5"><User size={14} className="text-text-muted" /> {client?.name}</p>
                        </div>
                    </div>

                    {/* Credentials Sections */}
                    <div className="space-y-4">
                        {isUnique && (
                            <div className="bg-surface-3 rounded-xl p-5 border border-[rgb(var(--fg-rgb))]/5">
                                <h5 className="text-[10px] font-semibold text-text-disabled uppercase tracking-widest mb-3 ml-1">Cuenta de Invitado (Cliente)</h5>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[9px] font-bold text-text-faint uppercase mb-1 block ml-1">Correo</label>
                                        <div className="bg-surface-sunken rounded-md h-12 flex items-center justify-between px-4 border border-[rgb(var(--fg-rgb))]/5 active:scale-[0.99] transition-transform" onClick={() => { navigator.clipboard.writeText(sale?.invitedEmail || ''); showToast('Copiado', 'success'); }}>
                                            <span className="text-sm font-bold text-text-primary truncate">{sale?.invitedEmail || '---'}</span>
                                            <Copy size={14} className="text-text-faint" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-text-faint uppercase mb-1 block ml-1">Contraseña</label>
                                        <div className="bg-surface-sunken rounded-md h-12 flex items-center justify-between px-4 border border-[rgb(var(--fg-rgb))]/5 active:scale-[0.99] transition-transform" onClick={() => { navigator.clipboard.writeText(sale?.invitedPassword || ''); showToast('Copiado', 'success'); }}>
                                            <span className="text-sm font-mono font-bold text-text-primary truncate">{sale?.invitedPassword || '---'}</span>
                                            <Copy size={14} className="text-text-faint" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-surface-3 rounded-xl p-5 border border-[rgb(var(--fg-rgb))]/5">
                             <h5 className="text-[10px] font-semibold text-text-disabled uppercase tracking-widest mb-3 ml-1">Cuenta Maestra</h5>
                             <div className="space-y-3">
                                <div>
                                    <label className="text-[9px] font-bold text-text-faint uppercase mb-1 block ml-1">Correo</label>
                                    <div className="bg-surface-sunken rounded-md h-12 flex items-center justify-between px-4 border border-[rgb(var(--fg-rgb))]/5 active:scale-[0.99] transition-transform" onClick={() => { navigator.clipboard.writeText(account?.email || ''); showToast('Copiado', 'success'); }}>
                                        <span className="text-sm font-bold text-text-primary truncate">{account?.email || '---'}</span>
                                        <Copy size={14} className="text-text-faint" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-text-faint uppercase mb-1 block ml-1">Contraseña</label>
                                    <div className="bg-surface-sunken rounded-md h-12 flex items-center justify-between px-4 border border-[rgb(var(--fg-rgb))]/5 active:scale-[0.99] transition-transform" onClick={() => { navigator.clipboard.writeText(account?.password || ''); showToast('Copiado', 'success'); }}>
                                        <span className="text-sm font-mono font-bold text-text-primary truncate">{account?.password || '---'}</span>
                                        <Copy size={14} className="text-text-faint" />
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Report Note */}
                    <div className="bg-surface-3 rounded-xl p-5 border border-[rgb(var(--fg-rgb))]/5">
                        <label className="text-[10px] font-semibold text-text-disabled uppercase tracking-widest mb-2 block ml-1">Motivo Reportado</label>
                        <div className="bg-surface-sunken rounded-lg p-4 min-h-[80px] border border-[rgb(var(--fg-rgb))]/5">
                             <p className="text-sm text-text-secondary font-medium leading-relaxed italic">"{selectedFailure.notes || 'Sin descripción detallada.'}"</p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => onHandleNotifyFailure(selectedFailure)} className="h-14 bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 text-text-primary rounded-lg font-semibold text-xs shadow-sm flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 active:scale-95 transition-all">
                                Avisar Falla
                            </button>
                            <button onClick={() => onHandleSolveFailure(selectedFailure, true)} className="h-12 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-2xl font-semibold text-xs shadow-glow flex items-center justify-center text-center leading-tight active:scale-95 transition-all">
                                Resolver y Notificar
                            </button>
                        </div>
                        
                        <button onClick={() => onHandleSolveFailure(selectedFailure, false)} className="w-full h-14 bg-surface-3 text-text-muted font-semibold text-xs rounded-lg flex items-center justify-center gap-2 border border-[rgb(var(--fg-rgb))]/5 hover:text-text-primary transition-colors active:scale-95">
                            Solo Resolver <ChevronDown size={14} />
                        </button>
                    </div>
                </div>
            )
         })()}
      </Modal>

      <ImportGuideModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onConfirm={() => fileInputRef.current?.click()} title="Importar Ventas" type="sales" />
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx,.xls,.csv" />
      <Modal isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)} title="Filtrar Ventas">
        <div className="space-y-3 pt-2">
            <p className="text-text-disabled text-[10px] font-semibold uppercase tracking-widest ml-1 mb-4">Estado de Suscripción</p>
            {filterOptions.map(opt => (
                <button key={opt.id} onClick={() => { haptic('nav'); setStatusFilter(opt.id as any); setIsFilterModalOpen(false); }} className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all group ${statusFilter === opt.id ? 'bg-brand-primary/10 border-brand-primary/40' : 'bg-transparent border border-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/5'}`}>
                    <span className={`text-sm font-bold ${statusFilter === opt.id ? 'text-text-primary' : 'text-text-muted group-hover:text-text-primary'}`}>{opt.label}</span>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${statusFilter === opt.id ? 'bg-brand-primary border-brand-primary text-white shadow-glow-sm' : 'border-zinc-800'}`}>{statusFilter === opt.id && <Check size={12} strokeWidth={3} />}</div>
                </button>
            ))}
            <div className="pt-4"><button onClick={() => setIsFilterModalOpen(false)} className="w-full py-4 text-text-disabled text-xs font-semibold uppercase tracking-widest active:text-text-primary">Cerrar</button></div>
        </div>
      </Modal>
      
      {/* SaleDetail Page uses onEdit which now should redirect to the page */}
      <SaleDetailPage isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} group={mobileSelectedGroup} onEdit={handleEditSale} onDelete={handleDeleteSingleSale} />
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Eliminar Venta" zIndex={60000}><div className="pt-2 pb-4 space-y-6"><div className="bg-status-danger/10 border border-status-danger/20 p-5 rounded-xl flex gap-4 items-start shadow-sm"><div className="bg-status-danger/20 p-3 rounded-full shrink-0 text-status-danger"><Trash2 size={24} /></div><div><h4 className="text-text-primary font-bold text-sm">¿Confirmar eliminación?</h4><p className="text-text-muted text-xs mt-1 leading-relaxed">Esta acción es permanente y eliminará todas las suscripciones vigentes para este cliente agrupado.</p></div></div><div className="flex gap-3"><button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 h-14 bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/10 text-text-muted rounded-2xl font-semibold text-xs active:scale-95">Cancelar</button><button onClick={confirmDelete} className="flex-1 h-14 bg-status-danger text-white rounded-2xl font-bold text-xs shadow-[0_0_20px_rgba(239,68,68,0.4)] active:scale-95">Eliminar Todo</button></div></div></Modal>
      <ScrollFloatingActions onAdd={handleNewSale} onBack={onBack} />
      <SaleModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={editingSale} zIndex={60000} />
      <EditSaleModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} sale={editingSale} zIndex={60000} />
    </div>
  );
};

export default SalesMobile;
