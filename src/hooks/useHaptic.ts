import { useCallback } from 'react';

export const useHaptic = () => {
  const vibrate = useCallback((type: 'nav' | 'success' | 'error' | 'heavy' = 'nav') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        switch(type) {
          case 'nav': 
            // Pulso suave para navegación
            navigator.vibrate(10); 
            break;
          case 'success': 
            // Pulso doble para acciones críticas
            navigator.vibrate([15, 30, 30]); 
            break;
          case 'error': 
            navigator.vibrate([50, 50, 50]); 
            break;
          case 'heavy': 
            navigator.vibrate(40); 
            break;
          default:
            navigator.vibrate(10);
        }
      } catch (e) {
        // Ignorar si el contexto no permite vibración
      }
    }
  }, []);

  return vibrate;
};