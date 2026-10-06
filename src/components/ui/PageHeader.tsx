import React from 'react';
import { isNativePlatform } from '../../utils/platformUtils';
import { cx } from '../../utils/cx';

/**
 * Estructura estándar de las pantallas móviles de Noova (basada en Clientes
 * y Ventas). Usar siempre estas dos piezas en lugar de armar el encabezado y
 * los márgenes a mano, para que todas las pantallas tengan el mismo ritmo:
 *
 *   <div className={PAGE_SHELL}>
 *     <PageHeader title="Finanzas" subtitle="Control de capital" actions={…} />
 *     …contenido…
 *   </div>
 *
 * Márgenes: 16px laterales, safe-area superior + 16px, y 128px abajo para que
 * el contenido no quede bajo la barra de navegación inferior.
 */
export const PAGE_SHELL = 'min-h-dvh pb-32 px-4 font-sans text-text-primary relative';

interface PageHeaderProps {
  title: string;
  /** Texto corto bajo el título (se muestra en mayúsculas pequeñas). */
  subtitle?: string;
  /** Ícono opcional dentro de una insignia con el degradado de marca. */
  icon?: React.ReactNode;
  /** Botones de acción a la derecha (usar <Button iconOnly size="sm" />). */
  actions?: React.ReactNode;
  /** Sin safe-area ni margen superior: para pantallas anidadas dentro de otra (p. ej. subpáginas de Ajustes). */
  compact?: boolean;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon, actions, compact = false, className }) => (
  <header className={cx('relative z-20 flex items-center justify-between gap-3 mb-4', !compact && (isNativePlatform() ? 'pt-safe mt-2' : 'pt-safe mt-4'), className)}>
    <div className="flex items-center gap-3 min-w-0">
      {icon && (
        <div
          aria-hidden="true"
          className="w-10 h-10 shrink-0 rounded-md bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white shadow-glow-sm"
        >
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <h1 className="text-2xl font-black text-text-primary tracking-tight leading-none truncate">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-text-muted text-micro font-bold uppercase tracking-[0.15em] truncate">{subtitle}</p>
        )}
      </div>
    </div>
    {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
  </header>
);

export default PageHeader;
