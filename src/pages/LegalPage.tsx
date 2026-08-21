
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, FileText } from 'lucide-react';
import { TERMS_AND_CONDITIONS, PRIVACY_POLICY } from '../data/legalContent';

interface LegalPageProps {
  type: 'terms' | 'privacy';
}

const LegalPage: React.FC<LegalPageProps> = ({ type }) => {
  const data = type === 'terms' ? TERMS_AND_CONDITIONS : PRIVACY_POLICY;
  const title = type === 'terms' ? 'Términos y Condiciones' : 'Política de Privacidad';
  const updated = "01-12-2025";

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const goBack = () => {
    // Si hay historial, volver atrás, si no, ir al inicio
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary font-sans selection:bg-brand-primary/30">
      
      {/* Header */}
      <div className="sticky top-0 z-50 bg-bg/80 backdrop-blur-xl border-b border-[rgb(var(--fg-rgb))]/10">
         <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
             <button 
               onClick={goBack}
               className="w-10 h-10 rounded-sm bg-[rgb(var(--fg-rgb))]/5 border border-[rgb(var(--fg-rgb))]/5 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-[rgb(var(--fg-rgb))]/10 transition-colors active:scale-95"
             >
                <ArrowLeft size={20} />
             </button>
             <h1 className="text-lg font-bold text-text-primary">{title}</h1>
         </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10 pb-32">
         
         <div className="mb-10 text-center">
             <div className="w-20 h-20 bg-gradient-to-br from-brand-primary to-brand-accent rounded-xl mx-auto flex items-center justify-center shadow-glow mb-6">
                 {type === 'terms' ? <FileText size={40} className="text-text-primary" /> : <ShieldCheck size={40} className="text-text-primary" />}
             </div>
             <h2 className="text-3xl font-bold text-text-primary mb-2">{title}</h2>
             <p className="text-text-disabled text-sm">Última actualización: {updated}</p>
         </div>

         <div className="space-y-8">
             {data.map((section, idx) => (
                 <motion.div 
                   key={idx}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: idx * 0.05 }}
                   className="bg-surface-3 border border-[rgb(var(--fg-rgb))]/5 rounded-xl p-6 md:p-8"
                 >
                     <h3 className="text-xl font-bold text-text-primary mb-4">{section.title}</h3>
                     <p className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap">
                        {section.content}
                     </p>
                 </motion.div>
             ))}
         </div>

         <div className="mt-12 pt-8 border-t border-[rgb(var(--fg-rgb))]/10 text-center">
             <p className="text-text-faint text-xs">
                 &copy; {new Date().getFullYear()} Noova Suite. Todos los derechos reservados.
             </p>
         </div>

      </div>

    </div>
  );
};

export default LegalPage;
