import React from 'react';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { cx } from '../../utils/cx';
import {
  FieldLabel,
  FieldMessage,
  FieldSize,
  fieldControlClass,
  fieldShellClass,
  useFieldIds,
} from './Field';

/**
 * Campos de formulario globales: Input, Textarea, Select y SearchInput.
 *
 * Estados soportados: default · hover · focus · filled · error · success ·
 * disabled · loading. El error se muestra debajo del campo (con ícono) y se
 * enlaza con aria-describedby / aria-invalid. Siempre usar `label` en lugar
 * de depender del placeholder. Para fechas usar `<Input type="date" />`.
 */

interface FieldExtras {
  label?: string;
  hint?: string;
  error?: string;
  success?: boolean;
  size?: FieldSize;
  containerClassName?: string;
}

/* ───────────────────────────── Input ───────────────────────────── */

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    FieldExtras {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label, hint, error, success, size = 'md', containerClassName,
      loading, leftIcon, rightSlot, className, id: idProp, disabled, required, ...rest
    },
    ref,
  ) => {
    const { id, messageId } = useFieldIds(idProp);
    const hasMessage = Boolean(error || hint);

    return (
      <div className={containerClassName}>
        <FieldLabel htmlFor={id} label={label} required={required} />
        <div className={fieldShellClass({ error: !!error, success, disabled, size })}>
          {leftIcon && (
            <span className="shrink-0 text-text-muted" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            disabled={disabled}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={hasMessage ? messageId : undefined}
            className={cx(fieldControlClass, 'h-full', className)}
            {...rest}
          />
          {loading ? (
            <Loader2 size={16} className="shrink-0 animate-spin text-text-muted" aria-hidden="true" />
          ) : success && !error ? (
            <Check size={16} strokeWidth={3} className="shrink-0 text-status-success-soft" aria-hidden="true" />
          ) : null}
          {rightSlot}
        </div>
        <FieldMessage id={messageId} error={error} hint={hint} />
      </div>
    );
  },
);
Input.displayName = 'Input';

/* ──────────────────────────── Textarea ─────────────────────────── */

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    Omit<FieldExtras, 'size'> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { label, hint, error, success, containerClassName, className, id: idProp, disabled, required, rows = 4, ...rest },
    ref,
  ) => {
    const { id, messageId } = useFieldIds(idProp);
    const hasMessage = Boolean(error || hint);

    return (
      <div className={containerClassName}>
        <FieldLabel htmlFor={id} label={label} required={required} />
        <div className={fieldShellClass({ error: !!error, success, disabled, multiline: true })}>
          <textarea
            ref={ref}
            id={id}
            rows={rows}
            disabled={disabled}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={hasMessage ? messageId : undefined}
            className={cx(fieldControlClass, 'resize-none leading-relaxed', className)}
            {...rest}
          />
        </div>
        <FieldMessage id={messageId} error={error} hint={hint} />
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

/* ───────────────────────────── Select ──────────────────────────── */

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    FieldExtras {}

/** Select nativo (mejor experiencia en móvil) con el mismo aspecto que Input. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, hint, error, success, size = 'md', containerClassName, className, id: idProp, disabled, required, children, ...rest },
    ref,
  ) => {
    const { id, messageId } = useFieldIds(idProp);
    const hasMessage = Boolean(error || hint);

    return (
      <div className={containerClassName}>
        <FieldLabel htmlFor={id} label={label} required={required} />
        <div className={cx(fieldShellClass({ error: !!error, success, disabled, size }), 'pr-3')}>
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={hasMessage ? messageId : undefined}
            className={cx(fieldControlClass, 'h-full appearance-none cursor-pointer disabled:cursor-not-allowed', className)}
            {...rest}
          >
            {children}
          </select>
          <ChevronDown size={18} className="pointer-events-none shrink-0 text-text-muted" aria-hidden="true" />
        </div>
        <FieldMessage id={messageId} error={error} hint={hint} />
      </div>
    );
  },
);
Select.displayName = 'Select';

/* ─────────────────────────── SearchInput ───────────────────────── */

export interface SearchInputProps
  extends Omit<InputProps, 'leftIcon' | 'rightSlot' | 'type' | 'label' | 'error' | 'success' | 'hint'> {
  /** Si se pasa, aparece el botón "Borrar búsqueda" cuando hay texto. */
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, className, placeholder = 'Buscar…', value, ...rest }, ref) => {
    const hasText = value !== undefined && String(value).length > 0;
    return (
      <Input
        ref={ref}
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        aria-label={rest['aria-label'] ?? 'Buscar'}
        placeholder={placeholder}
        value={value}
        leftIcon={<Search size={18} />}
        rightSlot={
          onClear && hasText ? (
            <button
              type="button"
              onClick={onClear}
              aria-label="Borrar búsqueda"
              className="tap-44 -mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-text-muted transition-colors hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
            >
              <X size={16} aria-hidden="true" />
            </button>
          ) : undefined
        }
        className={cx('[&::-webkit-search-cancel-button]:appearance-none', className)}
        {...rest}
      />
    );
  },
);
SearchInput.displayName = 'SearchInput';

export default Input;
