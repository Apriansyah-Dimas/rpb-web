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
  fetchedAt: number;
}

let authCache: AuthCache = {
  hydrated: false,
  user: null,
  role: null,
  fetchedAt: 0,
};

let refreshPromise: Promise<void> | null = null;

const AUTH_CACHE_MAX_AGE_MS = 10 * 60 * 1000;

const isCacheFresh = (): boolean =>
  authCache.hydrated && Date.now() - authCache.fetchedAt <= AUTH_CACHE_MAX_AGE_MS;

export const useAuthSession = (): AuthSessionState => {
  const [user, setUser] = useState<User | null>(authCache.user);
  const [role, setRole] = useState<UserRole | null>(authCache.role);
  const [loading, setLoading] = useState(!authCache.hydrated);

  const refreshInternal = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const supabase = getSupabaseBrowserClient();
          const {
            data: { user: nextUser },
          } = await supabase.auth.getUser();

          const resolvedUser = nextUser ?? null;
          let nextRole: UserRole | null = authCache.role;

          if (resolvedUser) {
            try {
              nextRole = await fetchCurrentUserRole(supabase, resolvedUser);
            } catch {
              // Keep previous role if role lookup fails temporarily.
            }
          } else {
            nextRole = null;
          }

          authCache = {
            hydrated: true,
            user: resolvedUser,
            role: nextRole,
            fetchedAt: Date.now(),
          };
        } catch {
          // Keep cache state and retry on the next mount/refresh.
          authCache = {
            ...authCache,
            hydrated: true,
            fetchedAt: 0,
          };
        }
      })().finally(() => {
        refreshPromise = null;
      });
    }

    await refreshPromise;
    setUser(authCache.user);
    setRole(authCache.role);
    setLoading(false);
  };

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!isCacheFresh()) {
      queueMicrotask(() => {
        void refreshInternal(true);
      });
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      authCache = {
        hydrated: true,
        user: nextUser,
        role: nextUser ? authCache.role : null,
        fetchedAt: 0,
      };
      setUser(nextUser);
      if (!nextUser) {
        setRole(null);
      }
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
      fetchedAt: Date.now(),
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
