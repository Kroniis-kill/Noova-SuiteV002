
import React, { useMemo } from 'react';

interface AvatarProps {
  name: string;
  image?: string;
  size?: number | string; // Pixel size (number) or string (e.g., "100%")
  className?: string; // Additional classes (e.g., 'rounded-md')
  fallbackIcon?: React.ReactNode;
}

const COLORS = [
  ['#6A2CFF', '#B621FF'], // Primary Purple/Accent
  ['#FF1493', '#FF69B4'], // Pink
  ['#10b981', '#34d399'], // Emerald
  ['#f59e0b', '#fbbf24'], // Amber
  ['#3b82f6', '#60a5fa'], // Blue
  ['#6366f1', '#8b5cf6'], // Indigo
  ['#f43f5e', '#fb7185'], // Rose
  ['#06b6d4', '#22d3ee'], // Cyan
];

const Avatar: React.FC<AvatarProps> = React.memo(({ 
  name, 
  image, 
  size = 48, 
  className = "rounded-md", 
  fallbackIcon 
}) => {
  
  // Deterministic color generation based on name string
  const [bgStart, bgEnd] = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLORS.length;
    return COLORS[index];
  }, [name]);

  const initials = useMemo(() => {
    return name
      .substring(0, 2)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, ''); // Remove emojis or special chars for cleaner SVG
  }, [name]);

  const sizeStyle = typeof size === 'number' ? `${size}px` : size;
  const style = { width: sizeStyle, height: sizeStyle };

  // 1. Image Mode (Network)
  if (image) {
    return (
      <div className={`relative overflow-hidden bg-surface-4 ${className}`} style={style}>
        <img 
          src={image} 
          alt={name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // 2. SVG Mode (Local - Instant, No Network)
  return (
    <div 
      className={`relative flex items-center justify-center overflow-hidden shadow-inner border border-white/10 ${className}`}
      style={{ 
        ...style,
        background: `linear-gradient(135deg, ${bgStart}, ${bgEnd})` 
      }}
    >
      {fallbackIcon ? (
        <div className="text-white opacity-90">{fallbackIcon}</div>
      ) : (
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full p-2"
          xmlns="http://www.w3.org/2000/svg"
        >
          <text 
            x="50%" 
            y="55%" 
            dominantBaseline="middle" 
            textAnchor="middle" 
            fill="white" 
            fontSize="45" 
            fontWeight="bold"
            fontFamily="Inter, sans-serif"
          >
            {initials}
          </text>
        </svg>
      )}
    </div>
  );
});

export default Avatar;
