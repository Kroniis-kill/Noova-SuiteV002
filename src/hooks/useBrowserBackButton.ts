import { useEffect, useRef } from 'react';
import { closeTopDialog } from './useDialog';

/**
 * Botón "atrás" del teléfono en la PWA (navegador / app instalada).
 *
 * La app navega por estado interno (no hay router), así que el navegador solo
 * ve UNA entrada de historial y "atrás" saca al usuario de la app. Aquí se deja
 * siempre una entrada "guardia" delante de la base: al pulsar atrás el
 * navegador consume la guardia (sin salir) y nosotros decidimos qué retroceder:
 *
 *   1. diálogo / hoja abierta  → se cierra
 *   2. acción de retroceso de la pantalla (backAction)
 *   3. menú lateral abierto    → se cierra
 *   4. pantalla distinta del inicio → vuelve a la anterior
 *   5. inicio → primer "atrás" avisa, el segundo (en 2 s) sale de la app
 *
 * Tras cada retroceso gestionado se vuelve a colocar la guardia.
 * En la app nativa (Capacitor) esto no aplica: App.tsx ya escucha backButton.
 */
interface Options {
  enabled: boolean;
  /** Devuelve true si consumió el "atrás" (había algo que cerrar / retroceder). */
  handleBack: () => boolean;
  onExitHint: () => void;
}

const EXIT_WINDOW_MS = 2000;

export function useBrowserBackButton({ enabled, handleBack, onExitHint }: Options) {
  // Refs para registrar el listener una sola vez y leer siempre el estado actual.
  const handleBackRef = useRef(handleBack);
  const hintRef = useRef(onExitHint);
  handleBackRef.current = handleBack;
  hintRef.current = onExitHint;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const arm = () => window.history.pushState({ noovaGuard: true }, '');

    // Colocar la guardia (si ya existe, p. ej. por StrictMode, no se duplica).
    if (!window.history.state?.noovaGuard) {
      window.history.replaceState({ ...(window.history.state || {}), noovaBase: true }, '');
      arm();
    }

    let lastExitHint = 0;

    const onPopState = () => {
      // Si caímos sobre la guardia (avance o entradas ajenas como un #hash), no es un "atrás" nuestro.
      if (window.history.state?.noovaGuard) return;

      if (handleBackRef.current()) {
        arm();
        return;
      }

      const now = Date.now();
      if (now - lastExitHint < EXIT_WINDOW_MS) {
        // Segundo "atrás" seguido en el inicio: dejar que el navegador salga.
        window.history.back();
        return;
      }
      lastExitHint = now;
      hintRef.current();
      arm();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [enabled]);
}
