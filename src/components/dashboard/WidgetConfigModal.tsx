
import React from 'react';
import Modal from '../ui/Modal';
import { DashboardWidgets } from '../../types';
import {
  Layers, AlertOctagon, ShoppingCart, Receipt, Search, Briefcase, Truck, UserPlus,
  BarChart3, CheckSquare, ClipboardList, Trash2, Calculator, Package, Store, Users, Settings
} from 'lucide-react';

interface WidgetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: DashboardWidgets;
  toggleWidget?: (key: keyof DashboardWidgets) => void;
  toggleQuickAction?: (actionId: string) => void;
}

const WidgetConfigModal: React.FC<WidgetConfigModalProps> = ({ isOpen, onClose, widgets, toggleQuickAction }) => {

  // Catálogo de accesos directos. Los ids deben existir en quickActionsConfig
  // de DashboardMobile y DashboardDesktop.
  const actionButtons: { id: string; label: string; icon: React.ElementType }[] = [
      { id: 'sale', label: 'Vender', icon: ShoppingCart },
      { id: 'expense', label: 'Gasto', icon: Receipt },
      { id: 'stock', label: 'Stock', icon: Search },
      { id: 'services', label: 'Servicios', icon: Layers },
      { id: 'expired', label: 'Vencidas', icon: AlertOctagon },
      { id: 'refund', label: 'Reembolso', icon: Calculator },
      { id: 'add_client', label: 'Cliente', icon: UserPlus },
      { id: 'add_reseller', label: 'Revendedor', icon: Briefcase },
      { id: 'add_provider', label: 'Proveedor', icon: Truck },
      { id: 'inventory', label: 'Inventario', icon: Package },
      { id: 'sales', label: 'Ventas', icon: Store },
      { id: 'contacts', label: 'Contactos', icon: Users },
      { id: 'agenda', label: 'Agenda', icon: ClipboardList },
      { id: 'reports', label: 'Reportes', icon: BarChart3 },
      { id: 'trash', label: 'Papelera', icon: Trash2 },
      { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Accesos rápidos">
      <div className="flex flex-col gap-4 pt-2 pb-4">
        <div>
            <h4 className="text-xs font-semibold text-text-disabled uppercase tracking-wider mb-3 ml-1">Botones de acción</h4>
            <div className="grid grid-cols-2 gap-2">
                {actionButtons.map(btn => {
                    const isActive = !!widgets.quickActions?.includes(btn.id);
                    return (
                        <button
                            key={btn.id}
                            type="button"
                            aria-pressed={isActive}
                            onClick={() => toggleQuickAction?.(btn.id)}
                            className={`flex items-center gap-2 p-3 rounded-md border text-left transition-all active:scale-95 ${isActive ? 'bg-brand-primary/10 border-brand-primary/30' : 'bg-surface-zinc border-hairline opacity-60'}`}
                        >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isActive ? 'bg-brand-primary text-white' : 'bg-zinc-700 text-text-muted'}`}>
                                {isActive ? <CheckSquare size={12} /> : <btn.icon size={12} />}
                            </div>
                            <span className={`text-caption font-semibold truncate ${isActive ? 'text-text-primary' : 'text-text-disabled'}`}>{btn.label}</span>
                        </button>
                    );
                })}
            </div>
            <p className="text-tiny text-text-faint mt-2 ml-1">Selecciona los accesos directos que usas frecuentemente.</p>
        </div>

        <button
          onClick={onClose}
          className="mt-2 w-full py-3.5 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-md text-xs font-semibold shadow-[0_0_20px_-5px_rgba(106,44,255,0.4)] active:scale-95 transition-all hover:brightness-110"
        >
          Guardar Cambios
        </button>
      </div>
    </Modal>
  );
};

export default WidgetConfigModal;
