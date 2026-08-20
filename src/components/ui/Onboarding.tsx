
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowRight } from 'lucide-react';

interface OnboardingProps {
  onFinish: () => void;
}

// --- ANIMATED ILLUSTRATIONS ---

const StockIllustration = () => (
  <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <motion.path 
      d="M100 180 L20 140 L100 100 L180 140 Z" 
      stroke="#6A2CFF" strokeWidth="4" fill="rgba(106, 44, 255, 0.1)" strokeLinejoin="round"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse", repeatDelay: 1 }}
    />
    <motion.path 
      d="M100 140 L20 100 L100 60 L180 100 Z" 
      stroke="#B621FF" strokeWidth="4" fill="rgba(182, 33, 255, 0.1)" strokeLinejoin="round"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, repeat: Infinity, repeatType: "reverse", repeatDelay: 1 }}
    />
    <motion.path 
      d="M100 100 L20 60 L100 20 L180 60 Z" 
      stroke="#FF1493" strokeWidth="4" fill="rgba(255, 20, 147, 0.1)" strokeLinejoin="round"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4, repeat: Infinity, repeatType: "reverse", repeatDelay: 1 }}
    />
    <motion.circle 
      cx="100" cy="20" r="4" fill="white"
      initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ delay: 0.8, type: "spring" }}
    />
  </svg>
);

const FinanceIllustration = () => (
  <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Bar Chart Background */}
    <motion.rect x="40" y="100" width="30" height="80" rx="4" fill="#27272a" initial={{ height: 0, y: 180 }} animate={{ height: 80, y: 100 }} transition={{ duration: 0.5 }} />
    <motion.rect x="85" y="60" width="30" height="120" rx="4" fill="#27272a" initial={{ height: 0, y: 180 }} animate={{ height: 120, y: 60 }} transition={{ duration: 0.5, delay: 0.1 }} />
    <motion.rect x="130" y="80" width="30" height="100" rx="4" fill="#27272a" initial={{ height: 0, y: 180 }} animate={{ height: 100, y: 80 }} transition={{ duration: 0.5, delay: 0.2 }} />
    
    {/* Line Graph */}
    <motion.path
      d="M20 160 L60 120 L100 140 L140 60 L180 40"
      stroke="#FF1493" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: "easeInOut", delay: 0.3 }}
    />
    
    {/* Floating Coin */}
    <motion.g
      initial={{ y: 20, opacity: 0 }} 
      animate={{ y: [0, -10, 0], opacity: 1 }} 
      transition={{ delay: 1, y: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
    >
        <circle cx="180" cy="40" r="18" fill="#6A2CFF" />
        <text x="180" y="46" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">$</text>
    </motion.g>
  </svg>
);

const ClientsIllustration = () => (
  <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Central Node */}
    <motion.circle cx="100" cy="100" r="25" fill="#00E5FF" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} />
    
    {/* Connected Nodes */}
    <motion.line x1="100" y1="100" x2="40" y2="40" stroke="white" strokeWidth="2" strokeOpacity="0.2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.3 }} />
    <motion.circle cx="40" cy="40" r="15" fill="#1c1c1e" stroke="#00E5FF" strokeWidth="2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }} />

    <motion.line x1="100" y1="100" x2="160" y2="40" stroke="white" strokeWidth="2" strokeOpacity="0.2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.4 }} />
    <motion.circle cx="160" cy="40" r="15" fill="#1c1c1e" stroke="#00E5FF" strokeWidth="2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7 }} />

    <motion.line x1="100" y1="100" x2="100" y2="170" stroke="white" strokeWidth="2" strokeOpacity="0.2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.5 }} />
    <motion.circle cx="100" cy="170" r="15" fill="#1c1c1e" stroke="#00E5FF" strokeWidth="2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 }} />
    
    {/* Pulse Effect */}
    <motion.circle 
       cx="100" cy="100" r="25" 
       stroke="#00E5FF" strokeWidth="2" fill="none"
       initial={{ scale: 1, opacity: 0.8 }}
       animate={{ scale: 2, opacity: 0 }}
       transition={{ duration: 1.5, repeat: Infinity }}
    />
  </svg>
);

const slides = [
  {
    id: 1,
    title: "Gestión de Stock",
    desc: "Organiza tus cuentas, perfiles y pines en un solo lugar. Control total de tu inventario digital.",
    Illustration: StockIllustration,
    color: "from-brand-primary to-brand-primary-hi", 
    shadow: "shadow-[0_0_50px_-10px_rgba(106,44,255,0.5)]"
  },
  {
    id: 2,
    title: "Finanzas Claras",
    desc: "Registra ventas, gastos y ganancias. Visualiza el crecimiento real de tu negocio.",
    Illustration: FinanceIllustration,
    color: "from-brand-accent to-status-danger", 
    shadow: "shadow-[0_0_50px_-10px_rgba(255,20,147,0.5)]"
  },
  {
    id: 3,
    title: "Cartera de Clientes",
    desc: "Automatiza recordatorios de vencimiento y mantén a tus clientes siempre conectados.",
    Illustration: ClientsIllustration,
    color: "from-status-info to-status-info", 
    shadow: "shadow-[0_0_50px_-10px_rgba(0,229,255,0.5)]"
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
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.2 } }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-bg flex flex-col overflow-hidden font-sans text-white gpu-accelerated">
      
      {/* BACKGROUND AMBIENCE */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
         <div className={`absolute -top-[20%] -left-[10%] w-[500px] h-[500px] rounded-full blur-[100px] bg-gradient-to-br ${slide.color} opacity-20 animate-blob-1 transition-colors duration-700`} />
         <div className="absolute top-[60%] -right-[20%] w-[400px] h-[400px] bg-brand-primary/10 rounded-full blur-[100px] animate-blob-2" />
      </div>

      {/* TOP BAR */}
      <div className="w-full p-6 flex justify-end z-20 pt-8">
         <button 
            onClick={onFinish} 
            className="text-zinc-500 text-xs font-semibold uppercase tracking-wider hover:text-white transition-colors px-4 py-2 rounded-full bg-white/5 active:scale-95"
         >
            Omitir
         </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col justify-center items-center relative z-10 px-6">
         
         {/* Visual Element (Animated SVG) */}
         <div className="w-full max-w-sm aspect-square relative flex items-center justify-center mb-8">
            <AnimatePresence mode='wait'>
               <motion.div
                  key={slide.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="relative flex items-center justify-center"
               >
                  <div className={`w-72 h-72 rounded-2xl border border-white/10 flex items-center justify-center relative backdrop-blur-2xl bg-white/[0.03] ${slide.shadow}`}>
                      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${slide.color} opacity-10`} />
                      <div className="relative z-10 scale-125">
                         <IllustrationComponent />
                      </div>
                  </div>
               </motion.div>
            </AnimatePresence>
         </div>

         {/* Text Content */}
         <div className="w-full max-w-xs text-center min-h-[120px]">
            <AnimatePresence mode='wait'>
                <motion.div
                   key={slide.id}
                   variants={contentVariants}
                   initial="initial"
                   animate="animate"
                   exit="exit"
                >
                   <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
                      {slide.title}
                   </h2>
                   <p className="text-[15px] text-zinc-400 font-medium leading-relaxed">
                      {slide.desc}
                   </p>
                </motion.div>
            </AnimatePresence>
         </div>
      </div>

      {/* BOTTOM CONTROLS */}
      <div className="w-full p-8 pb-12 z-20 flex items-center justify-between">
         <div className="flex gap-2">
            {slides.map((s, idx) => (
               <div 
                 key={s.id} 
                 className={`h-1.5 rounded-full transition-all duration-300 ${currentIndex === idx ? 'w-8 bg-white' : 'w-2 bg-white/20'}`} 
               />
            ))}
         </div>

         <button
            onClick={handleNext}
            className="w-14 h-14 rounded-lg bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white shadow-[0_0_30px_-5px_rgba(106,44,255,0.5)] active:scale-90 transition-transform hover:scale-105 border border-white/10"
         >
            {currentIndex === slides.length - 1 ? <ArrowRight size={24} strokeWidth={2.5} /> : <ChevronRight size={28} />}
         </button>
      </div>

    </div>
  );
};

export default Onboarding;
