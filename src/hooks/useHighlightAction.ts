import { useState, useEffect } from 'react';

export const useHighlightAction = (viewName: string) => {
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    const highlight = sessionStorage.getItem('highlight_add_action');
    if (highlight === viewName) {
      setIsHighlighted(true);
      sessionStorage.removeItem('highlight_add_action');
      
      const timer = setTimeout(() => {
        setIsHighlighted(false);
      }, 5000); // Highlight for 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [viewName]);

  return isHighlighted;
};
