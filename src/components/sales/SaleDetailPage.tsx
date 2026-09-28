
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SalesGroup, getCombinedWhatsAppTemplate } from '../../utils/salesUtils';
import { Sale } from '../../types';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useHaptic } from '../../hooks/useHaptic';
import { 
  Copy, Tv, Pencil, Mail, Lock, Unlock, Trash2, ShieldCheck, Link2, Receipt,
  CalendarClock, AlertOctagon, UserCircle, ChevronDown, Snowflake, BellRing,
  Briefcase, DollarSign, RefreshCw, Check, History as HistoryIcon
} from 'lucide-react';
import RenewModal from './RenewModal';
import WhatsAppMenu from './WhatsAppMenu';
import WarrantyModal from './WarrantyModal';
import ReceiptModal from './ReceiptModal'; 
import { formatDate, sendWhatsAppMessage } from '../../utils/contactosUtils';
import Modal from '../ui/Modal'; 
import { getDaysRemaining, getDaysInFailure, calculateProfit } from '../../utils/expiredUtils';
import { generateUUID } from '../../utils/uuid';
import Avatar from '../ui/Avatar';
import Header from '../ui/Header';
import ContactoBottomSheet from '../contactos/ContactoBottomSheet';
import { useContactos } from '../../hooks/useContactos';

// --- HELPERS Y SUB-COMPONENTES ---

const SECTION_LABEL = "text-[10px] font-bold text-text-disabled uppercase tracking-widest ml-1 block";

// Lucide no trae el logo de WhatsApp: ícono propio con el mismo trazo que los demás
const WhatsAppIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
  </svg>
);

interface CopyRowProps {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  labelClass?: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
  onCopy: () => void;
}

// Fila de credencial: al tocarla copia el valor
const CopyRow: React.FC<CopyRowProps> = ({ icon, iconClass, label, labelClass = 'text-text-faint', value, mono, muted, onCopy }) => (
  <div className="flex justify-between items-center gap-3 group cursor-pointer rounded-md" onClick={onCopy}>
    <div className="flex items-center gap-2.5 min-w-0">
      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${iconClass}`}>{icon}</div>
      <div className="flex flex-col min-w-0">
        <span className={`text-[10px] font-semibold ${labelClass}`}>{label}</span>
        <span className={`truncate ${mono ? 'text-[13px] font-mono font-bold text-text-secondary' : muted ? 'text-xs font-medium text-text-disabled' : 'text-[13px] font-semibold text-text-secondary'}`}>{value}</span>
      </div>
    </div>
    <Copy size={14} className="text-text-faint group-hover:text-text-primary shrink-0" />
  </div>
);

const ROW_DIVIDER = "w-full h-px bg-[rgb(var(--fg-rgb))]/5";

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
                                title="Enviar recordatorio de vencimiento" aria-label="Enviar recordatorio de vencimiento"
                              >
                                  <BellRing size={16} fill="currentColor" />
                              </button>
                               <button 
                                 onClick={() => { haptic('nav'); setIsClientModalOpen(true); }}
                                 className="w-9 h-9 rounded-full bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center text-text-muted hover:text-text-primary active:scale-90 transition-all shrink-0 shadow-sm"
                                 title="Ver historial del cliente" aria-label="Ver historial del cliente"
                               >
                                   <HistoryIcon size={16} />
                               </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <p className="text-sm text-text-disabled font-mono tracking-widest">{group.clientPhone}</p>
                            {group.reseller && (
                                <span className="bg-status-warning/10 text-status-warning text-[11px] font-semibold px-2 py-0.5 rounded-md border border-status-warning/20 flex items-center gap-1">
                                    <Briefcase size={12} /> {group.reseller.name}
                                </span>
                            )}
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-surface-1 rounded-xl p-5 border border-[rgb(var(--fg-rgb))]/5 flex flex-col items-center shadow-sm">
                          <span className="text-[11px] font-bold text-text-faint uppercase tracking-widest mb-1">Activos</span>
                          <span className="text-2xl font-black text-text-primary">{allGroupSales.length}</span>
                      </div>
                      <div className="bg-surface-1 rounded-xl p-5 border border-[rgb(var(--fg-rgb))]/5 flex flex-col items-center shadow-sm">
                          <span className="text-[11px] font-bold text-text-faint uppercase tracking-widest mb-1">Inversión</span>
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
                                  <div className="flex flex-col min-w-0">
                                      <div className="flex items-center gap-2">
                                          <span className="text-xs font-semibold text-text-muted tracking-wide">{formatDate(dateKey)}</span>
                                          {isGroupFrozen && (
                                              <span className="bg-status-info/10 text-status-info-soft text-[10px] font-semibold px-1.5 py-0.5 rounded border border-status-info/20 flex items-center gap-1">
                                                  <Snowflake size={11} /> Congelado
                                              </span>
                                          )}
                                      </div>
                                      <span className={`text-[11px] font-medium mt-0.5 ${isGroupFrozen ? 'text-status-info-soft' : isExpired ? 'text-status-danger' : 'text-text-faint'}`}>
                                          {isGroupFrozen ? 'Tiempo en pausa' : isExpired ? `Vencido hace ${Math.abs(days)} ${Math.abs(days) === 1 ? 'día' : 'días'}` : days === 0 ? 'Vence hoy' : `Vence en ${days} ${days === 1 ? 'día' : 'días'}`}
                                      </span>
                                  </div>
                                  <div className="h-px bg-[rgb(var(--fg-rgb))]/5 flex-1 min-w-0" />
                                  <div className="flex items-center gap-1.5 shrink-0">
                                      {salesInGroup.length > 1 && (
                                          <button onClick={() => handleGroupMessage(salesInGroup)} className="w-8 h-8 rounded-lg bg-status-success/10 text-status-success flex items-center justify-center border border-status-success/20 active:scale-90 transition-all hover:bg-status-success/20" title="Enviar mensaje consolidado" aria-label="Enviar mensaje consolidado"><WhatsAppIcon size={17} /></button>
                                      )}
                                      <button onClick={() => handleGroupRenew(salesInGroup)} className="w-8 h-8 rounded-lg bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-brand-primary border border-[rgb(var(--fg-rgb))]/5 active:scale-90 transition-all hover:bg-[rgb(var(--fg-rgb))]/10" title="Renovar grupo" aria-label="Renovar grupo"><CalendarClock size={17} /></button>
                                      {salesInGroup.length > 1 && (
                                        <button onClick={() => handleSendAccessData(salesInGroup)} className="w-8 h-8 rounded-lg bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-status-info-soft border border-[rgb(var(--fg-rgb))]/5 active:scale-90 transition-all hover:bg-[rgb(var(--fg-rgb))]/10" title="Enviar datos de acceso" aria-label="Enviar datos de acceso"><Unlock size={17} /></button>
                                      )}
                                      <button onClick={() => handleReceiptClick(salesInGroup)} className="w-8 h-8 rounded-lg bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-muted border border-[rgb(var(--fg-rgb))]/5 active:scale-90 transition-all hover:bg-[rgb(var(--fg-rgb))]/10" title="Ver comprobante" aria-label="Ver comprobante"><Receipt size={17} /></button>
                                      <button onClick={() => handleReportFailClick(salesInGroup)} className="w-8 h-8 rounded-lg bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-status-warning border border-[rgb(var(--fg-rgb))]/5 active:scale-90 transition-all hover:bg-[rgb(var(--fg-rgb))]/10" title="Reportar falla" aria-label="Reportar falla"><AlertOctagon size={17} /></button>
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
                                              <div onClick={() => { haptic('nav'); setExpandedSaleId(isExpanded ? null : sale.id); }} className="p-4 flex items-center justify-between gap-3 cursor-pointer active:bg-[rgb(var(--fg-rgb))]/5">
                                                  <div className="flex items-center gap-3 min-w-0">
                                                      <div className="w-10 h-10 rounded-md bg-bg flex items-center justify-center shrink-0 overflow-hidden border border-[rgb(var(--fg-rgb))]/5">
                                                          {serviceObj?.image_url ? <img src={serviceObj.image_url} className="w-full h-full object-cover" /> : <Tv size={18} className="text-text-faint" />}
                                                      </div>
                                                      <div className="min-w-0">
                                                          <h4 className="text-[13px] font-bold text-text-primary truncate">{sale.serviceName}</h4>
                                                          <div className="flex items-center gap-1.5 flex-wrap">
                                                            <p className="text-[11px] font-medium text-text-faint">{isUnique ? 'Usuario único' : isFull ? 'Cuenta completa' : 'Pantalla asignada'}</p>
                                                            {isFailing && <span className="text-[10px] font-semibold text-status-info-soft bg-status-info/10 px-1.5 rounded">Pausado · {getDaysInFailure(account?.failure_started_at)} días</span>}
                                                          </div>
                                                      </div>
                                                  </div>
                                                  <div className="flex items-center gap-3 shrink-0">
                                                      {!isExpanded && (
                                                          <div className="flex flex-col items-end">
                                                              <span className="text-[13px] font-semibold text-text-primary">{settings.currency}{sale.amount}</span>
                                                              <span className="text-[11px] font-semibold text-status-success/70">+{settings.currency}{profit}</span>
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
                                                                          <CopyRow
                                                                            icon={<Mail size={14} />}
                                                                            iconClass="bg-[rgb(var(--fg-rgb))]/5 text-text-disabled"
                                                                            label={isFull ? 'Usuario dueño' : 'Cuenta maestra'}
                                                                            value={account?.email || ''}
                                                                            onCopy={() => handleCopy(account?.email || '', 'Usuario')}
                                                                          />
                                                                          <div className={ROW_DIVIDER} />
                                                                          <CopyRow
                                                                            icon={<Lock size={14} />}
                                                                            iconClass="bg-[rgb(var(--fg-rgb))]/5 text-text-disabled"
                                                                            label="Contraseña"
                                                                            value={account?.password || ''}
                                                                            mono
                                                                            onCopy={() => handleCopy(account?.password || '', 'Clave')}
                                                                          />
                                                                        </>
                                                                      )}
                                                                      {isUnique && (
                                                                        <>
                                                                          <CopyRow
                                                                            icon={<Mail size={14} />}
                                                                            iconClass="bg-status-info/10 text-status-info-soft"
                                                                            label="Acceso cliente"
                                                                            labelClass="text-status-info-soft"
                                                                            value={sale.invitedEmail || '---'}
                                                                            onCopy={() => handleCopy(sale.invitedEmail || '', 'Usuario Invitado')}
                                                                          />
                                                                          <div className={ROW_DIVIDER} />
                                                                          <CopyRow
                                                                            icon={<Lock size={14} />}
                                                                            iconClass="bg-status-info/10 text-status-info-soft"
                                                                            label="Clave personal"
                                                                            labelClass="text-status-info-soft"
                                                                            value={sale.invitedPassword || '---'}
                                                                            mono
                                                                            onCopy={() => handleCopy(sale.invitedPassword || '', 'Clave Invitado')}
                                                                          />
                                                                          <div className={ROW_DIVIDER} />
                                                                          <CopyRow
                                                                            icon={<Link2 size={14} />}
                                                                            iconClass="bg-[rgb(var(--fg-rgb))]/5 text-text-faint"
                                                                            label="Maestra a la que se unió"
                                                                            value={account?.email || ''}
                                                                            muted
                                                                            onCopy={() => handleCopy(account?.email || '', 'Maestra')}
                                                                          />
                                                                        </>
                                                                      )}
                                                                      {isScreen && sale.assignedProfiles && sale.assignedProfiles.length > 0 && (
                                                                          <div className="pt-2 space-y-2">
                                                                              {sale.assignedProfiles.map((profile, pIdx) => (
                                                                                  <div key={pIdx} className="flex gap-2">
                                                                                      <div className="flex-1 min-w-0 bg-[rgb(var(--fg-rgb))]/[0.02] rounded-md p-2 border border-[rgb(var(--fg-rgb))]/5 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => handleCopy(profile.name, 'Perfil')}>
                                                                                          <span className="text-[10px] font-semibold text-text-faint flex items-center gap-1 mb-0.5"><UserCircle size={12} /> Perfil {sale.assignedProfiles!.length > 1 ? pIdx + 1 : ''}</span>
                                                                                          <span className="text-[13px] font-semibold text-text-secondary truncate block">{profile.name}</span>
                                                                                      </div>
                                                                                      <div className="w-[72px] shrink-0 bg-[rgb(var(--fg-rgb))]/[0.02] rounded-md p-2 border border-[rgb(var(--fg-rgb))]/5 text-center cursor-pointer active:scale-[0.98] transition-transform" onClick={() => handleCopy(profile.pin, 'PIN')}>
                                                                                          <span className="text-[10px] font-semibold text-text-faint block mb-0.5">PIN</span>
                                                                                          <span className="text-[13px] font-semibold text-text-secondary font-mono">{profile.pin || '0000'}</span>
                                                                                      </div>
                                                                                  </div>
                                                                              ))}
                                                                          </div>
                                                                      )}
                                                                  </div>
                                                              </div>
                                                              <div className="grid grid-cols-5 gap-2">
                                                                  <button onClick={() => handleIndividualRenew(sale)} className="h-10 rounded-md bg-surface-3 text-brand-primary flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 active:scale-95 transition-all hover:bg-brand-primary/10" title="Renovar" aria-label="Renovar"><CalendarClock size={18} /></button>
                                                                  <button onClick={() => handleIndividualMessage(sale)} className="h-10 rounded-md bg-surface-3 text-status-success flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 active:scale-95 transition-all hover:bg-status-success/10" title="Enviar mensaje" aria-label="Enviar mensaje"><WhatsAppIcon size={18} /></button>
                                                                  <button onClick={() => handleWarrantyClick(sale)} className="h-10 rounded-md bg-surface-3 text-purple-400 flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 active:scale-95 transition-all hover:bg-purple-400/10" title="Garantía" aria-label="Garantía"><ShieldCheck size={18} /></button>
                                                                  <button onClick={() => { haptic('nav'); onEdit(sale); }} className="h-10 rounded-md bg-surface-3 text-text-disabled flex items-center justify-center border border-[rgb(var(--fg-rgb))]/5 active:scale-95 transition-all hover:bg-[rgb(var(--fg-rgb))]/10" title="Editar" aria-label="Editar"><Pencil size={18} /></button>
                                                                  <button onClick={() => handleDeleteRequest(sale.id)} className="h-10 rounded-md bg-status-danger/10 text-status-danger-soft flex items-center justify-center border border-status-danger/10 active:scale-95 transition-all hover:bg-status-danger/20" title="Eliminar" aria-label="Eliminar"><Trash2 size={18} /></button>
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
          
          <Modal isOpen={isFailReportModalOpen} onClose={() => setIsFailReportModalOpen(false)} title="Reportar falla" zIndex={MODAL_Z_INDEX + 50}>
            <div className="flex flex-col gap-5 pt-1 pb-2">
                {salesInCurrentReportingGroup.length > 1 && (
                    <div className="space-y-3">
                        <label className={SECTION_LABEL}>Selecciona el servicio afectado</label>
                        <div className="space-y-2 max-h-[190px] overflow-y-auto custom-scrollbar pr-1">
                            {salesInCurrentReportingGroup.map(s => {
                                const isPicked = failingSale?.id === s.id;
                                return (
                                    <button key={s.id} onClick={() => setFailingSale(s)} className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all active:scale-[0.98] ${isPicked ? 'bg-brand-primary/10 border-brand-primary/30' : 'bg-surface-sunken border-[rgb(var(--fg-rgb))]/5'}`}>
                                        <div className="w-10 h-10 rounded-md bg-brand-primary/15 text-brand-primary-hi flex items-center justify-center shrink-0"><Tv size={18} /></div>
                                        <span className={`flex-1 min-w-0 truncate text-sm font-bold ${isPicked ? 'text-text-primary' : 'text-text-muted'}`}>{s.serviceName}</span>
                                        {isPicked && <Check size={16} className="text-brand-primary shrink-0" strokeWidth={3} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
                <AnimatePresence mode="wait">
                    {(failingSale || salesInCurrentReportingGroup.length === 1) && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-5">
                            <div className="space-y-3">
                                <label className={SECTION_LABEL}>Detalle del problema</label>
                                {/* El contenedor dibuja el borde y el foco; el textarea va limpio */}
                                <div className="bg-surface-sunken rounded-md border border-[rgb(var(--fg-rgb))]/10 focus-within:border-brand-primary/40 transition-colors p-4">
                                    <textarea
                                        value={failNote}
                                        onChange={e => setFailNote(e.target.value)}
                                        placeholder="Describe la falla observada..."
                                        className="w-full min-h-[100px] resize-none !bg-transparent !border-0 !ring-0 focus:!ring-0 !rounded-none !p-0 !m-0 outline-none text-text-primary placeholder:text-text-faint"
                                    />
                                </div>
                            </div>
                            <button onClick={submitFailReport} disabled={!failNote.trim() || !failingSale} className="w-full h-[52px] bg-status-warning text-black rounded-md font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all">
                                <AlertOctagon size={18} /> Confirmar reporte
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
          </Modal>

          {showCurrencyModal && (
            <Modal isOpen={true} onClose={() => setShowCurrencyModal(false)} title="Enviar aviso de cobro" zIndex={MODAL_Z_INDEX + 10}>
                <div className="flex flex-col gap-5 pt-1 pb-2">
                    <div className="space-y-3">
                        <label className={SECTION_LABEL}>Moneda del recordatorio</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleConfirmSmartReminder(false)} className="h-[88px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-brand-primary/40 active:scale-95 transition-all">
                                <DollarSign size={22} className="text-brand-primary mb-0.5" />
                                <span className="text-sm font-bold text-text-primary">{settings.currency || 'USD'}</span>
                                <span className="text-[11px] text-text-disabled">Principal</span>
                            </button>
                            <button onClick={() => handleConfirmSmartReminder(true)} className="h-[88px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/10 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-brand-primary/40 active:scale-95 transition-all">
                                <RefreshCw size={22} className="text-status-success-soft mb-0.5" />
                                <span className="text-sm font-bold text-text-primary">{settings.subCurrency || 'SEC'}</span>
                                <span className="text-[11px] text-text-disabled">Secundaria</span>
                            </button>
                        </div>
                    </div>
                    <button onClick={() => setShowCurrencyModal(false)} className="w-full h-[52px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-4 text-text-secondary hover:text-text-primary rounded-md font-semibold text-sm transition-all active:scale-[0.98]">Cancelar</button>
                </div>
            </Modal>
          )}

          <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Eliminar servicio" zIndex={MODAL_Z_INDEX + 100}>
             <div className="flex flex-col gap-5 pt-1 pb-2">
                <div className="bg-status-danger/10 border border-status-danger/20 p-4 rounded-xl flex gap-3 items-start">
                    <div className="bg-status-danger/20 w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-status-danger"><Trash2 size={20} /></div>
                    <div className="min-w-0"><h4 className="text-text-primary font-bold text-sm">¿Confirmar eliminación?</h4><p className="text-text-muted text-xs mt-1 leading-relaxed">Esta acción es permanente. Se liberará el cupo en el inventario pero el historial de esta venta se perderá.</p></div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 h-[52px] bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 hover:bg-surface-4 text-text-secondary hover:text-text-primary rounded-md font-semibold text-sm transition-all active:scale-[0.98]">Cancelar</button>
                    <button onClick={confirmDelete} className="flex-[2] h-[52px] bg-status-danger text-white rounded-md font-bold text-sm active:scale-[0.98] transition-all">Eliminar ahora</button>
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
