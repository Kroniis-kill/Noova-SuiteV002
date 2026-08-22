
import Dexie, { Table } from 'dexie';
import { LogAction, LogEntity } from '../types';

export interface SyncItem {
  id?: number;
  action: LogAction;
  entity: LogEntity;
  payload: any;
  createdAt: number;
  // Número de intentos no-red fallidos. Tras N intentos se descarta el item
  // para evitar que un registro "envenenado" bloquee la cola.
  tries?: number;
  // Último error legible (para diagnóstico/diagnostics si hace falta).
  lastError?: string;
}

export class NoovaDatabase extends Dexie {
  syncQueue!: Table<SyncItem, number>;

  constructor() {
    super('NoovaOfflineDB');
    // v21 → v22: añade `tries` y `lastError` opcionales. Dexie maneja el upgrade
    // automáticamente porque los nuevos campos no son indexados.
    this.version(21).stores({
      syncQueue: '++id, action, entity, createdAt'
    });
    this.version(22).stores({
      syncQueue: '++id, action, entity, createdAt'
    });
  }
}

export const dbLocal = new NoovaDatabase();

// ============================================================
// WATCHDOG DE CONEXIÓN — recupera la base local tras backgrounding
// ============================================================
//
// Problema conocido de IndexedDB en navegadores móviles (sobre todo
// Safari/iOS, pero también se ve en Android): cuando el sistema pone la
// app en segundo plano un rato y la vuelve a activar, la conexión abierta
// a IndexedDB puede quedar "congelada" — las transacciones nuevas nunca
// resuelven ni rechazan, simplemente no responden. El síntoma para el
// usuario es exactamente "hice un cambio y no se guardó, tuve que cerrar
// la app por completo para que funcione" — cerrar del todo crea una
// conexión nueva y por eso "arregla" el problema.
//
// La solución estándar (recomendada por el propio autor de Dexie): correr
// una transacción de prueba corta con un timeout; si no contesta a
// tiempo, asumimos que la conexión está muerta, la cerramos y dejamos que
// Dexie abra una nueva en la siguiente consulta.
const DB_WATCHDOG_TIMEOUT_MS = 2500;

let recoveryInFlight: Promise<void> | null = null;

/**
 * Verifica que la conexión a la base local sigue viva. Si no responde a
 * tiempo, la reinicia. Se debe llamar SIEMPRE antes de cualquier
 * lectura/escritura crítica que ocurra justo al volver del segundo plano
 * (resume de la app), y sirve también como red de seguridad dentro de
 * `addToSyncQueue` por si el usuario alcanza a escribir antes de que el
 * watchdog de resume termine de correr.
 */
export async function ensureDbAlive(): Promise<void> {
  if (recoveryInFlight) return recoveryInFlight;

  recoveryInFlight = (async () => {
    try {
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise<'timeout'>((resolve) => {
        timeoutId = setTimeout(() => resolve('timeout'), DB_WATCHDOG_TIMEOUT_MS);
      });
      const pingPromise = dbLocal.syncQueue.count().then(() => 'ok' as const);

      const result = await Promise.race([pingPromise, timeoutPromise]);
      clearTimeout(timeoutId!);

      if (result === 'timeout') {
        console.warn('[DB Watchdog] Conexión local sin respuesta, reiniciando...');
        try { dbLocal.close(); } catch { /* ya podía estar cerrada */ }
        await dbLocal.open();
      }
    } catch (err) {
      // Si el ping en sí falla (no solo cuelga), también reintentamos abrir.
      console.warn('[DB Watchdog] Error verificando conexión local, reabriendo...', err);
      try { dbLocal.close(); } catch { /* noop */ }
      try { await dbLocal.open(); } catch (openErr) {
        console.error('[DB Watchdog] No se pudo reabrir la base local:', openErr);
      }
    } finally {
      recoveryInFlight = null;
    }
  })();

  return recoveryInFlight;
}
