import { supabase } from '../../supabaseClient';

/**
 * Returns a valid user id, preferring the prop and falling back to the
 * active Supabase session. Shared by all modular entity hooks.
 */
export const resolveUserId = async (userId: string | undefined): Promise<string | null> => {
  if (userId && userId !== 'offline-user-id') return userId;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
};
