
import { PlanType } from './subscriptionTypes';

export type SubscriptionAction = 'CREATED' | 'UPDATED' | 'SUSPENDED' | 'RENEWED' | 'REACTIVATED' | 'DELETED';

export interface SubscriptionHistory {
  id: string;
  user_id: string;
  admin_id: string;
  action: SubscriptionAction;
  old_plan?: PlanType;
  new_plan?: PlanType;
  old_expiration?: string;
  new_expiration?: string;
  timestamp: string;
  user_email?: string; // For UI convenience, joined usually
  admin_email?: string; // For UI convenience
}

export interface Feedback {
  id: string;
  user_id: string;
  user_email: string;
  message: string;
  created_at: string;
  status: 'pending' | 'read';
}

export interface Announcement {
  id: string;
  message: string;
  created_at: string;
  is_active: boolean;
}

export interface AdminAnalyticsData {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  expiredUsers: number;
  
  byPlan: Record<PlanType, number>;
  
  registrationsByMonth: { name: string; count: number }[];
  renewalsByMonth: { name: string; count: number }[];
  
  nextToExpire?: { email: string; date: string };
  oldestUser?: { email: string; date: string };
}
