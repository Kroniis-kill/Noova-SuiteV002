
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase, supabaseUrl, supabaseAnonKey } from '../supabaseClient';
import { withRetry } from '../utils/supabaseUtils';
import { createClient } from '@supabase/supabase-js'; 
import { UserSubscription, PlanType } from '../types/subscriptionTypes';
import { Feedback, Announcement } from '../types/adminTypes';
import { useToast } from './ToastContext';

export type AccessStatus = 'granted' | 'blocked' | 'warning_trial' | 'warning_plan';

interface SubscriptionContextType {
  isAdmin: boolean;
  subscription: UserSubscription | null;
  isExpired: boolean;
  loadingSub: boolean;
  supportNumber: string;
  accessStatus: AccessStatus; 
  daysRemaining: number;
  isTrial: boolean;
  
  updateSupportNumber: (num: string) => Promise<void>;
  getAllSubscriptions: () => Promise<UserSubscription[]>;
  toggleSubscriptionStatus: (userId: string, currentStatus: boolean) => Promise<boolean>;
  registerTenant: (email: string, password: string, plan: PlanType, expiryDate: string) => Promise<{ success: boolean; message?: string }>;
  updateSubscription: (userId: string, plan: PlanType, expiryDate: string) => Promise<{ success: boolean; message?: string }>;
  deleteSubscription: (userId: string) => Promise<{ success: boolean; message?: string }>;
  checkAccessStatus: () => void;
  // Admin helpers
  toggleAutoRenewal: (userId: string, currentStatus: boolean) => Promise<boolean>;
  renewSubscription: (userId: string, monthsToAdd: number) => Promise<boolean>;
  revokeUserPlan: (userId: string) => Promise<boolean>;
  extendDays: (userId: string, days: number) => Promise<boolean>;
  toggleBlockStatus: (userId: string, currentStatus: string) => Promise<boolean>;
  getFeedback: () => Promise<Feedback[]>;
  markFeedbackAsRead: (id: string) => Promise<boolean>;
  getAnnouncements: () => Promise<Announcement[]>;
  createAnnouncement: (message: string) => Promise<boolean>;
  deleteAnnouncement: (id: string) => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loadingSub, setLoadingSub] = useState(true); 
  const [supportNumber, setSupportNumberState] = useState('');
  
  const [accessStatus, setAccessStatus] = useState<AccessStatus>('granted');
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [isTrial, setIsTrial] = useState(false);

  // --- FEEDBACK & ANNOUNCEMENTS ---
  const getFeedback = async (): Promise<Feedback[]> => {
      if (!isAdmin) return [];
      try {
          const { data, error } = await withRetry(() => supabase.from('feedback').select('id, user_id, user_email, message, status, created_at').order('created_at', { ascending: false }));
          if (error && error.code === 'PGRST205') return [];
          return data || [];
      } catch (e) {
          return [];
      }
  };

  const markFeedbackAsRead = async (id: string): Promise<boolean> => {
      if (!isAdmin) return false;
      const { error } = await withRetry(() => supabase.from('feedback').update({ status: 'read' }).eq('id', id));
      return !error;
  };

  const getAnnouncements = async (): Promise<Announcement[]> => {
      try {
          const { data, error } = await withRetry(() => supabase.from('announcements').select('id, message, is_active, created_at').order('created_at', { ascending: false }));
          if (error && error.code === 'PGRST205') return [];
          return data || [];
      } catch (e) {
          return [];
      }
  };

  const createAnnouncement = async (message: string): Promise<boolean> => {
      if (!isAdmin) return false;
      const { error } = await withRetry(() => supabase.from('announcements').insert({ message, is_active: true }));
      return !error;
  };

  const deleteAnnouncement = async (id: string): Promise<boolean> => {
      if (!isAdmin) return false;
      const { error } = await withRetry(() => supabase.from('announcements').delete().eq('id', id));
      return !error;
  };

  // --- LOGICA DE ACCESO (3 DÍAS TRIAL vs PLAN PRO) ---
  const checkAccessStatus = useCallback(() => {
    if (isAdmin) {
        setAccessStatus('granted');
        setDaysRemaining(999);
        setIsTrial(false);
        return;
    }

    if (!subscription) return;

    // 1. Verificar Bloqueo Administrativo Directo
    if (subscription.status === 'banned' || subscription.status === 'suspended') {
        setAccessStatus('blocked');
        setDaysRemaining(0);
        return;
    }

    const now = new Date();
    
    // Si el plan NO es free, desactivamos Trial inmediatamente
    const isFreePlan = subscription.plan === 'free';
    
    if (isFreePlan) {
        setIsTrial(true);
        
        let targetDate = new Date();
        if (subscription.expires_at) {
            targetDate = new Date(subscription.expires_at);
        } else {
            const createdDate = subscription.created_at ? new Date(subscription.created_at) : new Date();
            targetDate = new Date(createdDate);
            targetDate.setDate(targetDate.getDate() + 3);
        }
        
        const diffTime = targetDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffTime <= 0) {
            setAccessStatus('blocked'); // Bloqueo estricto al acabar el trial
            setDaysRemaining(0);
        } else {
            setAccessStatus(diffDays <= 1 ? 'warning_trial' : 'granted');
            setDaysRemaining(Math.max(0, diffDays));
        }
    } else {
        // Plan PRO
        setIsTrial(false); 
        
        const planExpiryDate = subscription.expires_at ? new Date(subscription.expires_at) : new Date();
        
        // Aseguramos comparar contra el final del día de vencimiento
        if (subscription.expires_at && subscription.expires_at.length <= 10) {
            planExpiryDate.setHours(23, 59, 59, 999);
        }

        const diffTime = planExpiryDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (!subscription.is_active || diffTime <= 0) {
            setAccessStatus('blocked');
            setDaysRemaining(0);
        } else {
            setAccessStatus(diffDays <= 5 ? 'warning_plan' : 'granted');
            setDaysRemaining(Math.max(0, diffDays));
        }
    }
  }, [subscription, isAdmin]);

  useEffect(() => {
      checkAccessStatus();
  }, [checkAccessStatus]);

  // --- FETCH CONFIG ---
  useEffect(() => {
    let mounted = true;
    const fetchConfig = async () => {
        try {
            const { data, error } = await withRetry(() => supabase.from('app_config').select('value').eq('key', 'support_phone').single());
            if (error) { return; }
            if (data && mounted) setSupportNumberState(data.value);
        } catch(e) {}
    };
    fetchConfig();
    return () => { mounted = false; };
  }, []);

  // --- FETCH USER DATA ---
  const fetchUserData = useCallback(async () => {
      if (!user) return;
      try {
        // #6: has_role() RPC es la fuente única de verdad.
        // Fallback a app_admins solo si el RPC no existe (envs viejos sin migración aplicada).
        let userIsAdmin = false;
        let usedLegacyFallback = false;
        let adminData: { id: string; email: string } | null = null;

        try {
          const { data: hasAdmin, error: roleErr } = await supabase
            .rpc('has_role', { _user_id: user.id, _role: 'admin' });
          if (roleErr) {
            // RPC ausente → caer al legacy. Cualquier otro error: tratar como no-admin.
            const msg = (roleErr as any)?.message || '';
            if (msg.includes('function') || (roleErr as any)?.code === '42883') {
              usedLegacyFallback = true;
            }
          } else if (hasAdmin === true) {
            userIsAdmin = true;
          }
        } catch {
          usedLegacyFallback = true;
        }

        if (!userIsAdmin && usedLegacyFallback) {
          const { data } = await withRetry(() => supabase
            .from('app_admins')
            .select('id, email')
            .eq('email', user.email)
            .maybeSingle());
          adminData = data as any;
          if (adminData) userIsAdmin = true;
        }

        if (userIsAdmin) {
            setIsAdmin(true);

            // Data Repair: solo si vino por la ruta legacy (drift de app_admins).
            // Con has_role() ya no hay nada que reparar.
            if (usedLegacyFallback && adminData) {
                const repairData = async () => {
                    try {
                        await supabase.from('movements').update({ user_id: user.id }).is('user_id', null);
                        await supabase.from('expenses').update({ user_id: user.id }).is('user_id', null);
                        if (adminData?.id && adminData.id !== user.id) {
                            await supabase.from('movements').update({ user_id: user.id }).eq('user_id', adminData.id);
                            await supabase.from('expenses').update({ user_id: user.id }).eq('user_id', adminData.id);
                            await supabase.from('app_admins').update({ id: user.id }).eq('email', user.email);
                        }
                    } catch (err) {
                        console.error('Error during admin data repair:', err);
                    }
                };
                repairData();
            }
        }

        // 2. Fetch user_data (even for admins)
        const { data: userData, error: userError } = await withRetry(() => supabase
            .from('user_data')
            .select('id, email, full_name, plan, plan_expiry, is_active, created_at, auto_renewal, status')
            .eq('id', user.id)
            .maybeSingle());

        if (userData) {
           // Admin Auto-Upgrade: aplica a cualquier admin (RPC o legacy) con plan free
           if (userIsAdmin && userData.plan === 'free') {
               const upgrade = {
                   plan: 'lifetime',
                   plan_expiry: new Date(2099, 0, 1).toISOString(),
                   is_active: true,
                   status: 'active'
               };
               await supabase.from('user_data').update(upgrade).eq('id', user.id);
               userData.plan = 'lifetime';
               userData.plan_expiry = upgrade.plan_expiry;
               userData.is_active = true;
               userData.status = 'active';
           }

           // Calcular expiración por defecto si es free y no tiene fecha
           let expiry = userData.plan_expiry;
           if (!expiry && userData.plan === 'free') {
               const created = new Date(userData.created_at);
               created.setDate(created.getDate() + 3);
               expiry = created.toISOString();
           }

           const newSub: UserSubscription = {
               user_id: user.id,
               plan: userData.plan || 'free',
               expires_at: expiry || new Date().toISOString(),
               is_active: userData.is_active !== false,
               created_at: userData.created_at || new Date().toISOString(),
               auto_renewal: userData.auto_renewal,
               status: userData.status || 'active',
               full_name: userData.full_name
           };
           setSubscription(newSub);
        } else {
           // If no user_data, create it (Self-healing)
           console.info("Creating missing user_data for user:", user.email);
           const now = new Date().toISOString();
           const trialEnd = new Date();
           trialEnd.setDate(trialEnd.getDate() + 3);
           
           const newProfile = {
               id: user.id,
               email: user.email,
               full_name: user.name || user.email.split('@')[0],
               plan: userIsAdmin ? 'lifetime' : 'free', // Admins get LIFETIME by default
               plan_expiry: userIsAdmin ? new Date(2099, 0, 1).toISOString() : trialEnd.toISOString(),
               is_active: true,
               created_at: now,
               status: 'active'
           };

           const { error: insertError } = await withRetry(() => supabase.from('user_data').insert(newProfile));
           
           if (!insertError) {
               setSubscription({
                   user_id: user.id,
                   plan: newProfile.plan as PlanType,
                   expires_at: newProfile.plan_expiry,
                   is_active: true,
                   created_at: now,
                   status: 'active',
                   full_name: newProfile.full_name
               });
           } else {
               // Fallback state
               setSubscription({
                   user_id: user.id,
                   plan: userIsAdmin ? 'lifetime' : 'free',
                   expires_at: trialEnd.toISOString(),
                   is_active: true,
                   created_at: now,
                   status: 'active'
               });
           }
        }
      } catch (e) {
        console.error("Error fetching sub:", e);
      } finally {
        setLoadingSub(false);
      }
  }, [user]);

  // --- INIT & REALTIME LISTENER ---
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
        setIsAdmin(false);
        setSubscription(null);
        setLoadingSub(false);
        return;
    }

    // Solo activamos cargando si NO tenemos suscripción previa (carga inicial)
    // Para refrescos en segundo plano, se hace de manera silenciosa
    if (!subscription) {
      setLoadingSub(true);
    }
    
    fetchUserData();

    // Safety timeout to prevent permanent loading screens if data fetch hangs
    const timeoutTimer = setTimeout(() => {
       setLoadingSub(false);
    }, 8000);

    const channel = supabase
      .channel(`public:user_data:id=${user.id}`)
      .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'user_data', filter: `id=eq.${user.id}` }, 
          (payload) => {
              if (payload.new) {
                  const newData = payload.new;
                  setSubscription(prev => ({
                      ...prev!,
                      plan: newData.plan || 'free',
                      expires_at: newData.plan_expiry,
                      is_active: newData.is_active,
                      auto_renewal: newData.auto_renewal,
                      status: newData.status,
                      full_name: newData.full_name
                  }));
              } else {
                  fetchUserData();
              }
          }
      )
      .subscribe();

    return () => {
        clearTimeout(timeoutTimer);
        supabase.removeChannel(channel);
    };

  }, [user, authLoading, fetchUserData]);

  // --- ADMIN ACTIONS ---

  const updateSupportNumber = async (num: string) => {
      if (!isAdmin) return;
      try {
          await withRetry(() => supabase.from('app_config').upsert({ key: 'support_phone', value: num }));
          setSupportNumberState(num);
      } catch (e) { console.error(e); }
  };

  const getAllSubscriptions = async (): Promise<UserSubscription[]> => {
      if (!isAdmin) return [];
      try {
          const { data } = await withRetry(() => supabase.from('user_data').select('id, email, full_name, plan, plan_expiry, is_active, created_at, auto_renewal, status').order('created_at', { ascending: false }));
          return (data || []).map(u => {
              // Lógica de cálculo de fecha para visualización en admin
              let expiry = u.plan_expiry;
              if (!expiry && (!u.plan || u.plan === 'free')) {
                  const created = new Date(u.created_at);
                  created.setDate(created.getDate() + 3);
                  expiry = created.toISOString();
              }
              
              return {
                  user_id: u.id,
                  user_email: u.email,
                  full_name: u.full_name, // Map name for admin
                  plan: u.plan || 'free',
                  expires_at: expiry || new Date().toISOString(),
                  is_active: u.is_active !== false,
                  created_at: u.created_at,
                  auto_renewal: u.auto_renewal,
                  status: u.status || 'active'
              };
          });
      } catch (e) { return []; }
  };

  const toggleSubscriptionStatus = async (userId: string, currentStatus: boolean): Promise<boolean> => {
      try {
          const { error } = await withRetry(() => supabase.from('user_data').update({ is_active: !currentStatus }).eq('id', userId));
          return !error;
      } catch (e) { return false; }
  };
  
  // New: Block/Unblock User
  const toggleBlockStatus = async (userId: string, currentStatus: string): Promise<boolean> => {
      try {
          const newStatus = currentStatus === 'banned' ? 'active' : 'banned';
          const { error } = await withRetry(() => supabase.from('user_data').update({ status: newStatus }).eq('id', userId));
          return !error;
      } catch (e) { return false; }
  };

  const registerTenant = async (email: string, password: string, plan: PlanType, expiryDate: string) => {
      try {
          const tempClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
          const { data: authData, error: authError } = await tempClient.auth.signUp({
              email, password, options: { data: { full_name: email.split('@')[0] } }
          });

          if (authError) throw authError;
          const newUser = authData.user;
          if (!newUser) throw new Error("No se pudo crear el usuario en Auth.");

          const { error: dbError } = await withRetry(() => supabase.from('user_data').insert({
              id: newUser.id, email, full_name: email.split('@')[0],
              plan: plan, plan_expiry: expiryDate, created_at: new Date().toISOString(), is_active: true, status: 'active'
          }));

          if (dbError) throw dbError;
          return { success: true };
      } catch (e: any) { return { success: false, message: e.message }; }
  };

  const updateSubscription = async (userId: string, plan: PlanType, expiryDate: string) => {
      try {
          const { error } = await withRetry(() => supabase.from('user_data').update({
              plan: plan, 
              plan_expiry: expiryDate,
              is_active: true 
          }).eq('id', userId));
          if (error) throw error;
          return { success: true };
      } catch (e: any) { return { success: false, message: e.message }; }
  };

  const deleteSubscription = async (userId: string) => {
      try {
          const { error } = await withRetry(() => supabase.from('user_data').delete().eq('id', userId));
          if (error) throw error;
          return { success: true };
      } catch (e: any) { return { success: false, message: e.message }; }
  };

  const toggleAutoRenewal = async (userId: string, currentStatus: boolean): Promise<boolean> => {
      try {
          const { error } = await withRetry(() => supabase.from('user_data').update({ auto_renewal: !currentStatus }).eq('id', userId));
          return !error;
      } catch (e) { return false; }
  };

  const renewSubscription = async (userId: string, monthsToAdd: number): Promise<boolean> => {
      try {
          const { data } = await withRetry(() => supabase.from('user_data').select('plan_expiry').eq('id', userId).single());
          if (!data) return false;
          
          const currentExpiry = new Date(data.plan_expiry);
          const now = new Date();
          const baseDate = currentExpiry > now ? currentExpiry : now;
          baseDate.setMonth(baseDate.getMonth() + monthsToAdd);
          
          const { error } = await withRetry(() => supabase.from('user_data').update({
              plan_expiry: baseDate.toISOString(),
              is_active: true
          }).eq('id', userId));
          
          return !error;
      } catch (e) { return false; }
  };
  
  const revokeUserPlan = async (userId: string): Promise<boolean> => {
      try {
          const { error } = await withRetry(() => supabase.from('user_data').update({
              plan: 'free',
              plan_expiry: new Date().toISOString(), 
              auto_renewal: false
          }).eq('id', userId));
          return !error;
      } catch (e) { return false; }
  };

  const extendDays = async (userId: string, days: number): Promise<boolean> => {
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
          
          const { error } = await withRetry(() => supabase.from('user_data').update({
              plan_expiry: baseDate.toISOString(),
              is_active: true
          }).eq('id', userId));
          
          return !error;
      } catch (e) { return false; }
  };

  return (
    <SubscriptionContext.Provider value={{
      isAdmin, subscription, isExpired: accessStatus === 'blocked', loadingSub, supportNumber,
      accessStatus, daysRemaining, isTrial,
      updateSupportNumber, getAllSubscriptions, toggleSubscriptionStatus,
      registerTenant, updateSubscription, deleteSubscription,
      checkAccessStatus,
      toggleAutoRenewal, renewSubscription, revokeUserPlan, extendDays, toggleBlockStatus,
      getFeedback, markFeedbackAsRead, getAnnouncements, createAnnouncement, deleteAnnouncement
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used within SubscriptionProvider');
  return context;
};
