/**
 * Convierte cualquier error (Supabase/PostgreSQL, red, o lanzado por la propia
 * app) en un mensaje corto y entendible para el usuario. NUNCA devuelve texto
 * técnico (nombres de tablas, códigos SQL, trazas): ese detalle se queda en la
 * consola para depuración.
 *
 * Los errores que la propia app lanza con un mensaje pensado para el usuario
 * (por ejemplo "No hay cupos disponibles") se respetan tal cual.
 */
const TECHNICAL = /fetch|network|jwt|pgrst|postgres|sql|relation|column|violates|syntax|constraint|schema|undefined|null value|timeout|abort|cors|supabase/i;

export const getSupabaseErrorMessage = (error: any): string => {
  // Siempre se deja el detalle técnico en la consola (antes solo en DEV, y en producción
  // el error real quedaba oculto detrás del mensaje genérico).
  if (error) console.error('[error]', { code: error.code, message: error.message, details: error.details, hint: error.hint, error });

  if (!error) return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  if (typeof error === 'string') return TECHNICAL.test(error) ? 'Ocurrió un error inesperado. Inténtalo de nuevo.' : error;

  const message: string = error.message || '';

  // Sin conexión / servidor inalcanzable
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(message) || error.name === 'AbortError') {
    return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
  }

  // Sesión vencida
  if (message === 'No auth' || /no autenticado/i.test(message) || /jwt|not authenticated|invalid token/i.test(message) || error.code === 'PGRST301' || error.status === 401) {
    return 'Tu sesión expiró. Inicia sesión nuevamente.';
  }

  // RAISE EXCEPTION de las funciones SQL (P0001): mensajes de negocio pensados
  // para el usuario ("Cupos agotados", "PIN incorrecto"…).
  if (error.code === 'P0001' && message && !TECHNICAL.test(message)) return message;

  switch (error.code) {
    case '23505': // Clave duplicada
      if (error.details?.includes('phone')) return 'Este número de teléfono ya está registrado.';
      if (error.details?.includes('name')) return 'Este nombre ya existe.';
      return 'Ya existe un registro con estos datos.';
    case '23503': // Llave foránea
      return 'Este registro está vinculado a otros datos, por eso no se puede completar la acción.';
    case '23502': // Campo obligatorio vacío
    case '23514': // Check violation
    case '22P02': // Formato inválido
      return 'Revisa los datos ingresados: falta un campo o tiene un formato inválido.';
    case '42501': // Permisos / RLS
    case 'PGRST116':
      return 'No tienes permiso para realizar esta acción.';
    case '42P01':
    case 'PGRST204':
    case 'PGRST202':
      return 'No pudimos completar la acción. Si el problema continúa, actualiza la app.';
    case '57014': // statement timeout
      return 'La operación tardó demasiado. Inténtalo de nuevo.';
  }

  // Error de la propia app con texto legible: se muestra tal cual.
  if (message && !error.code && !TECHNICAL.test(message)) return message;

  // Mensaje genérico + código corto (sin datos sensibles) para poder diagnosticar el caso.
  const ref = error.code ? ` (cód. ${error.code})` : '';
  return `No pudimos completar la acción. Inténtalo de nuevo.${ref}`;
};
