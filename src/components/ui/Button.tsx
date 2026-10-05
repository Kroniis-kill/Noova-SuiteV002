import React from 'react';
import { Loader2 } from 'lucide-react';
import { cx } from '../../utils/cx';

/**
 * Botón global — fuente única de verdad para altura, radio, tipografía,
 * transición, foco, disabled y loading.
 *
 * Variantes:
 *  - primary   → degradado de marca (acción principal de la pantalla)
 *  - secondary → superficie elevada con borde (acción alternativa)
 *  - outline   → solo borde (acción neutra)
 *  - ghost     → sin fondo (acciones de baja jerarquía, "Cancelar")
 *  - danger    → rojo sólido (acciones destructivas)
 *  - success   → verde sólido (confirmaciones positivas)
 *
 * Tamaños: sm (40px) · md (48px, default) · lg (52px, botón principal de modal).
 * Con `iconOnly` el botón es cuadrado y `aria-label` es obligatorio.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-brand-primary to-brand-accent text-white font-bold shadow-glow-primary hover:brightness-110',
  secondary:
    'bg-surface-3 text-text-secondary font-semibold border border-border-subtle hover:bg-surface-4 hover:text-text-primary',
  outline:
    'bg-transparent text-text-primary font-semibold border border-border-strong hover:bg-[rgb(var(--fg-rgb))]/5',
  ghost:
    'bg-transparent text-text-muted font-semibold hover:bg-[rgb(var(--fg-rgb))]/5 hover:text-text-primary',
  danger: 'bg-status-danger text-white font-bold shadow-glow-danger hover:brightness-110',
  success: 'bg-status-success text-white font-bold hover:brightness-110',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-xs gap-1.5',
  md: 'h-12 px-5 text-sm gap-2',
  lg: 'h-[52px] px-6 text-sm gap-2',
};

const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-10 w-10',
  md: 'h-11 w-11',
  lg: 'h-12 w-12',
};

const BASE_CLASSES =
  'inline-flex items-center justify-center rounded-md select-none whitespace-nowrap shrink-0 ' +
  'transition-all duration-150 ease-out-soft active:scale-[0.98] ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100 disabled:hover:brightness-100';

type NativeButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

interface CommonProps extends NativeButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Muestra un spinner y bloquea el botón (aria-busy). */
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

type ButtonProps =
  | (CommonProps & { iconOnly?: false })
  | (CommonProps & { iconOnly: true; 'aria-label': string });

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      iconOnly = false,
      leftIcon,
      rightIcon,
      className,
      disabled,
      type = 'button',
      children,
      ...rest
    },
    ref,
  ) => {
    const spinnerSize = size === 'sm' ? 14 : 18;
    const startIcon = loading ? <Loader2 size={spinnerSize} className="animate-spin" aria-hidden="true" /> : leftIcon;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cx(
          BASE_CLASSES,
          VARIANT_CLASSES[variant],
          iconOnly ? ICON_SIZE_CLASSES[size] : SIZE_CLASSES[size],
          fullWidth && 'w-full',
          className,
        )}
        {...rest}
      >
        {iconOnly ? (
          loading ? <Loader2 size={spinnerSize} className="animate-spin" aria-hidden="true" /> : children
        ) : (
          <>
            {startIcon}
            {children}
            {!loading && rightIcon}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
