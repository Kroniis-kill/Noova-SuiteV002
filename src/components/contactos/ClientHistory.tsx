
import React, { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext';
import { supabase } from '../../supabaseClient';
import { Clock, MonitorPlay, AlertTriangle, History as HistoryIcon } from 'lucide-react';
import { formatDate } from '../../utils/contactosUtils';
import { ProfileHistoryEntry } from '../../types';
import { mappers } from '../../utils/mappers';

interface ClientHistoryProps {
  clientId: string;
  clientName?: string;
}

const ClientHistory: React.FC<ClientHistoryProps> = ({ clientId, clientName }) => {
  const { accounts, services } = useData();
  const [history, setHistory] = useState<ProfileHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
        // Corrección: Si no hay nombre, detenemos la carga inmediatamente para evitar loop infinito
        if (!clientName) {
            setLoading(false);
            return;
        }

        setLoading(true);
        
        try {
            const { data, error } = await supabase
                .from('profile_history')
                .select('*')
                .eq('client_name', clientName)
                .order('created_at', { ascending: false });

            if (!error && data) {
                // Filtramos localmente para asegurar consistencia visual (solo eventos con notas o cambios)
                const validHistory = data.filter(d => d.action_type === 'MODIFIED' || (d.notes && d.notes.length > 0));
                setHistory(validHistory.map(mappers.profileHistory.fromDb));
            }
        } catch (e) {
            console.error("Error loading history", e);
        } finally {
            setLoading(false);
        }
    };

    fetchHistory();
  }, [clientId, clientName]);

  const getDaysElapsed = (dateStr: string) => {
      const start = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - start.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      return days === 0 ? 'Hoy' : `Hace ${days} días`;
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-48 text-disabled">
              <Clock size={24} className="animate-spin mb-2" />
              <p className="text-xs">Cargando historial...</p>
          </div>
      );
  }

  if (history.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-48 text-disabled opacity-60">
              <HistoryIcon size={32} className="mb-2" />
              <p className="text-xs">No hay historial registrado.</p>
          </div>
      );
  }

  return (
    <div className="space-y-3 pb-4">
        {history.map(entry => {
            const account = accounts.find(a => a.id === entry.accountId);
            // Intentamos obtener el servicio desde la cuenta actual o inferirlo si la cuenta fue borrada
            const service = account ? services.find(s => s.id === account.serviceId) : null;
            
            // Detectar si fue por bloqueo
            const isBlock = entry.notes?.toLowerCase().includes('bloqueo');
            
            return (
                <div key={entry.id} className="bg-surface-zinc border border-[rgb(var(--fg-rgb))]/5 rounded-md p-3 relative overflow-hidden group">
                    {/* Indicador lateral */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isBlock ? 'bg-status-warning' : 'bg-[rgb(var(--fg-rgb))]/10'}`} />
                    
                    <div className="flex justify-between items-start pl-3">
                        <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-sm flex items-center justify-center shrink-0 border ${isBlock ? 'bg-status-warning/10 border-status-warning/20 text-status-warning' : 'bg-[rgb(var(--fg-rgb))]/5 border-[rgb(var(--fg-rgb))]/5 text-muted'}`}>
                                {isBlock ? <AlertTriangle size={14} /> : <MonitorPlay size={14} />}
                            </div>
                            
                            <div>
                                <h4 className="text-sm font-bold text-primary leading-tight">
                                    {service?.name || 'Servicio'}
                                </h4>
                                <p className="text-[10px] text-disabled mt-0.5 font-mono">
                                    {account?.email || 'Cuenta no disponible'}
                                </p>
                                
                                {entry.notes && (
                                    <div className={`mt-2 text-[11px] p-2 rounded-xs border inline-block max-w-full ${isBlock ? 'bg-status-warning/5 border-status-warning/10 text-amber-200/80' : 'bg-surface-sunken border-[rgb(var(--fg-rgb))]/5 text-muted'}`}>
                                        {entry.notes}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                             <span className="text-[9px] font-bold text-disabled block uppercase tracking-wider mb-1">
                                 {getDaysElapsed(entry.createdAt)}
                             </span>
                             <span className="text-[10px] text-faint bg-[rgb(var(--fg-rgb))]/5 px-1.5 py-0.5 rounded">
                                 {formatDate(entry.createdAt)}
                             </span>
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
  );
};

export default ClientHistory;
