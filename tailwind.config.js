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

        hairline: 'var(--border-hairline)',
        'border-subtle': 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
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
