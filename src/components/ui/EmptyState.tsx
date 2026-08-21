import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon: React.ElementType;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon: Icon, actionLabel, onAction }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center text-center p-8 min-h-[400px]"
    >
      <div className="relative mb-6">
        {/* Ilustración de fondo en gradiente */}
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary to-brand-accent blur-[60px] opacity-10 rounded-full" />
        <div className="relative w-24 h-24 rounded-2xl bg-surface-1 border border-[rgb(var(--fg-rgb))]/5 flex items-center justify-center shadow-2xl">
          <Icon size={40} className="text-brand-primary" strokeWidth={1.5} />
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-primary mb-2 tracking-tight">
        {title}
      </h3>
      <p className="text-disabled text-sm max-w-[260px] leading-relaxed mb-8">
        {description}
      </p>

      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-6 py-3 bg-[rgb(var(--fg-rgb))]/5 hover:bg-[rgb(var(--fg-rgb))]/10 text-primary rounded-full text-xs font-semibold transition-all border border-[rgb(var(--fg-rgb))]/10 active:scale-95 shadow-lg group"
        >
          <Plus size={16} className="text-brand-accent group-hover:scale-110 transition-transform" />
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
};

export default EmptyState;