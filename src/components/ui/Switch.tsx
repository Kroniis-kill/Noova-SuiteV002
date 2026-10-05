import React from 'react';
import { cx } from '../../utils/cx';

/**
 * Interruptor accesible (role="switch"). Misma apariencia que el ToggleSwitch
 * histórico de Ajustes, pero con semántica correcta, foco visible y label.
 * Pasa `aria-label` (o `aria-labelledby`) para que lo anuncien los lectores.
 */
interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onChange, disabled, id, className, ...aria }, ref) => (
    <button
      ref={ref}
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative w-12 h-7 rounded-pill shrink-0 transition-colors duration-200',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        checked ? 'bg-brand-primary' : 'bg-[rgb(var(--fg-rgb))]/20',
        className,
      )}
      {...aria}
    >
      <span
        aria-hidden="true"
        className={cx(
          'absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-elev-sm transition-transform duration-200',
          checked && 'translate-x-5',
        )}
      />
    </button>
  ),
);

Switch.displayName = 'Switch';

export default Switch;
