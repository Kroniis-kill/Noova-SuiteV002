
import React, { useEffect, useState } from 'react';
import { getSubscriptionHistory } from '../../../../services/adminService';
import { SubscriptionHistory } from '../../../../types/adminTypes';
import { HistoryItem } from '../../../../components/admin/history/HistoryComponents';
import { ArrowLeft } from 'lucide-react';

const AdminHistoryDesktop: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [history, setHistory] = useState<SubscriptionHistory[]>([]);

  useEffect(() => {
    getSubscriptionHistory().then(data => setHistory(data));
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
       <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center text-zinc-300 hover:bg-white/10 transition-colors">
             <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-white">Historial de Suscriptores</h1>
       </div>

       <div className="space-y-2">
          {history.map(item => (
             <HistoryItem key={item.id} item={item} />
          ))}
          {history.length === 0 && <p className="text-zinc-500">Sin historial.</p>}
       </div>
    </div>
  );
};

export default AdminHistoryDesktop;
