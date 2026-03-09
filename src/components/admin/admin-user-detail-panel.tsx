"use client";

import { useAuthSession } from "@/hooks/use-auth-session";
import { Save, Trash2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ManagedUser } from "@/components/admin/admin-users-panel";

type AdminRole = "admin" | "user";

interface AdminUserDetailPanelProps {
  initialUser: ManagedUser;
  initialAdminCount: number;
}

interface UserDraft {
  email: string;
  username: string;
  fullName: string;
  phoneNumber: string;
  role: AdminRole;
  password: string;
  confirmPassword: string;
}

interface InlineNotice {
  tone: "success" | "error" | "info";
  text: string;
}

interface DeleteDialogState {
  typedEmail: string;
  error: string | null;
}

interface PasswordValidationState {
  passwordError: string | null;
  confirmError: string | null;
  summaryError: string | null;
  hasInput: boolean;
  canSubmit: boolean;
}

const normalizeEmail = (value: string): string =>
  value.trim().toLowerCase();

const normalizeText = (value: string): string =>
  value.trim();

const normalizeUsernameInput = (value: string): string => {
  const noSpace = value.replace(/\s+/g, "");
  if (!noSpace) {
    return "";
  }
  return `${noSpace.charAt(0).toUpperCase()}${noSpace.slice(1).toLowerCase()}`;
};

const toDraft = (user: ManagedUser): UserDraft => ({
  email: user.email,
  username: user.username,
  fullName: user.fullName,
  phoneNumber: user.phoneNumber,
  role: user.role,
  password: "",
  confirmPassword: "",
});

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const hasProfileChanges = (user: ManagedUser, draft: UserDraft): boolean =>
  normalizeEmail(draft.email) !== normalizeEmail(user.email) ||
  normalizeText(draft.username) !== normalizeText(user.username) ||
  normalizeText(draft.fullName) !== normalizeText(user.fullName) ||
  normalizeText(draft.phoneNumber) !== normalizeText(user.phoneNumber) ||
  draft.role !== user.role;

const getPasswordValidation = (draft: UserDraft): PasswordValidationState => {
  const hasInput = Boolean(draft.password || draft.confirmPassword);
  let passwordError: string | null = null;
  let confirmError: string | null = null;

  if (draft.confirmPassword && !draft.password) {
    passwordError = "Isi password baru.";
  } else if (draft.password && draft.password.length < 6) {
    passwordError = "Minimal 6 karakter.";
  }

  if (draft.password && !draft.confirmPassword) {
    confirmError = "Isi konfirmasi.";
  } else if (draft.password && draft.confirmPassword && draft.password !== draft.confirmPassword) {
    confirmError = "Konfirmasi tidak sama.";
  }

  return {
    passwordError,
    confirmError,
    summaryError: passwordError || confirmError,
    hasInput,
    canSubmit:
      draft.password.length >= 6 &&
      draft.confirmPassword.length > 0 &&
      draft.password === draft.confirmPassword,
  };
};

const noticeClassName = (tone: InlineNotice["tone"]): string => {
  if (tone === "error") {
    return "rpb-alert rpb-alert-error";
  }
  if (tone === "success") {
    return "rpb-alert rpb-alert-success";
  }
  return "rpb-alert rpb-alert-info";
};

export function AdminUserDetailPanel({ initialUser, initialAdminCount }: AdminUserDetailPanelProps) {
  const { user } = useAuthSession();
  const router = useRouter();
  const [managedUser, setManagedUser] = useState<ManagedUser>(initialUser);
  const [draft, setDraft] = useState<UserDraft>(() => toDraft(initialUser));
  const [adminCount, setAdminCount] = useState(initialAdminCount);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<InlineNotice | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null);

  const profileDirty = hasProfileChanges(managedUser, draft);
  const passwordValidation = getPasswordValidation(draft);
  const passwordDirty = passwordValidation.hasInput;
  const isCurrentUser = managedUser.id === user?.id;
  const isLastAdmin = managedUser.role === "admin" && adminCount <= 1;
  const deleteBlockedReason = isCurrentUser
    ? "Akun aktif tidak bisa dihapus."
    : isLastAdmin
      ? "Admin terakhir tidak bisa dihapus."
      : null;

  const updateDraft = (next: Partial<UserDraft>) => {
    setNotice(null);
    setDraft((prev) => ({ ...prev, ...next }));
  };

  const resetProfileDraft = () => {
    setNotice(null);
    setDraft((prev) => ({
      ...prev,
      email: managedUser.email,
      username: managedUser.username,
      fullName: managedUser.fullName,
      phoneNumber: managedUser.phoneNumber,
      role: managedUser.role,
    }));
  };

  const clearPasswordDraft = () => {
    setNotice(null);
    setDraft((prev) => ({
      ...prev,
      password: "",
      confirmPassword: "",
    }));
  };

  const refreshCurrentUser = async (): Promise<ManagedUser> => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users", { method: "GET" });
      const body = (await response.json()) as {
        error?: string;
        users?: ManagedUser[];
      };

      if (!response.ok || !body.users) {
        throw new Error(body.error || "Gagal memuat user.");
      }

      const found = body.users.find((item) => item.id === managedUser.id);
      if (!found) {
        throw new Error("User tidak ditemukan.");
      }

      setManagedUser(found);
      setAdminCount(body.users.filter((item) => item.role === "admin").length);
      setDraft((prev) => ({
        ...prev,
        email: found.email,
        username: found.username,
        fullName: found.fullName,
        phoneNumber: found.phoneNumber,
        role: found.role,
      }));

      return found;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Gagal memuat user.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setNotice(null);
    try {
      await refreshCurrentUser();
      setNotice({
        tone: "info",
        text: "Diperbarui.",
      });
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal memuat user.",
      });
    }
  };

  const saveUserInfo = async () => {
    if (!profileDirty) {
      setNotice({
        tone: "info",
        text: "Tidak ada perubahan.",
      });
      return;
    }

    setBusyAction("save");
    setNotice(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: managedUser.id,
          email: draft.email,
          username: draft.username,
          fullName: draft.fullName,
          phoneNumber: draft.phoneNumber,
          role: draft.role,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Gagal simpan profil.");
      }

      try {
        await refreshCurrentUser();
        setNotice({
          tone: "success",
          text: "Profil tersimpan.",
        });
      } catch {
        setNotice({
          tone: "info",
          text: "Profil tersimpan. Refresh manual.",
        });
      }
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal simpan profil.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const changePassword = async () => {
    if (!passwordValidation.canSubmit) {
      setNotice({
        tone: "error",
        text: passwordValidation.summaryError || "Password belum valid.",
      });
      return;
    }

    setBusyAction("password");
    setNotice(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: managedUser.id,
          password: draft.password,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Gagal ganti password.");
      }

      clearPasswordDraft();
      setNotice({
        tone: "success",
        text: "Password diperbarui.",
      });
    } catch (err) {
      setNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal ganti password.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const openDeleteDialog = () => {
    if (deleteBlockedReason) {
      setNotice({
        tone: "error",
        text: deleteBlockedReason,
      });
      return;
    }

    setDeleteDialog({
      typedEmail: "",
      error: null,
    });
  };

  const confirmDeleteUser = async () => {
    if (!deleteDialog) {
      return;
    }

    if (normalizeEmail(deleteDialog.typedEmail) !== normalizeEmail(managedUser.email)) {
      setDeleteDialog((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          error: "Email tidak cocok.",
        };
      });
      return;
    }

    setBusyAction("delete");
    setNotice(null);
    setDeleteDialog((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        error: null,
      };
    });

    try {
      const response = await fetch(`/api/admin/users?id=${encodeURIComponent(managedUser.id)}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Gagal menghapus user.");
      }

      router.push("/admin/users");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menghapus user.";
      setNotice({
        tone: "error",
        text: message,
      });
      setDeleteDialog((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          error: message,
        };
      });
    } finally {
      setBusyAction(null);
    }
  };

  const deleteDialogBusy = busyAction === "delete";
  const deleteDialogTypedMatch = deleteDialog
    ? normalizeEmail(deleteDialog.typedEmail) === normalizeEmail(managedUser.email)
    : false;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <section className="rpb-section p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="rpb-h-title text-base font-semibold">Detail</h2>
          <button
            type="button"
            className="rpb-btn-ghost px-3 py-2 text-xs font-semibold"
            onClick={() => void handleManualRefresh()}
            disabled={loading}
          >
            {loading ? "Memuat..." : "Refresh"}
          </button>
        </div>

        <p className="text-sm font-semibold text-foreground">{managedUser.fullName || managedUser.username || managedUser.email}</p>
        <p className="text-xs text-rpb-ink-soft">{managedUser.email}</p>

        {notice ? (
          <div className={`${noticeClassName(notice.tone)} mt-3`} role={notice.tone === "error" ? "alert" : "status"}>
            {notice.text}
          </div>
        ) : null}
      </section>

      <section className="rpb-section p-4">
        <h3 className="rpb-h-title text-sm font-semibold">Profil</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
            Email
            <input
              className="rpb-input"
              type="email"
              value={draft.email}
              onChange={(event) => updateDraft({ email: event.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
            Username
            <input
              className="rpb-input"
              type="text"
              value={draft.username}
              onChange={(event) => updateDraft({ username: normalizeUsernameInput(event.target.value) })}
            />
            <span className="text-xs font-normal text-rpb-ink-soft">
              Tanpa spasi. Huruf pertama kapital.
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
            Nama
            <input
              className="rpb-input"
              type="text"
              value={draft.fullName}
              onChange={(event) => updateDraft({ fullName: event.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
            Phone
            <input
              className="rpb-input"
              type="text"
              value={draft.phoneNumber}
              onChange={(event) => updateDraft({ phoneNumber: event.target.value })}
            />
          </label>
          <fieldset className="flex flex-col gap-1 md:col-span-2">
            <legend className="text-sm font-semibold text-rpb-ink-soft">Role</legend>
            <div className="inline-flex w-fit items-center gap-1 rounded-2xl border border-rpb-border bg-[#f3f4f6] p-1">
              <button
                type="button"
                className={`min-w-[84px] rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                  draft.role === "user"
                    ? "border-[#d5dae4] bg-white text-[#0f2a55] shadow-sm"
                    : "border-transparent text-rpb-ink-soft hover:bg-white/80"
                }`}
                onClick={() => updateDraft({ role: "user" })}
                aria-pressed={draft.role === "user"}
              >
                User
              </button>
              <button
                type="button"
                className={`min-w-[84px] rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                  draft.role === "admin"
                    ? "border-[#d5dae4] bg-white text-[#0f2a55] shadow-sm"
                    : "border-transparent text-rpb-ink-soft hover:bg-white/80"
                }`}
                onClick={() => updateDraft({ role: "admin" })}
                aria-pressed={draft.role === "admin"}
              >
                Admin
              </button>
            </div>
          </fieldset>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rpb-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
            onClick={() => void saveUserInfo()}
            disabled={!profileDirty || busyAction === "save"}
          >
            <Save size={14} />
            {busyAction === "save" ? "Menyimpan..." : "Simpan"}
          </button>
          <button
            type="button"
            className="rpb-btn-ghost px-4 py-2 text-sm font-semibold"
            onClick={() => resetProfileDraft()}
            disabled={!profileDirty || busyAction === "save"}
          >
            Reset
          </button>
        </div>
      </section>

      <section className="rpb-section p-4">
        <h3 className="rpb-h-title text-sm font-semibold">Password</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
            Baru
            <input
              className={`rpb-input ${passwordValidation.passwordError ? "border-red-300" : ""}`}
              type="password"
              value={draft.password}
              onChange={(event) => updateDraft({ password: event.target.value })}
            />
            <span className={`text-xs ${passwordValidation.passwordError ? "text-red-700" : "text-rpb-ink-soft"}`}>
              {passwordValidation.passwordError || "Minimal 6 karakter."}
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
            Konfirmasi
            <input
              className={`rpb-input ${passwordValidation.confirmError ? "border-red-300" : ""}`}
              type="password"
              value={draft.confirmPassword}
              onChange={(event) => updateDraft({ confirmPassword: event.target.value })}
            />
            <span className={`text-xs ${passwordValidation.confirmError ? "text-red-700" : "text-rpb-ink-soft"}`}>
              {passwordValidation.confirmError || "Harus sama."}
            </span>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rpb-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
            onClick={() => void changePassword()}
            disabled={!passwordValidation.canSubmit || busyAction === "password"}
          >
            <UserRound size={14} />
            {busyAction === "password" ? "Menyimpan..." : "Simpan Password"}
          </button>
          <button
            type="button"
            className="rpb-btn-ghost px-4 py-2 text-sm font-semibold"
            onClick={() => clearPasswordDraft()}
            disabled={!passwordDirty || busyAction === "password"}
          >
            Reset
          </button>
        </div>
      </section>

      <section className="rpb-section p-4">
        <h3 className="rpb-h-title text-sm font-semibold text-red-700">Hapus</h3>
        {deleteBlockedReason ? (
          <p className="mt-2 text-xs font-semibold text-red-700">{deleteBlockedReason}</p>
        ) : (
          <button
            type="button"
            className="rpb-btn-ghost mt-3 inline-flex items-center gap-2 border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:border-red-400 hover:bg-red-100 hover:text-red-700"
            onClick={() => openDeleteDialog()}
            disabled={busyAction === "delete"}
          >
            <Trash2 size={14} />
            {busyAction === "delete" ? "Menghapus..." : "Hapus User"}
          </button>
        )}
      </section>

      <section className="rpb-section p-4">
        <div className="grid gap-2 text-xs text-rpb-ink-soft md:grid-cols-3">
          <div>
            <p className="font-semibold">Dibuat</p>
            <p>{formatDateTime(managedUser.createdAt)}</p>
          </div>
          <div>
            <p className="font-semibold">Update</p>
            <p>{formatDateTime(managedUser.updatedAt)}</p>
          </div>
          <div>
            <p className="font-semibold">Login</p>
            <p>{formatDateTime(managedUser.lastSignInAt)}</p>
          </div>
        </div>
      </section>

      {deleteDialog ? (
        <div className="rpb-modal-backdrop fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#15172b]/45 p-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] backdrop-blur-[2px] md:items-center md:pb-6">
          <div className="rpb-modal-panel w-full max-w-lg overflow-hidden rounded-xl border border-rpb-border bg-white shadow-xl">
            <div className="border-b border-rpb-border px-4 py-3">
              <h3 className="rpb-h-title text-base font-semibold text-foreground">Konfirmasi</h3>
            </div>

            <div className="space-y-3 px-4 py-4">
              <p className="text-sm text-foreground">
                Hapus <span className="font-semibold">{managedUser.email}</span>
              </p>
              <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
                Ketik Email
                <input
                  className="rpb-input"
                  type="text"
                  value={deleteDialog.typedEmail}
                  onChange={(event) =>
                    setDeleteDialog((prev) => {
                      if (!prev) {
                        return prev;
                      }
                      return {
                        ...prev,
                        typedEmail: event.target.value,
                        error: null,
                      };
                    })
                  }
                  autoFocus
                />
              </label>

              {deleteDialog.error ? (
                <div className={noticeClassName("error")} role="alert">
                  {deleteDialog.error}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-rpb-border px-4 py-3">
              <button
                type="button"
                className="rpb-btn-ghost px-4 py-2 text-sm font-semibold"
                onClick={() => setDeleteDialog(null)}
                disabled={deleteDialogBusy}
              >
                Batal
              </button>
              <button
                type="button"
                className="rpb-btn-ghost inline-flex items-center gap-2 border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:border-red-400 hover:bg-red-100 hover:text-red-700"
                onClick={() => void confirmDeleteUser()}
                disabled={!deleteDialogTypedMatch || deleteDialogBusy}
              >
                <Trash2 size={14} />
                {deleteDialogBusy ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
