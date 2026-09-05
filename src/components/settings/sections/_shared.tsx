import React from 'react';

// Primitivas y estilos compartidos de las secciones de Ajustes.
// Alineadas a los mismos tokens de diseño que ya usa el resto de la app
// (NotificationCenter, InAppNotifications, SaleModal, etc.): border-subtle,
// shadow-elev-*, radios rounded-xl/2xl y el mismo lenguaje de "cards".

export const styles = {
  card: "bg-surface-1 border border-border-subtle rounded-xl p-6 mb-6 shadow-elev-sm",
  sectionTitle: "text-lg font-bold text-text-primary mb-6",
  label: "text-[10px] font-semibold text-text-disabled uppercase tracking-wider mb-2 block ml-1",
  input: "w-full bg-surface-sunken border border-border-subtle rounded-xl px-4 h-[52px] text-sm text-text-primary outline-none focus:border-brand-primary/50 focus:shadow-glow-sm transition-all placeholder:text-text-faint font-medium",
  textarea: "w-full bg-transparent text-sm text-text-secondary outline-none transition-all placeholder:text-text-faint font-medium h-full resize-none leading-relaxed",
  select: "w-full h-full bg-transparent text-[14px] text-text-primary px-4 outline-none appearance-none cursor-pointer font-medium rounded-xl",
  buttonPrimary: "w-full h-[52px] bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-xl font-bold text-sm shadow-glow transition-all active:scale-[0.98] flex items-center justify-center gap-2 hover:brightness-110",
  buttonDanger: "w-full h-[52px] bg-surface-1 border border-status-danger/20 text-status-danger-soft hover:bg-status-danger/10 rounded-xl font-bold text-sm transition-all flex items-center justify-between px-6 mb-3 active:scale-[0.98]",
  toggleContainer: "flex items-center justify-between bg-surface-sunken p-4 rounded-xl border border-border-subtle",
  toggleActive: "bg-brand-primary",
  toggleInactive: "bg-zinc-700",
};

export const StatusRow = ({ icon: Icon, label, status, color }: any) => (
  <div className="flex items-center justify-between p-4 bg-surface-sunken border border-border-subtle rounded-xl mb-3 last:mb-0">
     <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[rgb(var(--fg-rgb))]/5 border border-border-subtle">
           <Icon size={18} className="text-text-muted" />
        </div>
        <span className="text-sm font-bold text-text-primary">{label}</span>
     </div>
     <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-pill border uppercase ${color}`}>
        {status}
     </span>
  </div>
);

export const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <button
    type="button"
    onClick={onChange}
    aria-pressed={checked}
    className={`w-12 h-7 rounded-pill relative transition-colors duration-300 shrink-0 ${checked ? styles.toggleActive : styles.toggleInactive}`}
  >
    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-elev-sm transition-transform duration-300 ${checked ? 'translate-x-5' : ''}`} />
  </button>
);

/** Encabezado de subsección: ícono + título, mismo patrón en toda la app. */
export const SectionHeading = ({
  icon: Icon,
  title,
  colorClass = 'text-brand-primary',
}: { icon: any; title: string; colorClass?: string }) => (
  <div className={`flex items-center gap-2 mb-2 ${colorClass}`}>
    <Icon size={18} />
    <h3 className="font-bold text-text-primary text-sm">{title}</h3>
  </div>
);

/** Selector de pestañas tipo "pill" — reemplaza el bloque duplicado que existía
 *  en BusinessSettings, LegalSection y MessagesSection con distintos radios/bordes. */
export const TabSwitcher = <T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; icon?: any }[];
  active: T;
  onChange: (id: T) => void;
}) => (
  <div className="flex bg-surface-1 p-1.5 rounded-xl border border-border-subtle w-full mb-4 shadow-elev-sm">
    {tabs.map((tab) => {
      const Icon = tab.icon;
      const isActive = active === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all text-center active:scale-[0.98] ${
            isActive
              ? 'bg-surface-4 text-text-primary shadow-elev-sm border border-border-subtle'
              : 'text-text-disabled hover:text-text-primary'
          }`}
        >
          {Icon && <Icon size={14} />}
          {tab.label}
        </button>
      );
    })}
  </div>
);
