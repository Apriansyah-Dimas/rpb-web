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

interface AuthCache {
  hydrated: boolean;
  user: User | null;
  role: UserRole | null;
}

let authCache: AuthCache = {
  hydrated: false,
  user: null,
  role: null,
};

export const useAuthSession = (): AuthSessionState => {
  const [user, setUser] = useState<User | null>(authCache.user);
  const [role, setRole] = useState<UserRole | null>(authCache.role);
  const [loading, setLoading] = useState(!authCache.hydrated);

  const refreshInternal = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    const supabase = getSupabaseBrowserClient();
    const {
      data: { user: nextUser },
    } = await supabase.auth.getUser();

    const resolvedUser = nextUser ?? null;
    setUser(resolvedUser);
    authCache.user = resolvedUser;

    if (nextUser) {
      try {
        const nextRole = await fetchCurrentUserRole(supabase);
        setRole(nextRole);
        authCache.role = nextRole;
      } catch {
        // Keep previous role if role lookup fails temporarily.
      }
    } else {
      setRole(null);
      authCache.role = null;
    }

    authCache.hydrated = true;
    setLoading(false);
  };

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    queueMicrotask(() => {
      void refreshInternal(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void refreshInternal(true);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    authCache = {
      hydrated: true,
      user: null,
      role: null,
    };
    setUser(null);
    setRole(null);
    setLoading(false);
  };

  return {
    user,
    role,
    loading,
    refresh: () => refreshInternal(false),
    signOut,
  };
};
