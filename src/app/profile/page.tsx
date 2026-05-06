"use client";

import { LogoutButton } from "@/components/auth/logout-button";
import { RpbPageFrame } from "@/components/layout/rpb-page-frame";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { useAuthSession } from "@/hooks/use-auth-session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { IdCard, Mail, Phone, Shield, UserRound, Pencil, Check, X } from "lucide-react";
import { useEffect, useState } from "react";

interface ProfileInfo {
  email: string;
  username: string;
  fullName: string;
  phoneNumber: string;
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
  const [editingField, setEditingField] = useState<"fullName" | "phoneNumber" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

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
          .select("email, username, full_name, phone_number, role, created_at")
          .eq("id", user.id)
          .maybeSingle();

        if (selectError) {
          throw selectError;
        }

        setProfileInfo({
          email: String(data?.email ?? user.email ?? "-"),
          username: String(data?.username ?? ""),
          fullName: String(data?.full_name ?? ""),
          phoneNumber: String(data?.phone_number ?? ""),
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

  const startEditing = (field: "fullName" | "phoneNumber") => {
    setEditingField(field);
    setEditValue(field === "fullName" ? profileInfo?.fullName ?? "" : profileInfo?.phoneNumber ?? "");
    setEditError(null);
    setSuccessNotice(null);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue("");
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!user || !editingField) return;

    setEditBusy(true);
    setEditError(null);

    const trimmedValue = editValue.trim();

    if (editingField === "fullName" && !trimmedValue) {
      setEditError("Nama lengkap tidak boleh kosong.");
      setEditBusy(false);
      return;
    }

    if (editingField === "phoneNumber" && trimmedValue && !/^[\d\+\-\s()]{6,20}$/.test(trimmedValue)) {
      setEditError("Format nomor telepon tidak valid.");
      setEditBusy(false);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const updateData = {
        [editingField === "fullName" ? "full_name" : "phone_number"]: trimmedValue || null,
      };

      const { error: updateError } = await supabase
        .from("user_profiles")
        .update(updateData)
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      setProfileInfo((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [editingField]: trimmedValue,
        };
      });

      setSuccessNotice(editingField === "fullName" ? "Nama berhasil diperbarui." : "Nomor telepon berhasil diperbarui.");
      cancelEditing();

      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal memperbarui.");
    } finally {
      setEditBusy(false);
    }
  };

  return (
    <RpbPageFrame shellClassName="rpb-compact">
      <div className="space-y-4 py-5 md:py-6">
        {loading || busy ? (
          <div className="rpb-section rpb-delayed-loader p-4 text-sm text-rpb-ink-soft">Memuat profil...</div>
        ) : null}
        {error ? (
          <div className="rpb-alert rpb-alert-error">
            {error}
          </div>
        ) : null}
        {successNotice ? (
          <div className="rpb-alert rpb-alert-success">
            {successNotice}
          </div>
        ) : null}

        <section className="rpb-section p-5">
          <h2 className="rpb-h-title mb-4 text-lg font-semibold">Informasi Akun</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-rpb-border bg-white p-4">
              <p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold text-rpb-ink-soft">
                <UserRound size={14} />
                Nama User
              </p>
              <p className="text-sm font-semibold text-foreground">
                {profileInfo?.username || "-"}
              </p>
            </div>
            <div className="rounded-xl border border-rpb-border bg-white p-4">
              <p className="mb-1 inline-flex items-center gap-2 text-xs font-semibold text-rpb-ink-soft">
                <IdCard size={14} />
                Nama Lengkap
              </p>
              {editingField === "fullName" ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => {
                      setEditValue(e.target.value);
                      if (editError) setEditError(null);
                    }}
                    className="rpb-input text-sm"
                    placeholder="Masukkan nama lengkap"
                    disabled={editBusy}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveEdit();
                      if (e.key === "Escape") cancelEditing();
                    }}
                  />
                  {editError ? (
                    <p className="text-xs text-red-600" role="alert">{editError}</p>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void saveEdit()}
                      disabled={editBusy}
                      className="rpb-btn-primary flex items-center gap-1 px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed"
                    >
                      <Check size={12} />
                      {editBusy ? "Menyimpan..." : "Simpan"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={editBusy}
                      className="rpb-btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed"
                    >
                      <X size={12} />
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {profileInfo?.fullName || "-"}
                  </p>
                  <button
                    type="button"
                    onClick={() => startEditing("fullName")}
                    className="rounded-md p-1.5 text-rpb-ink-soft transition-colors hover:bg-rpb-primary-soft hover:text-rpb-primary"
                    aria-label="Edit nama lengkap"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              )}
            </div>
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
                <Phone size={14} />
                Phone Number
              </p>
              {editingField === "phoneNumber" ? (
                <div className="space-y-2">
                  <input
                    type="tel"
                    value={editValue}
                    onChange={(e) => {
                      setEditValue(e.target.value);
                      if (editError) setEditError(null);
                    }}
                    className="rpb-input text-sm"
                    placeholder="Masukkan nomor telepon"
                    disabled={editBusy}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveEdit();
                      if (e.key === "Escape") cancelEditing();
                    }}
                  />
                  {editError ? (
                    <p className="text-xs text-red-600" role="alert">{editError}</p>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void saveEdit()}
                      disabled={editBusy}
                      className="rpb-btn-primary flex items-center gap-1 px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed"
                    >
                      <Check size={12} />
                      {editBusy ? "Menyimpan..." : "Simpan"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      disabled={editBusy}
                      className="rpb-btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed"
                    >
                      <X size={12} />
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    {profileInfo?.phoneNumber || "-"}
                  </p>
                  <button
                    type="button"
                    onClick={() => startEditing("phoneNumber")}
                    className="rounded-md p-1.5 text-rpb-ink-soft transition-colors hover:bg-rpb-primary-soft hover:text-rpb-primary"
                    aria-label="Edit nomor telepon"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              )}
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

        <ChangePasswordForm />
      </div>
    </RpbPageFrame>
  );
}
