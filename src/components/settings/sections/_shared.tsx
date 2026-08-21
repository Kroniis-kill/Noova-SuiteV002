import React from 'react';

// Shared styles & primitives for Settings sections.
// Extracted from the old monolithic SettingsComponents.tsx to keep each
// section file under ~300 LOC.

export const styles = {
  card: "bg-surface-1 border border-[rgb(var(--fg-rgb))]/[0.08] rounded-xl p-6 mb-6 shadow-sm",
  sectionTitle: "text-lg font-bold text-primary mb-6",
  label: "text-[10px] font-semibold text-disabled uppercase tracking-wider mb-2 block ml-1",
  input: "w-full bg-surface-sunken border border-[rgb(var(--fg-rgb))]/10 rounded-md px-4 h-[52px] text-sm text-primary outline-none focus:border-brand-primary/50 transition-all placeholder:text-faint font-medium",
  textarea: "w-full bg-transparent text-sm text-secondary outline-none transition-all placeholder:text-faint font-medium h-full resize-none leading-relaxed",
  select: "w-full h-full bg-transparent text-[14px] text-primary px-4 outline-none appearance-none cursor-pointer font-medium rounded-md",
  buttonPrimary: "w-full h-[52px] bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-bold text-sm shadow-[0_0_20px_-5px_rgba(106,44,255,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 hover:brightness-110",
  buttonDanger: "w-full h-[52px] bg-surface-1 border border-status-danger/20 text-status-danger-soft hover:bg-status-danger/10 rounded-lg font-bold text-sm transition-all flex items-center justify-between px-6 mb-3 active:scale-[0.98]",
  toggleContainer: "flex items-center justify-between bg-surface-sunken p-4 rounded-md border border-[rgb(var(--fg-rgb))]/5",
  toggleActive: "bg-brand-primary",
  toggleInactive: "bg-zinc-700",
};

export const StatusRow = ({ icon: Icon, label, status, color }: any) => (
  <div className="flex items-center justify-between p-4 bg-surface-sunken border border-[rgb(var(--fg-rgb))]/5 rounded-md mb-3 last:mb-0">
     <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-sm flex items-center justify-center bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/5`}>
           <Icon size={18} className="text-muted" />
        </div>
        <span className="text-sm font-bold text-primary">{label}</span>
     </div>
     <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${color}`}>
        {status}
     </span>
  </div>
);

export const ToggleSwitch = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <button
    onClick={onChange}
    className={`w-12 h-7 rounded-full relative transition-colors duration-300 ${checked ? styles.toggleActive : styles.toggleInactive}`}
  >
    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${checked ? 'translate-x-5' : ''}`} />
  </button>
);
