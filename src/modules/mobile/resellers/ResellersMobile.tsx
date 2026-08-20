
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { Reseller, Client, Sale } from '../../../types';
import ResellerModal from '../../../components/revendedores/ResellerModal';
import ResellerDetailSheet from '../../../components/revendedores/ResellerDetailSheet';
import ResellerCard from '../../../components/revendedores/ResellerCard';
import SaleDetailPage from '../../../components/sales/SaleDetailPage'; 
import SaleModal from '../../../components/sales/SaleModal'; 
import ImportGuideModal from '../../../components/ui/ImportGuideModal';
import Modal from '../../../components/ui/Modal';
import ScrollFloatingActions from '../../../components/ui/ScrollFloatingActions';
import { 
  Plus, Search, Upload, X, Trash2, AlertTriangle, 
  ChevronRight, Users, ShoppingCart, 
  MessageCircle, Edit2, Send, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../../context/ToastContext';
import { loadXlsx } from '../../../utils/lazyXlsx';
import { generateUUID } from '../../../utils/uuid';
import { getRandomColor, getInitials } from '../../../utils/revendedoresUtils';
import { sendWhatsAppMessage } from '../../../utils/contactosUtils';
import { SalesGroup } from '../../../utils/salesUtils';
import { useHaptic } from '../../../hooks/useHaptic';
import { useUIStore } from '../../../store/uiStore';
import { isNativePlatform } from '../../../utils/platformUtils';

interface ResellersMobileProps {
  onBack?: () => void;
}

const ResellersMobile: React.FC<ResellersMobileProps> = ({ onBack }) => {
  const { resellers, clients, sales, addReseller, updateReseller, deleteReseller, deleteSale } = useData();
  const { showToast } = useToast();
  const haptic = useHaptic();
  const setBackAction = useUIStore(state => state.setBackAction);
  const isNative = isNativePlatform();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = React.useDeferredValue(searchQuery);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [selectedSaleGroup, setSelectedSaleGroup] = useState<SalesGroup | null>(null);
  const [isSaleDetailOpen, setIsSaleDetailOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  
  const [resellerToDelete, setResellerToDelete] = useState<Reseller | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (isSaleDetailOpen) setBackAction(() => setIsSaleDetailOpen(false));
      else if (isDetailOpen) setBackAction(() => setIsDetailOpen(false));
      else setBackAction(null);
      return () => setBackAction(null);
  }, [isSaleDetailOpen, isDetailOpen, setBackAction]);

  const getResellerStats = (resellerId: string) => {
    const resellerClients = clients.filter(c => c.resellerId === resellerId);
    const clientIds = resellerClients.map(c => c.id);
    const resellerSales = sales.filter(s => clientIds.includes(s.clientId));
    return {
      clients: resellerClients.length,
      salesCount: resellerSales.length,
      totalRevenue: resellerSales.reduce((acc, curr) => acc + curr.amount, 0)
    };
  };

  const filteredResellers = useMemo(() => {
    let list = resellers;
    if (deferredSearchQuery) {
        const q = deferredSearchQuery.toLowerCase();
        list = list.filter(r => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
    }
    return list.sort((a, b) => getResellerStats(b.id).totalRevenue - getResellerStats(a.id).totalRevenue);
  }, [resellers, deferredSearchQuery, clients, sales]);

  const globalStats = useMemo(() => {
      return resellers.reduce((acc, r) => {
          const stats = getResellerStats(r.id);
          acc.totalClients += stats.clients;
          return acc;
      }, { totalClients: 0 });
  }, [resellers, clients]);

  const handleAdd = () => { setEditingReseller(null); setIsModalOpen(true); };
  
  const handleEdit = (r: Reseller) => { 
      setEditingReseller(r); 
      setIsModalOpen(true); 
  };
  
  const handleCardClick = (r: Reseller) => { 
      setSelectedReseller(r); 
      setIsDetailOpen(true); 
  };

  const handleClientClick = (client: Client) => {
      const clientSales = sales.filter(s => s.clientId === client.id);
      const renewalGroups: { date: string; sales: Sale[] }[] = [];
      clientSales.forEach(sale => {
         let g = renewalGroups.find(r => r.date === sale.expiryDate);
         if (!g) { g = { date: sale.expiryDate, sales: [] }; renewalGroups.push(g); }
         g.sales.push(sale);
      });
      const group: SalesGroup = {
         clientId: client.id,
         clientName: client.name,
         clientPhone: client.phone || '',
         clientTelegram: client.telegram,
         reseller: selectedReseller || undefined,
         renewalGroups
      };
      setSelectedSaleGroup(group);
      setIsSaleDetailOpen(true);
  };

  const handleEditSale = (sale: Sale) => { setEditingSale(sale); setIsSaleModalOpen(true); };

  const handleSubmit = async (data: Reseller) => {
    try {
      if (editingReseller) { 
          await updateReseller(data); 
          if (selectedReseller?.id === data.id) setSelectedReseller(data); 
          showToast('Socio actualizado', 'success'); 
      } else { 
          await addReseller(data); 
          showToast('Socio registrado', 'success'); 
      }
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Error saving reseller:", error);
      showToast(error?.message || 'Error al guardar', 'error');
    }
  };

  const handleDeleteRequest = (r: Reseller) => { setResellerToDelete(r); setIsDeleteModalOpen(true); };

  const handleDeleteConfirm = (strategy: 'delete_clients' | 'unlink') => {
    if (resellerToDelete) {
        haptic('heavy'); 
        deleteReseller(resellerToDelete.id, strategy); 
        setResellerToDelete(null); 
        setIsDeleteModalOpen(false);
        // Fix: Use 'selectedReseller' instead of 'selectedProvider' to fix the compilation error
        if (selectedReseller?.id === resellerToDelete.id) { 
            setIsDetailOpen(false); 
            setSelectedReseller(null); 
        }
        showToast('Socio eliminado', 'success');
    }
  };

  const handleDeleteSale = (id: string) => { deleteSale(id); showToast('Venta eliminada', 'success'); };

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
          addReseller({
             id: generateUUID(),
             name: `${safeRow.nombre || ""}`.trim(),
             whatsapp: `${safeRow.whatsapp || safeRow.telefono || ""}`.trim(),
             code: safeRow.codigo ? `${safeRow.codigo}` : (`${safeRow.nombre || ""}`.substring(0, 2).toUpperCase() + '-'),
             color: getRandomColor(),
             registrationDate: new Date().toISOString().split('T')[0]
          });
          count++;
       }
    });
    if (count > 0) showToast(`Importados ${count} socios`, 'success'); 
    else showToast('Datos inválidos en archivo', 'error');
  };

  const listVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="min-h-screen pb-32 pt-2 px-4 font-sans text-zinc-100 relative">
       <div className="fixed top-0 left-0 w-full h-[400px] bg-gradient-to-b from-brand-accent/10 to-transparent pointer-events-none" />
       <div className={`relative z-10 pt-safe ${isNative ? 'mt-2' : 'mt-4'}`}>
          <div className="flex justify-between items-center mb-4">
              <div>
                  <h1 className="text-2xl font-black text-white tracking-tight">Socios</h1>
                  <p className="text-zinc-400 text-[10px] font-semibold uppercase tracking-[0.15em] mt-1">Gestión de revendedores</p>
              </div>
              <div className="flex gap-2">
                  <div className={`relative transition-all duration-300 ease-out ${isSearchOpen ? 'w-[160px]' : 'w-[44px]'}`}>
                      <div className={`flex items-center h-[44px] overflow-hidden ${isSearchOpen ? 'bg-surface-1 border border-white/10 rounded-md pr-2' : ''}`}>
                          <button onClick={() => setIsSearchOpen(true)} className={`w-[44px] h-[44px] flex items-center justify-center shrink-0 ${!isSearchOpen && 'bg-surface-1 border border-white/[0.08] rounded-md text-zinc-400 active:scale-95 transition-transform shadow-sm'}`}>
                              <Search size={18} />
                          </button>
                          <input 
                            autoFocus={isSearchOpen} 
                            placeholder="Buscar..." 
                            value={searchQuery} 
                            onChange={e => setSearchQuery(e.target.value)} 
                            className={`bg-transparent text-sm text-white outline-none w-full ml-1 font-medium ${isSearchOpen ? 'opacity-100' : 'opacity-0'}`} 
                          />
                          {isSearchOpen && <button onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}><X size={14} className="text-zinc-500" /></button>}
                      </div>
                  </div>
                  <button onClick={() => setIsImportModalOpen(true)} className="w-[44px] h-[44px] rounded-md bg-surface-1 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95 shadow-sm">
                      <Upload size={20} />
                  </button>
                  <button onClick={handleAdd} className="w-[44px] h-[44px] rounded-md bg-gradient-to-r from-brand-primary to-brand-accent flex items-center justify-center text-white shadow-glow active:scale-95 transition-all">
                      <Plus size={22} strokeWidth={2.5} />
                  </button>
              </div>
          </div>
       </div>

       <div className="mb-6 relative z-10">
          <div className="bg-surface-1 border border-white/[0.08] rounded-lg p-4 flex items-center justify-between relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/10 rounded-full blur-xl -mr-4 -mt-4 pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                      <Users size={20} />
                  </div>
                  <div>
                      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Red Total</p>
                      <p className="text-xs text-zinc-400">Clientes indirectos</p>
                  </div>
              </div>
              <p className="text-3xl font-bold text-white tracking-tight relative z-10">{globalStats.totalClients}</p>
          </div>
       </div>

       <motion.div variants={listVariants} initial="hidden" animate="visible" className="grid grid-cols-1 lg:grid-cols-2 gap-4 relative z-10 pb-20">
          <AnimatePresence mode='popLayout'>
             {filteredResellers.map(reseller => (
                <motion.div key={reseller.id} variants={itemVariants} layout >
                   <ResellerCard reseller={reseller} stats={getResellerStats(reseller.id)} onClick={handleCardClick} onEdit={handleEdit} onDelete={handleDeleteRequest} />
                </motion.div>
             ))}
          </AnimatePresence>
       </motion.div>

       <ScrollFloatingActions onAdd={handleAdd} onBack={isDetailOpen ? () => setIsDetailOpen(false) : onBack} />
       <ResellerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit} initialData={editingReseller} />
       <ResellerDetailSheet isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} reseller={selectedReseller} clients={clients} sales={sales} onEdit={handleEdit} onDelete={handleDeleteRequest} onClientClick={handleClientClick} />
       <SaleDetailPage isOpen={isSaleDetailOpen} onClose={() => setIsSaleDetailOpen(false)} group={selectedSaleGroup} onEdit={handleEditSale} onDelete={handleDeleteSale} />
       <SaleModal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} initialData={editingSale} zIndex={isSaleDetailOpen ? 20000 : 9999} />
       <ImportGuideModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onConfirm={() => fileInputRef.current?.click()} columns={['nombre', 'whatsapp', 'codigo', 'telegram']} title="Importar Socios" type="resellers" />
       <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv, .xlsx, .xls" />

       <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Eliminar Socio">
          <div className="space-y-4 pt-2">
             <div className="bg-status-danger/10 border border-status-danger/20 p-4 rounded-xl flex gap-4 items-start">
                 <AlertTriangle size={24} className="text-status-danger shrink-0" />
                 <div>
                     <h4 className="text-white font-bold text-sm">Atención</h4>
                     <p className="text-zinc-400 text-xs mt-1 leading-relaxed">El socio <strong>{resellerToDelete?.name}</strong> tiene clientes asociados.</p>
                 </div>
             </div>
             <div className="flex flex-col gap-3">
                <button onClick={() => handleDeleteConfirm('unlink')} className="w-full p-4 rounded-lg bg-surface-1 border border-white/10 hover:bg-white/5 text-left flex justify-between items-center transition-colors">
                   <div><span className="block text-white font-bold text-sm">Desvincular Clientes</span><span className="block text-zinc-500 text-[10px]">Los clientes pasarán a ser directos.</span></div>
                   <ChevronRight size={16} className="text-zinc-600" />
                </button>
                <button onClick={() => handleDeleteConfirm('delete_clients')} className="w-full p-4 rounded-lg bg-status-danger/5 border border-status-danger/20 flex items-center justify-between hover:bg-status-danger/10 transition-colors">
                   <div><span className="block text-status-danger-soft font-bold text-sm">Eliminar Todo</span><span className="block text-status-danger-soft/60 text-[10px]">Se eliminará el revendedor y sus clientes.</span></div>
                   <Trash2 size={16} className="text-status-danger-soft/60" />
                </button>
             </div>
             <button onClick={() => setIsDeleteModalOpen(false)} className="w-full py-3 text-zinc-500 text-xs font-semibold mt-2 hover:text-white transition-colors">Cancelar Operación</button>
          </div>
       </Modal>
    </div>
  );
};

export default ResellersMobile;
