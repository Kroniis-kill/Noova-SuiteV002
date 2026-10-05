import EmptyState from '../../../components/ui/EmptyState';
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
import { Search, Plus, Upload, RefreshCw, Layers, Ban, Crown, Star, Sparkles, AlertTriangle, Users, SearchX, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollFloatingActions from '../../../components/ui/ScrollFloatingActions';
import ContactoModal from '../../../components/contactos/ContactoModal';
import ContactoBottomSheet from '../../../components/contactos/ContactoBottomSheet';
import Avatar from '../../../components/ui/Avatar';
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
       <div className="relative z-20 pt-safe mt-4 px-4">
             <div className="flex justify-between items-center mb-4">
                 <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-text-primary tracking-tight leading-none mb-1">Clientes</h1>
                    <p className="text-text-muted text-micro font-bold uppercase tracking-[0.15em]">{clients.length} en cartera</p>
                 </div>
                 <div className="flex gap-2">
                     <button onClick={handleSync} disabled={isSyncing} className="w-10 h-10 rounded-md bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-muted hover:text-text-primary transition-all active:scale-95">
                        <RefreshCw size={16} className={isSyncing ? 'animate-spin text-brand-primary' : ''} />
                     </button>
                     <button onClick={() => setIsImportOpen(true)} className="w-10 h-10 rounded-md bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-muted hover:text-text-primary transition-all active:scale-95">
                        <Upload size={16} />
                     </button>
                     <button onClick={() => { setEditingClient(null); setIsModalOpen(true); }} className={`w-10 h-10 rounded-md bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white shadow-glow-md active:scale-95 transition-all ${isHighlighted ? 'ring-2 ring-white' : ''}`}>
                        <Plus size={20} strokeWidth={3} />
                     </button>
                 </div>
             </div>

             <div className="flex items-center bg-surface-1 border border-border-subtle rounded-xl p-1 mb-3.5">
                <button
                  onClick={() => onHandleTabChange('active')}
                  className={`flex-1 flex items-center justify-center gap-2 h-[42px] rounded-sm transition-all ${activeTab === 'active' ? 'bg-status-success/10' : ''}`}
                >
                   <span className="w-[7px] h-[7px] rounded-full bg-status-success" />
                   <span className="text-body-sm font-bold text-status-success-soft">{stats.active}</span>
                   <span className="text-caption font-semibold text-text-muted">Activos</span>
                </button>
                <div className="w-px h-[22px] bg-border-subtle" />
                <button
                  onClick={() => onHandleTabChange('inactive')}
                  className={`flex-1 flex items-center justify-center gap-2 h-[42px] rounded-sm transition-all ${activeTab === 'inactive' ? 'bg-[rgb(var(--fg-rgb))]/[0.05]' : ''}`}
                >
                   <span className="w-[7px] h-[7px] rounded-full bg-text-faint" />
                   <span className="text-body-sm font-bold text-text-secondary">{stats.inactive}</span>
                   <span className="text-caption font-semibold text-text-muted">Inactivos</span>
                </button>
             </div>

             <div className="relative mb-4 group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-disabled group-focus-within:text-brand-primary transition-colors" />
                <input 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  placeholder="Buscar por nombre o celular..." 
                  className="relative w-full h-11 bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 rounded-md pl-11 pr-5 text-label text-text-primary outline-none focus:border-brand-primary/40 placeholder:text-text-faint transition-all font-medium" 
                />
             </div>
       </div>
       <div className="grid grid-cols-3 gap-2.5 relative z-10 pb-24 px-4">
          {filteredList.length === 0 && (
            <div className="col-span-3">
              {clients.length === 0 ? (
                <EmptyState compact icon={Users} title="Aún no tienes clientes" description="Registra tu primer cliente o importa tu lista desde Excel." actionLabel="Nuevo cliente" onAction={() => { setEditingClient(null); setIsModalOpen(true); }} />
              ) : (
                <EmptyState compact icon={SearchX} title="Sin resultados" description={`No encontramos coincidencias para “${searchQuery}”.`} actionLabel="Limpiar búsqueda" onAction={() => setSearchQuery('')} actionIcon={<X size={16} aria-hidden="true" />} />
              )}
            </div>
          )}
          <AnimatePresence mode='popLayout'>
             {filteredList.map((client, index) => {
                const isActive = client.activeServices > 0;
                const displayTags = getClientTags(client, client.activeServices);
                const primaryTag = displayTags[0];
                const initials = client.name.trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
                const tagBadge: Record<string, { icon: React.ElementType; className: string }> = {
                   'VIP': { icon: Crown, className: 'bg-status-warning' },
                   'Frecuente': { icon: Star, className: 'bg-brand-primary' },
                   'Nuevo': { icon: Sparkles, className: 'bg-status-success' },
                   'Problemático': { icon: AlertTriangle, className: 'bg-status-danger' },
                };
                const badge = client.isBlocked ? null : (primaryTag ? tagBadge[primaryTag] : undefined);

                return (
                   <motion.button
                      key={client.id}
                      layout
                      type="button"
                      onClick={() => onHandleCardClick(client)}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { delay: Math.min(index, 12) * 0.03, duration: 0.3, ease: "easeOut" }
                      }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`flex flex-col items-center rounded-xl bg-surface-1 border border-border-subtle p-3 pt-3.5 text-center active:scale-[0.96] transition-all duration-150 ease-out-soft outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/60 ${isActive ? '' : 'opacity-60'}`}
                   >
                      <div className="relative w-14 h-14">
                         <Avatar name={client.name} size={56} className="rounded-full shadow-md border border-[rgb(var(--fg-rgb))]/10" />
                         {badge && (
                            <span className={`absolute -right-1 -bottom-1 w-7 h-7 rounded-full border-[2.5px] border-surface-1 flex items-center justify-center shadow-md ${badge.className}`}>
                               <badge.icon size={14} strokeWidth={2.5} className="text-white" aria-hidden="true" />
                            </span>
                         )}
                      </div>

                      <h3 className="text-label font-bold text-text-primary truncate w-full mt-2.5 leading-tight">
                         {client.name}
                      </h3>

                      <div className="flex items-center gap-1 mt-0.5 text-tiny font-semibold text-text-disabled">
                         {client.isBlocked ? (
                           <><Ban size={11} className="text-status-danger-soft" aria-hidden="true" /><span className="text-status-danger-soft">Bloqueado</span></>
                         ) : (
                           <><Layers size={11} aria-hidden="true" /><span>{client.activeServices} {client.activeServices === 1 ? 'servicio' : 'servicios'}</span></>
                         )}
                      </div>
                   </motion.button>
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
