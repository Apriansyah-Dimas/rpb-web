"use client";

import { LogoutButton } from "@/components/auth/logout-button";
import { RpbPageFrame } from "@/components/layout/rpb-page-frame";
import { useAuthSession } from "@/hooks/use-auth-session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Mail, Shield, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

interface ProfileInfo {
  email: string;
  role: "admin" | "user";
  createdAt: string | null;
}

const formatDate = (value: string | null) => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

export default function ProfilePage() {
  const { user, role, loading } = useAuthSession();
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfileInfo(null);
      return;
    }

    const loadProfile = async () => {
      setBusy(true);
      setError(null);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error: selectError } = await supabase
          .from("user_profiles")
          .select("email, role, created_at")
          .eq("id", user.id)
          .maybeSingle();

        if (selectError) {
          throw selectError;
        }

        setProfileInfo({
          email: String(data?.email ?? user.email ?? "-"),
          role: data?.role === "admin" ? "admin" : "user",
          createdAt: data?.created_at ? String(data.created_at) : null,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat profil.");
      } finally {
        setBusy(false);
      }
    };

    void loadProfile();
  }, [user]);

  return (
    <RpbPageFrame shellClassName="rpb-compact">
      <div className="space-y-4 py-5 md:py-6">
        {loading || busy ? (
          <div className="rpb-section p-4 text-sm text-rpb-ink-soft">Memuat profil...</div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rpb-section p-5">
          <h2 className="rpb-h-title mb-4 text-lg font-semibold">Informasi Akun</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-rpb-border bg-white p-4">
              <p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold text-rpb-ink-soft">
                <Mail size={14} />
                Email
              </p>
              <p className="text-sm font-semibold text-foreground">
                {profileInfo?.email ?? user?.email ?? "-"}
              </p>
            </div>
            <div className="rounded-xl border border-rpb-border bg-white p-4">
              <p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold text-rpb-ink-soft">
                <Shield size={14} />
                Role
              </p>
              <p className="text-sm font-semibold uppercase text-foreground">
                {profileInfo?.role ?? role ?? "-"}
              </p>
            </div>
            <div className="rounded-xl border border-rpb-border bg-white p-4">
              <p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold text-rpb-ink-soft">
                <UserRound size={14} />
                Terdaftar Sejak
              </p>
              <p className="text-sm font-semibold text-foreground">
                {formatDate(profileInfo?.createdAt ?? null)}
              </p>
            </div>
          </div>
        </section>

        <section className="rpb-section p-4">
          <LogoutButton className="rpb-btn-primary px-4 py-2 text-sm font-semibold" />
        </section>
      </div>
    </RpbPageFrame>
  );
}
