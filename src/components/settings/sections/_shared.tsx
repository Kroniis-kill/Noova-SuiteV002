import React from 'react';

// Shared styles & primitives for Settings sections.
// Extracted from the old monolithic SettingsComponents.tsx to keep each
// section file under ~300 LOC.

export const styles = {
  card: "bg-surface-1 border border-white/[0.08] rounded-xl p-6 mb-6 shadow-sm",
  sectionTitle: "text-lg font-bold text-white mb-6",
  label: "text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block ml-1",
  input: "w-full bg-surface-sunken border border-white/10 rounded-md px-4 h-[52px] text-sm text-white outline-none focus:border-brand-primary/50 transition-all placeholder:text-zinc-600 font-medium",
  textarea: "w-full bg-transparent text-sm text-zinc-200 outline-none transition-all placeholder:text-zinc-700 font-medium h-full resize-none leading-relaxed",
  select: "w-full h-full bg-transparent text-[14px] text-white px-4 outline-none appearance-none cursor-pointer font-medium rounded-md",
  buttonPrimary: "w-full h-[52px] bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-bold text-sm shadow-[0_0_20px_-5px_rgba(106,44,255,0.4)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 hover:brightness-110",
  buttonDanger: "w-full h-[52px] bg-surface-1 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-lg font-bold text-sm transition-all flex items-center justify-between px-6 mb-3 active:scale-[0.98]",
  toggleContainer: "flex items-center justify-between bg-surface-sunken p-4 rounded-md border border-white/5",
  toggleActive: "bg-brand-primary",
  toggleInactive: "bg-zinc-700",
};

export const StatusRow = ({ icon: Icon, label, status, color }: any) => (
  <div className="flex items-center justify-between p-4 bg-surface-sunken border border-white/5 rounded-md mb-3 last:mb-0">
     <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-sm flex items-center justify-center bg-white/5 border border-white/5`}>
           <Icon size={18} className="text-zinc-400" />
        </div>
        <span className="text-sm font-bold text-white">{label}</span>
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
