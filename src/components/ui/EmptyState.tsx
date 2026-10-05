import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import Button from './Button';

/**
 * Estado vacío / de error de una pantalla o lista. Explica por qué no hay
 * contenido y ofrece una acción.
 *
 *  - tone="default" → no hay datos todavía (acción típica: crear el primero)
 *  - tone="error"   → falló la carga (acción típica: "Reintentar")
 *  - compact        → versión baja para listas dentro de tarjetas o pestañas
 */
interface EmptyStateProps {
  title: string;
  description: string;
  icon: React.ElementType;
  actionLabel?: string;
  onAction?: () => void;
  /** Ícono del botón de acción (por defecto "+"). */
  actionIcon?: React.ReactNode;
  tone?: 'default' | 'error';
  compact?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon,
  actionLabel,
  onAction,
  actionIcon,
  tone = 'default',
  compact = false,
}) => {
  const isError = tone === 'error';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      role={isError ? 'alert' : 'status'}
      className={`flex flex-col items-center justify-center text-center p-8 ${compact ? 'min-h-[220px]' : 'min-h-[400px]'}`}
    >
      <div
        className={`flex items-center justify-center border border-border-subtle shadow-elev-md ${
          compact ? 'w-16 h-16 rounded-xl mb-4' : 'w-24 h-24 rounded-xl mb-6'
        } ${isError ? 'bg-status-danger/10' : 'bg-surface-1'}`}
      >
        <Icon
          size={compact ? 28 : 40}
          className={isError ? 'text-status-danger' : 'text-brand-primary'}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>

      <h3 className={`font-bold text-text-primary mb-2 tracking-tight ${compact ? 'text-base' : 'text-xl'}`}>{title}</h3>
      <p className={`text-text-muted text-sm max-w-[280px] leading-relaxed ${onAction && actionLabel ? 'mb-6' : ''}`}>
        {description}
      </p>

      {onAction && actionLabel && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onAction}
          leftIcon={actionIcon ?? <Plus size={16} className="text-brand-accent" aria-hidden="true" />}
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
};

export default EmptyState;
