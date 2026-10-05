import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cx } from '../../utils/cx';

/**
 * Piezas compartidas por todos los campos de formulario (Input, Textarea,
 * Select, SearchInput…). Mantiene en un solo lugar: etiqueta, caja del campo,
 * estados (default / hover / focus / error / success / disabled) y mensajes.
 */

export const fieldLabelClass =
  'block ml-1 mb-2 text-tiny font-semibold text-text-muted uppercase tracking-widest';

/** Estilo del <input>/<select>/<textarea> interno (la caja la dibuja el contenedor). */
export const fieldControlClass =
  'w-full min-w-0 bg-transparent border-0 rounded-md p-0 text-sm font-medium text-text-primary ' +
  'placeholder:text-text-disabled outline-none ring-0 disabled:cursor-not-allowed';

export type FieldSize = 'sm' | 'md';

interface ShellOptions {
  error?: boolean;
  success?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  size?: FieldSize;
}

/** Clases de la caja visual del campo. */
export function fieldShellClass({ error, success, disabled, multiline, size = 'md' }: ShellOptions): string {
  return cx(
    'relative flex gap-3 px-4 bg-surface-sunken border rounded-md transition-all duration-150',
    multiline ? 'items-start py-3' : cx('items-center', size === 'sm' ? 'h-11' : 'h-[52px]'),
    'focus-within:outline focus-within:outline-2 focus-within:outline-offset-0',
    error
      ? 'border-status-danger/60 focus-within:border-status-danger focus-within:outline-status-danger/20'
      : success
        ? 'border-status-success/50 focus-within:border-status-success focus-within:outline-status-success/20'
        : 'border-border-subtle hover:border-border-strong focus-within:border-brand-primary/60 focus-within:outline-brand-primary/20',
    disabled && 'opacity-50 cursor-not-allowed hover:border-border-subtle',
  );
}

/** Ids estables para enlazar label ↔ campo ↔ mensaje (aria-describedby). */
export function useFieldIds(idProp?: string) {
  const generated = React.useId();
  const id = idProp ?? generated;
  return { id, messageId: `${id}-msg` };
}

interface FieldLabelProps {
  htmlFor: string;
  label?: string;
  required?: boolean;
}

export const FieldLabel: React.FC<FieldLabelProps> = ({ htmlFor, label, required }) => {
  if (!label) return null;
  return (
    <label htmlFor={htmlFor} className={fieldLabelClass}>
      {label}
      {required && (
        <span className="ml-0.5 text-status-danger-soft" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
};

interface FieldMessageProps {
  id: string;
  error?: string;
  hint?: string;
}

/** Error (con ícono, no solo color) o ayuda, siempre junto al campo. */
export const FieldMessage: React.FC<FieldMessageProps> = ({ id, error, hint }) => {
  if (error) {
    return (
      <p id={id} aria-live="polite" className="mt-1.5 ml-1 flex items-start gap-1.5 text-caption font-medium text-status-danger-soft">
        <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </p>
    );
  }
  if (hint) {
    return (
      <p id={id} className="mt-1.5 ml-1 text-caption text-text-muted">
        {hint}
      </p>
    );
  }
  return null;
};
