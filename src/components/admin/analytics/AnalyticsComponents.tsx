
import React from 'react';
import { AdminAnalyticsData } from '../../../types/adminTypes';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsDashboardProps {
  data: AdminAnalyticsData;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

export const AnalyticsCharts: React.FC<AnalyticsDashboardProps> = ({ data }) => {
  const planData = Object.entries(data.byPlan).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
       {/* Plans Distribution */}
       <div className="bg-surface-zinc/60 border border-[rgb(var(--fg-rgb))]/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-text-primary mb-6">Distribución de Planes</h3>
          <div className="h-[250px] w-full relative">
             <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                   <Pie
                      data={planData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                   >
                      {planData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                   </Pie>
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                   />
                </PieChart>
             </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 justify-center mt-4">
             {planData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                   <span className="text-xs text-text-muted capitalize">{entry.name}</span>
                </div>
             ))}
          </div>
       </div>

       {/* Monthly Growth */}
       <div className="bg-surface-zinc/60 border border-[rgb(var(--fg-rgb))]/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-text-primary mb-6">Nuevos Usuarios (Último Año)</h3>
          <div className="h-[250px] w-full relative">
             <ResponsiveContainer width="99%" height="100%">
                <BarChart data={data.registrationsByMonth}>
                   <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                   <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                      contentStyle={{ backgroundColor: '#09090b', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                   />
                   <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
             </ResponsiveContainer>
          </div>
       </div>
    </div>
  );
};
