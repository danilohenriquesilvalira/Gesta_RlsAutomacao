'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const supabase = createClient();

    async function initializeAuth() {
      try {
        console.log('Initializing Auth...');

        // 1. Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
        }

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        // 2. If user exists, fetch profile
        if (currentUser) {
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

          if (profileError) {
            console.error('Profile fetch error:', profileError);
          } else {
            setProfile(data);
          }
        }
      } catch (err) {
        console.error('useAuth initialization crash:', err);
      } finally {
        console.log('Auth initialization complete.');
        setLoading(false);
      }
    }

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth State Changed:', event);
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
          setProfile(data);
        } else {
          setProfile(null);
        }

        // Ensure loading is false if an event fires (like login/logout)
        setLoading(false);
      }
    );

    // Sync profile updates across all useAuth instances (e.g. after avatar upload)
    const handleProfileSync = (e: Event) => {
      setProfile((e as CustomEvent<Profile>).detail);
    };
    window.addEventListener('auth:profile-updated', handleProfileSync);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('auth:profile-updated', handleProfileSync);
    };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentUser = user;
    if (!currentUser) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    if (data) {
      setProfile(data);
      // Notifica todas as instâncias de useAuth para actualizarem o perfil
      window.dispatchEvent(new CustomEvent('auth:profile-updated', { detail: data }));
    }
  }, [user]);

  return { user, profile, loading, signOut, refreshProfile };
}
