
import React, { useEffect, useState } from 'react';
import { getSubscriptionHistory } from '../../../../services/adminService';
import { SubscriptionHistory } from '../../../../types/adminTypes';
import { HistoryItem } from '../../../../components/admin/history/HistoryComponents';
import { ArrowLeft } from 'lucide-react';

const AdminHistoryMobile: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [history, setHistory] = useState<SubscriptionHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubscriptionHistory().then(data => {
      setHistory(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="pb-32 pt-2 px-4 space-y-4">
       <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="w-10 h-10 rounded-md bg-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-secondary">
             <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Historial de Cambios</h1>
       </div>

       {loading ? (
          <p className="text-center text-text-disabled text-sm py-10">Cargando historial...</p>
       ) : (
          <div className="space-y-3">
             {history.map(item => (
                <HistoryItem key={item.id} item={item} />
             ))}
             {history.length === 0 && (
                <div className="py-12 text-center border-2 border-dashed border-[rgb(var(--fg-rgb))]/5 rounded-xl">
                   <p className="text-text-disabled text-xs">No hay registros de historial.</p>
                </div>
             )}
          </div>
       )}
    </div>
  );
};

export default AdminHistoryMobile;
