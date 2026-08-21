
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, LayoutGrid, Zap, ShieldCheck } from 'lucide-react';
import AnimatedLogo from './AnimatedLogo';

interface DesktopWelcomeScreenProps {
  onFinish: () => void;
}

const DesktopWelcomeScreen: React.FC<DesktopWelcomeScreenProps> = ({ onFinish }) => {
  
  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { 
        duration: 0.8, 
        staggerChildren: 0.15,
        delayChildren: 0.2
      } 
    },
    exit: { opacity: 0, scale: 1.05, filter: 'blur(10px)', transition: { duration: 0.5 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }
  };

  const floatingVariants = {
    animate: {
      y: [-10, 10, -10],
      rotate: [-2, 2, -2],
      transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
    }
  };

  const floatingVariantsReverse = {
    animate: {
      y: [10, -10, 10],
      rotate: [2, -2, 2],
      transition: { duration: 7, repeat: Infinity, ease: "easeInOut" }
    }
  };

  return (
    <motion.div 
      className="fixed inset-0 z-[150] flex items-center justify-center bg-transparent font-sans text-primary overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      
      {/* Fondo sólido, sin decoraciones ambientales */}

      {/* --- FLOATING ICONS (DECORATION) --- */}
      <motion.div 
        variants={floatingVariants}
        animate="animate"
        className="absolute left-[15%] top-[30%] w-20 h-20 bg-[rgb(var(--fg-rgb))]/5 backdrop-blur-md rounded-xl border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center shadow-2xl hidden lg:flex"
      >
         <LayoutGrid size={32} className="text-brand-primary" />
      </motion.div>

      <motion.div 
        variants={floatingVariantsReverse}
        animate="animate"
        className="absolute right-[15%] bottom-[30%] w-24 h-24 bg-[rgb(var(--fg-rgb))]/5 backdrop-blur-md rounded-2xl border border-[rgb(var(--fg-rgb))]/10 flex items-center justify-center shadow-2xl hidden lg:flex"
      >
         <Zap size={40} className="text-brand-accent" />
      </motion.div>

      {/* --- MAIN CONTENT CARD --- */}
      <div className="relative z-10 max-w-4xl w-full px-6 flex flex-col items-center text-center">
         
         {/* Animated Logo */}
         <motion.div variants={itemVariants} className="mb-10 scale-125">
            <div className="relative">
               <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary to-brand-accent blur-[60px] opacity-40 rounded-full" />
               <AnimatedLogo size={120} showFill={false} delay={0.5} />
            </div>
         </motion.div>

         {/* Text Content */}
         <motion.div variants={itemVariants} className="space-y-6 max-w-2xl">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-zinc-400 pb-2">
               Bienvenido a Noova Suite
            </h1>
            
            <h2 className="text-xl md:text-2xl font-medium text-secondary">
               Gestiona y administra tus servicios digitales desde una experiencia optimizada para escritorio.
            </h2>
            
            <p className="text-muted text-base md:text-lg leading-relaxed max-w-xl mx-auto font-light">
               Explora tus módulos con mayor comodidad, una interfaz más amplia y un flujo de trabajo diseñado para aumentar tu productividad.
            </p>
         </motion.div>

         {/* Action Button */}
         <motion.div variants={itemVariants} className="mt-12">
            <button
               onClick={onFinish}
               className="group relative inline-flex items-center justify-center gap-3 px-10 py-4 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-xl font-bold text-lg shadow-[0_0_40px_-10px_rgba(106,44,255,0.5)] hover:shadow-[0_0_60px_-10px_rgba(106,44,255,0.7)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
               <span className="relative z-10 flex items-center gap-2">
                  Iniciar <ArrowRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
               </span>
               
               {/* Inner Shine */}
               <div className="absolute inset-0 rounded-xl bg-[rgb(var(--fg-rgb))]/20 opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
            </button>
         </motion.div>

         {/* Footer Note */}
         <motion.div variants={itemVariants} className="mt-16 flex items-center gap-2 text-faint text-xs font-medium uppercase tracking-widest bg-[rgb(var(--fg-rgb))]/5 px-4 py-2 rounded-full border border-[rgb(var(--fg-rgb))]/5">
            <ShieldCheck size={12} />
            <span>Entorno Seguro & Sincronizado</span>
         </motion.div>

      </div>
    </motion.div>
  );
};

export default DesktopWelcomeScreen;
