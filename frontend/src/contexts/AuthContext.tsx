import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, type UserRole, type UserProfile } from '../lib/supabase';
import { getCurrentUser } from '../services/api';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithMicrosoft: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null; session: Session | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Extract basic profile from Supabase user (fallback if backend unavailable)
function extractProfileFromSupabase(user: User): UserProfile {
  const metadata = user.app_metadata || {};
  const email = user.email || '';
  const displayName = user.user_metadata?.full_name
    || user.user_metadata?.name
    || email.split('@')[0];
  return {
    id: user.id,
    email,
    role: (metadata.role as UserRole) || 'user',
    displayName,
    avatarUrl: user.user_metadata?.avatar_url,
  };
}

// Fetch profile from backend API with timeout (has authoritative role from database)
async function fetchBackendProfile(user: User): Promise<UserProfile> {
  try {
    // Add timeout to prevent hanging if backend is slow/unavailable
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Backend timeout')), 5000);
    });

    const backendProfile = await Promise.race([
      getCurrentUser(),
      timeoutPromise,
    ]);

    return {
      id: backendProfile.id,
      email: backendProfile.email,
      role: backendProfile.role,
      displayName: backendProfile.display_name || user.user_metadata?.full_name || user.user_metadata?.name,
      avatarUrl: backendProfile.avatar_url || user.user_metadata?.avatar_url,
    };
  } catch (error) {
    // Fallback to Supabase profile if backend is unavailable
    console.warn('Failed to fetch profile from backend, using Supabase fallback:', error);
    return extractProfileFromSupabase(user);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isConfigured = isSupabaseConfigured();

  // Initialize auth state
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const supabaseClient = supabase; // Capture for closure

    // Get initial session
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch profile from backend (has authoritative role)
          const userProfile = await fetchBackendProfile(session.user);
          if (mounted) {
            setProfile(userProfile);
          }
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      try {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch profile from backend (has authoritative role)
          const userProfile = await fetchBackendProfile(session.user);
          if (mounted) {
            setProfile(userProfile);
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error('Failed to handle auth state change:', error);
        // Set basic profile from session if backend fails
        if (session?.user && mounted) {
          setProfile(extractProfileFromSupabase(session.user));
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/classify`,
      },
    });
  };

  const signInWithMicrosoft = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email profile',
        redirectTo: `${window.location.origin}/classify`,
      },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') as AuthError };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase not configured') as AuthError, session: null };
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { error, session: data.session };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const isAdmin = profile?.role === 'admin';
  const isAuthenticated = user !== null;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      isConfigured,
      signInWithGoogle,
      signInWithMicrosoft,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      isAdmin,
      isAuthenticated,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
