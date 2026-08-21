
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useContactos } from '../../../hooks/useContactos';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useHaptic } from '../../../hooks/useHaptic';
import { useUIStore } from '../../../store/uiStore';
import { useOfflineSync } from '../../../hooks/useOfflineSync';
import { useHighlightAction } from '../../../hooks/useHighlightAction';
import { Client } from '../../../types';
import { Virtuoso } from 'react-virtuoso';
import { Search, Plus, Upload, UserCheck, UserX, RefreshCw, Users, ChevronRight, Phone, Layers, Ban, X, History as HistoryIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollFloatingActions from '../../../components/ui/ScrollFloatingActions';
import Avatar from '../../../components/ui/Avatar';
import ContactoModal from '../../../components/contactos/ContactoModal';
import ContactoBottomSheet from '../../../components/contactos/ContactoBottomSheet';
import ImportGuideModal from '../../../components/ui/ImportGuideModal';
import { getClientTags, getLocalDateISO } from '../../../utils/contactosUtils';
import { loadXlsx } from '../../../utils/lazyXlsx';
import { generateUUID } from '../../../utils/uuid';
import { useQueryClient } from '@tanstack/react-query';

interface ClientsMobileProps {
  onBack?: () => void;
}

type TabType = 'active' | 'inactive';

const ClientsMobile: React.FC<ClientsMobileProps> = ({ onBack }) => {
  const { 
    clients, searchQuery, setSearchQuery, 
    updateClient, deleteClient, addClient
  } = useContactos();
  const { user } = useAuth();
  const { resellers, sales } = useData(); 
  const { showToast } = useToast();
  const haptic = useHaptic();
  const setBackAction = useUIStore(state => state.setBackAction);
  const { processSyncQueue } = useOfflineSync(user?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [initialSheetTab, setInitialSheetTab] = useState<'info' | 'purchases' | 'history'>('info');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const isHighlighted = useHighlightAction('contacts');

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    haptic('nav');
    
    try {
      await processSyncQueue();
      const today = getLocalDateISO();
      let updatedCount = 0;

      const syncPromises = clients.map(async (client) => {
          const clientActiveSales = sales.filter(s => 
              s.clientId === client.id && 
              s.expiryDate >= today
          );
          const realCount = clientActiveSales.length;
          if (client.activeServices !== realCount) {
              updatedCount++;
              return updateClient({ ...client, activeServices: realCount });
          }
          return null;
      });

      await Promise.all(syncPromises);
      await queryClient.invalidateQueries({ queryKey: ['clients', user?.id] });
      
      if (updatedCount > 0) showToast(`${updatedCount} estados corregidos`, 'success');
      else showToast('Cartera ya está al día', 'info');
    } catch (e) { showToast('Error en la sincronización', 'error'); } finally { setTimeout(() => setIsSyncing(false), 400); }
  };

  const onHandleTabChange = useCallback((tab: TabType) => {
      haptic('nav');
      setActiveTab(tab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [haptic]);

  const onHandleCardClick = useCallback((client: Client) => {
    haptic('nav');
    setInitialSheetTab('info');
    setSelectedClient(client);
  }, [haptic]);

  const onHandleHistoryClick = useCallback((e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    haptic('nav');
    setInitialSheetTab('purchases');
    setSelectedClient(client);
  }, [haptic]);

  const onHandleEdit = useCallback((client: Client) => {
    haptic('nav');
    setSelectedClient(null);
    setEditingClient(client);
    setIsModalOpen(true);
  }, [haptic]);

  const { setSyncing, setSyncError } = useUIStore();

  const onHandleDelete = useCallback(async (id: string) => {
    haptic('heavy');
    try {
        setSyncing(true);
        await deleteClient(id);
        showToast('Cliente eliminado', 'success');
    } catch(e: any) { 
        setSyncError(e.message || 'Error al eliminar'); 
    } finally {
        setSyncing(false);
    }
  }, [deleteClient, haptic, showToast, setSyncing, setSyncError]);

  const onHandleSubmit = useCallback(async (data: Client) => {
    try {
        setSyncing(true);
        setSyncError(null);
        if (editingClient) {
            await updateClient(data);
            showToast('Cliente actualizado', 'success');
        } else {
            await addClient(data);
            haptic('success');
            showToast('Cliente registrado', 'success');
        }
        setIsModalOpen(false);
    } catch (e: any) { 
        setSyncError(e.message || 'Error al procesar registro'); 
    } finally {
        setSyncing(false);
    }
  }, [editingClient, updateClient, addClient, haptic, showToast, setSyncing, setSyncError]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await loadXlsx();
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        let count = 0;
        data.forEach((row: any) => {
           const safeRow: any = {};
           Object.keys(row).forEach(k => safeRow[k.trim().toLowerCase()] = row[k]);
           if (safeRow.nombre && (safeRow.whatsapp || safeRow.telefono)) {
              addClient({
                 id: generateUUID(),
                 name: `${safeRow.nombre || ""}`.trim(),
                 phone: `${safeRow.whatsapp || safeRow.telefono || ""}`.trim(),
                 telegram: safeRow.telegram ? `${safeRow.telegram}` : '',
                 registrationDate: new Date().toISOString().split('T')[0],
                 activeServices: 0,
                 notes: safeRow.notes || '',
                 tags: ['Nuevo']
              });
              count++;
           }
        });
        if (count > 0) showToast(`Importados ${count} contactos`, 'success');
        else showToast('No se encontraron contactos válidos', 'error');
      } catch (error) { showToast("Error al procesar archivo", "error"); }
    };
    reader.readAsBinaryString(file);
    setIsImportOpen(false);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (selectedClient) setBackAction(() => setSelectedClient(null));
    else setBackAction(null);
    return () => setBackAction(null);
  }, [selectedClient, setBackAction]);

  const filteredList = useMemo(() => {
    return clients.filter(c => activeTab === 'active' ? c.activeServices > 0 : c.activeServices === 0);
  }, [clients, activeTab]);

  const stats = useMemo(() => {
      const active = clients.filter(c => c.activeServices > 0).length;
      return { active, inactive: clients.length - active };
  }, [clients]);

  return (
    <div className="min-h-screen pb-32 pt-2 font-sans text-text-primary relative">
       <div className="relative z-20 pt-safe mt-4">
             <div className="flex justify-between items-center mb-6">
                 <div className="flex flex-col">
                    <h1 className="text-xl font-black text-text-primary tracking-tighter leading-none mb-1">Clientes</h1>
                    <div className="flex items-center gap-2">
                       <div className="w-1 h-1 bg-brand-primary rounded-full animate-pulse" />
                       <p className="text-text-disabled text-[8px] font-black uppercase tracking-[0.2em]">Gestión de Cartera</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                     <button onClick={handleSync} disabled={isSyncing} className="w-9 h-9 rounded-sm bg-[rgb(var(--fg-rgb))]/[0.03] border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-muted hover:text-text-primary transition-all active:scale-95 shadow-inner">
                        <RefreshCw size={16} className={isSyncing ? 'animate-spin text-brand-primary' : ''} />
                     </button>
                     <button onClick={() => setIsImportOpen(true)} className="w-9 h-9 rounded-sm bg-[rgb(var(--fg-rgb))]/[0.03] border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-muted hover:text-text-primary transition-all active:scale-95 shadow-inner">
                        <Upload size={16} />
                     </button>
                     <button onClick={() => { setEditingClient(null); setIsModalOpen(true); }} className={`w-9 h-9 rounded-sm bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white shadow-glow-md active:scale-95 transition-all ${isHighlighted ? 'ring-2 ring-white' : ''}`}>
                        <Plus size={20} strokeWidth={3} />
                     </button>
                 </div>
             </div>
             <div className="bg-surface-1/50 backdrop-blur-md p-1 rounded-lg flex border border-[rgb(var(--fg-rgb))]/[0.08] relative shadow-2xl mb-5">
                 <button onClick={() => onHandleTabChange('active')} className={`flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'active' ? 'bg-surface-3 text-text-primary shadow-xl border border-[rgb(var(--fg-rgb))]/5' : 'text-text-disabled hover:text-text-secondary'}`}>
                    <UserCheck size={14} className={activeTab === 'active' ? 'text-status-success-soft' : ''} />
                    Activos <span className="bg-[rgb(var(--fg-rgb))]/10 px-1.5 py-0.5 rounded-full text-[8px] ml-0.5">{stats.active}</span>
                 </button>
                 <button onClick={() => onHandleTabChange('inactive')} className={`flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ${activeTab === 'inactive' ? 'bg-surface-3 text-text-primary shadow-xl border border-[rgb(var(--fg-rgb))]/5' : 'text-text-disabled hover:text-text-secondary'}`}>
                    <UserX size={14} />
                    Inactivos <span className="bg-[rgb(var(--fg-rgb))]/10 px-1.5 py-0.5 rounded-full text-[8px] ml-0.5">{stats.inactive}</span>
                 </button>
             </div>
             <div className="relative mb-6 group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled group-focus-within:text-brand-primary transition-colors" />
                <input 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  placeholder="Buscar por nombre o celular..." 
                  className="relative w-full h-[46px] bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-lg pl-11 pr-5 text-[13px] text-text-primary outline-none focus:border-brand-primary/40 shadow-inner placeholder:text-text-faint transition-all font-medium" 
                />
             </div>
       </div>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-10 h-full pb-24">
          <AnimatePresence mode='popLayout'>
             {filteredList.map((client, index) => {
                const isActive = client.activeServices > 0;
                const displayTags = getClientTags(client, client.activeServices);
                 return (
                    <motion.div 
                       key={client.id} 
                       layout
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ 
                         opacity: 1, 
                         y: 0,
                         transition: { delay: index * 0.05, duration: 0.4, ease: "easeOut" } 
                       }}
                       exit={{ opacity: 0, scale: 0.95 }}
                       className="group"
                    >
                       <div 
                         onClick={() => onHandleCardClick(client)} 
                         className={`
                           relative flex items-center p-4 rounded-lg border cursor-pointer active:scale-[0.98] transition-all duration-300 
                           ${isActive 
                             ? 'bg-surface-1 border-[rgb(var(--fg-rgb))]/10 shadow-glow-sm hover:border-brand-primary/40' 
                             : 'bg-surface-sunken/60 border-[rgb(var(--fg-rgb))]/[0.05] hover:border-[rgb(var(--fg-rgb))]/15'
                           }
                         `}
                       >
                          {isActive && (
                          )}
                          
                          <div className="flex items-center gap-4 w-full relative z-10">
                              <div className="relative">
                                 <Avatar name={client.name} size={46} className="rounded-md shadow-2xl border border-[rgb(var(--fg-rgb))]/10" />
                                 {isActive && (
                                   <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-brand-primary rounded-full border-2 border-surface-1 flex items-center justify-center">
                                      <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                                   </span>
                                 )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-1.5">
                                      <div className="flex flex-col gap-0.5">
                                          <h3 className="text-[14px] font-black tracking-tight truncate pr-2 text-text-primary group-hover:text-brand-primary transition-colors">{client.name}</h3>
                                          <div className="flex flex-wrap gap-1">
                                              {displayTags.map(tag => (
                                                <span key={tag} className="text-[7px] bg-[rgb(var(--fg-rgb))]/[0.08] text-text-muted px-1.5 py-0.5 rounded-full uppercase font-black tracking-widest border border-[rgb(var(--fg-rgb))]/[0.03]">
                                                  {tag}
                                                </span>
                                              ))}
                                          </div>
                                      </div>
                                      
                                      {isActive && (
                                        <div className="flex flex-col items-end">
                                          <span className="flex items-center gap-1 text-[9px] font-black text-white bg-brand-primary px-2 py-0.5 rounded-full shadow-glow-sm">
                                            <Layers size={9} strokeWidth={3} /> {client.activeServices}
                                          </span>
                                        </div>
                                      )}
                                  </div>
                                  
                                  <div className="flex items-center gap-3">
                                      <p className="text-[10px] text-text-disabled font-mono font-bold flex items-center gap-1 leading-none">
                                        <Phone size={10} className="text-text-faint" /> 
                                        {client.phone}
                                      </p>
                                      {client.isBlocked && (
                                        <span className="text-[8px] font-black text-brand-accent bg-brand-accent/10 px-1.5 py-0.5 rounded-full border border-brand-accent/20 flex items-center gap-1 uppercase tracking-widest leading-none">
                                          <Ban size={8} /> Bloqueado
                                        </span>
                                      )}
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-1.5 ml-1">
                                  <button 
                                    onClick={(e) => onHandleHistoryClick(e, client)}
                                    className="w-8 h-8 rounded-sm bg-[rgb(var(--fg-rgb))]/[0.03] border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-disabled hover:text-brand-primary hover:bg-[rgb(var(--fg-rgb))]/10 transition-all active:scale-90"
                                    title="Historial de compras"
                                  >
                                    <HistoryIcon size={16} />
                                  </button>
                                  <div className="text-text-faint group-hover:text-text-muted transition-colors"><ChevronRight size={18} /></div>
                              </div>
                          </div>
                       </div>
                    </motion.div>
                 );
             })}
          </AnimatePresence>
       </div>

       <ImportGuideModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onConfirm={() => fileInputRef.current?.click()} type="clients" title="Importar Contactos" />
       <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".xlsx,.xls,.csv" />
       <ScrollFloatingActions onAdd={() => { setEditingClient(null); setIsModalOpen(true); }} onBack={selectedClient ? () => setSelectedClient(null) : onBack} />
       <ContactoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={onHandleSubmit} initialData={editingClient} />
       <ContactoBottomSheet client={selectedClient} onClose={() => setSelectedClient(null)} onEdit={onHandleEdit} onDelete={onHandleDelete} initialTab={initialSheetTab} />
    </div>
  );
};

export default ClientsMobile;
