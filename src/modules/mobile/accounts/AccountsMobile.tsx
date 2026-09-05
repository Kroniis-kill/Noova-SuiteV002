
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { useInventario } from '../../../hooks/useInventario';
import { Account } from '../../../types';
import { Plus, Box, Layers, Search, Activity, Upload, Trash2, X, RefreshCcw, Monitor, Mail, Key, RotateCcw, Filter, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollFloatingActions from '../../../components/ui/ScrollFloatingActions';
import EmptyState from '../../../components/ui/EmptyState';
import Skeleton from '../../../components/ui/Skeleton';
import { useData } from '../../../context/DataContext'; 
import { useHaptic } from '../../../hooks/useHaptic';
import { useHighlightAction } from '../../../hooks/useHighlightAction';
import { useUIStore } from '../../../store/uiStore';
import ServiceCard from '../../../components/inventario/ServiceCard';
import CuentaCard from '../../../components/inventario/CuentaCard';
import CuentaDetailModal from '../../../components/inventario/CuentaDetailModal';
import CuentaModal from '../../../components/inventario/CuentaModal';
import FailureAgendaModal from '../../../components/inventario/FailureAgendaModal';
import HealthCheckModal from '../../../components/inventario/HealthCheckModal';
import ImportGuideModal from '../../../components/ui/ImportGuideModal';
import AccountRenewModal from '../../../components/inventario/AccountRenewModal';
import Modal from '../../../components/ui/Modal';
import { loadXlsx } from '../../../utils/lazyXlsx';
import { useToast } from '../../../context/ToastContext';
import { generateUUID } from '../../../utils/uuid';

const ServiceSkeleton = () => (
  <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/5 p-4 rounded-xl h-[130px] flex flex-col justify-between">
    <div className="flex justify-between items-start">
      <Skeleton className="w-10 h-10 rounded-md" />
      <Skeleton className="w-8 h-6 rounded-md" />
    </div>
    <Skeleton variant="text" className="w-3/4 h-3" />
    <Skeleton variant="text" className="w-1/2 h-2" />
  </div>
);

interface AccountsMobileProps {
  onBack?: () => void;
  initialView?: 'services' | 'accounts' | 'trash' | 'all_accounts';
}

const AccountsMobile: React.FC<AccountsMobileProps> = ({ onBack, initialView = 'services' }) => {
  const { 
    services, serviceStats, selectedServiceId, setSelectedServiceId,
    filteredAccounts, addAccount, updateAccount, deleteAccount, analyzeImportData, processImportBatch
  } = useInventario();
  
  const { accounts, isLoading, sales, addFailure, pendingAction, setPendingAction } = useData(); 
  const { showToast } = useToast();
  const haptic = useHaptic();
  const isHighlighted = useHighlightAction('inventory');
  const setBackAction = useUIStore(state => state.setBackAction);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Notifications Deep Links
  useEffect(() => {
    if (pendingAction?.type === 'OPEN_ACCOUNT_DETAIL') {
      const acc = accounts.find(a => a.id === pendingAction.targetId);
      if (acc) {
        // Asegurar que estamos en la vista de cuentas del servicio correcto
        if (acc.serviceId) setSelectedServiceId(acc.serviceId);
        setViewLevel('accounts');
        setSelectedAccount(acc);
        setIsDetailOpen(true);
        setPendingAction(null);
      }
    } else if (pendingAction?.type === 'OPEN_SERVICE_ACCOUNTS') {
      setSelectedServiceId(pendingAction.targetId);
      setViewLevel('accounts');
      setPendingAction(null);
    }
  }, [pendingAction, accounts, setPendingAction, setSelectedServiceId]);

  const [viewLevel, setViewLevel] = useState<'services' | 'accounts' | 'trash' | 'all_accounts'>(initialView);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFailureAgendaModalOpen, setIsFailureAgendaModalOpen] = useState(false);
  const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [accountToRenew, setAccountToRenew] = useState<Account | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  useEffect(() => {
    if (initialView) setViewLevel(initialView);
  }, [initialView]);

  const globalFilteredAccounts = useMemo(() => {
      let list = accounts;
      if (viewLevel === 'trash') {
          list = accounts.filter(a => a.status === 'trash');
      } else if (viewLevel === 'accounts') {
          list = filteredAccounts; 
      } else if (viewLevel === 'all_accounts') {
          list = accounts.filter(a => a.status !== 'trash');
      }

      if (deferredSearchQuery) {
          const q = deferredSearchQuery.toLowerCase();
          list = list.filter(a => a.email.toLowerCase().includes(q) || a.notes?.toLowerCase().includes(q));
      }
      return list;
  }, [accounts, viewLevel, filteredAccounts, deferredSearchQuery]);

  const onHandleAccountClick = useCallback((acc: Account) => {
      haptic('nav');
      setSelectedAccount(acc);
      setIsDetailOpen(true);
  }, [haptic]);

  const onHandleServiceClick = useCallback((serviceId: string) => {
      haptic('nav');
      setSelectedServiceId(serviceId);
      setViewLevel('accounts');
  }, [haptic, setSelectedServiceId]);

  const handleBackToServices = useCallback(() => {
    haptic('nav');
    setViewLevel('services');
    setSelectedServiceId(null);
    setIsSearchOpen(false);
    setSearchQuery('');
  }, [haptic, setSelectedServiceId]);

  const handleRestore = (acc: Account) => {
      updateAccount({ ...acc, status: 'activa' });
      showToast('Cuenta restaurada al inventario', 'success');
  };

  const handleMoveToTrash = () => {
    if (accountToDelete) {
      updateAccount({ ...accountToDelete, status: 'trash' });
      setAccountToDelete(null);
      setSelectedAccount(null);
      showToast('Cuenta archivada en papelera', 'success');
    }
  };

  const confirmDelete = () => {
    if (accountToDelete) {
      deleteAccount(accountToDelete.id);
      if (selectedAccount?.id === accountToDelete.id) setSelectedAccount(null);
      setAccountToDelete(null);
      showToast('Registro eliminado definitivamente', 'success');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await loadXlsx();
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const result = analyzeImportData(data);
        if (result.newEntries.length > 0) {
             processImportBatch(result.newEntries, [], 'skip');
             showToast(`Importadas ${result.newEntries.length} cuentas con éxito`, 'success');
        } else showToast('No se encontraron datos nuevos', 'info');
      } catch (e) { showToast("Error al procesar archivo", "error"); }
    };
    reader.readAsBinaryString(file);
    setIsImportOpen(false);
  };

  const handleAddNew = () => {
    haptic('nav');
    setSelectedAccount(null);
    setIsModalOpen(true);
  };

  const onHandleFormSubmit = async (data: Partial<Account>) => {
    try {
        if (selectedAccount) {
            // Caso Edición
            await updateAccount({ ...selectedAccount, ...data } as Account);
            showToast('Cuenta actualizada', 'success');
        } else {
            // Caso Nueva Cuenta
            const newAcc: Account = {
                ...data,
                id: generateUUID(),
                serviceId: selectedServiceId || data.serviceId || '',
                startDate: data.startDate || new Date().toISOString().split('T')[0],
                status: data.status || 'activa',
                profiles: data.profiles || []
            } as Account;
            
            await addAccount(newAcc);
            showToast('Nueva cuenta registrada', 'success');
        }
        setIsModalOpen(false);
    } catch (error) {
        showToast('Error al guardar datos', 'error');
    }
  };

  useEffect(() => {
      if (isRenewOpen) setBackAction(() => setIsRenewOpen(false));
      else if (isDetailOpen) setBackAction(() => setIsDetailOpen(false));
      else if (isFailureAgendaModalOpen) setBackAction(() => setIsFailureAgendaModalOpen(false));
      else if (isHealthCheckOpen) setBackAction(() => setIsHealthCheckOpen(false));
      else if (viewLevel !== 'services') setBackAction(handleBackToServices);
      else setBackAction(null);
      return () => setBackAction(null);
  }, [isRenewOpen, isDetailOpen, isFailureAgendaModalOpen, isHealthCheckOpen, viewLevel, handleBackToServices, setBackAction]);

  const handleConfirmFailureReport = async (addToAgenda: boolean) => {
    if (!selectedAccount) return;
    
    try {
        const isFailing = selectedAccount.status === 'fallando';
        if (isFailing) return; 

        await updateAccount({
            ...selectedAccount, 
            status: 'fallando', 
            failure_started_at: new Date().toISOString() 
        });

        if (addToAgenda) {
            const todayStr = new Date().toISOString().split('T')[0];
            const activeSales = sales.filter(s => s.accountId === selectedAccount.id && s.expiryDate >= todayStr);
            
            for (const sale of activeSales) {
                await addFailure({
                    id: generateUUID(),
                    userId: '', 
                    saleId: sale.id,
                    notes: `Falla masiva reportada en cuenta ${selectedAccount.email}`,
                    createdAt: new Date().toISOString()
                });
            }
            showToast(`Falla reportada y ${activeSales.length} clientes agregados a la agenda`, 'success');
        } else {
            showToast('Falla reportada correctamente', 'info');
        }
    } catch (error) {
        showToast('Error al procesar reporte', 'error');
    } finally {
        setIsFailureAgendaModalOpen(false);
        setIsDetailOpen(false);
    }
  };

  return (
    <div className="min-h-screen pb-32 pt-4 px-4 font-sans text-text-primary relative flex flex-col">
        
        <div className="relative z-20 flex items-center justify-between mb-4">
            <div>
               <h1 className="text-2xl font-black text-text-primary tracking-tight">
                   {viewLevel === 'services' ? 'Inventario' : 
                    viewLevel === 'trash' ? 'Papelera' :
                    viewLevel === 'all_accounts' ? 'Todas las Cuentas' :
                    services.find(s => s.id === selectedServiceId)?.name}
               </h1>
               <p className="text-text-muted text-[10px] font-semibold uppercase tracking-[0.15em] mt-1">Control de suministros</p>
            </div>
            <div className="flex gap-2">
                {viewLevel === 'services' && (
                    <>
                        <button onClick={() => setIsHealthCheckOpen(true)} className="w-10 h-10 rounded-md bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-status-success-soft active:scale-95 shadow-sm" title="Auditoría"><Activity size={18} /></button>
                        <button onClick={() => setViewLevel('trash')} className="w-10 h-10 rounded-md bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-muted active:scale-95 shadow-sm relative"><Trash2 size={18} /></button>
                    </>
                )}
                <button onClick={() => setIsImportOpen(true)} className="w-10 h-10 rounded-md bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-muted active:scale-95 shadow-sm"><Upload size={18} /></button>
                <button onClick={handleAddNew} className={`w-10 h-10 rounded-md bg-gradient-to-tr from-brand-primary to-brand-accent border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-white active:scale-95 shadow-glow ${isHighlighted ? 'ring-4 ring-white animate-pulse' : ''}`}><Plus size={22} strokeWidth={2.5} /></button>
            </div>
        </div>

        <div className="relative z-20 mb-6">
            <div className="relative w-full h-[43px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 rounded-md flex items-center px-4 transition-all focus-within:border-brand-primary/50 shadow-sm">
                <Search size={18} className="text-text-disabled shrink-0" />
                <input 
                    value={searchQuery} 
                    onChange={e => { setSearchQuery(e.target.value); if(viewLevel === 'services') setViewLevel('all_accounts'); }} 
                    placeholder="Buscar cuenta o servicio..." 
                    className="bg-transparent border-none outline-none text-[12px] leading-[18px] h-[15px] text-text-primary w-full ml-3 placeholder:text-text-faint font-medium" 
                />
                {searchQuery && <button onClick={() => { setSearchQuery(''); if(viewLevel === 'all_accounts') setViewLevel('services'); }} className="p-1"><X size={14} className="text-text-disabled" /></button>}
            </div>
        </div>
        
        <div className="flex-1 relative z-10">
            <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => <ServiceSkeleton key={i} />)}
                  </motion.div>
                ) : viewLevel === 'services' ? (
                  <motion.div key="services" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
                      {serviceStats.length === 0 ? (
                        <div className="col-span-2 lg:col-span-3">
                          <EmptyState 
                            title="Inventario vacío"
                            description="No tienes servicios configurados. Agrega el primero para empezar a cargar stock."
                            icon={Box}
                            actionLabel="Crear Servicio"
                            onAction={() => window.location.hash = '#services'}
                          />
                        </div>
                      ) : (
                        serviceStats.map(({ service, stats }) => (
                          <ServiceCard 
                            key={service.id} 
                            service={service} 
                            stats={stats} 
                            onClick={() => onHandleServiceClick(service.id)} 
                          />
                        ))
                      )}
                  </motion.div>
                ) : (
                  <motion.div key="accounts-list" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
                      {globalFilteredAccounts.length === 0 ? (
                        <div className="col-span-1 md:col-span-2 lg:col-span-3">
                          <EmptyState 
                            title={viewLevel === 'trash' ? "Papelera vacía" : "Sin cuentas"}
                            description={viewLevel === 'trash' ? "No hay cuentas archivadas por ahora." : "No se encontraron registros para tu búsqueda."}
                            icon={Layers}
                            actionLabel={viewLevel !== 'trash' ? "Nueva Cuenta" : undefined}
                            onAction={viewLevel !== 'trash' ? handleAddNew : undefined}
                          />
                        </div>
                      ) : (
                        globalFilteredAccounts.map(acc => {
                            if (viewLevel === 'trash') {
                                const svc = services.find(s => s.id === acc.serviceId);
                                return (
                                    <div key={acc.id} onClick={() => onHandleAccountClick(acc)} className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/5 p-4 rounded-xl flex items-center justify-between shadow-sm active:scale-95 transition-all">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-10 h-10 rounded-sm bg-surface-sunken flex items-center justify-center text-text-disabled border border-[rgb(var(--fg-rgb))]/5 shrink-0"><Monitor size={18} /></div>
                                            <div className="min-w-0">
                                                <h4 className="text-sm font-bold text-text-primary truncate">{svc?.name || 'Servicio'}</h4>
                                                <p className="text-[10px] text-text-disabled truncate">{acc.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); handleRestore(acc); }} className="p-2 rounded-lg bg-status-success/10 text-status-success-soft border border-status-success/20 active:scale-90" title="Restaurar"><RotateCcw size={16} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); setAccountToDelete(acc); }} className="p-2 rounded-lg bg-status-danger/10 text-status-danger-soft border border-status-danger/20 active:scale-90" title="Borrar para siempre"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                );
                            }
                            return <CuentaCard key={acc.id} account={acc} onClick={onHandleAccountClick} />;
                        })
                      )}
                  </motion.div>
                )}
            </AnimatePresence>
        </div>

        <ScrollFloatingActions onAdd={handleAddNew} onBack={viewLevel !== 'services' ? handleBackToServices : onBack} />
        
        <CuentaDetailModal 
          isOpen={isDetailOpen} 
          onClose={() => setIsDetailOpen(false)} 
          account={selectedAccount}
          onEdit={(acc) => { setSelectedAccount(acc); setIsModalOpen(true); }}
          onRenew={(acc) => { setAccountToRenew(acc); setIsRenewOpen(true); }}
          onToggleStatus={(acc) => {
              const isPaused = acc.status === 'inactiva';
              updateAccount({...acc, status: isPaused ? 'activa' : 'inactiva'});
              showToast(isPaused ? 'Cuenta activada' : 'Cuenta pausada', 'info');
          }}
          onToggleFailure={(acc) => {
              const isFailing = acc.status === 'fallando';
              if (isFailing) {
                  updateAccount({...acc, status: 'activa', failure_started_at: undefined });
                  showToast('Falla resuelta', 'info');
              } else {
                  setSelectedAccount(acc);
                  setIsFailureAgendaModalOpen(true);
              }
          }}
          onDelete={(id) => { const acc = accounts.find(a => a.id === id); if(acc) setAccountToDelete(acc); }}
          onRestore={handleRestore}
        />

        <FailureAgendaModal 
          isOpen={isFailureAgendaModalOpen} 
          onClose={() => setIsFailureAgendaModalOpen(false)} 
          account={selectedAccount} 
          onConfirm={handleConfirmFailureReport} 
        />

        <CuentaModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={onHandleFormSubmit}
          serviceId={selectedServiceId}
          services={services}
          initialData={selectedAccount}
        />

        <HealthCheckModal isOpen={isHealthCheckOpen} onClose={() => setIsHealthCheckOpen(false)} />
        
        <AccountRenewModal 
           isOpen={isRenewOpen} 
           onClose={() => setIsRenewOpen(false)} 
           accounts={accountToRenew ? [accountToRenew] : []} 
           serviceName={accountToRenew ? services.find(s => s.id === accountToRenew.serviceId)?.name || 'Servicio' : ''} 
        />

        <ImportGuideModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onConfirm={() => fileInputRef.current?.click()} type="inventory" title="Importar Inventario" />
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx,.xls,.csv" />

        <Modal isOpen={!!accountToDelete} onClose={() => setAccountToDelete(null)} title="Eliminar Registro" zIndex={60000}>
          <div className="space-y-5 pt-2">
              <div className="bg-status-danger/10 border border-status-danger/20 p-4 rounded-xl flex gap-4 items-start">
                  <div className="bg-status-danger/20 p-3 rounded-full shrink-0"><Trash2 size={24} className="text-status-danger" /></div>
                  <div>
                      <h4 className="text-text-primary font-bold text-sm">Gestión de Eliminación</h4>
                      <p className="text-text-muted text-xs mt-1 leading-relaxed">
                          ¿Cómo deseas proceder con la cuenta <strong>{accountToDelete?.email}</strong>?
                      </p>
                  </div>
              </div>
              <div className="flex flex-col gap-3">
                {viewLevel !== 'trash' && (
                  <button onClick={handleMoveToTrash} className="w-full p-4 rounded-xl bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 hover:bg-[rgb(var(--fg-rgb))]/5 text-left flex justify-between items-center transition-all group">
                    <div>
                      <span className="block text-text-primary font-bold text-sm">Archivar en Papelera</span>
                      <span className="block text-text-disabled text-[10px]">Podrás recuperarla más tarde si la necesitas.</span>
                    </div>
                    <RotateCcw size={16} className="text-text-faint group-hover:text-brand-primary transition-colors" />
                  </button>
                )}
                <button onClick={confirmDelete} className="w-full p-4 rounded-lg bg-status-danger/5 border border-status-danger/10 hover:bg-status-danger/10 text-left flex justify-between items-center transition-all group">
                  <div>
                    <span className="block text-status-danger-soft font-bold text-sm">Eliminar para siempre</span>
                    <span className="block text-status-danger-soft/50 text-[10px]">El registro será borrado definitivamente del sistema.</span>
                  </div>
                  <Trash2 size={16} className="text-status-danger-soft/50 group-hover:text-status-danger-soft transition-colors" />
                </button>
              </div>
              <button onClick={() => setAccountToDelete(null)} className="w-full py-3 text-text-disabled text-xs font-semibold mt-1 active:text-text-primary">Cancelar</button>
          </div>
        </Modal>
    </div>
  );
};

export default AccountsMobile;
