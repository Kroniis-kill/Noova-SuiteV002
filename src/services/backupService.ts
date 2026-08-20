
import { loadXlsx } from '../utils/lazyXlsx';
import { supabase } from '../supabaseClient';
import { generateUUID } from '../utils/uuid';
import { mappers } from '../utils/mappers';

const TABLES_CONFIG = [
  { id: 'settings', table: 'settings', mapper: null },
  { id: 'providers', table: 'providers', mapper: 'provider' },
  { id: 'resellers', table: 'resellers', mapper: 'reseller' },
  { id: 'expense_categories', table: 'expense_categories', mapper: 'expenseCategory' },
  { id: 'clients', table: 'clients', mapper: 'client' },
  { id: 'financial_accounts', table: 'financial_accounts', mapper: 'financial' },
  { id: 'services', table: 'services', mapper: 'service' },
  { id: 'accounts', table: 'accounts', mapper: 'account' },
  { id: 'sales', table: 'sales', mapper: 'sale' },
  { id: 'expenses', table: 'expenses', mapper: 'expense' },
  { id: 'supplies', table: 'supplies', mapper: 'supply' },
  { id: 'payable_expenses', table: 'payable_expenses', mapper: 'payable' },
  { id: 'movements', table: 'movements', mapper: 'movement' },
  { id: 'profile_history', table: 'profile_history', mapper: 'profileHistory' },
  { id: 'service_failures', table: 'service_failures', mapper: 'serviceFailure' },
  { id: 'activity_logs', table: 'activity_logs', mapper: 'log' }
];

const TABLE_ORDER = TABLES_CONFIG.map(t => t.table);

// Fields that might reference other table IDs (we'll also auto-detect *_id)
const ADDITIONAL_FK_FIELDS = ['parent_id', 'ref_id', 'related_account_id'];

export const backupService = {
  exportData: async (userId: string) => {
    try {
      const backup: any = {
        version: '1.5',
        timestamp: new Date().toISOString(),
        userId,
        data: {}
      };

      console.log('--- Iniciando Exportación Completa ---');

      for (const config of TABLES_CONFIG) {
        const { data, error } = await supabase
          .from(config.table)
          .select('*')
          .eq('user_id', userId);
        
        if (!error && data) {
          // Normalización para tablas que puedan tener nombres distintos en backups legacy
          backup.data[config.table] = data;
          console.log(`[Export] ${config.table}: ${data.length} registros`);
        } else if (error) {
          console.warn(`[Export Error] ${config.table}:`, error.message);
        }
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const filename = `noova_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error al exportar JSON:', error);
      throw error;
    }
  },

  importData: async (file: File, userId: string, onProgress?: (msg: string) => void) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          if (!content) throw new Error('El archivo está vacío');
          
          const backup = JSON.parse(content);
          if (!backup.data) throw new Error('Formato inválido: Falta el nodo de datos');

          // --- NORMALIZACIÓN DE TABLAS (Compatibilidad con versiones viejas y exportaciones manuales) ---
          const normalizeTable = (oldName: string, newName: string) => {
            if (backup.data[oldName] && !backup.data[newName]) {
              backup.data[newName] = backup.data[oldName];
              console.log(`[Import] Mapeando tabla legacy '${oldName}' -> '${newName}'`);
            }
          };

          normalizeTable('failure_reports', 'service_failures');
          normalizeTable('client', 'clients');
          normalizeTable('sale', 'sales');
          normalizeTable('account', 'accounts');
          normalizeTable('service', 'services');
          normalizeTable('movement', 'movements');
          normalizeTable('expense', 'expenses');
          normalizeTable('provider', 'providers');
          normalizeTable('reseller', 'resellers');
          normalizeTable('payable', 'payable_expenses');
          normalizeTable('supply', 'supplies');
          normalizeTable('log', 'activity_logs');
          normalizeTable('category', 'expense_categories');

          // Detección de migración de identidad
          const backupUserId = backup.userId || backup.data?.settings?.[0]?.user_id;
          const isDifferentUser = !!backupUserId && backupUserId !== userId;
          const idMap = new Map<string, string>();
          
          onProgress?.('Analizando integridad del respaldo...');

          if (isDifferentUser) {
            onProgress?.('Preparando migración de datos (Cuenta distinta)...');
            TABLES_CONFIG.forEach(config => {
                const rows = backup.data[config.table];
                if (Array.isArray(rows)) {
                    rows.forEach((row: any) => {
                        if (row.id) idMap.set(String(row.id), generateUUID());
                    });
                }
            });
          }

          let totalSuccess = 0;
          let totalError = 0;
          let totalAttempted = 0;
          const errorLog: string[] = [];

          onProgress?.('Iniciando restauración programada...');

          // Ejecutar en el orden definido por TABLES_CONFIG para respetar dependencias lógicas
          for (const config of TABLES_CONFIG) {
            const rows = backup.data[config.table];
            if (!Array.isArray(rows) || rows.length === 0) {
                console.log(`[Import] Saltando ${config.table} (Sin datos)`);
                continue;
            }

            onProgress?.(`Procesando ${config.table} (${rows.length} registros)...`);
            console.log(`[Import] Procesando ${config.table}...`);
            
            const sanitizedRows = rows.map(jsonRow => {
                 let rowToUpsert: any;
                 totalAttempted++;

                 // 1. Filtrado de columnas usando Mappers
                 if (config.mapper && (mappers as any)[config.mapper]) {
                    const mapper = (mappers as any)[config.mapper];
                    try {
                        const domainObj = mapper.fromDb(jsonRow);
                        rowToUpsert = mapper.toDb(domainObj, userId);
                    } catch (err) {
                        console.warn(`Mapper fallback for ${config.table}:`, err);
                        rowToUpsert = { ...jsonRow, user_id: userId };
                    }
                 } else {
                    rowToUpsert = { ...jsonRow, user_id: userId };
                 }

                 // 2. Mapeo de Identidades
                 Object.keys(rowToUpsert).forEach(key => {
                    if (isDifferentUser) {
                        const val = String(rowToUpsert[key]);
                        if (key === 'id' || key.endsWith('_id') || ADDITIONAL_FK_FIELDS.includes(key)) {
                            if (idMap.has(val)) {
                                rowToUpsert[key] = idMap.get(val);
                            } else if (key !== 'id' && key !== 'user_id' && val && val !== 'null' && val !== 'undefined') {
                                rowToUpsert[key] = null;
                            }
                        }
                    }
                 });

                 // 3. Garantizar campos críticos y limpiar campos no permitidos
                 if (config.table === 'settings') delete rowToUpsert.id;
                 if (!rowToUpsert.created_at && config.table !== 'settings') rowToUpsert.created_at = new Date().toISOString();
                 if (config.table === 'movements' && !rowToUpsert.date) rowToUpsert.date = new Date().toISOString().split('T')[0];
                 
                 return rowToUpsert;
            });

            const conflictCol = config.table === 'settings' ? 'user_id' : 'id';
            const batchSize = 25;
            
            for (let i = 0; i < sanitizedRows.length; i += batchSize) {
              const batch = sanitizedRows.slice(i, i + batchSize);
              const { error } = await supabase
                .from(config.table)
                .upsert(batch, { onConflict: conflictCol });
              
              if (error) {
                console.error(`Error en ${config.table}:`, error.message, error.details);
                errorLog.push(`${config.table}: ${error.message}`);
                totalError += batch.length;
              } else {
                totalSuccess += batch.length;
              }
            }
          }

          if (totalSuccess === 0 && totalAttempted > 0) {
            throw new Error(`Error crítico: No se pudo restaurar ningún dato. Verifique el formato del archivo.`);
          }

          if (totalError > 0) {
            onProgress?.(`Restauración parcial: ${totalSuccess} realizados, ${totalError} omitidos.`);
          } else {
            onProgress?.(`¡Exito! ${totalSuccess} registros restaurados correctamente.`);
          }
          
          resolve(true);
        } catch (error) {
          console.error('Restore sequence crashed:', error);
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo JSON'));
      reader.readAsText(file);
    });
  },

  exportToExcel: async (userId: string) => {
    try {
      // For Excel, we'll focus on the most important data: Sales, Clients, Accounts
      const collections = [
        { name: 'Ventas', table: 'sales' },
        { name: 'Clientes', table: 'clients' },
        { name: 'Cuentas', table: 'accounts' },
        { name: 'Movimientos', table: 'movements' },
        { name: 'Gastos', table: 'expenses' }
      ];

      const XLSX = await loadXlsx();
      const workbook = XLSX.utils.book_new();

      for (const col of collections) {
        const { data, error } = await supabase
          .from(col.table)
          .select('*')
          .eq('user_id', userId);
        
        if (!error && data && data.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, worksheet, col.name);
        }
      }

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const filename = `noova_datos_${new Date().toISOString().split('T')[0]}.xlsx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  },

  deleteUserData: async (userId: string, target: 'Ventas' | 'Clientes' | 'Productos' | 'Todo') => {
    try {
      let tables: string[] = [];
      
      switch (target) {
        case 'Ventas':
          tables = ['sales', 'movements', 'service_failures'];
          break;
        case 'Clientes':
          tables = ['profile_history', 'movements', 'sales', 'accounts', 'clients'];
          break;
        case 'Productos':
          tables = ['service_failures', 'services'];
          break;
        case 'Todo':
          tables = [...TABLE_ORDER].reverse();
          break;
      }
      
      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('user_id', userId);
        
        if (error) {
          console.warn(`Error deleting from ${table}:`, error);
          // Continue with others if some fail due to constraints, or throw?
          // Usually we want to be thorough.
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting ${target}:`, error);
      throw error;
    }
  }
};
