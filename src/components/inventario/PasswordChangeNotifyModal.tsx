import React from 'react';
import Modal from '../ui/Modal';
import { Sale, Client, Account } from '../../types';
import { MessageCircle, Key, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getCombinedWhatsAppTemplate } from '../../utils/salesUtils';
import { sendWhatsAppMessage } from '../../utils/contactosUtils';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';

interface PasswordChangeNotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  affectedSales: Sale[];
  account: Account;
  clients: Client[];
}

const PasswordChangeNotifyModal: React.FC<PasswordChangeNotifyModalProps> = ({ 
  isOpen, onClose, affectedSales, account, clients 
}) => {
  const { settings, accounts } = useData();
  const { showToast } = useToast();

  const handleNotify = (sale: Sale, client: Client) => {
    const message = getCombinedWhatsAppTemplate(
        'password',
        [sale], // Enviamos solo esta venta específica
        client.name,
        accounts,
        settings,
        'whatsapp'
    );
    sendWhatsAppMessage(client.phone ?? '', message);
  };

  const handleNotifyAll = () => {
     // Esta función es compleja en web/móvil porque abriría muchas ventanas.
     // Por ahora, notificamos al primero o dejamos que el usuario lo haga uno a uno.
     // Para mejor UX, dejamos que el usuario pulse uno por uno.
     showToast('WhatsApp solo permite enviar los mensajes uno por uno: toca cada cliente de la lista.', 'info');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cambio de Contraseña Detectado">
      <div className="pt-2 space-y-5">
        
        <div className="bg-status-warning/10 border border-status-warning/20 p-4 rounded-md flex gap-4 items-start">
           <div className="bg-status-warning/20 p-2.5 rounded-full text-status-warning shrink-0">
              <Key size={24} />
           </div>
           <div>
              <h4 className="text-status-warning font-bold text-sm mb-1">Actualización Requerida</h4>
              <p className="text-text-secondary text-xs leading-relaxed">
                 Has cambiado la contraseña de <strong>{account.email}</strong>. 
                 Hay <strong>{affectedSales.length} clientes</strong> activos usando esta cuenta que perderán el acceso.
              </p>
           </div>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
           <p className="text-tiny font-semibold text-text-disabled uppercase tracking-wider ml-1">Clientes Afectados</p>
           
           {affectedSales.map(sale => {
              const client = clients.find(c => c.id === sale.clientId);
              const profile = sale.assignedProfiles?.[0];
              
              if (!client) return null;

              return (
                 <div key={sale.id} className="flex items-center justify-between p-3 bg-surface-zinc border border-border-subtle rounded-md">
                    <div className="min-w-0 flex-1 mr-3">
                       <p className="text-sm font-bold text-text-primary truncate">{client.name}</p>
                       <p className="text-tiny text-text-disabled truncate flex items-center gap-1">
                          {profile?.name || 'Perfil'} 
                          <span className="w-1 h-1 bg-zinc-600 rounded-full" /> 
                          {client.phone}
                       </p>
                    </div>
                    <button 
                       onClick={() => handleNotify(sale, client)}
                       className="h-9 px-3 bg-brand-whatsapp/10 hover:bg-brand-whatsapp/20 text-brand-whatsapp border border-brand-whatsapp/20 rounded-sm flex items-center gap-2 text-tiny font-semibold transition-all active:scale-95"
                    >
                       <MessageCircle size={14} /> Notificar
                    </button>
                 </div>
              );
           })}
        </div>

        <div className="pt-2 flex flex-col gap-3">
           <button onClick={onClose} className="w-full py-3.5 bg-surface-3 text-text-muted font-semibold text-xs rounded-md hover:bg-[rgb(var(--fg-rgb))]/5 transition-colors">
              Listo, cerrar
           </button>
        </div>
      </div>
    </Modal>
  );
};

export default PasswordChangeNotifyModal;