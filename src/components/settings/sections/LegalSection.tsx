import React, { useState } from 'react';
import { FileText, ShieldCheck } from 'lucide-react';
import { TERMS_AND_CONDITIONS, PRIVACY_POLICY } from '../../../data/legalContent';
import { styles } from './_shared';

export const LegalSection = () => {
    const [view, setView] = useState<'terms' | 'privacy'>('terms');

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex bg-surface-1 p-1.5 rounded-lg border border-[rgb(var(--fg-rgb))]/[0.08] w-full mb-4 shadow-sm">
                 <button onClick={() => setView('terms')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md text-xs font-semibold transition-all ${view === 'terms' ? 'bg-surface-4 text-primary shadow-sm border border-[rgb(var(--fg-rgb))]/5' : 'text-disabled hover:text-primary'}`}>
                    <FileText size={16} /> Términos
                 </button>
                 <button onClick={() => setView('privacy')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md text-xs font-semibold transition-all ${view === 'privacy' ? 'bg-surface-4 text-primary shadow-sm border border-[rgb(var(--fg-rgb))]/5' : 'text-disabled hover:text-primary'}`}>
                    <ShieldCheck size={16} /> Privacidad
                 </button>
            </div>

            <div className={styles.card}>
                <div className="space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar pr-2">
                    {(view === 'terms' ? TERMS_AND_CONDITIONS : PRIVACY_POLICY).map((item, idx) => (
                        <div key={idx} className="space-y-3">
                            <h4 className="text-base font-bold text-primary leading-tight">{item.title}</h4>
                            <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap">{item.content}</p>
                            {idx < (view === 'terms' ? TERMS_AND_CONDITIONS.length : PRIVACY_POLICY.length) - 1 && (
                                <div className="h-px bg-[rgb(var(--fg-rgb))]/5 w-full mt-6" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="text-center opacity-30">
                <p className="text-[10px] text-disabled uppercase font-semibold tracking-widest">Noova Suite Legal Compliance</p>
            </div>
        </div>
    );
};
