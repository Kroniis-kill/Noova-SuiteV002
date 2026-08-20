import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, LucideIcon } from 'lucide-react';
import { cardClass } from '../ui/Card';


interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: string;
  subValue?: string;
  className?: string; // Added prop to pass className
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp, color = 'primary', subValue, className }) => {
  
  const getColorClasses = () => {
    switch (color) {
      case 'primary': return 'from-primary to-accent text-white';
      case 'emerald': return 'from-emerald-500 to-teal-500 text-white';
      case 'amber': return 'from-orange-400 to-amber-500 text-white';
      case 'red': return 'from-red-500 to-rose-600 text-white';
      case 'blue': return 'from-blue-500 to-cyan-500 text-white';
      default: return 'from-zinc-700 to-zinc-600 text-white';
    }
  };

  return (
    <motion.div 
      {...({
        whileHover: { scale: 1.02 },
        transition: { type: "spring", stiffness: 300, damping: 20 }
      } as any)}
      className={cardClass({ variant: 'elevated', pad: 'md', radius: 'lg', className: `relative flex flex-col justify-between ${className ?? ''}` })}
    >
      <div className="flex justify-between items-start mb-3 relative z-10">
        <div className={`p-2.5 rounded-2xl bg-gradient-to-br ${getColorClasses()} shadow-lg`}>
          <Icon size={20} className="text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${trendUp ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
            {trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {trend}
          </div>
        )}
      </div>
      
      <div className="relative z-10">
        <h4 className="text-white/50 text-[11px] font-semibold uppercase tracking-wider mb-1">{title}</h4>
        <div className="text-2xl md:text-3xl font-bold text-white tracking-tight drop-shadow-sm">{value}</div>
        {subValue && (
          <p className="text-[11px] text-white/40 mt-1 font-medium">{subValue}</p>
        )}
      </div>

      {/* Background decoration */}
      <div className={`absolute -bottom-8 -right-8 w-32 h-32 rounded-full blur-[60px] opacity-10 bg-gradient-to-br ${getColorClasses()}`} />
    </motion.div>
  );
};

export default StatCard;