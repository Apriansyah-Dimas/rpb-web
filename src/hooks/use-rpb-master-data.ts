"use client";

import { useEffect, useState } from "react";
import { fetchCurrentUserRole, fetchRpbMasterData } from "@/lib/rpb-db";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RpbMasterData, UserRole } from "@/types/rpb";

interface MasterDataState {
  data: RpbMasterData | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface MasterDataCachePayload {
  data: RpbMasterData;
  role: UserRole | null;
  fetchedAt: number;
}

const MASTER_DATA_CACHE_KEY = "rpb-master-data-cache-v1";
const MASTER_DATA_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

let memoryCache: MasterDataCachePayload | null = null;

const readStorageCache = (): MasterDataCachePayload | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(MASTER_DATA_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<MasterDataCachePayload> | null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    if (!parsed.data || typeof parsed.fetchedAt !== "number") {
      return null;
    }

    const role = parsed.role === "admin" || parsed.role === "user" ? parsed.role : null;

    return {
      data: parsed.data as RpbMasterData,
      role,
      fetchedAt: parsed.fetchedAt,
    };
  } catch {
    return null;
  }
};

const getCachedMasterData = (): MasterDataCachePayload | null => {
  if (memoryCache) {
    return memoryCache;
  }

  const storageCache = readStorageCache();
  if (storageCache) {
    memoryCache = storageCache;
  }

  return storageCache;
};

const writeCache = (payload: MasterDataCachePayload) => {
  memoryCache = payload;

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(MASTER_DATA_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures and keep memory cache only.
  }
};

const isCacheFresh = (payload: MasterDataCachePayload | null): boolean => {
  if (!payload) {
    return false;
  }

  return Date.now() - payload.fetchedAt <= MASTER_DATA_CACHE_MAX_AGE_MS;
};

export const useRpbMasterData = (): MasterDataState => {
  const initialCache = getCachedMasterData();

  const [data, setData] = useState<RpbMasterData | null>(initialCache?.data ?? null);
  const [role, setRole] = useState<UserRole | null>(initialCache?.role ?? null);
  const [loading, setLoading] = useState(initialCache ? false : true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const [masterData, currentRole] = await Promise.all([
        fetchRpbMasterData(supabase),
        fetchCurrentUserRole(supabase),
      ]);

      writeCache({
        data: masterData,
        role: currentRole,
        fetchedAt: Date.now(),
      });

      setData(masterData);
      setRole(currentRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil data master.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = getCachedMasterData();

    if (isCacheFresh(cached)) {
      return;
    }

    void refresh(Boolean(cached));
  }, []);

  return { data, role, loading, error, refresh: () => refresh(false) };
};
