import { supabase } from '../supabaseClient';

/**
 * Verifica si el usuario autenticado tiene rol de admin.
 *
 * SEGURIDAD: usa la función `has_role()` (SECURITY DEFINER) sobre la tabla
 * `user_roles`. Esta es la única fuente de verdad — nunca confíes en
 * `email`, localStorage ni en la tabla legacy `app_admins` desde el cliente.
 *
 * Requiere haber ejecutado `src/setup_user_roles.sql` en Supabase.
 */
export const checkIsAdmin = async (userId?: string): Promise<boolean> => {
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id;
  }
  if (!userId) return false;

  try {
    const { data, error } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin',
    });
    if (error) {
      console.warn('[isAdmin] has_role error:', error.message);
      return false;
    }
    return data === true;
  } catch (e) {
    console.error('[isAdmin] exception:', e);
    return false;
  }
};
