import React from 'react';
import { Check } from 'lucide-react';
import { cx } from '../../utils/cx';
import { FieldMessage, fieldLabelClass, useFieldIds } from './Field';

/**
 * Checkbox y RadioGroup globales. Usan el <input> nativo (teclado, lectores
 * de pantalla y formularios funcionan solos) y dibujan encima el control
 * visual con los tokens del sistema.
 */

const BOX_FOCUS =
  'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-primary';

const ROW_CLASS =
  'flex items-start gap-3 cursor-pointer select-none has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed';

/* ───────────────────────────── Checkbox ────────────────────────── */

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: React.ReactNode;
  description?: string;
  error?: string;
  containerClassName?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, containerClassName, className, id: idProp, ...rest }, ref) => {
    const { id, messageId } = useFieldIds(idProp);
    return (
      <div className={containerClassName}>
        <label htmlFor={id} className={ROW_CLASS}>
          <input
            ref={ref}
            id={id}
            type="checkbox"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? messageId : undefined}
            className={cx('peer sr-only', className)}
            {...rest}
          />
          <span
            aria-hidden="true"
            className={cx(
              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-xs border bg-surface-sunken text-white transition-colors',
              error ? 'border-status-danger/60' : 'border-border-strong',
              'peer-checked:border-brand-primary peer-checked:bg-brand-primary',
              '[&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100',
              BOX_FOCUS,
            )}
          >
            <Check size={14} strokeWidth={3} />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-text-primary">{label}</span>
            {description && <span className="mt-0.5 block text-caption text-text-muted">{description}</span>}
          </span>
        </label>
        <FieldMessage id={messageId} error={error} />
      </div>
    );
  },
);
Checkbox.displayName = 'Checkbox';

export default Checkbox;

/* ──────────────────────────── RadioGroup ───────────────────────── */

export interface RadioOption<T extends string> {
  value: T;
  label: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps<T extends string> {
  legend: string;
  value: T | null | undefined;
  onChange: (value: T) => void;
  options: RadioOption<T>[];
  name?: string;
  error?: string;
  orientation?: 'vertical' | 'horizontal';
  /** Oculta la leyenda visualmente (sigue disponible para lectores de pantalla). */
  hideLegend?: boolean;
  className?: string;
}

export function RadioGroup<T extends string>({
  legend,
  value,
  onChange,
  options,
  name,
  error,
  orientation = 'vertical',
  hideLegend = false,
  className,
}: RadioGroupProps<T>) {
  const { id, messageId } = useFieldIds();
  const groupName = name ?? id;

  return (
    <fieldset className={cx('min-w-0 border-0 p-0 m-0', className)} aria-describedby={error ? messageId : undefined}>
      <legend className={hideLegend ? 'sr-only' : fieldLabelClass}>{legend}</legend>
      <div className={cx('flex gap-3', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap')}>
        {options.map((opt) => (
          <label key={opt.value} className={ROW_CLASS}>
            <input
              type="radio"
              name={groupName}
              value={opt.value}
              checked={value === opt.value}
              disabled={opt.disabled}
              onChange={() => onChange(opt.value)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={cx(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border bg-surface-sunken transition-colors',
                error ? 'border-status-danger/60' : 'border-border-strong',
                'peer-checked:border-brand-primary',
                '[&>span]:scale-0 peer-checked:[&>span]:scale-100',
                BOX_FOCUS,
              )}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-brand-primary transition-transform duration-150" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-text-primary">{opt.label}</span>
              {opt.description && <span className="mt-0.5 block text-caption text-text-muted">{opt.description}</span>}
            </span>
          </label>
        ))}
      </div>
      <FieldMessage id={messageId} error={error} />
    </fieldset>
  );
}
