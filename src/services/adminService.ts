
import { supabase } from '../supabaseClient';
import { PlanType } from '../types/subscriptionTypes';
import { SubscriptionHistory, AdminAnalyticsData, SubscriptionAction } from '../types/adminTypes';

import { withRetry } from '../utils/supabaseUtils';

/**
 * Logs a change in the subscription history table.
 */
export const logSubscriptionChange = async (
  userId: string,
  adminId: string,
  action: SubscriptionAction,
  oldData?: { plan?: PlanType; expires_at?: string },
  newData?: { plan?: PlanType; expires_at?: string }
) => {
  try {
    // We assume the table 'subscription_history' exists in Supabase
    const { error } = await withRetry(() => supabase.from('subscription_history').insert({
      user_id: userId,
      admin_id: adminId,
      action,
      old_plan: oldData?.plan || null,
      new_plan: newData?.plan || null,
      old_expiration: oldData?.expires_at || null,
      new_expiration: newData?.expires_at || null,
      timestamp: new Date().toISOString()
    }));

    if (error) console.error('Error logging subscription change:', error);
  } catch (e) {
    console.error('Exception logging subscription change:', e);
  }
};

/**
 * Fetches subscription history with optional filtering.
 */
export const getSubscriptionHistory = async (): Promise<SubscriptionHistory[]> => {
  try {
    // Joining with auth.users (aliased if possible, or just raw IDs)
    // Note: Frontend usually can't join auth.users easily unless specific Views are created.
    // For this implementation, we will fetch history and then try to map emails if available in our loaded user list or stored in metadata.
    // Assuming 'user_email' might be stored or we fetch it separately.
    
    // Simplification: Fetch history raw.
    const { data, error } = await withRetry(() => supabase
      .from('subscription_history')
      .select('id, user_id, admin_id, action, old_plan, new_plan, old_expiration, new_expiration, timestamp')
      .order('timestamp', { ascending: false }));

    if (error) throw error;
    
    // In a real app, we would join with users table to get emails.
    // We'll mock the email fetch or assume a view exists for now to keep it simple as requested.
    return data as SubscriptionHistory[];
  } catch (e) {
    console.error('Error fetching history:', e);
    return [];
  }
};

/**
 * Calculates analytics data for the dashboard.
 */
export const getAdminAnalytics = async (): Promise<AdminAnalyticsData> => {
  const analytics: AdminAnalyticsData = {
    totalUsers: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    expiredUsers: 0,
    byPlan: { free: 0, monthly: 0, quarterly: 0, semiannual: 0, annual: 0, lifetime: 0 },
    registrationsByMonth: [],
    renewalsByMonth: [],
  };

  try {
    const { data: subs, error } = await withRetry(() => supabase.from('user_subscriptions').select('id, plan, expires_at, is_active, created_at, user_email, user_id'));
    if (error || !subs) return analytics;

    const now = new Date();

    analytics.totalUsers = subs.length;

    subs.forEach((sub: any) => {
      const expiry = new Date(sub.expires_at);
      const isExpired = expiry < now;

      // Status Counts
      if (sub.is_active && !isExpired) analytics.activeUsers++;
      else if (!sub.is_active) analytics.suspendedUsers++;
      if (isExpired) analytics.expiredUsers++;

      // Plan Counts
      if (sub.plan in analytics.byPlan) {
        analytics.byPlan[sub.plan as PlanType]++;
      }

      // Next to expire
      if (!analytics.nextToExpire || (expiry < new Date(analytics.nextToExpire.date) && !isExpired)) {
         analytics.nextToExpire = { email: sub.user_email || sub.user_id, date: sub.expires_at };
      }
      
      // Oldest User (by created_at)
      if (sub.created_at) {
         const created = new Date(sub.created_at);
         if (!analytics.oldestUser || created < new Date(analytics.oldestUser.date)) {
            analytics.oldestUser = { email: sub.user_email || sub.user_id, date: sub.created_at };
         }
      }
    });

    // Mock Chart Data (since we don't have full history loaded here for performance)
    // In production, use RPC or specific queries.
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    analytics.registrationsByMonth = months.map(m => ({ name: m, count: Math.floor(Math.random() * 10) })); // Placeholder logic
    analytics.renewalsByMonth = months.map(m => ({ name: m, count: Math.floor(Math.random() * 15) })); // Placeholder logic

    return analytics;
  } catch (e) {
    console.error('Error calculating analytics:', e);
    return analytics;
  }
};