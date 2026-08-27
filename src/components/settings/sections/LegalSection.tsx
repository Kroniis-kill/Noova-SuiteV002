import React, { useState } from 'react';
import { FileText, ShieldCheck } from 'lucide-react';
import { TERMS_AND_CONDITIONS, PRIVACY_POLICY } from '../../../data/legalContent';
import { styles, TabSwitcher } from './_shared';

const TABS: { id: 'terms' | 'privacy'; label: string; icon: any }[] = [
    { id: 'terms', label: 'Términos', icon: FileText },
    { id: 'privacy', label: 'Privacidad', icon: ShieldCheck },
];

export const LegalSection = () => {
    const [view, setView] = useState<'terms' | 'privacy'>('terms');

    return (
        <div className="space-y-6 animate-fade-in">
            <TabSwitcher tabs={TABS} active={view} onChange={setView} />

            <div className={styles.card}>
                <div className="space-y-8 overflow-y-auto max-h-[60vh] custom-scrollbar pr-2">
                    {(view === 'terms' ? TERMS_AND_CONDITIONS : PRIVACY_POLICY).map((item, idx) => (
                        <div key={idx} className="space-y-3">
                            <h4 className="text-base font-bold text-text-primary leading-tight">{item.title}</h4>
                            <p className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap">{item.content}</p>
                            {idx < (view === 'terms' ? TERMS_AND_CONDITIONS.length : PRIVACY_POLICY.length) - 1 && (
                                <div className="h-px bg-hairline w-full mt-6" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="text-center opacity-30">
                <p className="text-[10px] text-text-disabled uppercase font-semibold tracking-widest">Noova Suite Legal Compliance</p>
            </div>
        </div>
    );
};
