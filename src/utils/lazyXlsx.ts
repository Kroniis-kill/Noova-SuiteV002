/**
 * Carga perezosa del módulo `xlsx` (~900 KB minificado).
 *
 * Importar xlsx estáticamente en cualquier pantalla la mete en el bundle
 * inicial. Con este helper, el chunk de xlsx solo se descarga cuando el
 * usuario realmente importa/exporta un archivo.
 *
 * Uso:
 *   const XLSX = await loadXlsx();
 *   const wb = XLSX.read(...);
 */
export const loadXlsx = () => import('xlsx');
export type XlsxModule = Awaited<ReturnType<typeof loadXlsx>>;
