
import React from 'react';
import { Account } from '../../types';
import { getAccountStatus, getStatusLabel, getStatusColor } from '../../utils/inventarioUtils';
import { Edit2, Trash2, RefreshCw, Power, Copy, AlertTriangle } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface CuentaTableProps {
  accounts: Account[];
  onEdit: (acc: Account) => void;
  onDelete: (id: string) => void;
  onRenew: (acc: Account) => void;
  onToggleStatus: (acc: Account) => void;
  onToggleFailure: (acc: Account) => void; // Nueva prop
}

const CuentaTable: React.FC<CuentaTableProps> = ({ accounts, onEdit, onDelete, onRenew, onToggleStatus, onToggleFailure }) => {
  const { providers } = useData();

  return (
    <div className="bg-surface-3 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg">
       <table className="w-full text-left border-collapse">
          <thead>
             <tr className="border-b border-white/5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider bg-white/[0.02]">
                <th className="p-5 pl-8">Cuenta / Correo</th>
                <th className="p-5">Contraseña</th>
                <th className="p-5">Vencimiento</th>
                <th className="p-5">Ocupación</th>
                <th className="p-5">Estado</th>
                <th className="p-5 text-right pr-8">Acciones</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm">
             {accounts.map(acc => {
                const status = getAccountStatus(acc);
                const statusStyle = getStatusColor(status);
                const usage = acc.account_type === 'cuenta_completa' ? 'Completa' : `${acc.usedScreens || 0} / ${acc.maxScreens}`;
                const provider = acc.providerId ? providers.find(p => p.id === acc.providerId) : null;
                const isFailing = acc.status === 'fallando';

                return (
                   <tr key={acc.id} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="p-5 pl-8 font-medium text-white">
                         <div className="flex items-center gap-2 group/email">
                            {provider && (
                               <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: provider.color }} title={provider.name} />
                            )}
                            {acc.email}
                            <button 
                              onClick={() => navigator.clipboard.writeText(acc.email)}
                              className="text-zinc-600 hover:text-white opacity-0 group-hover/email:opacity-100 transition-opacity"
                            >
                              <Copy size={14} />
                            </button>
                         </div>
                      </td>
                      <td className="p-5 font-mono text-zinc-400 tracking-wider text-xs">{acc.password}</td>
                      <td className="p-5 text-zinc-300 font-medium">{acc.endDate}</td>
                      <td className="p-5 text-zinc-300">
                         <span className="bg-white/5 px-2 py-1 rounded-md border border-white/5 text-xs font-semibold text-zinc-400">
                            {usage}
                         </span>
                      </td>
                      <td className="p-5">
                         <span className={`px-3 py-1 rounded-lg text-[10px] font-semibold border uppercase tracking-wide ${statusStyle}`}>
                            {getStatusLabel(status)}
                         </span>
                      </td>
                      <td className="p-5 text-right pr-8">
                         <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button 
                               onClick={() => onToggleFailure(acc)} 
                               className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border ${isFailing ? 'bg-orange-500/20 text-orange-500 border-orange-500/20' : 'bg-white/5 hover:bg-orange-500/10 text-zinc-400 hover:text-orange-400 border-transparent'}`} 
                               title={isFailing ? 'Quitar Reporte Falla' : 'Reportar Falla'}
                            >
                               <AlertTriangle size={14} />
                            </button>
                            <button onClick={() => onRenew(acc)} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-primary/20 text-zinc-400 hover:text-primary rounded-lg transition-all border border-transparent hover:border-primary/20" title="Renovar">
                               <RefreshCw size={14} />
                            </button>
                            <button onClick={() => onEdit(acc)} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-lg transition-all" title="Editar">
                               <Edit2 size={14} />
                            </button>
                            <button onClick={() => onToggleStatus(acc)} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-orange-400 rounded-lg transition-all" title={acc.status === 'inactiva' ? 'Activar' : 'Pausar'}>
                               <Power size={14} />
                            </button>
                            <button onClick={() => onDelete(acc.id)} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-all border border-transparent hover:border-red-500/20" title="Eliminar">
                               <Trash2 size={14} />
                            </button>
                         </div>
                      </td>
                   </tr>
                );
             })}
             {accounts.length === 0 && (
                <tr>
                   <td colSpan={6} className="p-16 text-center text-zinc-500 text-sm">No hay cuentas para mostrar.</td>
                </tr>
             )}
          </tbody>
       </table>
    </div>
  );
};

export default CuentaTable;
