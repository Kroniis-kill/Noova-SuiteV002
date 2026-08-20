
import React from 'react';
import Modal from '../ui/Modal';
import { DashboardWidgets } from '../../types';
import { 
  LayoutTemplate, DollarSign, Users, Layers, AlertOctagon, Zap, 
  ShoppingCart, Receipt, Search, Briefcase, Truck, UserPlus, BarChart3, CheckSquare,
  ClipboardList, Trash2
} from 'lucide-react';

interface WidgetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: DashboardWidgets;
  toggleWidget: (key: keyof DashboardWidgets) => void;
  toggleQuickAction?: (actionId: string) => void;
}

const WidgetConfigModal: React.FC<WidgetConfigModalProps> = ({ isOpen, onClose, widgets, toggleWidget, toggleQuickAction }) => {
  
  const cardsOptions: { key: keyof DashboardWidgets; label: string; icon: React.ElementType; color: string }[] = [
    { key: 'showSales', label: 'Ventas del Mes', icon: DollarSign, color: 'text-emerald-400' },
    { key: 'showProfit', label: 'Ganancia Neta', icon: LayoutTemplate, color: 'text-brand-primary' },
    { key: 'showClients', label: 'Clientes Activos', icon: Users, color: 'text-blue-400' },
    { key: 'showInventory', label: 'Inventario / Stock', icon: Layers, color: 'text-indigo-400' },
    { key: 'showExchangeRate', label: 'Alertas / Vencimientos', icon: AlertOctagon, color: 'text-red-400' },
    { key: 'showQuickActions', label: 'Panel de Acciones', icon: Zap, color: 'text-amber-400' },
  ];

  const actionButtons = [
      { id: 'sale', label: 'Vender', icon: ShoppingCart },
      { id: 'expense', label: 'Gasto', icon: Receipt },
      { id: 'stock', label: 'Stock', icon: Search },
      { id: 'services', label: 'Servicios', icon: Layers },
      { id: 'expired', label: 'Vencidas', icon: AlertOctagon },
      { id: 'add_client', label: 'Cliente', icon: UserPlus },
      { id: 'add_reseller', label: 'Revendedor', icon: Briefcase },
      { id: 'add_provider', label: 'Proveedor', icon: Truck },
      { id: 'agenda', label: 'Agenda', icon: ClipboardList },
      { id: 'trash', label: 'Papelera', icon: Trash2 },
      { id: 'reports', label: 'Reportes', icon: BarChart3 },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Personalizar Dashboard">
      <div className="flex flex-col gap-6 pt-2 pb-4">
        
        {/* Sección Tarjetas */}
        <div>
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 ml-1">Tarjetas Visibles</h4>
            <div className="space-y-2">
              {cardsOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => toggleWidget(opt.key)}
                  className="w-full flex items-center justify-between p-3 rounded-md bg-surface-zinc border border-white/5 active:scale-[0.99] transition-all hover:bg-surface-3"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center ${opt.color}`}>
                      <opt.icon size={16} />
                    </div>
                    <span className={`text-xs font-medium ${widgets[opt.key] ? 'text-white' : 'text-zinc-500'}`}>
                      {opt.label}
                    </span>
                  </div>
                  
                  <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${widgets[opt.key] ? 'bg-brand-primary' : 'bg-zinc-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${widgets[opt.key] ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
              ))}
            </div>
        </div>

        {/* Sección Botones de Acción (Solo si toggleQuickAction existe) */}
        {toggleQuickAction && widgets.showQuickActions && (
            <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 ml-1">Botones de Acción</h4>
                <div className="grid grid-cols-2 gap-2">
                    {actionButtons.map(btn => {
                        const isActive = widgets.quickActions?.includes(btn.id);
                        return (
                            <button 
                                key={btn.id}
                                onClick={() => toggleQuickAction(btn.id)}
                                className={`flex items-center gap-2 p-3 rounded-md border text-left transition-all active:scale-95 ${isActive ? 'bg-brand-primary/10 border-brand-primary/30' : 'bg-surface-zinc border-white/5 opacity-60'}`}
                            >
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isActive ? 'bg-brand-primary text-white' : 'bg-zinc-700 text-zinc-400'}`}>
                                    {isActive ? <CheckSquare size={12} /> : <btn.icon size={12} />}
                                </div>
                                <span className={`text-[11px] font-semibold ${isActive ? 'text-white' : 'text-zinc-500'}`}>{btn.label}</span>
                            </button>
                        );
                    })}
                </div>
                <p className="text-[10px] text-zinc-600 mt-2 ml-1">Selecciona los accesos directos que usas frecuentemente.</p>
            </div>
        )}

        <button 
          onClick={onClose} 
          className="mt-4 w-full py-3.5 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-md text-xs font-semibold shadow-[0_0_20px_-5px_rgba(106,44,255,0.4)] active:scale-95 transition-all hover:brightness-110"
        >
          Guardar Cambios
        </button>
      </div>
    </Modal>
  );
};

export default WidgetConfigModal;
