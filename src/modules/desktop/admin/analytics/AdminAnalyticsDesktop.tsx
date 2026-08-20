
import React, { useEffect, useState } from 'react';
import { getAdminAnalytics } from '../../../../services/adminService';
import { AdminAnalyticsData } from '../../../../types/adminTypes';
import { AnalyticsCharts } from '../../../../components/admin/analytics/AnalyticsComponents';
import { ArrowLeft, Users, Activity, UserX, AlertOctagon } from 'lucide-react';

const AdminAnalyticsDesktop: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);

  useEffect(() => {
    getAdminAnalytics().then(data => setData(data));
  }, []);

  if (!data) return <div>Cargando...</div>;

  const StatCard = ({ title, value, icon: Icon, color }: any) => (
     <div className="bg-surface-zinc/60 backdrop-blur-xl border border-white/10 rounded-xl p-5 flex items-center gap-4">
        <div className={`w-12 h-12 rounded-md flex items-center justify-center ${color} bg-white/5`}>
           <Icon size={24} />
        </div>
        <div>
           <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
           <h4 className="text-3xl font-bold text-white">{value}</h4>
        </div>
     </div>
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
       <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-md bg-white/5 flex items-center justify-center text-zinc-300 hover:bg-white/10 transition-colors">
             <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
       </div>

       <div className="grid grid-cols-4 gap-6">
          <StatCard title="Total Usuarios" value={data.totalUsers} icon={Users} color="text-blue-400" />
          <StatCard title="Activos" value={data.activeUsers} icon={Activity} color="text-emerald-400" />
          <StatCard title="Suspendidos" value={data.suspendedUsers} icon={AlertOctagon} color="text-orange-400" />
          <StatCard title="Expirados" value={data.expiredUsers} icon={UserX} color="text-red-400" />
       </div>

       <div className="grid grid-cols-2 gap-8">
          <AnalyticsCharts data={data} />
          
          <div className="bg-surface-zinc/60 border border-white/10 rounded-2xl p-8 h-fit">
             <h3 className="text-lg font-bold text-white mb-6">Insights</h3>
             <div className="space-y-6">
                <div className="flex justify-between border-b border-white/5 pb-4">
                   <span className="text-zinc-400">Próximo Vencimiento</span>
                   <span className="text-white font-mono font-bold text-right">
                      {data.nextToExpire ? `${data.nextToExpire.email} (${new Date(data.nextToExpire.date).toLocaleDateString()})` : 'N/A'}
                   </span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-4">
                   <span className="text-zinc-400">Cliente Más Antiguo</span>
                   <span className="text-white font-mono font-bold text-right">
                      {data.oldestUser ? data.oldestUser.email : 'N/A'}
                   </span>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};

export default AdminAnalyticsDesktop;
