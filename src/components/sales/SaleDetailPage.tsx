
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SalesGroup, getCombinedWhatsAppTemplate } from '../../utils/salesUtils';
import { Sale } from '../../types';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useHaptic } from '../../hooks/useHaptic';
import { 
  MessageCircle, Copy, Monitor, RefreshCw, Edit2, Key, Mail, Trash2, 
  ShieldCheck, X, Database, FileImage, AlertTriangle, 
  ChevronDown, Shield, Snowflake, BellRing, Briefcase, DollarSign,
  Check, TrendingUp, History as HistoryIcon
} from 'lucide-react';
import RenewModal from './RenewModal';
import WhatsAppMenu from './WhatsAppMenu';
import WarrantyModal from './WarrantyModal';
import ReceiptModal from './ReceiptModal'; 
import { formatDate, sendWhatsAppMessage, parseLocalISO, getLocalDateISO } from '../../utils/contactosUtils';
import Modal from '../ui/Modal'; 
import { getDaysRemaining, getDaysInFailure, calculateProfit } from '../../utils/expiredUtils';
import { generateUUID } from '../../utils/uuid';
import Avatar from '../ui/Avatar';
import Header from '../ui/Header';
import ContactoBottomSheet from '../contactos/ContactoBottomSheet';
import { useContactos } from '../../hooks/useContactos';

interface SaleDetailPageProps {
  isOpen: boolean;
  group: SalesGroup | null;
  onClose: () => void;
  onEdit: (sale: Sale) => void;
  onDelete: (id: string) => void;
}

const SaleDetailPage: React.FC<SaleDetailPageProps> = ({ isOpen, group, onClose, onEdit, onDelete }) => {
  const { accounts = [], sales: globalSales = [], settings, services, addFailure } = useData();
  const { deleteClient: removeClient } = useContactos();
  const { showToast } = useToast();
  const haptic = useHaptic();
  
  const [renewSales, setRenewSales] = useState<Sale[]>([]);
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [salesForMessage, setSalesForMessage] = useState<Sale[]>([]); 
  const [isWAOpen, setIsWAOpen] = useState(false);
  const [warrantySale, setWarrantySale] = useState<Sale | null>(null);
  const [isWarrantyOpen, setIsWarrantyOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [salesForReceipt, setSalesForReceipt] = useState<Sale[]>([]);

  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [isFailReportModalOpen, setIsFailReportModalOpen] = useState(false);
  const [salesInCurrentReportingGroup, setSalesInCurrentReportingGroup] = useState<Sale[]>([]);
  const [failingSale, setFailingSale] = useState<Sale | null>(null);
  const [failNote, setFailNote] = useState('');

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [saleToDeleteId, setSaleToDeleteId] = useState<string | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const { clients: allClients, updateClient } = useData();

  const selectedClient = useMemo(() => {
    if (!group) return null;
    return allClients.find(c => c.id === group.clientId);
  }, [allClients, group]);

  const MODAL_Z_INDEX = 20000;

  const allGroupSales = useMemo(() => {
    if (!group || !Array.isArray(globalSales)) return [];
    return globalSales.filter(s => s && s.clientId === group.clientId);
  }, [globalSales, group]);

  const salesByDate = useMemo(() => {
    const grouped: Record<string, Sale[]> = {};
    allGroupSales.forEach(sale => {
      const dateKey = sale.expiryDate ? sale.expiryDate : 'Sin Fecha'; 
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(sale);
    });
    return grouped;
  }, [allGroupSales]);

  const sortedDates = useMemo(() => {
      return Object.keys(salesByDate).sort((a, b) => {
          if (a === 'Sin Fecha') return 1; 
          const dateA = new Date(a).getTime();
          const dateB = new Date(b).getTime();
          return (isNaN(dateA) ? 0 : dateA) - (isNaN(dateB) ? 0 : dateB);
      });
  }, [salesByDate]);

  const totalAmount = useMemo(() => {
      return allGroupSales.reduce((acc, s) => acc + s.amount, 0);
  }, [allGroupSales]);

  const handleCopy = useCallback((text: string, label: string) => {
    if(!text) return;
    haptic('nav');
    navigator.clipboard.writeText(text);
    showToast(`${label} copiado`, 'success');
  }, [showToast, haptic]);

  const handleGroupRenew = (sales: Sale[]) => { haptic('nav'); setRenewSales(sales); setIsRenewOpen(true); };
  
  const handleGroupMessage = (sales: Sale[]) => {
      haptic('nav');
      setSalesForMessage(sales);
      setIsWAOpen(true);
  };
  const handleSendAccessData = (sales: Sale[]) => {
    haptic('nav');
    if (!group) return;
    const message = getCombinedWhatsAppTemplate('data', sales, group.clientName, accounts, settings, 'whatsapp', false);
    sendWhatsAppMessage(group.clientPhone, message);
  };
  const handleReceiptClick = (sales: Sale[]) => { haptic('nav'); setSalesForReceipt(sales); setIsReceiptOpen(true); };
  const handleIndividualRenew = (sale: Sale) => { haptic('nav'); setRenewSales([sale]); setIsRenewOpen(true); };
  const handleIndividualMessage = (sale: Sale) => { haptic('nav'); setSalesForMessage([sale]); setIsWAOpen(true); };
  const handleWarrantyClick = (sale: Sale) => { haptic('nav'); setWarrantySale(sale); setIsWarrantyOpen(true); };

  const handleSmartReminderClick = () => {
    haptic('nav');
    setShowCurrencyModal(true);
  };

  const handleConfirmSmartReminder = (useSecondary: boolean) => {
    const threshold = settings.salesPreferences?.warningDays || 2;
    const urgentSales = allGroupSales.filter(s => {
        const refAccount = accounts.find(a => a.id === s.accountId);
        const days = getDaysRemaining(s.expiryDate, refAccount);
        return days <= threshold;
    });

    if (urgentSales.length === 0) {
        showToast('No hay servicios próximos a vencer', 'info');
        setShowCurrencyModal(false);
        return;
    }

    let type: 'expiration' | 'warning1Day' | 'warning2Days' = 'warning2Days';
    const worstDays = Math.min(...urgentSales.map(s => {
        const refAccount = accounts.find(a => a.id === s.accountId);
        return getDaysRemaining(s.expiryDate, refAccount);
    }));

    if (worstDays <= 0) type = 'expiration';
    else if (worstDays === 1) type = 'warning1Day';
    else type = 'warning2Days';

    const message = getCombinedWhatsAppTemplate(type, urgentSales, group!.clientName, accounts, settings, 'whatsapp', useSecondary);
    sendWhatsAppMessage(group!.clientPhone, message);
    setShowCurrencyModal(false);
  };

  const handleReportFailClick = (salesInDateGroup: Sale[]) => {
      haptic('nav');
      setFailNote('');
      setSalesInCurrentReportingGroup(salesInDateGroup);
      if (salesInDateGroup.length === 1) setFailingSale(salesInDateGroup[0]);
      else setFailingSale(null);
      setIsFailReportModalOpen(true);
  };

  const submitFailReport = async () => {
      if (!failingSale || !failNote.trim()) return;
      await addFailure({ id: generateUUID(), userId: '', saleId: failingSale.id, notes: failNote.trim(), createdAt: new Date().toISOString() });
      showToast('Falla reportada', 'success');
      setIsFailReportModalOpen(false);
  };

  const handleDeleteRequest = (id: string) => {
    haptic('heavy');
    setSaleToDeleteId(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (saleToDeleteId) {
      onDelete(saleToDeleteId);
      setIsDeleteConfirmOpen(false);
      setSaleToDeleteId(null);
    }
  };

  if (!isOpen || !group) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="fixed inset-0 lg:left-[226px] z-[150] bg-bg flex flex-col overflow-hidden text-text-primary"
        >
          {/* HEADER UNIFICADO */}
          <Header 
            openMobile={() => {}} 
            title="Detalles de Venta" 
            showBack={true} 
            onBack={onClose} 
          />

          <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
              {/* PERFIL DEL CLIENTE */}
              <div className="px-6 pt-6 lg:px-10 pb-2">
                  <div className="flex items-center gap-5 mb-8 relative">
                      <div className="w-20 h-20 rounded-full p-[1.5px] bg-gradient-to-tr from-brand-primary to-brand-accent shadow-glow shrink-0 relative z-10">
                          <Avatar name={group.clientName} size="100%" className="rounded-full border-4 border-bg" />
                      </div>
                      <div className="min-w-0 flex-1 relative z-10">
                          <div className="flex items-center gap-3">
                              <h2 className="text-2xl lg:text-3xl font-black text-text-primary truncate leading-tight tracking-tight">{group.clientName}</h2>
                              <button 
                                onClick={handleSmartReminderClick}
                                className="w-9 h-9 rounded-full bg-brand-whatsapp flex items-center justify-center text-black shadow-[0_0_15px_rgba(37,211,102,0.4)] active:scale-90 transition-all shrink-0"
                                title="Enviar recordatorio de vencimiento"
                              >
                                  <BellRing size={16} fill="currentColor" />
                              </button>
                               <button 
                                 onClick={() => { haptic('nav'); setIsClientModalOpen(true); }}
                                 className="w-9 h-9 rounded-full bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90 transition-all shrink-0 shadow-sm"
                                 title="Ver Historial de Cliente"
                               >
                                   <HistoryIcon size={16} />
                               </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <p className="text-sm text-text-disabled font-mono tracking-widest">{group.clientPhone}</p>
                            {group.reseller && (
                                <span className="bg-status-warning/10 text-status-warning text-[9px] font-black px-2 py-0.5 rounded border border-status-warning/20 flex items-center gap-1 uppercase">
                                    <Briefcase size={8} /> {group.reseller.name}
                                </span>
                            )}
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-surface-1 rounded-xl p-5 border border-[rgb(var(--fg-rgb))]/5 flex flex-col items-center shadow-sm">
                          <span className="text-[10px] font-bold text-text-faint uppercase tracking-[0.2em] mb-1">Activos</span>
                          <span className="text-2xl font-black text-text-primary">{allGroupSales.length}</span>
                      </div>
                      <div className="bg-surface-1 rounded-xl p-5 border border-[rgb(var(--fg-rgb))]/5 flex flex-col items-center shadow-sm">
                          <span className="text-[10px] font-bold text-text-faint uppercase tracking-[0.2em] mb-1">Inversión</span>
                          <span className="text-2xl font-black text-status-success-soft">{settings.currency}{totalAmount.toLocaleString()}</span>
                      </div>
                  </div>
              </div>

              <div className="px-4 lg:px-10 pt-10 pb-44 space-y-8">
                  {sortedDates.map((dateKey) => {
                      const salesInGroup = salesByDate[dateKey];
                      const isGroupFrozen = salesInGroup.some(s => accounts.find(a => a.id === s.accountId)?.status === 'fallando');
                      const refAccount = accounts.find(a => a.id === salesInGroup[0].accountId);
                      const days = getDaysRemaining(dateKey, refAccount);
                      const isExpired = days < 0;

                      return (
                          <div key={dateKey} className="space-y-3">
                              <div className="flex items-center justify-between gap-3 px-1">
                                  <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-bold text-text-disabled uppercase tracking-widest">{formatDate(dateKey)}</span>
                                          {isGroupFrozen && (
                                              <span className="bg-status-info/10 text-status-info-soft text-[8px] font-black px-1.5 py-0.5 rounded border border-status-info/20 flex items-center gap-1">
                                                  <Snowflake size={8} /> CONGELADO
                                              </span>
                                          )}
                                      </div>
                                      <span className={`text-[9px] font-bold ${isGroupFrozen ? 'text-status-info-soft' : isExpired ? 'text-status-danger' : 'text-text-faint'}`}>
                                          {isGroupFrozen ? 'TIEMPO EN PAUSA' : isExpired ? `VENCIDO HACE ${Math.abs(days)}D` : `VENCE EN ${days} DÍAS`}
                                      </span>
                                  </div>
                                  <div className="h-px bg-[rgb(var(--fg-rgb))]/5 flex-1 mx-2" />
                                  <div className="flex items-center gap-2">
                                      {salesInGroup.length > 1 && (
                                          <button onClick={() => handleGroupMessage(salesInGroup)} className="w-8 h-8 rounded-lg bg-status-success/10 text-status-success flex items-center justify-center border border-status-success/20 active:scale-90 transition-all hover:bg-status-success/20" title="Enviar Mensaje Consolidado"><MessageCircle size={16} /></button>
                                      )}
                                      <button onClick={() => handleGroupRenew(salesInGroup)} className="w-8 h-8 rounded-lg bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-brand-primary border border-[rgb(var(--fg-rgb))]/5 active:scale-90 transition-all hover:bg-[rgb(var(--fg-rgb))]/10" title="Renovar Grupo"><RefreshCw size={16} /></button>
                                      {salesInGroup.length > 1 && (
                                        <button onClick={() => handleSendAccessData(salesInGroup)} className="w-8 h-8 rounded-lg bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-status-info-soft border border-[rgb(var(--fg-rgb))]/5 active:scale-90 transition-all hover:bg-[rgb(var(--fg-rgb))]/10" title="Enviar Datos de Acceso"><Key size={16} /></button>
                                      )}
                                      <button onClick={() => handleReceiptClick(salesInGroup)} className="w-8 h-8 rounded-lg bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-muted border border-[rgb(var(--fg-rgb))]/5 active:scale-90 transition-all hover:bg-[rgb(var(--fg-rgb))]/10" title="Ver Comprobante"><FileImage size={16} /></button>
                                      <button onClick={() => handleReportFailClick(salesInGroup)} className="w-8 h-8 rounded-lg bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-status-warning border border-[rgb(var(--fg-rgb))]/5 active:scale-90 transition-all hover:bg-[rgb(var(--fg-rgb))]/10" title="Reportar Falla"><AlertTriangle size={16} /></button>
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 rounded-md">
                                  {salesInGroup.map((sale) => {
                                      const isExpanded = expandedSaleId === sale.id;
                                      const account = accounts.find(a => a.id === sale.accountId);
                                      const serviceObj = services.find(s => s.id === account?.serviceId);
                                      const isFailing = account?.status === 'fallando';
                                      const isUnique = sale.saleType === 'usuario_unico';
                                      const isFull = sale.saleType === 'cuenta_completa';
                                      const isScreen = !isUnique && !isFull;
                                      const profit = calculateProfit(sale, serviceObj);

                                      return (
                                          <div key={sale.id} className={`bg-surface-1 border transition-all duration-300 rounded-md overflow-hidden h-fit ${isFailing ? 'border-status-info/40 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'border-[rgb(var(--fg-rgb))]/[0.08]'}`}>
                                              <div onClick={() => { haptic('nav'); setExpandedSaleId(isExpanded ? null : sale.id); }} className="p-4 flex items-center justify-between cursor-pointer active:bg-[rgb(var(--fg-rgb))]/5">
                                                  <div className="flex items-center gap-3">
                                                      <div className="w-10 h-10 rounded-md bg-bg flex items-center justify-center shrink-0 overflow-hidden border border-[rgb(var(--fg-rgb))]/5">
                                                          {serviceObj?.image_url ? <img src={serviceObj.image_url} className="w-full h-full object-cover" /> : <Monitor size={18} className="text-text-faint" />}
                                                      </div>
                                                      <div className="min-w-0">
                                                          <h4 className="text-[13px] font-bold text-text-primary truncate">{sale.serviceName}</h4>
                                                          <div className="flex items-center gap-1.5">
                                                            <p className="text-[9px] font-bold text-text-faint uppercase tracking-tighter">{isUnique ? 'USUARIO ÚNICO' : isFull ? 'CUENTA COMPLETA' : 'PANTALLA ASIGNADA'}</p>
                                                            {isFailing && <span className="text-[8px] font-black text-status-info-soft bg-status-info/10 px-1 rounded flex items-center gap-1">PAUSADO ({getDaysInFailure(account?.failure_started_at)} DÍAS)</span>}
                                                          </div>
                                                      </div>
                                                  </div>
                                                  <div className="flex items-center gap-3">
                                                      {!isExpanded && (
                                                          <div className="flex flex-col items-end">
                                                              <span className="text-xs font-semibold text-text-primary">{settings.currency}{sale.amount}</span>
                                                              <span className="text-[8px] font-bold text-status-success/60 uppercase">+{settings.currency}{profit}</span>
                                                          </div>
                                                      )}
                                                      <ChevronDown size={18} className={`text-text-faint transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                  </div>
                                              </div>

                                              <AnimatePresence>
                                                  {isExpanded && (
                                                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                                          <div className="px-4 pb-5 space-y-4">
                                                              <div className={`bg-bg rounded-md p-4 border border-[rgb(var(--fg-rgb))]/5 space-y-3 relative overflow-hidden ${isFailing && 'grayscale-[0.5]'}`}>
                                                                  <div className="space-y-2.5 relative z-10">
                                                                      {(isScreen || isFull) && (
                                                                        <>
                                                                          <div className="flex justify-between items-center group cursor-pointer rounded-md" onClick={() => handleCopy(account?.email || '', 'Usuario')}>
                                                                              <div className="flex items-center gap-2.5 min-w-0">
                                                                                  <div className="w-7 h-7 rounded-md bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-disabled shrink-0"><Mail size={14} /></div>
                                                                                  <div className="flex flex-col min-w-0">
                                                                                      <span className="text-[8px] font-black text-text-faint uppercase">{isFull ? 'Usuario Dueño' : 'Cuenta Maestra'}</span>
                                                                                      <span className="text-[11px] font-semibold text-text-secondary truncate">{account?.email}</span>
                                                                                  </div>
                                                                              </div>
                                                                              <Copy size={12} className="text-text-faint group-hover:text-text-primary shrink-0" />
                                                                          </div>
                                                                          <div className="w-full h-px bg-[rgb(var(--fg-rgb))]/5" />
                                                                          <div className="flex justify-between items-center group cursor-pointer rounded-md" onClick={() => handleCopy(account?.password || '', 'Clave')}>
                                                                              <div className="flex items-center gap-2.5 min-w-0">
                                                                                  <div className="w-7 h-7 rounded-md bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-disabled shrink-0"><Key size={14} /></div>
                                                                                  <div className="flex flex-col min-w-0">
                                                                                      <span className="text-[8px] font-black text-text-faint uppercase">Contraseña</span>
                                                                                      <span className="text-[11px] font-mono font-bold text-text-secondary truncate">{account?.password}</span>
                                                                                  </div>
                                                                              </div>
                                                                              <Copy size={12} className="text-text-faint group-hover:text-text-primary shrink-0" />
                                                                          </div>
                                                                        </>
                                                                      )}
                                                                      {isUnique && (
                                                                        <>
                                                                           <div className="flex justify-between items-center group cursor-pointer rounded-md" onClick={() => handleCopy(sale.invitedEmail || '', 'Usuario Invitado')}>
                                                                              <div className="flex items-center gap-2.5 min-w-0">
                                                                                  <div className="w-7 h-7 rounded-md bg-status-info/10 flex items-center justify-center text-status-info-soft shrink-0"><Mail size={14} /></div>
                                                                                  <div className="flex flex-col min-w-0">
                                                                                      <span className="text-[8px] font-black text-status-info-soft uppercase">Acceso Cliente</span>
                                                                                      <span className="text-[11px] font-semibold text-text-secondary truncate">{sale.invitedEmail || '---'}</span>
                                                                                  </div>
                                                                              </div>
                                                                              <Copy size={12} className="text-text-faint group-hover:text-text-primary shrink-0" />
                                                                          </div>
                                                                          <div className="w-full h-px bg-[rgb(var(--fg-rgb))]/5" />
                                                                          <div className="flex justify-between items-center group cursor-pointer rounded-md" onClick={() => handleCopy(sale.invitedPassword || '', 'Clave Invitado')}>
                                                                              <div className="flex items-center gap-2.5 min-w-0">
                                                                                  <div className="w-7 h-7 rounded-md bg-status-info/10 flex items-center justify-center text-status-info-soft shrink-0"><Key size={14} /></div>
                                                                                  <div className="flex flex-col min-w-0">
                                                                                      <span className="text-[8px] font-black text-status-info-soft uppercase">Clave Personal</span>
                                                                                      <span className="text-[11px] font-mono font-bold text-text-secondary truncate">{sale.invitedPassword || '---'}</span>
                                                                                  </div>
                                                                              </div>
                                                                              <Copy size={12} className="text-text-faint group-hover:text-text-primary shrink-0" />
                                                                          </div>
                                                                          <div className="w-full h-px bg-[rgb(var(--fg-rgb))]/5" />
                                                                          <div className="flex justify-between items-center group cursor-pointer pt-1 rounded-md" onClick={() => handleCopy(account?.email || '', 'Maestra')}>
                                                                              <div className="flex items-center gap-2.5 min-w-0">
                                                                                  <div className="w-7 h-7 rounded-md bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-faint shrink-0"><Database size={12} /></div>
                                                                                  <div className="flex flex-col min-w-0">
                                                                                      <span className="text-[8px] font-black text-text-faint uppercase">Maestra a la que se unió</span>
                                                                                      <span className="text-[10px] font-medium text-text-disabled truncate">{account?.email}</span>
                                                                                  </div>
                                                                              </div>
                                                                              <Copy size={10} className="text-text-faint" />
                                                                          </div>
                                                                        </>
                                                                      )}
                                                                      {isScreen && sale.assignedProfiles && sale.assignedProfiles.length > 0 && (
                                                                          <div className="pt-2 space-y-2">
                                                                              {sale.assignedProfiles.map((profile, pIdx) => (
                                                                                  <div key={pIdx} className="flex gap-2">
                                                                                      <div className="flex-1 bg-[rgb(var(--fg-rgb))]/[0.02] rounded-md p-2 border border-[rgb(var(--fg-rgb))]/5" onClick={() => handleCopy(profile.name, 'Perfil')}>
                                                                                          <span className="text-[7px] font-black text-text-faint uppercase block mb-0.5">Perfil {sale.assignedProfiles!.length > 1 ? pIdx + 1 : ''}</span>
                                                                                          <span className="text-[10px] font-semibold text-text-secondary truncate block">{profile.name}</span>
                                                                                      </div>
                                                                                      <div className="w-16 bg-[rgb(var(--fg-rgb))]/[0.02] rounded-md p-2 border border-[rgb(var(--fg-rgb))]/5 text-center" onClick={() => handleCopy(profile.pin, 'PIN')}>
                                                                                          <span className="text-[7px] font-black text-text-faint uppercase block mb-0.5">PIN</span>
                                                                                          <span className="text-[10px] font-semibold text-text-secondary font-mono">{profile.pin || '0000'}</span>
                                                                                      </div>
                                                                                  </div>
                                                                              ))}
                                                                          </div>
                                                                      )}
                                                                  </div>
                                                              </div>
                                                              <div className="grid grid-cols-5 gap-2">
                                                                  <button onClick={() => handleIndividualRenew(sale)} className="h-10 rounded-md bg-surface-3 text-brand-primary flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 active:scale-95 transition-all hover:bg-brand-primary/10"><RefreshCw size={16} /></button>
                                                                  <button onClick={() => handleIndividualMessage(sale)} className="h-10 rounded-md bg-surface-3 text-status-success flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 active:scale-95 transition-all hover:bg-status-success/10"><MessageCircle size={16} /></button>
                                                                  <button onClick={() => handleWarrantyClick(sale)} className="h-10 rounded-md bg-surface-3 text-purple-400 flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 active:scale-95 transition-all hover:bg-purple-400/10"><ShieldCheck size={16} /></button>
                                                                  <button onClick={() => { haptic('nav'); onEdit(sale); }} className="h-10 rounded-md bg-surface-3 text-text-disabled flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 active:scale-95 transition-all hover:bg-[rgb(var(--fg-rgb))]/10"><Edit2 size={16} /></button>
                                                                  <button onClick={() => handleDeleteRequest(sale.id)} className="h-10 rounded-xl bg-status-danger/10 text-status-danger-soft flex items-center justify-center border border-status-danger/10 active:scale-95 transition-all hover:bg-status-danger/20"><Trash2 size={16} /></button>
                                                              </div>
                                                          </div>
                                                      </motion.div>
                                                  )}
                                              </AnimatePresence>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>

          <RenewModal isOpen={isRenewOpen} onClose={() => setIsRenewOpen(false)} salesToRenew={renewSales} zIndex={MODAL_Z_INDEX} />
          <WhatsAppMenu isOpen={isWAOpen} onClose={() => setIsWAOpen(false)} sales={salesForMessage} clientName={group.clientName} clientPhone={group.clientPhone} clientTelegram={group.clientTelegram} zIndex={MODAL_Z_INDEX} />
          <WarrantyModal isOpen={isWarrantyOpen} onClose={() => setIsWarrantyOpen(false)} sale={warrantySale} zIndex={MODAL_Z_INDEX} />
          <ReceiptModal isOpen={isReceiptOpen} onClose={() => setIsReceiptOpen(false)} sales={salesForReceipt} client={{ id: group.clientId, name: group.clientName, phone: group.clientPhone, registrationDate: '', activeServices: 0 }} zIndex={MODAL_Z_INDEX} />
          
          <Modal isOpen={isFailReportModalOpen} onClose={() => setIsFailReportModalOpen(false)} title="Reportar Falla" zIndex={MODAL_Z_INDEX + 50}>
            <div className="pt-2 pb-4 space-y-5">
                {salesInCurrentReportingGroup.length > 1 && (
                    <div className="space-y-3">
                        <label className="text-[10px] font-semibold text-text-disabled uppercase tracking-widest ml-1">Selecciona el servicio afectado</label>
                        <div className="grid grid-cols-1 gap-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                            {salesInCurrentReportingGroup.map(s => (
                                <button key={s.id} onClick={() => setFailingSale(s)} className={`flex items-center justify-between p-3.5 rounded-lg border transition-all active:scale-[0.98] ${failingSale?.id === s.id ? 'bg-brand-primary/10 border-brand-primary/40 text-text-primary' : 'bg-surface-sunken border-[rgb(var(--fg-rgb))]/5 text-text-disabled'}`}><span className="text-xs font-semibold">{s.serviceName}</span>{failingSale?.id === s.id && <Check size={14} className="text-brand-primary" strokeWidth={3} />}</button>
                            ))}
                        </div>
                    </div>
                )}
                <AnimatePresence mode="wait">
                    {(failingSale || salesInCurrentReportingGroup.length === 1) && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                            <div className="space-y-2"><label className="text-[10px] font-semibold text-text-disabled uppercase tracking-widest ml-1">Detalle del problema</label><textarea value={failNote} onChange={e => setFailNote(e.target.value)} placeholder="Describe la falla observada..." className="w-full bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 rounded-xl p-4 text-xs text-text-primary min-h-[100px] outline-none focus:border-brand-primary/50" /></div>
                            <button onClick={submitFailReport} disabled={!failNote.trim() || !failingSale} className="w-full h-12 bg-status-warning text-black rounded-xl font-semibold text-xs uppercase tracking-widest disabled:opacity-50 active:scale-95 transition-all shadow-lg shadow-status-warning/20">Confirmar Reporte</button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
          </Modal>

          {showCurrencyModal && (
            <Modal isOpen={true} onClose={() => setShowCurrencyModal(false)} title="Enviar Aviso de Cobro" zIndex={MODAL_Z_INDEX + 10}>
                <div className="space-y-4 pt-2">
                <div className="bg-surface-zinc border border-[rgb(var(--fg-rgb))]/10 rounded-md p-4 text-center">
                    <p className="text-sm text-text-secondary font-medium mb-4">Selecciona la moneda para el recordatorio</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleConfirmSmartReminder(false)} className="flex flex-col items-center justify-center p-4 rounded-md bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 border border-[rgb(var(--fg-rgb))]/5 transition-all active:scale-95"><DollarSign size={20} className="text-brand-primary mb-2" /><span className="text-xs font-semibold text-text-primary uppercase">{settings.currency || 'USD'}</span><span className="text-[10px] text-text-disabled">Principal</span></button>
                        <button onClick={() => handleConfirmSmartReminder(true)} className="flex flex-col items-center justify-center p-4 rounded-md bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 border border-[rgb(var(--fg-rgb))]/5 transition-all active:scale-95"><RefreshCw size={20} className="text-status-success-soft mb-2" /><span className="text-xs font-semibold text-text-primary uppercase">{settings.subCurrency || 'SEC'}</span><span className="text-[10px] text-text-disabled">Secundaria</span></button>
                    </div>
                </div>
                <button onClick={() => setShowCurrencyModal(false)} className="w-full py-3 text-text-disabled text-xs font-semibold">Cancelar</button>
                </div>
            </Modal>
          )}

          <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Eliminar Servicio" zIndex={MODAL_Z_INDEX + 100}>
             <div className="pt-2 pb-4 space-y-6">
                <div className="bg-status-danger/10 border border-status-danger/20 p-5 rounded-xl flex gap-4 items-start shadow-sm">
                    <div className="bg-status-danger/20 p-3 rounded-full shrink-0 text-status-danger"><Trash2 size={24} /></div>
                    <div><h4 className="text-text-primary font-bold text-sm">¿Confirmar eliminación?</h4><p className="text-text-muted text-xs mt-1 leading-relaxed">Esta acción es permanente. Se liberará el cupo en el inventario pero el historial de esta venta se perderá.</p></div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 h-14 bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/10 text-text-muted rounded-2xl font-semibold text-xs uppercase tracking-widest active:scale-95 transition-all">Cancelar</button>
                    <button onClick={confirmDelete} className="flex-1 h-14 bg-status-danger text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.4)] active:scale-95 transition-all">Eliminar Ahora</button>
                </div>
             </div>
          </Modal>

          {isClientModalOpen && selectedClient && (
            <ContactoBottomSheet 
                client={selectedClient} 
                onClose={() => setIsClientModalOpen(false)} 
                onEdit={() => {}}
                onDelete={(id) => {
                  removeClient(id);
                  setIsClientModalOpen(false);
                }}
                initialTab="purchases"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SaleDetailPage;
