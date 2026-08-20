
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
