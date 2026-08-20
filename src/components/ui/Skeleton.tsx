import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'rect' }) => {
  const borderRadius = variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded-md' : 'rounded-md';
  
  return (
    <motion.div
      initial={{ opacity: 0.4 }}
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className={`bg-white/5 ${borderRadius} ${className}`}
    />
  );
};

export default Skeleton;