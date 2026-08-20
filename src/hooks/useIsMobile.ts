
import { useState, useEffect } from 'react';

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkLayout = () => {
      // Coincide con el breakpoint de LayoutSelector (1024px)
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkLayout();
    window.addEventListener('resize', checkLayout);
    return () => window.removeEventListener('resize', checkLayout);
  }, []);

  return isMobile;
};
