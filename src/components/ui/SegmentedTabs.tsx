import React from 'react';
import { motion } from 'framer-motion';
import { cx } from '../../utils/cx';

/**
 * Selector de pestañas / filtros único de la app. Reemplaza las barras de
 * pestañas distintas que tenía cada pantalla.
 *
 *  - variant="segmented" (default): barra con fondo; ícono y texto apilados.
 *    Para secciones de una pantalla (Finanzas, Admin…).
 *  - variant="chips": botones tipo píldora en una fila con scroll horizontal.
 *    Para filtros de rango (Reportes: Este mes, Año…).
 */
export interface SegmentedTab<T extends string> {
  id: T;
  label: string;
  icon?: React.ElementType;
}

interface SegmentedTabsProps<T extends string> {
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (id: T) => void;
  variant?: 'segmented' | 'chips';
  /** Etiqueta accesible del grupo, por ejemplo "Secciones de finanzas". */
  ariaLabel: string;
  className?: string;
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  variant = 'segmented',
  ariaLabel,
  className,
}: SegmentedTabsProps<T>) {
  const groupId = React.useId();

  if (variant === 'chips') {
    return (
      <div role="tablist" aria-label={ariaLabel} className={cx('flex gap-2 overflow-x-auto no-scrollbar pb-1', className)}>
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(tab.id)}
              className={cx(
                'h-10 px-4 rounded-md text-caption font-semibold whitespace-nowrap border transition-all active:scale-[0.97]',
                active
                  ? 'bg-gradient-to-r from-brand-primary to-brand-accent text-white border-transparent shadow-glow-sm'
                  : 'bg-surface-1 border-border-subtle text-text-muted hover:text-text-primary',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cx('flex gap-1 p-1 bg-surface-1 border border-border-subtle rounded-xl overflow-x-auto no-scrollbar', className)}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cx(
              'relative flex-1 min-w-[72px] min-h-[48px] py-2 px-2 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors',
              'text-tiny font-bold tracking-wide',
              active ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary',
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-active-${groupId}`}
                className="absolute inset-0 rounded-lg bg-surface-4 border border-border-subtle"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            {Icon && <Icon size={15} className={cx('relative z-10', active && 'text-brand-primary-hi')} aria-hidden="true" />}
            <span className="relative z-10">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedTabs;
