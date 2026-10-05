import { useOfflineSync } from './useOfflineSync';
import { useUIStore } from '../store/uiStore';

export type SyncUiState = 'ok' | 'pending' | 'sync' | 'offline' | 'error';

// Mensaje que usa la cola cuando perdió la conexión a mitad de una subida (no es un fallo real).
export const RETRYING_MESSAGE = 'Reintentando conexión...';

/**
 * Estado de sincronización ya resuelto para la interfaz, en un solo lugar:
 * así el icono del encabezado, el estado de la tarjeta principal y el aviso
 * flotante siempre dicen lo mismo.
 */
export const useSyncState = () => {
  const { isOnline, isSyncing, pendingCount, pendingItems, processSyncQueue } = useOfflineSync();
  const syncError = useUIStore((s) => s.syncError);
  const setSyncError = useUIStore((s) => s.setSyncError);

  const realError = syncError && syncError !== RETRYING_MESSAGE ? syncError : null;

  let state: SyncUiState = 'ok';
  if (realError) state = 'error';
  else if (!isOnline) state = 'offline';
  else if (isSyncing) state = 'sync';
  else if (pendingCount > 0) state = 'pending';

  return {
    state,
    isOnline,
    isSyncing,
    pendingCount,
    pendingItems,
    processSyncQueue,
    syncError: realError,
    clearError: () => setSyncError(null),
  };
};
