import React, { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { supabase } from '../../lib/supabase';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setAuthLoading } = useStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setAuthLoading]);

  return <>{children}</>;
}
