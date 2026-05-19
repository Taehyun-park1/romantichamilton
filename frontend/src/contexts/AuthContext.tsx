import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isSupabaseConfigured, type Profile, supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readProvider(user: User) {
  const identity = user.identities?.[0];
  const provider = identity?.provider ?? user.app_metadata.provider ?? 'email';
  const providerUserId = identity?.id ?? user.id;

  return { provider, providerUserId };
}

function readDisplayName(user: User) {
  const metadata = user.user_metadata;

  return (
    metadata.display_name ||
    metadata.name ||
    metadata.full_name ||
    metadata.preferred_username ||
    user.email?.split('@')[0] ||
    '사용자'
  );
}

async function upsertProfile(user: User) {
  if (!supabase) return null;

  const { provider, providerUserId } = readProvider(user);
  const displayName = readDisplayName(user);
  const avatarUrl =
    user.user_metadata.avatar_url ||
    user.user_metadata.picture ||
    user.user_metadata.profile_image_url ||
    null;

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? null,
        display_name: displayName,
        avatar_url: avatarUrl,
        provider,
        provider_user_id: providerUserId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (error) {
    console.error('Failed to sync profile', error);
    return null;
  }

  return data as Profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!supabase) {
      setProfile(null);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfile(null);
      return;
    }

    const syncedProfile = await upsertProfile(user);
    setProfile(syncedProfile);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);

      if (data.session?.user) {
        setProfile(await upsertProfile(data.session.user));
      }

      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (!nextSession?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      upsertProfile(nextSession.user).then((syncedProfile) => {
        setProfile(syncedProfile);
        setLoading(false);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAuthenticated: Boolean(session?.user),
      isAdmin: profile?.role === 'admin',
      refreshProfile,
      signOut,
    }),
    [loading, profile, refreshProfile, session, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
