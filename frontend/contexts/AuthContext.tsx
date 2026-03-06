import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  getSession,
  onAuthStateChange,
  signOut as signOutRequest,
} from '@/lib/api/auth';
import { getMyProfile } from '@/lib/api/profile';
import { AuthSession, AuthUser, Profile } from '@/lib/types';

type AuthContextType = {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  profileLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);

    try {
      const nextProfile = await getMyProfile();
      setProfile(nextProfile);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile();
    }
  }, [fetchProfile, user?.id]);

  useEffect(() => {
    let active = true;

    void getSession()
      .then((nextSession) => {
        if (!active) {
          return;
        }

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setLoading(false);

        if (nextSession?.user) {
          void fetchProfile();
        } else {
          setProfile(null);
          setProfileLoading(false);
        }
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        setProfileLoading(false);
      });

    const { unsubscribe } = onAuthStateChange((_event, nextSession) => {
      if (!active) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (nextSession?.user) {
        void fetchProfile();
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await signOutRequest();
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        profileLoading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
