
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowRight, X } from 'lucide-react';

interface OnboardingProps {
  onFinish: () => void;
}

// --- ILLUSTRATIONS (animación de entrada única, sin loops infinitos) ---

const StockIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.path
      d="M100 180 L20 140 L100 100 L180 140 Z"
      stroke="#6A2CFF" strokeWidth="4" fill="rgba(106, 44, 255, 0.1)" strokeLinejoin="round"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
    />
    <motion.path
      d="M100 140 L20 100 L100 60 L180 100 Z"
      stroke="#B621FF" strokeWidth="4" fill="rgba(182, 33, 255, 0.1)" strokeLinejoin="round"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
    />
    <motion.path
      d="M100 100 L20 60 L100 20 L180 60 Z"
      stroke="#FF1493" strokeWidth="4" fill="rgba(255, 20, 147, 0.1)" strokeLinejoin="round"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
    />
    <motion.circle
      cx="100" cy="20" r="4" fill="white"
      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: "spring" }}
    />
  </svg>
);

const FinanceIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.rect x="40" y="100" width="30" height="80" rx="4" fill="#27272a" initial={{ height: 0, y: 180 }} animate={{ height: 80, y: 100 }} transition={{ duration: 0.4 }} />
    <motion.rect x="85" y="60" width="30" height="120" rx="4" fill="#27272a" initial={{ height: 0, y: 180 }} animate={{ height: 120, y: 60 }} transition={{ duration: 0.4, delay: 0.1 }} />
    <motion.rect x="130" y="80" width="30" height="100" rx="4" fill="#27272a" initial={{ height: 0, y: 180 }} animate={{ height: 100, y: 80 }} transition={{ duration: 0.4, delay: 0.2 }} />

    <motion.path
      d="M20 160 L60 120 L100 140 L140 60 L180 40"
      stroke="#FF1493" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, ease: "easeInOut", delay: 0.2 }}
    />

    <motion.g initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6, duration: 0.3 }}>
        <circle cx="180" cy="40" r="18" fill="#6A2CFF" />
        <text x="180" y="46" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">$</text>
    </motion.g>
  </svg>
);

const ClientsIllustration = () => (
  <svg width="120" height="120" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.circle cx="100" cy="100" r="25" fill="#00E5FF" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} />

    <motion.line x1="100" y1="100" x2="40" y2="40" stroke="white" strokeWidth="2" strokeOpacity="0.2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.15 }} />
    <motion.circle cx="40" cy="40" r="15" fill="#1c1c1e" stroke="#00E5FF" strokeWidth="2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }} />

    <motion.line x1="100" y1="100" x2="160" y2="40" stroke="white" strokeWidth="2" strokeOpacity="0.2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.2 }} />
    <motion.circle cx="160" cy="40" r="15" fill="#1c1c1e" stroke="#00E5FF" strokeWidth="2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.35 }} />

    <motion.line x1="100" y1="100" x2="100" y2="170" stroke="white" strokeWidth="2" strokeOpacity="0.2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.3, delay: 0.25 }} />
    <motion.circle cx="100" cy="170" r="15" fill="#1c1c1e" stroke="#00E5FF" strokeWidth="2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 }} />
  </svg>
);

const slides = [
  {
    id: 1,
    title: "Gestión de Stock",
    desc: "Organiza tus cuentas, perfiles y pines en un solo lugar. Control total de tu inventario digital.",
    Illustration: StockIllustration,
  },
  {
    id: 2,
    title: "Finanzas Claras",
    desc: "Registra ventas, gastos y ganancias. Visualiza el crecimiento real de tu negocio.",
    Illustration: FinanceIllustration,
  },
  {
    id: 3,
    title: "Cartera de Clientes",
    desc: "Automatiza recordatorios de vencimiento y mantén a tus clientes siempre conectados.",
    Illustration: ClientsIllustration,
  }
];

const Onboarding: React.FC<OnboardingProps> = ({ onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onFinish();
    }
  };

  const slide = slides[currentIndex];
  const IllustrationComponent = slide.Illustration;

  const contentVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.15 } }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 font-sans text-text-primary">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-sm bg-surface-1 border border-[rgb(var(--fg-rgb))]/10 rounded-2xl shadow-2xl flex flex-col items-center text-center p-6 pt-5"
      >
        <button
          onClick={onFinish}
          aria-label="Omitir tutorial"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-text-disabled hover:text-text-primary transition-colors rounded-full active:scale-90"
        >
          <X size={18} />
        </button>

        <div className="w-full flex items-center justify-center mb-2">
          <AnimatePresence mode='wait'>
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.15 } }}
              transition={{ duration: 0.25 }}
              className="w-32 h-32 rounded-2xl border border-[rgb(var(--fg-rgb))]/10 bg-bg flex items-center justify-center"
            >
              <IllustrationComponent />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="w-full min-h-[92px] flex flex-col items-center justify-start">
          <AnimatePresence mode='wait'>
            <motion.div key={slide.id} variants={contentVariants} initial="initial" animate="animate" exit="exit">
              <h2 className="text-xl font-bold text-text-primary mt-3 mb-2 tracking-tight">
                {slide.title}
              </h2>
              <p className="text-sm text-text-muted leading-relaxed">
                {slide.desc}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="w-full flex items-center justify-between mt-5 pt-5 border-t border-[rgb(var(--fg-rgb))]/5">
          <div className="flex gap-2">
            {slides.map((s, idx) => (
              <div
                key={s.id}
                className={`h-1.5 rounded-full transition-all duration-300 ${currentIndex === idx ? 'w-6 bg-brand-primary-hi' : 'w-1.5 bg-[rgb(var(--fg-rgb))]/15'}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="h-10 px-4 rounded-xl bg-brand-gradient flex items-center justify-center gap-1.5 text-white text-sm font-semibold active:scale-95 transition-transform hover:brightness-110"
          >
            {currentIndex === slides.length - 1 ? (
              <>Empezar <ArrowRight size={16} /></>
            ) : (
              <>Siguiente <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
