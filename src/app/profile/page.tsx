"use client";

import { LogoutButton } from "@/components/auth/logout-button";
import { RpbPageFrame } from "@/components/layout/rpb-page-frame";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { EditableProfileField } from "@/components/profile/editable-profile-field";
import { useAuthSession } from "@/hooks/use-auth-session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { CalendarDays, IdCard, Mail, Phone, Shield, UserRound } from "lucide-react";
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
        <section className="rpb-section p-5">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-rpb-primary text-xl font-bold text-white"
              aria-hidden="true"
            >
              {profileInfo?.fullName
                ? profileInfo.fullName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
                : profileInfo?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-foreground">
                {profileInfo?.fullName || profileInfo?.username || "-"}
              </p>
              <p className="truncate text-sm text-rpb-ink-soft">{profileInfo?.email ?? user?.email ?? "-"}</p>
              <span className="mt-1 inline-block rounded-md bg-rpb-primary-soft px-2 py-0.5 text-xs font-semibold uppercase text-rpb-primary">
                {profileInfo?.role ?? role ?? "-"}
              </span>
            </div>
          </div>
        </section>

        {loading || busy ? (
          <div
            className="rpb-section rpb-delayed-loader p-4 text-sm text-rpb-ink-soft"
            role="status"
            aria-live="polite"
            aria-label="Memuat profil"
          >
            Memuat profil...
          </div>
        ) : null}
        {error ? (
          <div className="rpb-alert rpb-alert-error" role="alert" aria-live="assertive">
            {error}
          </div>
        ) : null}
        {successNotice ? (
          <div className="rpb-alert rpb-alert-success" role="status" aria-live="polite">
            {successNotice}
          </div>
        ) : null}

        <section className="rpb-section p-5">
          <h2 className="rpb-h-title mb-4 text-lg font-semibold">Informasi Akun</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-[var(--rpb-border)] bg-white p-4">
              <dl>
                <dt className="mb-1 inline-flex items-center gap-2 text-xs font-semibold text-rpb-ink-soft">
                  <UserRound size={14} aria-hidden="true" />
                  Nama User
                </dt>
                <dd className="text-sm font-semibold text-foreground">
                  {profileInfo?.username || "-"}
                </dd>
              </dl>
            </div>

            <EditableProfileField
              label="Nama Lengkap"
              icon={<IdCard size={14} aria-hidden="true" />}
              value={profileInfo?.fullName}
              fieldKey="fullName"
              inputType="text"
              placeholder="Masukkan nama lengkap"
              editingField={editingField}
              editValue={editValue}
              editError={editError}
              editBusy={editBusy}
              onStartEdit={startEditing}
              onSave={saveEdit}
              onCancel={cancelEditing}
              onEditValueChange={(v) => {
                setEditValue(v);
                if (editError) setEditError(null);
              }}
            />

            <div className="rounded-xl border border-[var(--rpb-border)] bg-white p-4">
              <dl>
                <dt className="mb-1 inline-flex items-center gap-2 text-xs font-semibold text-rpb-ink-soft">
                  <Mail size={14} aria-hidden="true" />
                  Email
                </dt>
                <dd className="text-sm font-semibold text-foreground">
                  {profileInfo?.email ?? user?.email ?? "-"}
                </dd>
              </dl>
            </div>

            <EditableProfileField
              label="Nomor Telepon"
              icon={<Phone size={14} aria-hidden="true" />}
              value={profileInfo?.phoneNumber}
              fieldKey="phoneNumber"
              inputType="tel"
              placeholder="Masukkan nomor telepon"
              editingField={editingField}
              editValue={editValue}
              editError={editError}
              editBusy={editBusy}
              onStartEdit={startEditing}
              onSave={saveEdit}
              onCancel={cancelEditing}
              onEditValueChange={(v) => {
                setEditValue(v);
                if (editError) setEditError(null);
              }}
            />

            <div className="rounded-xl border border-[var(--rpb-border)] bg-white p-4">
              <dl>
                <dt className="mb-1 inline-flex items-center gap-2 text-xs font-semibold text-rpb-ink-soft">
                  <Shield size={14} aria-hidden="true" />
                  Role
                </dt>
                <dd className="text-sm font-semibold uppercase text-foreground">
                  {profileInfo?.role ?? role ?? "-"}
                </dd>
              </dl>
            </div>

            <div className="rounded-xl border border-[var(--rpb-border)] bg-white p-4">
              <dl>
                <dt className="mb-1 inline-flex items-center gap-2 text-xs font-semibold text-rpb-ink-soft">
                  <CalendarDays size={14} aria-hidden="true" />
                  Terdaftar Sejak
                </dt>
                <dd className="text-sm font-semibold text-foreground">
                  {formatDate(profileInfo?.createdAt ?? null)}
                </dd>
              </dl>
            </div>
          </div>
        </section>

        <ChangePasswordForm />

        <section className="rpb-section p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Keluar dari Akun</p>
              <p className="text-xs text-rpb-ink-soft">Sesi aktif akan diakhiri</p>
            </div>
            <LogoutButton
              className="rpb-btn-ghost border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 hover:border-red-300"
              confirmMessage="Yakin ingin keluar?"
            />
          </div>
        </section>
      </div>
    </RpbPageFrame>
  );
}
