
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { Provider, Account } from '../../../types';
import ProviderModal from '../../../components/providers/ProviderModal';
import ProviderCard from '../../../components/providers/ProviderCard';
import ProviderDetailSheet from '../../../components/providers/ProviderDetailSheet';
import CuentaModal from '../../../components/inventario/CuentaModal';
import CuentaDetailModal from '../../../components/inventario/CuentaDetailModal';
import FailureAgendaModal from '../../../components/inventario/FailureAgendaModal';
import ImportGuideModal from '../../../components/ui/ImportGuideModal';
import Modal from '../../../components/ui/Modal';
import ScrollFloatingActions from '../../../components/ui/ScrollFloatingActions';
import { 
  Plus, Search, Upload, Trash2, AlertTriangle, 
  ChevronRight, Layers, Truck, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../../context/ToastContext';
import { loadXlsx } from '../../../utils/lazyXlsx';
import { generateUUID } from '../../../utils/uuid';
import { getRandomColor } from '../../../utils/revendedoresUtils';
import { useHaptic } from '../../../hooks/useHaptic';
import { useUIStore } from '../../../store/uiStore';
import { isNativePlatform } from '../../../utils/platformUtils';

interface ProvidersMobileProps {
  onBack?: () => void;
}

const ProvidersMobile: React.FC<ProvidersMobileProps> = ({ onBack }) => {
  const { providers, accounts, services, sales, addProvider, updateProvider, deleteProvider, updateAccount, deleteAccount, addFailure } = useData();
  const { showToast } = useToast();
  const haptic = useHaptic();
  const { setBackAction } = useUIStore();
  const isNative = isNativePlatform();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Provider | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedInventoryAccount, setSelectedInventoryAccount] = useState<Account | null>(null);
  const [isInventoryDetailOpen, setIsInventoryDetailOpen] = useState(false);
  const [isFailureAgendaModalOpen, setIsFailureAgendaModalOpen] = useState(false);
  const [editingInventoryAccount, setEditingInventoryAccount] = useState<Account | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (isInventoryDetailOpen) setBackAction(() => setIsInventoryDetailOpen(false));
      else if (isFailureAgendaModalOpen) setBackAction(() => setIsFailureAgendaModalOpen(false));
      else if (isDetailOpen) setBackAction(() => setIsDetailOpen(false));
      else setBackAction(null);
      return () => setBackAction(null);
  }, [isInventoryDetailOpen, isFailureAgendaModalOpen, isDetailOpen, setBackAction]);

  const getProviderStats = (providerId: string) => {
    const providerAccounts = accounts.filter(a => a.providerId === providerId);
    return {
      total: providerAccounts.length,
      active: providerAccounts.filter(a => a.status === 'activa').length,
      expired: providerAccounts.filter(a => a.status === 'vencida').length
    };
  };

  const filteredProviders = useMemo(() => {
    let list = providers;
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => getProviderStats(b.id).active - getProviderStats(a.id).active);
  }, [providers, searchQuery, accounts]);

  const globalStats = useMemo(() => {
      const totalProviderAccounts = accounts.filter(a => a.providerId).length;
      return { totalProviderAccounts };
  }, [accounts]);

  const handleAdd = () => { setEditingProvider(null); setIsModalOpen(true); };
  const handleEdit = (p: Provider) => { setIsDetailOpen(false); setEditingProvider(p); setIsModalOpen(true); };
  const handleCardClick = (p: Provider) => { setSelectedProvider(p); setIsDetailOpen(true); };

  const handleSubmit = async (data: Provider) => {
    try {
      if (editingProvider) { 
          await updateProvider(data); 
          if (selectedProvider?.id === data.id) setSelectedProvider(data);
          showToast('Proveedor actualizado', 'success'); 
      } else { 
          await addProvider(data); 
          showToast('Proveedor creado', 'success'); 
      }
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error saving provider:", error);
      showToast(error?.message || 'Error al guardar', 'error');
    }
  };

  const handleDeleteRequest = (p: Provider) => { setIsDetailOpen(false); setDeleteConfirm(p); setIsDeleteModalOpen(true); };

  const handleDeleteConfirm = (strategy: 'delete_accounts' | 'unlink') => {
    if (deleteConfirm) {
        haptic('heavy'); 
        deleteProvider(deleteConfirm.id, strategy); 
        setDeleteConfirm(null); 
        setIsDeleteModalOpen(false);
        if (selectedProvider?.id === deleteConfirm.id) { 
            setIsDetailOpen(false); 
            setSelectedProvider(null); 
        }
        showToast('Proveedor eliminado', 'success');
    }
  };

  const handleAccountClick = (acc: Account) => { setIsDetailOpen(false); setSelectedInventoryAccount(acc); setIsInventoryDetailOpen(true); };
  const handleEditAccount = (acc: Account) => { setIsInventoryDetailOpen(false); setEditingInventoryAccount(acc); setIsAccountModalOpen(true); };

  const handleToggleFailure = (acc: Account) => {
    const isCurrentlyFailing = acc.status === 'fallando';
    if (isCurrentlyFailing) {
        const updated = { ...acc, status: 'activa' as Account['status'], failure_started_at: undefined };
        updateAccount(updated);
        if (selectedInventoryAccount?.id === acc.id) setSelectedInventoryAccount(updated);
        showToast('Falla removida', 'info');
    } else {
        setSelectedInventoryAccount(acc);
        setIsFailureAgendaModalOpen(true);
    }
  };

  const handleConfirmFailureReport = async (addToAgenda: boolean) => {
    if (!selectedInventoryAccount) return;
    
    try {
        const updated = { 
            ...selectedInventoryAccount, 
            status: 'fallando' as Account['status'], 
            failure_started_at: new Date().toISOString() 
        };
        
        await updateAccount(updated);
        setSelectedInventoryAccount(updated);

        if (addToAgenda) {
            const todayStr = new Date().toISOString().split('T')[0];
            const activeSales = sales.filter(s => s.accountId === selectedInventoryAccount.id && s.expiryDate >= todayStr);
            
            for (const sale of activeSales) {
                await addFailure({
                    id: generateUUID(),
                    userId: '', 
                    saleId: sale.id,
                    notes: `Falla masiva reportada en cuenta ${selectedInventoryAccount.email}`,
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
        setIsInventoryDetailOpen(false);
    }
  };

  const handleToggleAccountStatus = (acc: Account) => {
    const newStatus: Account['status'] = acc.status === 'inactiva' ? 'activa' : 'inactiva';
    updateAccount({ ...acc, status: newStatus });
    showToast(`Cuenta ${newStatus === 'activa' ? 'activada' : 'pausada'}`, 'info');
    if (selectedInventoryAccount?.id === acc.id) setSelectedInventoryAccount({ ...acc, status: newStatus } as Account);
  };

  const handleDeleteAccount = (id: string) => { deleteAccount(id); setIsInventoryDetailOpen(false); showToast('Cuenta eliminada', 'success'); };

  const handleAccountSubmit = (data: Partial<Account>) => {
    if (editingInventoryAccount) {
        updateAccount({ ...editingInventoryAccount, ...data } as Account);
        showToast('Cuenta actualizada', 'success');
        if (selectedInventoryAccount?.id === editingInventoryAccount.id) setSelectedInventoryAccount({ ...editingInventoryAccount, ...data } as Account);
    }
    setIsAccountModalOpen(false);
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
        processImportData(data);
      } catch (error) { showToast("Error al leer archivo", "error"); }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsImportModalOpen(false);
  };

  const processImportData = (data: any[]) => {
    let count = 0;
    data.forEach((row: any) => {
       const safeRow: any = {};
       Object.keys(row).forEach(k => safeRow[k.trim().toLowerCase()] = row[k]);
       if (safeRow.nombre && (safeRow.whatsapp || safeRow.telefono)) {
          addProvider({ 
            id: generateUUID(), 
            name: `${safeRow.nombre || ""}`.trim(), 
            whatsapp: `${safeRow.whatsapp || safeRow.telefono || ""}`.trim(), 
            telegram: safeRow.telegram ? `${safeRow.telegram}` : undefined, 
            color: getRandomColor(), 
            registrationDate: new Date().toISOString(), 
            qualityScore: 5 
          });
          count++;
       }
    });
    if (count > 0) showToast(`Importados ${count} proveedores`, 'success'); 
    else showToast('Datos inválidos en archivo', 'error');
  };

  const listVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen pb-32 pt-2 px-4 font-sans text-text-primary relative">
       <div className={`relative z-10 pt-safe ${isNative ? 'mt-2' : 'mt-4'}`}>
          <div className="flex justify-between items-center mb-4">
              <div>
                  <h1 className="text-2xl font-black text-text-primary tracking-tight">Proveedores</h1>
                  <p className="text-text-muted text-[10px] font-semibold uppercase tracking-[0.15em] mt-1">Gestión de suministros</p>
              </div>
              <div className="flex gap-2">
                  <div className={`relative transition-all duration-300 ease-out ${isSearchOpen ? 'w-[160px]' : 'w-10'}`}>
                      <div className={`flex items-center h-10 overflow-hidden ${isSearchOpen ? 'bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 rounded-md pr-2' : ''}`}>
                          <button onClick={() => setIsSearchOpen(true)} className={`w-10 h-10 flex items-center justify-center shrink-0 ${!isSearchOpen && 'bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-md text-text-muted active:scale-95 transition-transform shadow-sm'}`}>
                              <Search size={18} />
                          </button>
                          <input 
                            autoFocus={isSearchOpen} 
                            placeholder="Buscar..." 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                            className={`bg-transparent text-sm text-text-primary outline-none w-full ml-1 font-medium ${isSearchOpen ? 'opacity-100' : 'opacity-0'}`} 
                          />
                          {isSearchOpen && <button onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}><X size={14} className="text-text-disabled" /></button>}
                      </div>
                  </div>
                  <button onClick={() => setIsImportModalOpen(true)} className="w-10 h-10 rounded-md bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-muted hover:text-text-primary transition-all active:scale-95 shadow-sm">
                      <Upload size={20} />
                  </button>
                  <button onClick={handleAdd} className="w-10 h-10 rounded-md bg-gradient-to-r from-brand-primary to-brand-accent flex items-center justify-center text-white shadow-glow active:scale-95 transition-all">
                      <Plus size={22} strokeWidth={2.5} />
                  </button>
              </div>
          </div>
       </div>

       <div className="mb-6 relative z-10">
          <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-lg p-4 flex items-center justify-between relative overflow-hidden shadow-sm">
              <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-status-info/10 flex items-center justify-center text-status-info-soft">
                      <Layers size={20} />
                  </div>
                  <div><p className="text-[11px] font-semibold text-text-disabled uppercase tracking-wider">Inventario Externo</p><p className="text-xs text-text-muted">Cuentas de proveedores</p></div>
              </div>
              <p className="text-3xl font-bold text-text-primary tracking-tight relative z-10">{globalStats.totalProviderAccounts}</p>
          </div>
       </div>

       <motion.div variants={listVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-10 pb-20">
          <AnimatePresence mode='popLayout'>
             {filteredProviders.map(provider => (
                <motion.div key={provider.id} variants={itemVariants} layout >
                   <ProviderCard provider={provider} accountCount={getProviderStats(provider.id).total} onClick={handleCardClick} onEdit={handleEdit} />
                </motion.div>
             ))}
          </AnimatePresence>
       </motion.div>

       <ScrollFloatingActions onAdd={handleAdd} onBack={isDetailOpen ? () => setIsDetailOpen(false) : onBack} />
       <ProviderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit} initialData={editingProvider} />
       <ProviderDetailSheet isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} provider={selectedProvider} accounts={accounts} services={services} onEdit={handleEdit} onDelete={handleDeleteRequest} onAccountClick={handleAccountClick} />
       <CuentaDetailModal isOpen={isInventoryDetailOpen} onClose={() => setIsInventoryDetailOpen(false)} account={selectedInventoryAccount} onEdit={handleEditAccount} onRenew={() => {}} onToggleStatus={handleToggleAccountStatus} onToggleFailure={handleToggleFailure} onDelete={handleDeleteAccount} />
       <FailureAgendaModal 
         isOpen={isFailureAgendaModalOpen} 
         onClose={() => setIsFailureAgendaModalOpen(false)} 
         account={selectedInventoryAccount} 
         onConfirm={handleConfirmFailureReport} 
       />
       <CuentaModal isOpen={isAccountModalOpen} onClose={() => setIsAccountModalOpen(false)} onSubmit={handleAccountSubmit} initialData={editingInventoryAccount} serviceId={editingInventoryAccount?.serviceId || null} services={services} />
       <ImportGuideModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onConfirm={() => fileInputRef.current?.click()} columns={['nombre', 'whatsapp', 'telegram']} title="Importar Proveedores" type="providers" />
       <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv, .xlsx, .xls" />

       <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Eliminar Proveedor">
          <div className="space-y-4 pt-2">
             <div className="bg-status-danger/10 border border-status-danger/20 p-4 rounded-xl flex gap-4 items-start shadow-sm">
                 <AlertTriangle size={24} className="text-status-danger shrink-0" />
                 <div><h4 className="text-text-primary font-bold text-sm">Atención</h4><p className="text-text-muted text-xs mt-1 leading-relaxed">El proveedor <strong>{deleteConfirm?.name}</strong> tiene cuentas asociadas.</p></div>
             </div>
             <div className="flex flex-col gap-3">
                <button onClick={() => handleDeleteConfirm('unlink')} className="w-full p-4 rounded-lg bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 hover:bg-[rgb(var(--fg-rgb))]/5 text-left flex justify-between items-center transition-colors shadow-sm">
                   <div><span className="block text-text-primary font-bold text-sm">Desvincular Cuentas</span><span className="block text-text-disabled text-[10px]">Las cuentas quedarán sin proveedor.</span></div>
                   <ChevronRight size={16} className="text-text-faint" />
                </button>
                <button onClick={() => handleDeleteConfirm('delete_accounts')} className="w-full p-4 rounded-lg bg-status-danger/5 border border-status-danger/10 hover:bg-status-danger/10 text-left flex justify-between items-center transition-colors shadow-sm">
                   <div><span className="block text-status-danger-soft font-bold text-sm">Eliminar Todo</span><span className="block text-status-danger-soft/60 text-[10px]">Se eliminará el proveedor y sus cuentas.</span></div>
                   <Trash2 size={16} className="text-status-danger-soft/60" />
                </button>
             </div>
             <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-3 text-text-disabled text-xs font-semibold mt-2 hover:text-text-primary transition-colors">Cancelar Operación</button>
          </div>
       </Modal>
    </div>
  );
};

export default ProvidersMobile;
