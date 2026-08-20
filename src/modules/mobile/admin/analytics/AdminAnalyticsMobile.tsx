
import React, { useEffect, useState } from 'react';
import { getAdminAnalytics } from '../../../../services/adminService';
import { AdminAnalyticsData } from '../../../../types/adminTypes';
import { AnalyticsCharts } from '../../../../components/admin/analytics/AnalyticsComponents';
import { ArrowLeft, Users, Activity, UserX, AlertOctagon } from 'lucide-react';

const AdminAnalyticsMobile: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);

  useEffect(() => {
    getAdminAnalytics().then(data => setData(data));
  }, []);

  if (!data) return <div className="p-8 text-center text-zinc-500">Cargando estadísticas...</div>;

  const StatBox = ({ label, value, icon: Icon, color }: any) => (
     <div className="bg-surface-zinc/60 border border-white/10 rounded-lg p-4 flex flex-col justify-between h-[100px]">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${color} bg-white/5`}>
           <Icon size={16} />
        </div>
        <div>
           <span className="text-[10px] text-zinc-500 uppercase font-semibold">{label}</span>
           <span className="text-2xl font-bold text-white block">{value}</span>
        </div>
     </div>
  );

  return (
    <div className="pb-32 pt-2 px-4 space-y-6">
       <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center text-zinc-300">
             <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-white">Estadísticas</h1>
       </div>

       <div className="grid grid-cols-2 gap-3">
          <StatBox label="Total" value={data.totalUsers} icon={Users} color="text-status-info-soft" />
          <StatBox label="Activos" value={data.activeUsers} icon={Activity} color="text-status-success-soft" />
          <StatBox label="Suspendidos" value={data.suspendedUsers} icon={AlertOctagon} color="text-status-expiring-soft" />
          <StatBox label="Expirados" value={data.expiredUsers} icon={UserX} color="text-status-danger-soft" />
       </div>

       <AnalyticsCharts data={data} />

       <div className="bg-surface-zinc/60 border border-white/10 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Detalles Críticos</h3>
          <div className="flex justify-between items-center py-2 border-b border-white/5">
             <span className="text-xs text-zinc-400">Próximo a expirar</span>
             <span className="text-xs font-semibold text-status-warning-soft text-right">
                {data.nextToExpire ? `${data.nextToExpire.email} (${new Date(data.nextToExpire.date).toLocaleDateString()})` : 'N/A'}
             </span>
          </div>
          <div className="flex justify-between items-center py-2">
             <span className="text-xs text-zinc-400">Usuario más antiguo</span>
             <span className="text-xs font-semibold text-indigo-400 text-right">
                {data.oldestUser ? `${data.oldestUser.email}` : 'N/A'}
             </span>
          </div>
       </div>
    </div>
  );
};

export default AdminAnalyticsMobile;
