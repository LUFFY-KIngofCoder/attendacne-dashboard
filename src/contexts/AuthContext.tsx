import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  refreshProfile: () => Promise<Profile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Global flag to temporarily ignore auth state changes during user creation
let isCreatingUser = false;

export function setCreatingUserFlag(value: boolean) {
  isCreatingUser = value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const adminUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          setProfile(data);
          // Store admin user ID for later comparison
          if (data?.role === 'admin') {
            adminUserIdRef.current = session.user.id;
          }
        }

        setLoading(false);
      })();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        // If we're creating a user, ignore all auth state changes temporarily
        if (isCreatingUser) {
          // Wait longer to allow session restoration
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if session was restored to admin
          if (adminUserIdRef.current) {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (currentSession?.user?.id === adminUserIdRef.current) {
              // Session was restored, don't update state
              return;
            }
          }
        }

        // If we have an admin user ID stored and the new session is NOT the admin,
        // delay updating state to allow session restoration
        if (adminUserIdRef.current && session?.user && session.user.id !== adminUserIdRef.current) {
          // Longer delay to allow session restoration to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if session was restored to admin
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession?.user?.id === adminUserIdRef.current) {
            // Session was restored, don't update state - this prevents UI flicker
            return;
          }
        }

        // Also handle signOut events - delay to allow session restoration
        if (adminUserIdRef.current && !session && event === 'SIGNED_OUT') {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if session was restored to admin
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession?.user?.id === adminUserIdRef.current) {
            // Session was restored, don't update state
            return;
          }
        }

        // Only update state if session is valid and matches expected admin
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          setProfile(data);
          // Update admin user ID reference
          if (data?.role === 'admin') {
            adminUserIdRef.current = session.user.id;
          } else {
            adminUserIdRef.current = null;
          }
        } else {
          setProfile(null);
          adminUserIdRef.current = null;
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user profile exists and is active
      if (data.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profileData) {
          await supabase.auth.signOut();
          throw new Error('User profile not found. Please contact administrator.');
        }

        if (!profileData.is_active) {
          await supabase.auth.signOut();
          throw new Error('Your account has been deactivated. Please contact your administrator.');
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!user) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    setProfile(data);
    if (data?.role === 'admin') {
      adminUserIdRef.current = user.id;
    }
    return data;
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signOut,
    isAdmin: profile?.role === 'admin',
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
