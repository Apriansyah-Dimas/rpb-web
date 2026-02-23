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

export const useRpbMasterData = (): MasterDataState => {
  const [data, setData] = useState<RpbMasterData | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const [masterData, currentRole] = await Promise.all([
        fetchRpbMasterData(supabase),
        fetchCurrentUserRole(supabase),
      ]);
      setData(masterData);
      setRole(currentRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil data master.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { data, role, loading, error, refresh };
};
