
import React, { useId } from 'react';
import { motion } from 'framer-motion';

interface AnimatedLogoProps {
  size?: number;
  className?: string;
  delay?: number;
  showFill?: boolean;
  isStatic?: boolean;
  variant?: 'outline' | 'filled';
}

const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ 
  size = 100, 
  className = "", 
  delay = 0,
  showFill = true,
  isStatic = false,
  variant = 'outline'
}) => {
  const gradientId = useId();
  
  // Configuración de animación (Solo usada cuando no es estático)
  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => {
      const delayVal = delay + (i * 0.3);
      return {
        pathLength: 1,
        opacity: 1,
        transition: {
          pathLength: { delay: delayVal, type: "spring", duration: 1.5, bounce: 0 },
          opacity: { delay: delayVal, duration: 0.01 }
        }
      };
    }
  };

  // Propiedades fijas para modo estático (Sin animación)
  const staticProps = {
    initial: { pathLength: 1, opacity: 1 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: 0 }
  };

  // Helper to determine props based on mode
  const getProps = (customIndex: number) => {
    if (isStatic) return staticProps;
    return {
      variants: draw,
      custom: customIndex
    };
  };

  const isFilled = variant === 'filled';

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <motion.svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={isStatic ? "visible" : "hidden"}
        animate="visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6A2CFF" />
            <stop offset="1" stopColor="#FF1493" />
          </linearGradient>
        </defs>

        {/* 1. Contenedor (Cuadrado Redondeado) */}
        <motion.rect
          width="90" height="90" x="5" y="5" rx="22"
          stroke={isFilled ? "none" : `url(#${gradientId})`}
          strokeWidth="3" 
          strokeLinecap="round"
          fill={isFilled ? `url(#${gradientId})` : "transparent"}
          {...getProps(0)}
        />

        {/* 2. La "N" - Trazo Izquierdo (Vertical hacia arriba) */}
        <motion.path
          d="M 28 72 V 28"
          stroke={isFilled ? "white" : "white"}
          strokeWidth="10" 
          strokeLinecap="round"
          {...getProps(1)}
        />

        {/* 3. La "N" - Diagonal (Hacia abajo derecha) */}
        <motion.path
          d="M 28 28 L 72 72"
          stroke={isFilled ? "white" : `url(#${gradientId})`}
          strokeWidth="10"
          strokeLinecap="round"
          {...getProps(1.5)}
        />

        {/* 4. La "N" - Trazo Derecho (Vertical hacia arriba) */}
        <motion.path
          d="M 72 72 V 28"
          stroke={isFilled ? "white" : `url(#${gradientId})`}
          strokeWidth="10"
          strokeLinecap="round"
          {...getProps(2)}
        />

        {/* 5. Relleno Sutil (Opcional para dar cuerpo al final) */}
        {showFill && !isFilled && (
          <motion.rect
             width="90" height="90" x="5" y="5" rx="22"
             fill={`url(#${gradientId})`}
             initial={isStatic ? { opacity: 0.15 } : { opacity: 0 }}
             animate={{ opacity: 0.15 }}
             transition={isStatic ? { duration: 0 } : { delay: delay + 3, duration: 1 }}
          />
        )}
      </motion.svg>
    </div>
  );
};

export default AnimatedLogo;
