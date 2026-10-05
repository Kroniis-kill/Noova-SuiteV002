/**
 * Capas de modales — deben coincidir con --z-modal-base / --z-modal-top
 * definidos en index.css. Las capas "fijas" (nav, header, toast, alert…)
 * viven solo como tokens CSS (clases z-nav, z-toast, etc.).
 *
 * Los modales NO deberían inventar números: useDialog() apila
 * automáticamente cada diálogo nuevo por encima del anterior.
 */
export const Z_MODAL_BASE = 10000;
export const Z_MODAL_TOP = 20000;
export const Z_LAYER_STEP = 10;
