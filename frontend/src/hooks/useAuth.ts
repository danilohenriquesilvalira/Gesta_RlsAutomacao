import { useEffect, useState, useRef, useCallback } from 'react';
import { api, setToken, clearToken } from '@/lib/api/client';
import type { Profile } from '@/types';

interface AuthState {
  profile: Profile | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ profile: null, loading: true });
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const token = localStorage.getItem('auth_token');
    if (!token) {
      setState({ profile: null, loading: false });
      return;
    }

    api.get<Profile>('/api/auth/me')
      .then((profile) => setState({ profile, loading: false }))
      .catch(() => {
        clearToken();
        setState({ profile: null, loading: false });
      });

    const handleProfileSync = (e: Event) => {
      setState((prev) => ({ ...prev, profile: (e as CustomEvent<Profile>).detail }));
    };
    window.addEventListener('auth:profile-updated', handleProfileSync);
    return () => window.removeEventListener('auth:profile-updated', handleProfileSync);
  }, []);

  const signOut = useCallback(async () => {
    clearToken();
    window.location.href = '/login';
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await api.get<Profile>('/api/auth/me');
      setState((prev) => ({ ...prev, profile }));
      window.dispatchEvent(new CustomEvent('auth:profile-updated', { detail: profile }));
    } catch {
      // ignore
    }
  }, []);

  return {
    user: state.profile ? { id: state.profile.id } : null,
    profile: state.profile,
    loading: state.loading,
    signOut,
    refreshProfile,
  };
}
