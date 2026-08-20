import React from 'react';

/**
 * Primitivo de Tarjeta — fuente única de verdad para bg, border, radius, padding y hover.
 *
 * Variantes:
 *  - default     → tarjeta estándar (surface-1 + hairline)
 *  - flat        → sin borde, fondo más sutil (surface-sunken)
 *  - elevated    → con sombra y blur, para destacar (surface-3/80 + backdrop-blur)
 *  - interactive → default + hover/active states (cursor-pointer)
 *  - ghost       → transparente con sólo borde (para listas tipo "row")
 *
 * Padding (`pad`):
 *  - none → sin padding (el consumidor lo controla)
 *  - sm   → p-3 lg:p-3.5
 *  - md   → p-4 lg:p-5   (default)
 *  - lg   → p-5 lg:p-6
 *
 * Radio (`radius`): xs | sm | md | lg | xl | 2xl  (default: lg = 18px)
 */
export type CardVariant = 'default' | 'flat' | 'elevated' | 'interactive' | 'ghost';
export type CardPad = 'none' | 'sm' | 'md' | 'lg';
export type CardRadius = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  pad?: CardPad;
  radius?: CardRadius;
  as?: keyof React.JSX.IntrinsicElements;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default:     'bg-surface-1 border border-border-subtle shadow-elev-sm',
  flat:        'bg-surface-sunken border border-hairline',
  elevated:    'bg-surface-3/80 backdrop-blur-xl border border-border-subtle shadow-elev-md',
  interactive: 'bg-surface-1 border border-border-subtle shadow-elev-sm cursor-pointer hover:border-border-strong hover:bg-surface-2 active:scale-[0.99] transition-all duration-150 ease-out-soft',
  ghost:       'bg-transparent border border-border-subtle hover:border-border-strong transition-colors',
};

const PAD_CLASSES: Record<CardPad, string> = {
  none: '',
  sm:   'p-3 lg:p-3.5',
  md:   'p-4 lg:p-5',
  lg:   'p-5 lg:p-6',
};

const RADIUS_CLASSES: Record<CardRadius, string> = {
  xs: 'rounded-xs',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
};

/**
 * Helper para componer las mismas clases manualmente, útil cuando
 * el wrapper externo necesita ser un `<button>`, `<motion.div>` u otro.
 */
export function cardClass(opts: {
  variant?: CardVariant;
  pad?: CardPad;
  radius?: CardRadius;
  className?: string;
} = {}): string {
  const { variant = 'default', pad = 'md', radius = 'xl', className = '' } = opts;
  return [
    VARIANT_CLASSES[variant],
    PAD_CLASSES[pad],
    RADIUS_CLASSES[radius],
    'overflow-hidden',
    className,
  ].filter(Boolean).join(' ');
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', pad = 'md', radius = 'lg', className = '', as, children, ...rest }, ref) => {
    const Comp = (as ?? 'div') as React.ElementType;
    return (
      <Comp
        ref={ref}
        className={cardClass({ variant, pad, radius, className })}
        {...rest}
      >
        {children}
      </Comp>
    );
  },
);

Card.displayName = 'Card';

export default Card;
