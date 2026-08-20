
import { supabase } from '../supabaseClient';
import { UserSubscription } from '../types/subscriptionTypes';

export const checkSubscription = async (userId: string): Promise<UserSubscription | null> => {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      // If table doesn't exist yet or other error, return null (no sub)
      console.warn('Subscription check error:', error.message);
      return null;
    }

    return data as UserSubscription;
  } catch (e) {
    return null;
  }
};

export const isSubscriptionExpired = (expiresAt: string): boolean => {
  if (!expiresAt) return true;
  const expiry = new Date(expiresAt);
  const now = new Date();
  return now > expiry;
};
