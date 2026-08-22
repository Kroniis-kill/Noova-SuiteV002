import { supabase } from '../supabaseClient';
import { withRetry } from '../utils/supabaseUtils';
import { UserSubscription, PlanType } from '../types/subscriptionTypes';
import { Feedback, Announcement } from '../types/adminTypes';

/**
 * Funciones de datos del panel de plataforma (/admin).
 *
 * A propósito, este archivo NO reutiliza SubscriptionContext.tsx — ese
 * contexto es del lado "app del negocio" (tenant) y tiene lógica de
 * acceso/trial que no aplica acá. Duplicar estas pocas funciones como
 * llamadas planas (sin estado de React) es más seguro que refactorizar
 * un contexto que ya funciona en producción.
 */

// ── Suscripciones ──────────────────────────────────────────────────

export const getAllSubscriptions = async (): Promise<UserSubscription[]> => {
  const { data } = await withRetry(() =>
    supabase.from('user_data')
      .select('id, email, full_name, plan, plan_expiry, is_active, created_at, auto_renewal, status')
      .order('created_at', { ascending: false })
  );
  return (data || []).map((u: any) => {
    let expiry = u.plan_expiry;
    if (!expiry && (!u.plan || u.plan === 'free')) {
      const created = new Date(u.created_at);
      created.setDate(created.getDate() + 3);
      expiry = created.toISOString();
    }
    return {
      user_id: u.id,
      user_email: u.email,
      full_name: u.full_name,
      plan: u.plan || 'free',
      expires_at: expiry || new Date().toISOString(),
      is_active: u.is_active !== false,
      created_at: u.created_at,
      auto_renewal: u.auto_renewal,
      status: u.status || 'active',
    };
  });
};

export const updateSubscription = async (userId: string, plan: PlanType, expiryDate: string) => {
  try {
    const { error } = await withRetry(() =>
      supabase.from('user_data').update({ plan, plan_expiry: expiryDate, is_active: true }).eq('id', userId)
    );
    if (error) throw error;
    return { success: true };
  } catch (e: any) { return { success: false, message: e.message }; }
};

export const deleteSubscription = async (userId: string) => {
  try {
    const { error } = await withRetry(() => supabase.from('user_data').delete().eq('id', userId));
    if (error) throw error;
    return { success: true };
  } catch (e: any) { return { success: false, message: e.message }; }
};

export const registerTenant = async (email: string, password: string, plan: PlanType, expiryDate: string) => {
  try {
    // Usa signUp normal — igual que el panel embebido actual. El nuevo
    // usuario recibe su fila en user_data con el plan ya activado.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: email.split('@')[0] } },
    });
    if (authError) throw authError;
    const newUser = authData.user;
    if (!newUser) throw new Error('No se pudo crear el usuario en Auth.');

    const { error: dbError } = await withRetry(() =>
      supabase.from('user_data').insert({
        id: newUser.id, email, full_name: email.split('@')[0],
        plan, plan_expiry: expiryDate, created_at: new Date().toISOString(),
        is_active: true, status: 'active',
      })
    );
    if (dbError) throw dbError;
    return { success: true };
  } catch (e: any) { return { success: false, message: e.message }; }
};

export const toggleBlockStatus = async (userId: string, currentStatus: string): Promise<boolean> => {
  try {
    const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
    const { error } = await withRetry(() => supabase.from('user_data').update({ status: newStatus }).eq('id', userId));
    return !error;
  } catch { return false; }
};

export const toggleAutoRenewal = async (userId: string, currentStatus: boolean): Promise<boolean> => {
  try {
    const { error } = await withRetry(() => supabase.from('user_data').update({ auto_renewal: !currentStatus }).eq('id', userId));
    return !error;
  } catch { return false; }
};

export const renewSubscription = async (userId: string, monthsToAdd: number): Promise<boolean> => {
  try {
    const { data } = await withRetry(() => supabase.from('user_data').select('plan_expiry').eq('id', userId).single());
    if (!data) return false;
    const currentExpiry = new Date(data.plan_expiry);
    const now = new Date();
    const baseDate = currentExpiry > now ? currentExpiry : now;
    baseDate.setMonth(baseDate.getMonth() + monthsToAdd);
    const { error } = await withRetry(() =>
      supabase.from('user_data').update({ plan_expiry: baseDate.toISOString(), is_active: true }).eq('id', userId)
    );
    return !error;
  } catch { return false; }
};

export const extendDays = async (userId: string, days: number): Promise<boolean> => {
  try {
    const { data } = await withRetry(() => supabase.from('user_data').select('plan_expiry, created_at').eq('id', userId).single());
    if (!data) return false;
    let baseDate = new Date();
    if (data.plan_expiry) {
      const exp = new Date(data.plan_expiry);
      if (exp > baseDate) baseDate = exp;
    } else {
      const created = new Date(data.created_at);
      created.setDate(created.getDate() + 3);
      if (created > baseDate) baseDate = created;
    }
    baseDate.setDate(baseDate.getDate() + days);
    const { error } = await withRetry(() =>
      supabase.from('user_data').update({ plan_expiry: baseDate.toISOString(), is_active: true }).eq('id', userId)
    );
    return !error;
  } catch { return false; }
};

export const revokeUserPlan = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await withRetry(() =>
      supabase.from('user_data').update({ plan: 'free', plan_expiry: new Date().toISOString(), auto_renewal: false }).eq('id', userId)
    );
    return !error;
  } catch { return false; }
};

// ── Feedback / Anuncios ────────────────────────────────────────────

export const getFeedback = async (): Promise<Feedback[]> => {
  try {
    const { data, error } = await withRetry(() =>
      supabase.from('feedback').select('id, user_id, user_email, message, status, created_at').order('created_at', { ascending: false })
    );
    if (error && error.code === 'PGRST205') return [];
    return data || [];
  } catch { return []; }
};

export const markFeedbackAsRead = async (id: string): Promise<boolean> => {
  const { error } = await withRetry(() => supabase.from('feedback').update({ status: 'read' }).eq('id', id));
  return !error;
};

export const getAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const { data, error } = await withRetry(() =>
      supabase.from('announcements').select('id, message, is_active, created_at').order('created_at', { ascending: false })
    );
    if (error && error.code === 'PGRST205') return [];
    return data || [];
  } catch { return []; }
};

export const createAnnouncement = async (message: string): Promise<boolean> => {
  const { error } = await withRetry(() => supabase.from('announcements').insert({ message, is_active: true }));
  return !error;
};

export const deleteAnnouncement = async (id: string): Promise<boolean> => {
  const { error } = await withRetry(() => supabase.from('announcements').delete().eq('id', id));
  return !error;
};

// ── Códigos de descuento ───────────────────────────────────────────

export interface DiscountCode {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed_days' | 'fixed_amount';
  value: number;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  expires_at: string | null;
  note: string | null;
  created_at: string;
}

export const getDiscountCodes = async (): Promise<DiscountCode[]> => {
  try {
    const { data, error } = await withRetry(() =>
      supabase.from('discount_codes').select('*').order('created_at', { ascending: false })
    );
    if (error) {
      // Tabla todavía no creada (falta correr setup_discount_codes.sql) → no romper el panel.
      if (error.code === 'PGRST205' || error.code === '42P01') return [];
      throw error;
    }
    return data || [];
  } catch { return []; }
};

export const createDiscountCode = async (input: {
  code: string;
  discount_type: DiscountCode['discount_type'];
  value: number;
  max_uses?: number | null;
  expires_at?: string | null;
  note?: string | null;
}): Promise<{ success: boolean; message?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await withRetry(() =>
      supabase.from('discount_codes').insert({
        code: input.code.trim().toUpperCase(),
        discount_type: input.discount_type,
        value: input.value,
        max_uses: input.max_uses ?? null,
        expires_at: input.expires_at ?? null,
        note: input.note ?? null,
        created_by: user?.id,
      })
    );
    if (error) throw error;
    return { success: true };
  } catch (e: any) {
    const msg = e?.code === '23505' ? 'Ese código ya existe.' : (e?.message || 'Error creando el código.');
    return { success: false, message: msg };
  }
};

export const toggleDiscountCodeActive = async (id: string, currentStatus: boolean): Promise<boolean> => {
  const { error } = await withRetry(() => supabase.from('discount_codes').update({ is_active: !currentStatus }).eq('id', id));
  return !error;
};

export const deleteDiscountCode = async (id: string): Promise<boolean> => {
  const { error } = await withRetry(() => supabase.from('discount_codes').delete().eq('id', id));
  return !error;
};

/**
 * Aplica un código de descuento a la suscripción de un usuario:
 * - fixed_days → suma días a la fecha de vencimiento actual
 * - percent / fixed_amount → quedan registrados en el canje para que el
 *   admin los tenga en cuenta al cobrar (esta app no tiene cobro
 *   automático todavía, así que el descuento en $ se aplica "a mano"
 *   fuera del sistema — acá solo se registra el uso y, si el tipo es
 *   fixed_days, se extiende la fecha).
 * Valida: código activo, no vencido, y con cupos disponibles.
 */
export const redeemDiscountCode = async (
  codeText: string,
  targetUserId: string
): Promise<{ success: boolean; message?: string; code?: DiscountCode }> => {
  try {
    const normalized = codeText.trim().toUpperCase();
    const { data: code, error } = await withRetry(() =>
      supabase.from('discount_codes').select('*').eq('code', normalized).single()
    );
    if (error || !code) return { success: false, message: 'Código no encontrado.' };
    if (!code.is_active) return { success: false, message: 'Ese código está desactivado.' };
    if (code.expires_at && new Date(code.expires_at) < new Date()) return { success: false, message: 'Ese código ya venció.' };
    if (code.max_uses !== null && code.uses_count >= code.max_uses) return { success: false, message: 'Ese código alcanzó su límite de usos.' };

    if (code.discount_type === 'fixed_days') {
      const ok = await extendDays(targetUserId, code.value);
      if (!ok) return { success: false, message: 'No se pudo extender la suscripción.' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    await withRetry(() => supabase.from('discount_code_redemptions').insert({
      discount_code_id: code.id, user_id: targetUserId, redeemed_by_admin: user?.id,
    }));
    await withRetry(() => supabase.from('discount_codes').update({ uses_count: code.uses_count + 1 }).eq('id', code.id));

    return { success: true, code };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Error aplicando el código.' };
  }
};
