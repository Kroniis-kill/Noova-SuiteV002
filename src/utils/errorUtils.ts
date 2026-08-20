export const getSupabaseErrorMessage = (error: any): string => {
  if (!error) return "Error desconocido.";

  // Si el error ya es un string, lo devolvemos
  if (typeof error === 'string') return error;

  // Si es un error de red
  if (error.message === "Failed to fetch") return "Error de red: No se pudo conectar con el servidor.";

  // Errores de Supabase/PostgreSQL comunes
  switch (error.code) {
    case '23505': // Clave duplicada
      if (error.details?.includes('phone')) return "Este número de teléfono ya está registrado.";
      if (error.details?.includes('name')) return "Este nombre de cliente ya existe.";
      return "Registro duplicado: Estos datos ya están en el sistema.";
    
    case '23502': // Not null violation
      return "Falta un campo obligatorio.";
    
    case '42P01': // Table not found
      return "Error de base de datos: Tabla no encontrada.";

    case 'PGRST116': // Row level security
      return "Sin permisos para realizar esta acción.";

    default:
      // Devolver mensaje técnico si existe, de lo contrario un mensaje genérico
      return error.message || error.details || "Ocurrió un error inesperado al guardar.";
  }
};