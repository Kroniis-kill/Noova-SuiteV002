import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { withRetry } from '../utils/supabaseUtils';
import { User, UserData } from '../types';
import { Session } from '@supabase/supabase-js';

export const useAuthSupabase = () => {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      const raw = localStorage.getItem('noova_auth_token_v3');
      if (raw) {
        const parsed = JSON.parse(raw);
        // Supabase stores it differently sometimes depending on version
        return parsed.session || (parsed.access_token ? parsed : null);
      }
    } catch (e) {}
    return null;
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('noova_auth_token_v3');
      if (raw) {
        const parsed = JSON.parse(raw);
        const s = parsed.session || (parsed.access_token ? parsed : null);
        if (s?.user) {
          const cachedProfileRaw = localStorage.getItem('noova_cached_profile');
          if (cachedProfileRaw) {
            try {
              const cachedProfile = JSON.parse(cachedProfileRaw);
              if (cachedProfile.id === s.user.id) {
                return cachedProfile;
              }
            } catch(e) {}
          }

          return {
            id: s.user.id,
            email: s.user.email || '',
            name: s.user.user_metadata?.full_name || s.user.email?.split('@')[0] || 'Usuario',
            avatar: s.user.user_metadata?.avatar_url,
            role: 'user',
            plan: 'free'
          };
        }
      }
    } catch (e) {}
    return null;
  });

  const [loading, setLoading] = useState(() => {
    // Si no hay usuario en cache (es decir, plan 'free' forzado por defecto), requerimos cargar explícitamente para evitar pantallazos visuales de cuentas free erróneas.
    const cachedProfileRaw = localStorage.getItem('noova_cached_profile');
    const hasCachedProfile = cachedProfileRaw ? true : false;
    
    // Si tenemos usuario base pero no profile en caché, indicamos loading=true para que la UI principal espere
    const raw = localStorage.getItem('noova_auth_token_v3');
    if (raw && !hasCachedProfile) return true;
    
    return !user;
  });
  const isMounted = useRef(false);
  const sessionRef = useRef(session);
  const userRef = useRef(user);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Helper to fetch extended user profile data from DATABASE
  const fetchUserProfile = async (sessionUser: any): Promise<User> => {
    // 1. Basic user structure from Auth (Fallback)
    const baseUser: User = {
      id: sessionUser.id,
      email: sessionUser.email || '',
      name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0] || 'Usuario',
      avatar: sessionUser.user_metadata?.avatar_url,
      role: 'user',
      plan: 'free'
    };

    try {
      // 2. Fetch directly from DB with withRetry
      const { data: profileData, error } = await withRetry(() => 
        supabase
          .from('user_data')
          .select('id, email, full_name, avatar_url, plan, client_limit, created_at, updated_at, is_active, status, auto_renewal, plan_expiry')
          .eq('id', sessionUser.id)
          .maybeSingle()
      );

      if (!error && profileData) {
        const finalUser = {
          ...baseUser,
          name: profileData.full_name || baseUser.name,
          avatar: profileData.avatar_url || baseUser.avatar, 
          plan: profileData.plan || 'free',
          userData: profileData as UserData
        };
        localStorage.setItem('noova_cached_profile', JSON.stringify(finalUser));
        return finalUser;
      } else if (!profileData && !error) {
          // Self-healing: Create profile if missing
          await withRetry(() => 
            supabase.from('user_data').insert({
                id: sessionUser.id,
                email: sessionUser.email,
                full_name: baseUser.name,
                avatar_url: baseUser.avatar,
                plan: 'free',
                client_limit: 5,
                created_at: new Date().toISOString()
            })
          );
          return baseUser;
      }
    } catch (e) {
      console.info("Info: Usando perfil base por latencia de red.", e);
    }

    return baseUser;
  };

  useEffect(() => {
    isMounted.current = true;

    const initializeAuth = async () => {
      try {
        // Check if we have a persisted session in localStorage
        const hasPersistedSession = localStorage.getItem('noova_auth_token_v3');
        
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
           console.warn("Auth init warning:", error.message);
        }

        if (isMounted.current) {
          if (currentSession?.user) {
            setSession(currentSession);
            const userProfile = await fetchUserProfile(currentSession.user);
            if (isMounted.current) {
              setUser(userProfile);
              setLoading(false);
            }
          } else if (hasPersistedSession) {
            // If we have a token but getSession returned null, wait a bit for onAuthStateChange
            // This happens sometimes on mobile during initial boot
            console.info("Persisted session found, waiting for auth state change...");
            setTimeout(() => {
              if (isMounted.current) {
                setLoading(false);
              }
            }, 2500);
          } else {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Critical Auth init error:", error);
        if (isMounted.current) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted.current) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (currentSession?.user) {
          setSession(currentSession);
          const userProfile = await fetchUserProfile(currentSession.user);
          if(isMounted.current) {
            setUser(userProfile);
            setLoading(false);
          }
        }
      } 
      
      if (event === 'INITIAL_SESSION' && !currentSession) {
        setLoading(false);
      }
      
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (import.meta.env.DEV) console.log("App visible, refreshing session...");
        // Force a session refresh when coming back to the app
        supabase.auth.refreshSession().then(({ data: { session: currentSession }, error }) => {
          if (error) {
             console.warn("Failed to refresh session on visibility change:", error.message);
             // Fallback to getSession if refresh fails (e.g. rate limited)
             supabase.auth.getSession().then(({ data: { session: fallbackSession } }) => {
                if (fallbackSession?.user && isMounted.current) {
                  setSession(fallbackSession);
                  if (!userRef.current) {
                    fetchUserProfile(fallbackSession.user).then(u => isMounted.current && setUser(u));
                  }
                }
             });
             return;
          }
          if (currentSession?.user && isMounted.current) {
            setSession(currentSession);
            // We don't necessarily need to fetch the profile again unless it's missing
            if (!userRef.current) {
              fetchUserProfile(currentSession.user).then(userProfile => {
                if (isMounted.current) setUser(userProfile);
              });
            }
          }
        });
      }
    };

    const handleFocus = () => {
      if (import.meta.env.DEV) console.log("Window focused, checking session...");
      supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        if (currentSession?.user && isMounted.current) {
          setSession(currentSession);
          if (!userRef.current) {
            fetchUserProfile(currentSession.user).then(u => isMounted.current && setUser(u));
          }
        }
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Heartbeat to keep session alive and sync state
    const heartbeat = setInterval(() => {
      if (document.visibilityState === 'visible') {
        supabase.auth.getSession().then(({ data: { session: s } }) => {
          if (s && isMounted.current && (!sessionRef.current || s.access_token !== sessionRef.current.access_token)) {
            if (import.meta.env.DEV) console.log("Heartbeat: Syncing session state");
            setSession(s);
            if (!userRef.current) {
              fetchUserProfile(s.user).then(u => isMounted.current && setUser(u));
            }
          }
        });
      }
    }, 30000);

    const safetyTimer = setTimeout(() => {
      // Just log and exit loading if we get stuck. Don't access loading from outer scope
      if (isMounted.current) {
         setLoading(prev => {
            if (prev) return false;
            return prev;
         });
      }
    }, 8000); 

    return () => {
      isMounted.current = false;
      clearTimeout(safetyTimer);
      clearInterval(heartbeat);
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []); // Remove user and session dependencies to prevent teardown iteration

  const login = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    if (data.session) {
      const userProfile = await fetchUserProfile(data.session.user);
      setUser(userProfile);
      setSession(data.session);
      setLoading(false);
    }
  };

  const register = async (email: string, pass: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
    if (data.user) {
        const newUser = data.user;
        await withRetry(() => 
          supabase.from('user_data').insert({
              id: newUser.id,
              email: email,
              full_name: name,
              plan: 'free',
              client_limit: 5,
              created_at: new Date().toISOString()
          })
        );
        const userProfile = await fetchUserProfile(newUser);
        setUser(userProfile);
        setSession(data.session);
        setLoading(false);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('noova_auth_token_v3');
      localStorage.removeItem('noova_cached_profile');
      await supabase.auth.signOut();
    } catch (e: any) {
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  };

  const updateProfile = async (name: string, avatarUrl?: string) => {
    if (!user) return;
    const dbUpdates: any = { full_name: name };
    if (avatarUrl) dbUpdates.avatar_url = avatarUrl;
    await supabase.auth.updateUser({ data: { full_name: name, avatar_url: avatarUrl } });
    await withRetry(() => 
      supabase.from('user_data').upsert({ id: user.id, email: user.email, ...dbUpdates, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    );
    setUser(prev => {
      if (!prev) return null;
      const updatedUser = { ...prev, name, avatar: avatarUrl || prev.avatar, userData: prev.userData ? { ...prev.userData, ...dbUpdates } : undefined };
      localStorage.setItem('noova_cached_profile', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  return { user, session, loading, login, resetPassword, register, logout, updateProfile, updatePassword };
};