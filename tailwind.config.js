/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        'surface-1': 'rgb(var(--surface-1) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        'surface-3': 'rgb(var(--surface-3) / <alpha-value>)',
        'surface-4': 'rgb(var(--surface-4) / <alpha-value>)',
        'surface-sunken': 'rgb(var(--surface-sunken) / <alpha-value>)',
        'surface-zinc': 'rgb(var(--surface-zinc) / <alpha-value>)',
        'brand-whatsapp': 'rgb(var(--brand-whatsapp) / <alpha-value>)',
        'brand-telegram': 'rgb(var(--brand-telegram) / <alpha-value>)',

        'text-primary': 'rgb(var(--text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--text-secondary) / <alpha-value>)',
        'text-muted': 'rgb(var(--text-muted) / <alpha-value>)',
        'text-disabled': 'rgb(var(--text-disabled) / <alpha-value>)',
        'text-faint': 'rgb(var(--text-faint) / <alpha-value>)',

        'brand-primary': 'rgb(var(--brand-primary) / <alpha-value>)',
        'brand-primary-hi': 'rgb(var(--brand-primary-hi) / <alpha-value>)',
        'brand-accent': 'rgb(var(--brand-accent) / <alpha-value>)',
        'brand-lime': 'rgb(var(--brand-lime) / <alpha-value>)',

        'status-success': 'rgb(var(--status-success) / <alpha-value>)',
        'status-danger': 'rgb(var(--status-danger) / <alpha-value>)',
        'status-warning': 'rgb(var(--status-warning) / <alpha-value>)',
        'status-info': 'rgb(var(--status-info) / <alpha-value>)',
        'status-success-soft': 'rgb(var(--status-success-soft) / <alpha-value>)',
        'status-danger-soft': 'rgb(var(--status-danger-soft) / <alpha-value>)',
        'status-warning-soft': 'rgb(var(--status-warning-soft) / <alpha-value>)',
        'status-info-soft': 'rgb(var(--status-info-soft) / <alpha-value>)',
        'status-expiring': 'rgb(var(--status-expiring) / <alpha-value>)',
        'status-expiring-soft': 'rgb(var(--status-expiring-soft) / <alpha-value>)',

        hairline: 'var(--border-hairline)',
        'border-subtle': 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
      },
      // Tailwind genera las utilidades de color anteponiendo el prefijo de la
      // categoría (text-/bg-/border-) al *nombre* del color. Como varios
      // nombres de arriba ya empiezan con ese mismo prefijo ('text-primary',
      // 'border-subtle', etc.), Tailwind generaba 'text-text-primary',
      // 'border-border-subtle', etc. — no las clases cortas ('text-primary',
      // 'border-subtle') que ~1900 usos en toda la app esperan. Estas
      // secciones agregan esas clases cortas sin tocar lo anterior (que
      // sigue existiendo por si algo lo usa).
      textColor: {
        primary: 'rgb(var(--text-primary) / <alpha-value>)',
        secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
        disabled: 'rgb(var(--text-disabled) / <alpha-value>)',
        faint: 'rgb(var(--text-faint) / <alpha-value>)',
      },
      borderColor: {
        subtle: 'var(--border-subtle)',
        strong: 'var(--border-strong)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        'elev-sm': 'var(--shadow-sm)',
        'elev-md': 'var(--shadow-md)',
        'elev-lg': 'var(--shadow-lg)',
        modal: 'var(--shadow-modal)',
        'glow-primary': 'var(--glow-primary)',
        'glow-primary-sm': 'var(--glow-primary-sm)',
        'glow-accent': 'var(--glow-accent)',
        // Alias: antes `shadow-glow`/`shadow-glow-sm` solo existían en el
        // script de respaldo de Tailwind cargado en index.html (ya
        // eliminado). Se agregan acá, apuntando a los mismos tokens
        // oficiales de marca, para que las ~83 clases que ya los usan en
        // toda la app sigan funcionando exactamente igual sin depender de
        // un script externo.
        glow: 'var(--glow-primary)',
        'glow-sm': 'var(--glow-primary-sm)',
      },
      backgroundImage: {
        'brand-gradient': 'var(--brand-gradient)',
      },
      letterSpacing: {
        premium: 'var(--tracking-tight)',
        eyebrow: 'var(--tracking-uppercase)',
      },
      transitionTimingFunction: {
        'out-soft': 'var(--ease-out-soft)',
      },
    },
  },
  plugins: [],
};
