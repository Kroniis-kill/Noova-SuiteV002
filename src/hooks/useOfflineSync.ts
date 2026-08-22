import { useSyncExternalStore, useCallback } from 'react';
import { dbLocal, SyncItem, ensureDbAlive } from '../db/LocalDatabase';
import { useToast } from '../context/ToastContext';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase, supabaseUrl } from '../supabaseClient';
import { withRetry } from '../utils/supabaseUtils';
import { useLiveQuery } from 'dexie-react-hooks';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useUIStore } from '../store/uiStore';

// `navigator.onLine` solo dice si el dispositivo tiene una interfaz de red
// activa — no confirma que se pueda llegar realmente a internet/Supabase
// (wifi de hotel sin portal cautivo resuelto, red corporativa restringida,
// etc. reportan "online" igual). Este chequeo hace un HEAD real y corto al
// propio proyecto de Supabase antes de vaciar la cola de sincronización.
const CONNECTIVITY_CHECK_TIMEOUT_MS = 4000;

async function checkRealConnectivity(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
  if (typeof fetch === 'undefined') return true; // entorno sin fetch: no bloqueamos, dejamos que falle más adelante si aplica
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONNECTIVITY_CHECK_TIMEOUT_MS);
    // No nos importa el status code (401/404 cuentan como "servidor
    // alcanzable"), solo que la petición efectivamente complete.
    await fetch(`${supabaseUrl}/auth/v1/health`, { method: 'GET', signal: controller.signal, cache: 'no-store' });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

// ============================================================
// MODULE-LEVEL SINGLETON STATE
// One set of listeners, one sync runner, shared across the app.
// ============================================================

type Listener = () => void;

const state = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
};

const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

const subscribe = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getSnapshot = () => state;

// Máximo de reintentos por item antes de descartarlo (evita envenenar la cola)
const MAX_TRIES = 5;
// Reintento periódico en background mientras haya items pendientes
const BACKGROUND_RETRY_MS = 30_000;

let isGlobalSyncing = false;
let pendingFlushTimer: ReturnType<typeof setTimeout> | null = null;
let backgroundRetryTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;
let currentUserId: string | undefined;
let queryClientRef: QueryClient | null = null;
let toastRef: ReturnType<typeof useToast>['showToast'] | null = null;
let capacitorListener: { remove: () => void } | null = null;

const setIsOnline = (v: boolean) => {
  if (state.isOnline !== v) {
    state.isOnline = v;
    emit();
  }
};
const setIsSyncing = (v: boolean) => {
  if (state.isSyncing !== v) {
    state.isSyncing = v;
    emit();
  }
};

const isNetworkError = (error: any) => {
  if (!error) return false;
  const message = (error.message || String(error)).toLowerCase();
  const status = error?.status ?? error?.statusCode;
  const code = error?.code || '';

  // Códigos HTTP retriables (red/servidor caído)
  if (status === 0 || status === 408 || status === 429 ||
      status === 502 || status === 503 || status === 504) {
    return true;
  }

  // Sin status (típico de fetch abortado / DNS / offline)
  if (status === undefined && !navigator.onLine) return true;

  // PostgREST: 301 = JWT expirado; 116 = abort
  if (code === 'PGRST301' || code === '57014' || code === '20' || code === 'ECONNRESET') {
    return true;
  }

  return (
    message.includes('fetch') ||
    message.includes('networkerror') ||
    message.includes('failed to fetch') ||
    message.includes('load failed') ||
    message.includes('offline') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('abort') ||
    message.includes('socket') ||
    !navigator.onLine
  );
};

const mapEntityToQueryKey = (entity: string) => {
  switch (entity) {
    case 'SALE': return 'sales';
    case 'CLIENT': return 'clients';
    case 'ACCOUNT': return 'accounts';
    case 'SERVICE': return 'services';
    case 'FINANCE': return 'financial_accounts';
    case 'PROVIDER': return 'providers';
    case 'RESELLER': return 'resellers';
    case 'EXPENSE': return 'expenses';
    case 'SUPPLY': return 'supplies';
    case 'PAYABLE': return 'payable_expenses';
    case 'CATEGORY': return 'expense_categories';
    case 'MOVEMENT': return 'movements';
    default: return null;
  }
};

const updateLocalCache = (action: string, entity: string, payload: any) => {
  if (!queryClientRef) return;
  const queryKey = mapEntityToQueryKey(entity);
  if (!queryKey) return;
  queryClientRef.setQueryData([queryKey, currentUserId], (oldData: any[]) => {
    if (!oldData) return [payload];
    if (action === 'CREATE') return [payload, ...oldData];
    if (action === 'UPDATE') return oldData.map((item) => (item.id === payload.id ? { ...item, ...payload } : item));
    if (action === 'DELETE') return oldData.filter((item) => item.id !== payload.id);
    return oldData;
  });
};

const tableForEntity = (entity: SyncItem['entity']) => {
  switch (entity) {
    case 'SALE': return 'sales';
    case 'CLIENT': return 'clients';
    case 'ACCOUNT': return 'accounts';
    case 'SERVICE': return 'services';
    case 'FINANCE': return 'financial_accounts';
    case 'EXPENSE': return 'expenses';
    case 'SUPPLY': return 'supplies';
    case 'PROVIDER': return 'providers';
    case 'RESELLER': return 'resellers';
    case 'PAYABLE': return 'payable_expenses';
    case 'CATEGORY': return 'expense_categories';
    case 'MOVEMENT': return 'movements';
    default: return '';
  }
};

const executeSupabaseAction = async (item: SyncItem) => {
  if (!currentUserId) return;
  const table = tableForEntity(item.entity);
  if (!table) return;

  if (item.action === 'CREATE') {
    const { error } = await withRetry(() => supabase.from(table).insert(item.payload));
    if (error) throw error;
  } else if (item.action === 'UPDATE') {
    const { error } = await withRetry(() => supabase.from(table).update(item.payload).eq('id', item.payload.id));
    if (error) throw error;
  } else if (item.action === 'DELETE') {
    const { error } = await withRetry(() => supabase.from(table).delete().eq('id', item.payload.id));
    if (error) throw error;
  }
};

const processSyncQueue = async () => {
  if (isGlobalSyncing) return;
  const count = await dbLocal.syncQueue.count();
  if (count === 0) return;
  if (!navigator.onLine) return;
  // `navigator.onLine` solo confirma que hay una interfaz de red activa,
  // no que se pueda llegar a Supabase (da falsos positivos en redes
  // cautivas, wifi sin internet real, etc.). Antes de vaciar la cola
  // completa, confirmamos con un ping real y corto.
  if (!(await checkRealConnectivity())) return;

  isGlobalSyncing = true;
  setIsSyncing(true);
  useUIStore.getState().setSyncing(true);

  const queue = await dbLocal.syncQueue.orderBy('createdAt').toArray();
  let successCount = 0;
  let droppedCount = 0;
  let networkInterrupted = false;
  const invalidatedKeys = new Set<string>();

  try {
    for (const item of queue) {
      // Si perdimos conexión a mitad de cola, paramos y reintentamos luego.
      if (!navigator.onLine) {
        networkInterrupted = true;
        break;
      }
      try {
        await executeSupabaseAction(item);
        if (item.id) await dbLocal.syncQueue.delete(item.id);
        const qk = mapEntityToQueryKey(item.entity);
        if (qk) invalidatedKeys.add(qk);
        successCount++;
      } catch (itemError: any) {
        const code = itemError?.code || itemError?.details?.code;
        const msg = (itemError?.message || '').toLowerCase();
        const isDuplicate = code === '23505' || msg.includes('duplicate key');

        // Duplicado → ya existe remoto, descartar item.
        if (isDuplicate) {
          console.warn('[Sync] descartando duplicado', item.entity, item.payload?.id);
          if (item.id) await dbLocal.syncQueue.delete(item.id);
          continue;
        }

        // Error de red → parar y reintentar más tarde sin perder items.
        if (isNetworkError(itemError)) {
          networkInterrupted = true;
          break;
        }

        // Error no-red (RLS, validación, FK, etc.): incrementar tries.
        // No bloqueamos el resto de la cola por un item envenenado.
        const tries = (item.tries || 0) + 1;
        if (tries >= MAX_TRIES) {
          console.error('[Sync] descartando item tras', MAX_TRIES, 'intentos:', item.entity, itemError);
          if (item.id) await dbLocal.syncQueue.delete(item.id);
          droppedCount++;
        } else if (item.id) {
          await dbLocal.syncQueue.update(item.id, {
            tries,
            lastError: itemError?.message || String(itemError),
          });
        }
        // Continuar con siguiente item.
      }
    }

    if (successCount > 0) {
      toastRef?.(`Sincronización completada: ${successCount} ${successCount === 1 ? 'item' : 'items'}`, 'success');
      // Invalidar solo las queries afectadas, en lugar de TODO.
      invalidatedKeys.forEach((qk) => {
        queryClientRef?.invalidateQueries({ queryKey: [qk, currentUserId] });
      });
    }
    if (droppedCount > 0) {
      toastRef?.(`${droppedCount} ${droppedCount === 1 ? 'cambio fue descartado' : 'cambios fueron descartados'} tras varios intentos fallidos`, 'error');
    }

    if (networkInterrupted) {
      useUIStore.getState().setSyncError('Reintentando conexión...');
    } else {
      useUIStore.getState().setSyncError(null);
    }
    useUIStore.getState().setSyncing(false);
  } catch (error) {
    console.error('[Sync] error inesperado:', error);
    useUIStore.getState().setSyncError((error as any)?.message || 'Error desconocido');
  } finally {
    isGlobalSyncing = false;
    setIsSyncing(false);
    useUIStore.getState().setSyncing(false);
  }
};

/**
 * Encola una acción para sincronización offline.
 *
 * Deduplica de forma inteligente:
 * - Si hay un UPDATE o CREATE previo para el mismo registro, lo reemplaza por
 *   el payload más reciente (evita 10 escrituras consecutivas del mismo form).
 * - Si llega un DELETE de un item que aún no se ha creado remoto, anula
 *   ambos (CREATE + DELETE = nada).
 */
const addToSyncQueue = async (
  action: SyncItem['action'],
  entity: SyncItem['entity'],
  payload: any
) => {
  try {
    // Red de seguridad: si la app acaba de volver de segundo plano y la
    // conexión a IndexedDB quedó congelada, esto la recupera ANTES de
    // intentar escribir (ver comentario detallado en LocalDatabase.ts).
    // En el caso normal (conexión sana) esto resuelve casi instantáneo.
    await ensureDbAlive();

    const recordId = payload?.id;

    if (recordId) {
      // Buscar entradas previas del mismo registro (mismo entity + mismo id).
      const existing = await dbLocal.syncQueue
        .where('entity').equals(entity)
        .toArray();
      const sameRecord = existing.filter(
        (e) => e.payload?.id === recordId
      );

      // CREATE + DELETE pendiente → cancelar ambos.
      if (action === 'DELETE') {
        const pendingCreate = sameRecord.find((e) => e.action === 'CREATE');
        if (pendingCreate) {
          // Borrar el CREATE pendiente y NO encolar el DELETE (jamás llegó al server).
          if (pendingCreate.id) await dbLocal.syncQueue.delete(pendingCreate.id);
          // También limpiar UPDATEs pendientes.
          for (const e of sameRecord) {
            if (e.action === 'UPDATE' && e.id) await dbLocal.syncQueue.delete(e.id);
          }
          updateLocalCache(action, entity, payload);
          return;
        }
      }

      // Coalescer múltiples UPDATEs del mismo registro: quedarse con el último payload.
      if (action === 'UPDATE') {
        const pendingUpdates = sameRecord.filter((e) => e.action === 'UPDATE');
        for (const e of pendingUpdates) {
          if (e.id) await dbLocal.syncQueue.delete(e.id);
        }
        // Si hay un CREATE pendiente, fusionar el UPDATE en él (no encolar UPDATE separado).
        const pendingCreate = sameRecord.find((e) => e.action === 'CREATE');
        if (pendingCreate && pendingCreate.id) {
          await dbLocal.syncQueue.update(pendingCreate.id, {
            payload: { ...pendingCreate.payload, ...payload },
          });
          updateLocalCache(action, entity, payload);
          return;
        }
      }
    }

    await dbLocal.syncQueue.add({
      action, entity, payload,
      createdAt: Date.now(),
      tries: 0,
    });
    updateLocalCache(action, entity, payload);

    if (navigator.onLine) {
      if (pendingFlushTimer) clearTimeout(pendingFlushTimer);
      pendingFlushTimer = setTimeout(() => {
        pendingFlushTimer = null;
        processSyncQueue();
      }, 400);
    }
  } catch (error) {
    console.error('[Sync] error encolando acción offline:', error);
    toastRef?.('Error guardando en local', 'error');
  }
};

const startBackgroundRetry = () => {
  if (backgroundRetryTimer) return;
  backgroundRetryTimer = setInterval(async () => {
    if (!navigator.onLine) return;
    if (isGlobalSyncing) return;
    const count = await dbLocal.syncQueue.count();
    if (count > 0) processSyncQueue();
  }, BACKGROUND_RETRY_MS);
};

const initListeners = () => {
  if (initialized) return;
  initialized = true;

  // Solo forzamos una recarga completa de datos si la app estuvo
  // realmente inactiva un buen rato (no en cada parpadeo de segundo
  // plano). Antes se invalidaba TODO en cada regreso, sin importar si
  // habían pasado 3 segundos o 3 horas — eso multiplicaba la
  // transferencia de datos (egress) sin necesidad real: si volviste a
  // los pocos segundos, tus datos casi seguro siguen igual.
  const BACKGROUND_REFRESH_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutos
  let backgroundedAt: number | null = null;

  const shouldFullyRefresh = () => {
    if (backgroundedAt === null) return false;
    const elapsed = Date.now() - backgroundedAt;
    backgroundedAt = null;
    return elapsed > BACKGROUND_REFRESH_THRESHOLD_MS;
  };

  const handleOnline = () => {
    setIsOnline(true);
    processSyncQueue();
  };
  const handleOffline = () => setIsOnline(false);

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      backgroundedAt = Date.now();
      return;
    }
    if (document.visibilityState === 'visible' && navigator.onLine) {
      setIsOnline(true);
      const doFullRefresh = shouldFullyRefresh();
      setTimeout(async () => {
        if (!navigator.onLine) return;
        await ensureDbAlive();
        const count = await dbLocal.syncQueue.count();
        if (count > 0) processSyncQueue();
        else if (doFullRefresh) queryClientRef?.invalidateQueries();
      }, 200);
    }
  };

  // Caso relacionado: cuando iOS restaura la página desde el bfcache
  // (back-forward cache) tras volver de segundo plano, a veces no dispara
  // 'visibilitychange' de forma confiable. 'pageshow' con persisted=true
  // cubre ese hueco.
  const handlePageShow = (e: PageTransitionEvent) => {
    if (e.persisted) {
      setTimeout(async () => {
        await ensureDbAlive();
        if (navigator.onLine) {
          const count = await dbLocal.syncQueue.count();
          if (count > 0) processSyncQueue();
        }
      }, 200);
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pageshow', handlePageShow);

  if (Capacitor.isNativePlatform()) {
    CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        backgroundedAt = Date.now();
        return;
      }
      setIsOnline(navigator.onLine);
      if (!navigator.onLine) return;
      const doFullRefresh = shouldFullyRefresh();
      setTimeout(async () => {
        if (!navigator.onLine) return;
        await ensureDbAlive();
        const count = await dbLocal.syncQueue.count();
        if (count > 0) processSyncQueue();
        else if (doFullRefresh) queryClientRef?.invalidateQueries();
      }, 200);
    })
      .then((l) => {
        capacitorListener = l;
      })
      .catch((err) => console.error('Listener error', err));
  }

  startBackgroundRetry();

  if (navigator.onLine) processSyncQueue();
};

// ============================================================
// HOOK — exposes shared state + refs, installs listeners once.
// ============================================================
export const useOfflineSync = (userId?: string) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Keep latest refs (cheap — happens on every render but does no work)
  queryClientRef = queryClient;
  toastRef = showToast;
  if (userId !== undefined) currentUserId = userId;

  // Install listeners ONCE for the whole app
  if (!initialized && typeof window !== 'undefined') initListeners();

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const pendingItems =
    useLiveQuery(() => dbLocal.syncQueue.orderBy('createdAt').toArray(), []) || [];
  const pendingCount = pendingItems.length;

  const stableProcess = useCallback(() => processSyncQueue(), []);
  const stableAdd = useCallback(
    (action: SyncItem['action'], entity: SyncItem['entity'], payload: any) =>
      addToSyncQueue(action, entity, payload),
    []
  );

  return {
    isOnline: snapshot.isOnline,
    isSyncing: snapshot.isSyncing,
    addToSyncQueue: stableAdd,
    processSyncQueue: stableProcess,
    isNetworkError,
    pendingItems,
    pendingCount,
  };
};

// Optional teardown for HMR
if (typeof import.meta !== 'undefined' && (import.meta as any).hot) {
  (import.meta as any).hot.dispose(() => {
    if (capacitorListener) capacitorListener.remove();
    if (backgroundRetryTimer) { clearInterval(backgroundRetryTimer); backgroundRetryTimer = null; }
    initialized = false;
  });
}
