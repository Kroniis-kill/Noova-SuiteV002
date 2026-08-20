
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { Sale, Account, Service, ScreenProfile } from '../../types';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useHaptic } from '../../hooks/useHaptic';
import { 
  Save, X, Mail, Lock, Calendar, DollarSign, 
  User, Hash, Monitor, ChevronDown, Check, Search
} from 'lucide-react';
import { getLocalDateISO } from '../../utils/contactosUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface EditSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  zIndex?: number;
}

const EditSaleModal: React.FC<EditSaleModalProps> = ({ isOpen, onClose, sale, zIndex }) => {
  const { accounts, services, updateSale, clients } = useData();
  const { showToast } = useToast();
  const haptic = useHaptic();

  const [formData, setFormData] = useState<Partial<Sale>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccountSearchOpen, setIsAccountSearchOpen] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');

  useEffect(() => {
    if (isOpen && sale) {
      setFormData({ ...sale });
    }
  }, [isOpen, sale]);

  if (!isOpen || !sale) return null;

  const client = clients.find(c => c.id === sale.clientId);
  const currentAccount = accounts.find(a => a.id === formData.accountId);
  const service = services.find(s => s.name === sale.serviceName);

  const filteredAccounts = accounts.filter(a => 
    a.serviceId === service?.id && 
    (a.email.toLowerCase().includes(accountSearch.toLowerCase()) || a.status.toLowerCase().includes(accountSearch.toLowerCase()))
  );

  const handleSave = async () => {
    if (!formData.accountId) {
      showToast('Debe seleccionar una cuenta', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateSale(formData as Sale);
      haptic('success');
      showToast('Venta actualizada correctamente', 'success');
      onClose();
    } catch (error) {
      showToast('Error al actualizar la venta', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileChange = (idx: number, field: keyof ScreenProfile, value: string) => {
    const profiles = [...(formData.assignedProfiles || [])];
    if (!profiles[idx]) profiles[idx] = { name: '', pin: '' };
    profiles[idx] = { ...profiles[idx], [field]: value };
    setFormData({ ...formData, assignedProfiles: profiles });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Editar Servicio" zIndex={zIndex || 60000}>
      <div className="pt-2 pb-4 space-y-6">
        {/* Client & Service Info (Read Only) */}
        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white font-bold text-xs shadow-glow">
            {client?.name?.substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none mb-1">Cliente</p>
            <p className="text-sm font-bold text-white truncate">{client?.name}</p>
            <p className="text-[10px] text-brand-primary font-bold uppercase mt-0.5">{sale.serviceName}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Account Selection */}
          <div>
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">Cuenta Asignada</label>
            <button 
              onClick={() => setIsAccountSearchOpen(true)}
              className="w-full bg-surface-sunken border border-white/10 rounded-md h-[52px] px-4 flex items-center justify-between group active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Mail size={18} className="text-zinc-500" />
                <span className="text-sm font-bold text-white truncate">{currentAccount?.email || 'Seleccionar cuenta...'}</span>
              </div>
              <ChevronDown size={18} className="text-zinc-600 group-hover:text-white" />
            </button>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">Fecha Inicio</label>
              <div className="relative flex items-center bg-surface-sunken border border-white/10 rounded-md h-[52px] px-4">
                <Calendar size={18} className="text-zinc-500 mr-3" />
                <input 
                  type="date" 
                  value={formData.date?.split('T')[0] || ''} 
                  onChange={e => setFormData({ ...formData, date: new Date(e.target.value).toISOString() })}
                  className="bg-transparent text-sm text-white outline-none w-full font-bold uppercase"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">Vencimiento</label>
              <div className="relative flex items-center bg-surface-sunken border border-white/10 rounded-md h-[52px] px-4">
                <Calendar size={18} className="text-zinc-500 mr-3" />
                <input 
                  type="date" 
                  value={formData.expiryDate?.split('T')[0] || ''} 
                  onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="bg-transparent text-sm text-white outline-none w-full font-bold uppercase"
                />
              </div>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">Monto de Venta</label>
            <div className="relative flex items-center bg-surface-sunken border border-white/10 rounded-md h-[52px] px-4">
              <DollarSign size={18} className="text-emerald-500 mr-3" />
              <input 
                type="number" 
                value={formData.amount || ''} 
                onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                className="bg-transparent text-sm text-white outline-none w-full font-bold"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Profiles (if applicable) */}
          {sale.saleType === 'por_pantalla' && formData.assignedProfiles && (
            <div className="space-y-3">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest ml-1 block">Perfiles</label>
              {formData.assignedProfiles.map((profile, idx) => (
                <div key={idx} className="flex gap-2">
                  <div className="flex-1 bg-surface-sunken border border-white/10 rounded-md h-[48px] px-4 flex items-center">
                    <User size={16} className="text-zinc-600 mr-3" />
                    <input 
                      value={profile.name} 
                      onChange={e => handleProfileChange(idx, 'name', e.target.value)}
                      placeholder="Nombre Perfil"
                      className="bg-transparent text-sm text-white outline-none w-full font-bold"
                    />
                  </div>
                  <div className="w-24 bg-surface-sunken border border-white/10 rounded-md h-[48px] px-4 flex items-center">
                    <Hash size={14} className="text-zinc-600 mr-2" />
                    <input 
                      value={profile.pin} 
                      onChange={e => handleProfileChange(idx, 'pin', e.target.value)}
                      placeholder="PIN"
                      className="bg-transparent text-sm text-white outline-none w-full font-mono font-bold text-center"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Invited Credentials (if applicable) */}
          {(sale.saleType === 'usuario_unico' || sale.saleType === 'cuenta_completa') && (
            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg space-y-4">
               <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest ml-1">Credenciales de Acceso</p>
               <div className="space-y-3">
                  <div className="flex items-center bg-surface-sunken border border-white/10 rounded-md h-[48px] px-4">
                    <Mail size={16} className="text-zinc-500 mr-3" />
                    <input 
                      value={formData.invitedEmail || ''} 
                      onChange={e => setFormData({ ...formData, invitedEmail: e.target.value })}
                      placeholder="Correo Invitado"
                      className="bg-transparent text-sm text-white outline-none w-full font-medium"
                    />
                  </div>
                  <div className="flex items-center bg-surface-sunken border border-white/10 rounded-md h-[48px] px-4">
                    <Lock size={16} className="text-zinc-500 mr-3" />
                    <input 
                      value={formData.invitedPassword || ''} 
                      onChange={e => setFormData({ ...formData, invitedPassword: e.target.value })}
                      placeholder="Contraseña Invitado"
                      className="bg-transparent text-sm text-white outline-none w-full font-mono font-medium"
                    />
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button 
            onClick={onClose}
            className="flex-1 h-14 bg-white/5 border border-white/10 text-zinc-400 rounded-lg font-semibold text-xs uppercase tracking-widest active:scale-95 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex-[2] h-14 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-glow flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSubmitting ? <span className="animate-spin">⌛</span> : <Save size={18} />}
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* Account Search Modal */}
      {isAccountSearchOpen && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center p-4 z-[70000]" onClick={() => setIsAccountSearchOpen(false)}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            className="bg-surface-1 w-full max-w-md rounded-lg border border-border-subtle shadow-modal overflow-hidden flex flex-col max-h-[70vh]" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/5 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-bold">Cambiar Cuenta</h3>
                <button onClick={() => setIsAccountSearchOpen(false)} className="p-1 rounded-full bg-white/5 text-zinc-400"><X size={16} /></button>
              </div>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  autoFocus 
                  value={accountSearch} 
                  onChange={e => setAccountSearch(e.target.value)} 
                  placeholder="Buscar cuenta..." 
                  className="w-full bg-surface-sunken rounded-md pl-11 pr-4 h-[48px] text-sm text-white outline-none border border-white/10 focus:border-brand-primary/50" 
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredAccounts.map(acc => (
                <button 
                  key={acc.id} 
                  onClick={() => {
                    setFormData({ ...formData, accountId: acc.id });
                    setIsAccountSearchOpen(false);
                  }}
                  className={`w-full p-3.5 rounded-md flex items-center justify-between transition-all ${formData.accountId === acc.id ? 'bg-brand-primary/10 border border-brand-primary/30' : 'hover:bg-white/5 border border-transparent'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${acc.status === 'activa' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <div className="text-left min-w-0">
                      <p className="text-sm font-bold text-white truncate">{acc.email}</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-semibold">{acc.status}</p>
                    </div>
                  </div>
                  {formData.accountId === acc.id && <Check size={16} className="text-brand-primary" strokeWidth={3} />}
                </button>
              ))}
              {filteredAccounts.length === 0 && <p className="text-center text-zinc-500 text-sm py-8">No se encontraron cuentas.</p>}
            </div>
          </motion.div>
        </div>, document.body
      )}
    </Modal>
  );
};

export default EditSaleModal;
