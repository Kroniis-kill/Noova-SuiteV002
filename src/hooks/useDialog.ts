import { RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Z_LAYER_STEP, Z_MODAL_BASE } from '../constants/zIndex';

/**
 * Comportamiento común de cualquier diálogo / hoja inferior / overlay:
 *  - Apilado: cada diálogo abierto queda por encima del anterior (devuelve el z-index).
 *  - Foco: entra al abrir, se queda dentro (Tab / Shift+Tab) y vuelve al elemento
 *    que lo abrió al cerrar.
 *  - Escape: cierra solo el diálogo que está arriba.
 *
 * Uso:
 *   const ref = useRef<HTMLDivElement>(null);
 *   const z = useDialog({ isOpen, onClose, containerRef: ref });
 *   <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1} style={{ zIndex: z }}>
 */

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface Layer {
  z: number;
  close?: () => void;
}
const stack: Layer[] = [];

/**
 * Cierra el diálogo que está encima de todos (lo usa el botón "atrás" del
 * teléfono). Devuelve true si había un diálogo abierto — aunque no se pudo
 * cerrar — para que la navegación no retroceda por debajo de él.
 */
export function closeTopDialog(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top.close?.();
  return true;
}

// Bloqueo de scroll del fondo: con contador para que varios diálogos apilados
// no se pisen entre sí (solo se libera cuando se cierra el último).
let scrollLocks = 0;
let previousOverflow = '';
function lockBodyScroll() {
  if (scrollLocks === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLocks += 1;
}
function unlockBodyScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.style.overflow = previousOverflow;
}

interface UseDialogOptions {
  isOpen: boolean;
  onClose?: () => void;
  containerRef: RefObject<HTMLElement>;
  /** z-index mínimo deseado; si ya hay diálogos abiertos se coloca encima de ellos. */
  requestedZ?: number;
  closeOnEscape?: boolean;
  initialFocusRef?: RefObject<HTMLElement>;
}

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0,
  );
}

export function useDialog({
  isOpen,
  onClose,
  containerRef,
  requestedZ = Z_MODAL_BASE,
  closeOnEscape = true,
  initialFocusRef,
}: UseDialogOptions): number {
  const [z, setZ] = useState(requestedZ);
  const layerRef = useRef<Layer | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Apilado: se registra al abrir y se libera al cerrar.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const top = stack.length ? Math.max(...stack.map((l) => l.z)) : 0;
    const layer: Layer = {
      z: Math.max(requestedZ, top ? top + Z_LAYER_STEP : 0),
      close: () => onCloseRef.current?.(),
    };
    stack.push(layer);
    layerRef.current = layer;
    setZ(layer.z);
    return () => {
      const i = stack.indexOf(layer);
      if (i >= 0) stack.splice(i, 1);
      if (layerRef.current === layer) layerRef.current = null;
    };
  }, [isOpen, requestedZ]);

  // Foco, Escape y trampa de foco.
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement as HTMLElement | null;
    lockBodyScroll();

    const focusTimer = window.setTimeout(() => {
      const node = containerRef.current;
      if (!node || node.contains(document.activeElement)) return;
      const target = initialFocusRef?.current ?? getFocusable(node)[0] ?? node;
      target.focus({ preventScroll: true });
    }, 60);

    const isTop = () => stack.length > 0 && stack[stack.length - 1] === layerRef.current;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const node = containerRef.current;
      if (!node) return;
      const items = getFocusable(node);
      if (items.length === 0) {
        e.preventDefault();
        node.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !node.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !node.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown, true);
      unlockBodyScroll();
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [isOpen, closeOnEscape, containerRef, initialFocusRef]);

  return z;
}
