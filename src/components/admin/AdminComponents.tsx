import React, { useState } from 'react';
import { User, Calendar, CheckCircle, XCircle, Search, CreditCard, Clock } from 'lucide-react';
import { UserSubscription, PLAN_LABELS } from '../../types/subscriptionTypes';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => (
  <div className="bg-surface-1 backdrop-blur-xl border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-5 relative overflow-hidden group shadow-sm">
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-4">
        <div className={`w-10 h-10 rounded-sm flex items-center justify-center text-text-primary shadow-lg ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      <p className="text-text-disabled text-xs font-semibold uppercase tracking-wider">{title}</p>
      <h4 className="text-2xl font-bold text-text-primary mt-1">{value}</h4>
    </div>
  </div>
);

interface SubscriptionRowProps {
  sub: UserSubscription;
  onToggle: () => void;
}

export const SubscriptionRow: React.FC<SubscriptionRowProps> = ({ sub, onToggle }) => {
  const isExpired = new Date(sub.expires_at) < new Date();
  
  return (
    <div className="bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center text-white font-semibold text-xs">
           {sub.user_email ? sub.user_email.substring(0,2).toUpperCase() : 'U'}
        </div>
        <div>
           <p className="text-text-primary font-bold text-sm">{sub.user_email || sub.user_id}</p>
           <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] bg-[rgb(var(--fg-rgb))]/5 px-2 py-0.5 rounded border border-[rgb(var(--fg-rgb))]/5 text-text-muted">
                 {PLAN_LABELS[sub.plan]}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded border ${isExpired ? 'bg-status-danger/10 text-status-danger-soft border-status-danger/20' : 'bg-status-success/10 text-status-success-soft border-status-success/20'}`}>
                 {isExpired ? 'Expirado' : 'Vigente'}
              </span>
           </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 justify-between md:justify-end">
         <div className="text-right">
            <p className="text-[10px] text-text-disabled font-bold uppercase">Vence</p>
            <p className="text-xs text-text-secondary font-mono">{new Date(sub.expires_at).toLocaleDateString()}</p>
         </div>
         
         <button 
           onClick={onToggle}
           className={`w-10 h-10 rounded-md flex items-center justify-center border transition-all ${sub.is_active ? 'bg-status-success/10 border-status-success/20 text-status-success-soft' : 'bg-status-danger/10 border-status-danger/20 text-status-danger-soft'}`}
         >
            {sub.is_active ? <CheckCircle size={18} /> : <XCircle size={18} />}
         </button>
      </div>
    </div>
  );
};