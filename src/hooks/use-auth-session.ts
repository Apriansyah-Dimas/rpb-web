"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchCurrentUserRole } from "@/lib/rpb-db";
import type { UserRole } from "@/types/rpb";

interface AuthSessionState {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthSession = (): AuthSessionState => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user: nextUser },
    } = await supabase.auth.getUser();
    setUser(nextUser ?? null);
    if (nextUser) {
      try {
        setRole(await fetchCurrentUserRole(supabase));
      } catch {
        setRole(null);
      }
    } else {
      setRole(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    queueMicrotask(() => {
      void refresh();
    });
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
  };

  return { user, role, loading, refresh, signOut };
};
