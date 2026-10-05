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
      zIndex: {
        nav: 'var(--z-nav)',
        header: 'var(--z-header)',
        dropdown: 'var(--z-dropdown)',
        page: 'var(--z-page)',
        fullscreen: 'var(--z-fullscreen)',
        banner: 'var(--z-banner)',
        blocking: 'var(--z-blocking)',
        'modal-base': 'var(--z-modal-base)',
        'modal-overlay': 'var(--z-modal-overlay)',
        'modal-content': 'var(--z-modal-content)',
        'modal-top': 'var(--z-modal-top)',
        lockout: 'var(--z-lockout)',
        toast: 'var(--z-toast)',
        'alert-overlay': 'var(--z-alert-overlay)',
        alert: 'var(--z-alert)',
      },
      // Escala tipográfica para tamaños que no cubre Tailwind. Son solo
      // font-size (sin line-height), igual que antes con text-[Npx].
      fontSize: {
        nano: '8px',
        micro: '9px',
        tiny: '10px',
        caption: '11px',
        label: '12px',
        'body-sm': '13px',
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
        'glow-md': 'var(--glow-primary-md)',
        'glow-danger': '0 0 20px rgb(var(--status-danger) / 0.4)',
        // Puntos de estado luminosos (antes shadow-[0_0_8px_#hex])
        'dot-primary': '0 0 8px rgb(var(--brand-primary))',
        'dot-accent': '0 0 10px rgb(var(--brand-accent))',
        'dot-accent-sm': '0 0 5px rgb(var(--brand-accent))',
        'dot-success': '0 0 8px rgb(var(--status-success))',
        'dot-success-sm': '0 0 5px rgb(var(--status-success))',
        'dot-warning-sm': '0 0 5px rgb(var(--status-warning))',
        'dot-danger-sm': '0 0 5px rgb(var(--status-danger))',
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
