
export type PlanType = 'free' | 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'lifetime';

export interface AppAdmin {
  id: string;
  email: string;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  plan_name: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface UserSubscription {
  user_id: string;
  plan: PlanType;
  expires_at: string;
  is_active: boolean;
  user_email?: string;
  full_name?: string; // Added field for registration name
  created_at?: string;
  last_login?: string;
  status?: 'active' | 'suspended' | 'banned';
  client_limit?: number;
  auto_renewal?: boolean;
  // Campos para lógica de Trial y Bloqueo
  trial_start_date?: string;
  trial_end_date?: string;
  is_trial_active?: boolean;
}

export const PLAN_LABELS: Record<PlanType, string> = {
  free: 'Gratuito / Trial',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
  lifetime: 'Vitalicio'
};

export const PLAN_PRICES: Record<PlanType, number> = {
  free: 0,
  monthly: 9.99,
  quarterly: 24.99,
  semiannual: 44.99,
  annual: 79.99,
  lifetime: 199.99
};
