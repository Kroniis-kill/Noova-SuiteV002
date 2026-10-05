import { create } from 'zustand';

/**
 * Estado REAL de guardado, alimentado por resultados verificados:
 *  - una mutación terminó bien en el servidor      → 'saved'
 *  - la mutación quedó en la cola local (sin red)   → 'queued'
 *  - la cola local se subió al servidor             → 'synced'
 *  - algo falló                                     → 'error'
 *
 * Antes, el indicador mostraba "Guardado" cada vez que dejaba de haber
 * actividad de red (incluidas lecturas y mutaciones que habían fallado),
 * por eso a veces decía que se guardó algo que en realidad no se guardó.
 */
export type SaveToastKind = 'saved' | 'queued' | 'synced' | 'error';

interface SaveToast {
  kind: SaveToastKind;
  message?: string;
  count?: number;
  id: number;
}

interface SaveStatusState {
  /** Cantidad de guardados en curso. */
  saving: number;
  /** Sube cada vez que algo se encola localmente (sirve para saber si una mutación terminó "en cola"). */
  queueEpoch: number;
  toast: SaveToast | null;
  /** true mientras la cápsula de sincronización está en pantalla (los avisos se desplazan debajo). */
  pillVisible: boolean;
  setPillVisible: (v: boolean) => void;

  begin: () => void;
  end: (outcome: 'confirmed' | 'queued') => void;
  failMutation: (message?: string) => void;
  noteQueued: () => void;
  showSynced: (count: number) => void;
  showError: (message: string) => void;
  dismiss: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;
let nextId = 1;

const AUTO_HIDE_MS: Record<SaveToastKind, number> = {
  saved: 1800,
  synced: 2600,
  queued: 0, // se queda mientras haya pendientes (lo controla el indicador)
  error: 7000,
};

export const useSaveStatus = create<SaveStatusState>((set, get) => {
  const show = (kind: SaveToastKind, extra: Partial<SaveToast> = {}) => {
    if (timer) { clearTimeout(timer); timer = null; }
    const id = nextId++;
    set({ toast: { kind, id, ...extra } });
    const ms = AUTO_HIDE_MS[kind];
    if (ms > 0) {
      timer = setTimeout(() => {
        timer = null;
        if (get().toast?.id === id) set({ toast: null });
      }, ms);
    }
  };

  return {
    saving: 0,
    queueEpoch: 0,
    toast: null,
    pillVisible: false,
    setPillVisible: (v) => set((s) => (s.pillVisible === v ? s : { pillVisible: v })),

    begin: () => set((s) => ({ saving: s.saving + 1 })),

    end: (outcome) => {
      set((s) => ({ saving: Math.max(0, s.saving - 1) }));
      if (get().saving === 0) show(outcome === 'queued' ? 'queued' : 'saved');
    },

    failMutation: (message) => {
      set((s) => ({ saving: Math.max(0, s.saving - 1) }));
      show('error', { message: message || 'No se pudo guardar el cambio' });
    },

    noteQueued: () => set((s) => ({ queueEpoch: s.queueEpoch + 1 })),

    showSynced: (count) => show('synced', { count }),

    showError: (message) => show('error', { message }),

    dismiss: () => {
      if (timer) { clearTimeout(timer); timer = null; }
      set({ toast: null });
    },
  };
});
