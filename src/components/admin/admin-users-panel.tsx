"use client";

import { useAuthSession } from "@/hooks/use-auth-session";
import { ChevronDown, ChevronUp, Plus, Save, Trash2, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type AdminRole = "admin" | "user";

export interface ManagedUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  phoneNumber: string;
  role: AdminRole;
  createdAt: string | null;
  updatedAt: string | null;
  lastSignInAt: string | null;
}

interface AdminUsersPanelProps {
  initialUsers: ManagedUser[];
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
  id: string;
  label: string;
  email: string;
  role: AdminRole;
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

const toDraftMap = (users: ManagedUser[]): Record<string, UserDraft> =>
  users.reduce<Record<string, UserDraft>>((map, user) => {
    map[user.id] = {
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      password: "",
      confirmPassword: "",
    };
    return map;
  }, {});

const buildUserLabel = (user: Pick<ManagedUser, "fullName" | "username" | "email">): string =>
  user.fullName || user.username || user.email;

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
    passwordError = "Isi password baru terlebih dulu.";
  } else if (draft.password && draft.password.length < 6) {
    passwordError = "Password baru minimal 6 karakter.";
  }

  if (draft.password && !draft.confirmPassword) {
    confirmError = "Ulangi password baru untuk konfirmasi.";
  } else if (draft.password && draft.confirmPassword && draft.password !== draft.confirmPassword) {
    confirmError = "Konfirmasi password belum sama.";
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

export function AdminUsersPanel({ initialUsers }: AdminUsersPanelProps) {
  const { user } = useAuthSession();
  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>(() => toDraftMap(initialUsers));
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [listNotice, setListNotice] = useState<InlineNotice | null>(null);
  const [createNotice, setCreateNotice] = useState<InlineNotice | null>(null);
  const [rowNotices, setRowNotices] = useState<Record<string, InlineNotice>>({});
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null);
  const [createForm, setCreateForm] = useState({
    email: "",
    username: "",
    fullName: "",
    phoneNumber: "",
    password: "",
    role: "user" as AdminRole,
  });

  const sortedUsers = useMemo(
    () =>
      users.slice().sort((a, b) => {
        if (a.id === user?.id) {
          return -1;
        }
        if (b.id === user?.id) {
          return 1;
        }
        return buildUserLabel(a).localeCompare(buildUserLabel(b));
      }),
    [user?.id, users],
  );

  const adminCount = useMemo(
    () => users.filter((item) => item.role === "admin").length,
    [users],
  );

  const setRowNotice = (id: string, notice: InlineNotice) => {
    setRowNotices((prev) => ({
      ...prev,
      [id]: notice,
    }));
  };

  const clearRowNotice = (id: string) => {
    setRowNotices((prev) => {
      if (!prev[id]) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const refreshUsers = async (): Promise<ManagedUser[]> => {
    setLoading(true);
    setListNotice(null);
    try {
      const response = await fetch("/api/admin/users", { method: "GET" });
      const body = (await response.json()) as {
        error?: string;
        users?: ManagedUser[];
      };

      if (!response.ok || !body.users) {
        throw new Error(body.error || "Gagal memuat daftar user.");
      }

      const nextUsers = body.users;
      setUsers(nextUsers);
      setDrafts(toDraftMap(nextUsers));
      setRowNotices((prev) => {
        const next: Record<string, InlineNotice> = {};
        for (const item of nextUsers) {
          if (prev[item.id]) {
            next[item.id] = prev[item.id];
          }
        }
        return next;
      });
      setExpandedUserId((current) => {
        if (!current) {
          return null;
        }
        return nextUsers.some((item) => item.id === current) ? current : null;
      });
      return nextUsers;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memuat daftar user.";
      setListNotice({
        tone: "error",
        text: message,
      });
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    try {
      await refreshUsers();
      setListNotice({
        tone: "info",
        text: "Daftar user sudah diperbarui.",
      });
    } catch {
      // Error sudah ditampilkan oleh refreshUsers.
    }
  };

  const updateDraft = (id: string, next: Partial<UserDraft>) => {
    clearRowNotice(id);
    setDrafts((prev) => {
      const current = prev[id];
      if (!current) {
        return prev;
      }
      return {
        ...prev,
        [id]: { ...current, ...next },
      };
    });
  };

  const resetProfileDraft = (managedUser: ManagedUser) => {
    clearRowNotice(managedUser.id);
    setDrafts((prev) => {
      const current = prev[managedUser.id];
      if (!current) {
        return prev;
      }
      return {
        ...prev,
        [managedUser.id]: {
          ...current,
          email: managedUser.email,
          username: managedUser.username,
          fullName: managedUser.fullName,
          phoneNumber: managedUser.phoneNumber,
          role: managedUser.role,
        },
      };
    });
  };

  const clearPasswordDraft = (id: string) => {
    clearRowNotice(id);
    setDrafts((prev) => {
      const current = prev[id];
      if (!current) {
        return prev;
      }
      return {
        ...prev,
        [id]: {
          ...current,
          password: "",
          confirmPassword: "",
        },
      };
    });
  };

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusyAction("create");
    setCreateNotice(null);
    setListNotice(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const body = (await response.json()) as {
        error?: string;
        user?: { id?: string; email?: string };
      };
      if (!response.ok) {
        throw new Error(body.error || "Gagal membuat user.");
      }

      const createdUserId = body.user?.id ?? null;
      const createdEmail = body.user?.email ?? normalizeEmail(createForm.email);

      setCreateForm({
        email: "",
        username: "",
        fullName: "",
        phoneNumber: "",
        password: "",
        role: "user",
      });
      setShowCreateForm(false);

      try {
        await refreshUsers();
        if (createdUserId) {
          setExpandedUserId(createdUserId);
        }
        setCreateNotice({
          tone: "success",
          text: `User ${createdEmail} berhasil dibuat.`,
        });
      } catch {
        setCreateNotice({
          tone: "info",
          text: `User ${createdEmail} berhasil dibuat, tetapi daftar belum terbarui. Tekan Refresh.`,
        });
      }
    } catch (err) {
      setCreateNotice({
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal membuat user.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const saveUserInfo = async (id: string) => {
    const draft = drafts[id];
    const managedUser = users.find((item) => item.id === id);
    if (!draft || !managedUser) {
      return;
    }

    if (!hasProfileChanges(managedUser, draft)) {
      setRowNotice(id, {
        tone: "info",
        text: "Belum ada perubahan profil yang perlu disimpan.",
      });
      return;
    }

    setBusyAction(`save:${id}`);
    clearRowNotice(id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          email: draft.email,
          username: draft.username,
          fullName: draft.fullName,
          phoneNumber: draft.phoneNumber,
          role: draft.role,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Gagal update user.");
      }

      const label = buildUserLabel(managedUser);
      try {
        await refreshUsers();
        setRowNotice(id, {
          tone: "success",
          text: `Profil ${label} berhasil diperbarui.`,
        });
      } catch {
        setRowNotice(id, {
          tone: "info",
          text: `Profil ${label} tersimpan, tetapi daftar belum terbarui. Tekan Refresh.`,
        });
      }
    } catch (err) {
      setRowNotice(id, {
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal update user.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const changePassword = async (id: string) => {
    const draft = drafts[id];
    const managedUser = users.find((item) => item.id === id);
    if (!draft || !managedUser) {
      return;
    }

    const passwordValidation = getPasswordValidation(draft);
    if (!passwordValidation.canSubmit) {
      setRowNotice(id, {
        tone: "error",
        text:
          passwordValidation.summaryError ||
          "Lengkapi password baru dan konfirmasi sebelum menyimpan.",
      });
      return;
    }

    setBusyAction(`password:${id}`);
    clearRowNotice(id);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          password: draft.password,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Gagal ganti password.");
      }

      clearPasswordDraft(id);
      setRowNotice(id, {
        tone: "success",
        text: `Password untuk ${buildUserLabel(managedUser)} berhasil diperbarui.`,
      });
    } catch (err) {
      setRowNotice(id, {
        tone: "error",
        text: err instanceof Error ? err.message : "Gagal ganti password.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const openDeleteDialog = (managedUser: ManagedUser) => {
    const isCurrentUser = managedUser.id === user?.id;
    if (isCurrentUser) {
      setRowNotice(managedUser.id, {
        tone: "error",
        text: "Akun Anda sedang aktif dan tidak bisa dihapus dari halaman ini.",
      });
      return;
    }

    if (managedUser.role === "admin" && adminCount <= 1) {
      setRowNotice(managedUser.id, {
        tone: "error",
        text: "Tidak bisa menghapus admin terakhir. Tambahkan admin lain terlebih dulu.",
      });
      return;
    }

    setDeleteDialog({
      id: managedUser.id,
      label: buildUserLabel(managedUser),
      email: managedUser.email,
      role: managedUser.role,
      typedEmail: "",
      error: null,
    });
  };

  const confirmDeleteUser = async () => {
    if (!deleteDialog) {
      return;
    }

    if (normalizeEmail(deleteDialog.typedEmail) !== normalizeEmail(deleteDialog.email)) {
      setDeleteDialog((prev) => {
        if (!prev) {
          return prev;
        }
        return {
          ...prev,
          error: `Email konfirmasi harus sama persis dengan ${prev.email}.`,
        };
      });
      return;
    }

    const deletingId = deleteDialog.id;
    const deletingLabel = deleteDialog.label;
    setBusyAction(`delete:${deletingId}`);
    setListNotice(null);
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
      const response = await fetch(`/api/admin/users?id=${encodeURIComponent(deletingId)}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Gagal menghapus user.");
      }

      setDeleteDialog(null);
      if (expandedUserId === deletingId) {
        setExpandedUserId(null);
      }

      try {
        await refreshUsers();
        setListNotice({
          tone: "success",
          text: `User ${deletingLabel} berhasil dihapus.`,
        });
      } catch {
        setListNotice({
          tone: "info",
          text: `User ${deletingLabel} berhasil dihapus, tetapi daftar belum terbarui. Tekan Refresh.`,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menghapus user.";
      setRowNotice(deletingId, {
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

  const deleteDialogBusy = deleteDialog
    ? busyAction === `delete:${deleteDialog.id}`
    : false;
  const deleteDialogTypedMatch = deleteDialog
    ? normalizeEmail(deleteDialog.typedEmail) === normalizeEmail(deleteDialog.email)
    : false;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <section className="rpb-section p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="rpb-h-title text-base font-semibold">User Management</h2>
            <p className="mt-1 text-xs text-rpb-ink-soft">
              {sortedUsers.length} user terdaftar. Buka user untuk edit profil, reset password, atau hapus akun.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rpb-btn-ghost px-3 py-2 text-xs font-semibold"
              onClick={() => void handleManualRefresh()}
              disabled={loading}
            >
              {loading ? "Memuat..." : "Refresh"}
            </button>
          </div>
        </div>

        {listNotice ? (
          <div className={noticeClassName(listNotice.tone)} role={listNotice.tone === "error" ? "alert" : "status"}>
            {listNotice.text}
          </div>
        ) : null}

        {loading ? (
          <p className="rpb-delayed-loader mt-3 text-sm text-rpb-ink-soft">Memuat daftar user...</p>
        ) : sortedUsers.length === 0 ? (
          <p className="mt-3 text-sm text-rpb-ink-soft">Belum ada user terdaftar.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {sortedUsers.map((managedUser) => {
              const draft = drafts[managedUser.id];
              if (!draft) {
                return null;
              }

              const expanded = expandedUserId === managedUser.id;
              const isCurrentUser = managedUser.id === user?.id;
              const isLastRemainingAdmin = managedUser.role === "admin" && adminCount <= 1;
              const deleteBlockedReason = isCurrentUser
                ? "Akun yang sedang login tidak bisa dihapus."
                : isLastRemainingAdmin
                  ? "Admin terakhir tidak bisa dihapus."
                  : null;
              const profileDirty = hasProfileChanges(managedUser, draft);
              const passwordValidation = getPasswordValidation(draft);
              const passwordDirty = passwordValidation.hasInput;
              const rowNotice = rowNotices[managedUser.id];

              return (
                <article key={managedUser.id} className="rounded-2xl border border-rpb-border bg-white">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                    onClick={() =>
                      setExpandedUserId((current) =>
                        current === managedUser.id ? null : managedUser.id,
                      )
                    }
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {buildUserLabel(managedUser)}
                      </p>
                      <p className="truncate text-xs text-rpb-ink-soft">{managedUser.email}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rpb-chip px-2 py-0.5 text-[11px] font-semibold text-rpb-ink-soft">
                          {managedUser.role.toUpperCase()}
                        </span>
                        {isCurrentUser ? (
                          <span className="rounded-full bg-rpb-primary-soft px-2 py-0.5 text-[11px] font-semibold text-rpb-primary">
                            Anda
                          </span>
                        ) : null}
                        {profileDirty || passwordDirty ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            Perubahan belum disimpan
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-rpb-ink-soft">
                        Phone: {managedUser.phoneNumber || "-"}
                      </p>
                    </div>
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {expanded ? (
                    <div className="space-y-4 border-t border-rpb-border px-4 py-4">
                      {rowNotice ? (
                        <div className={noticeClassName(rowNotice.tone)} role={rowNotice.tone === "error" ? "alert" : "status"}>
                          {rowNotice.text}
                        </div>
                      ) : null}

                      <div className="grid gap-4 xl:grid-cols-2">
                        <section className="space-y-3 rounded-xl border border-rpb-border bg-white p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="rpb-h-title text-sm font-semibold text-foreground">Profil</h3>
                            <span className="text-xs text-rpb-ink-soft">
                              {profileDirty ? "Perubahan belum disimpan" : "Tidak ada perubahan"}
                            </span>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
                              Email
                              <input
                                className="rpb-input"
                                type="email"
                                value={draft.email}
                                onChange={(event) =>
                                  updateDraft(managedUser.id, { email: event.target.value })
                                }
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
                              Nama User
                              <input
                                className="rpb-input"
                                type="text"
                                value={draft.username}
                                onChange={(event) =>
                                  updateDraft(managedUser.id, { username: event.target.value })
                                }
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
                              Nama Lengkap
                              <input
                                className="rpb-input"
                                type="text"
                                value={draft.fullName}
                                onChange={(event) =>
                                  updateDraft(managedUser.id, { fullName: event.target.value })
                                }
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
                              Phone Number
                              <input
                                className="rpb-input"
                                type="text"
                                value={draft.phoneNumber}
                                onChange={(event) =>
                                  updateDraft(managedUser.id, { phoneNumber: event.target.value })
                                }
                              />
                            </label>
                            <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft md:col-span-2">
                              Role
                              <select
                                className="rpb-input"
                                value={draft.role}
                                onChange={(event) =>
                                  updateDraft(managedUser.id, {
                                    role: event.target.value as AdminRole,
                                  })
                                }
                              >
                                <option value="user">user</option>
                                <option value="admin">admin</option>
                              </select>
                            </label>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rpb-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                              onClick={() => void saveUserInfo(managedUser.id)}
                              disabled={!profileDirty || busyAction === `save:${managedUser.id}`}
                            >
                              <Save size={14} />
                              {busyAction === `save:${managedUser.id}` ? "Menyimpan..." : "Simpan Profil"}
                            </button>
                            <button
                              type="button"
                              className="rpb-btn-ghost px-4 py-2 text-sm font-semibold"
                              onClick={() => resetProfileDraft(managedUser)}
                              disabled={!profileDirty || busyAction === `save:${managedUser.id}`}
                            >
                              Reset Profil
                            </button>
                          </div>
                        </section>

                        <section className="space-y-3 rounded-xl border border-rpb-border bg-white p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="rpb-h-title text-sm font-semibold text-foreground">Security</h3>
                            <span className="text-xs text-rpb-ink-soft">
                              {passwordDirty ? "Draft password belum diproses" : "Kosongkan jika tidak diubah"}
                            </span>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
                              Password Baru
                              <input
                                className={`rpb-input ${passwordValidation.passwordError ? "border-red-300" : ""}`}
                                type="password"
                                value={draft.password}
                                onChange={(event) =>
                                  updateDraft(managedUser.id, { password: event.target.value })
                                }
                                placeholder="Minimal 6 karakter"
                              />
                              <span className={`text-xs ${passwordValidation.passwordError ? "text-red-700" : "text-rpb-ink-soft"}`}>
                                {passwordValidation.passwordError ||
                                  "Gunakan kombinasi minimal 6 karakter yang sulit ditebak."}
                              </span>
                            </label>
                            <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
                              Konfirmasi Password
                              <input
                                className={`rpb-input ${passwordValidation.confirmError ? "border-red-300" : ""}`}
                                type="password"
                                value={draft.confirmPassword}
                                onChange={(event) =>
                                  updateDraft(managedUser.id, {
                                    confirmPassword: event.target.value,
                                  })
                                }
                                placeholder="Ulangi password baru"
                              />
                              <span className={`text-xs ${passwordValidation.confirmError ? "text-red-700" : "text-rpb-ink-soft"}`}>
                                {passwordValidation.confirmError ||
                                  "Masukkan ulang password baru agar tidak salah ketik."}
                              </span>
                            </label>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rpb-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                              onClick={() => void changePassword(managedUser.id)}
                              disabled={!passwordValidation.canSubmit || busyAction === `password:${managedUser.id}`}
                            >
                              <UserRound size={14} />
                              {busyAction === `password:${managedUser.id}` ? "Memproses..." : "Simpan Password Baru"}
                            </button>
                            <button
                              type="button"
                              className="rpb-btn-ghost px-4 py-2 text-sm font-semibold"
                              onClick={() => clearPasswordDraft(managedUser.id)}
                              disabled={!passwordDirty || busyAction === `password:${managedUser.id}`}
                            >
                              Bersihkan Password
                            </button>
                          </div>

                          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-red-700">
                              Danger Zone
                            </p>
                            <p className="mt-1 text-xs text-red-700">
                              Menghapus user bersifat permanen dan tidak bisa dibatalkan.
                            </p>
                            {deleteBlockedReason ? (
                              <p className="mt-2 text-xs font-semibold text-red-700">
                                {deleteBlockedReason}
                              </p>
                            ) : (
                              <button
                                type="button"
                                className="rpb-btn-ghost mt-3 inline-flex items-center gap-2 border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:border-red-400 hover:bg-red-100 hover:text-red-700"
                                onClick={() => openDeleteDialog(managedUser)}
                                disabled={busyAction === `delete:${managedUser.id}`}
                              >
                                <Trash2 size={14} />
                                {busyAction === `delete:${managedUser.id}` ? "Menghapus..." : "Hapus User"}
                              </button>
                            )}
                          </div>
                        </section>
                      </div>

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
                          <p className="font-semibold">Login Terakhir</p>
                          <p>{formatDateTime(managedUser.lastSignInAt)}</p>
                        </div>
                      </div>

                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rpb-section p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          onClick={() => setShowCreateForm((value) => !value)}
        >
          <div>
            <h2 className="rpb-h-title text-base font-semibold">Tambah User Baru</h2>
            <p className="mt-1 text-xs text-rpb-ink-soft">
              Panel sekunder untuk membuat akun baru. Gunakan hanya untuk user internal.
            </p>
          </div>
          {showCreateForm ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showCreateForm ? (
          <div className="mt-4 space-y-3">
            {createNotice ? (
              <div className={noticeClassName(createNotice.tone)} role={createNotice.tone === "error" ? "alert" : "status"}>
                {createNotice.text}
              </div>
            ) : null}

            <form className="grid gap-3 md:grid-cols-2" onSubmit={createUser}>
              <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft md:col-span-2">
                Email
                <input
                  className="rpb-input"
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((value) => ({ ...value, email: event.target.value }))
                  }
                  placeholder="nama@perusahaan.com"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
                Nama User
                <input
                  className="rpb-input"
                  type="text"
                  value={createForm.username}
                  onChange={(event) =>
                    setCreateForm((value) => ({ ...value, username: event.target.value }))
                  }
                  placeholder="Username internal"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
                Nama Lengkap
                <input
                  className="rpb-input"
                  type="text"
                  value={createForm.fullName}
                  onChange={(event) =>
                    setCreateForm((value) => ({ ...value, fullName: event.target.value }))
                  }
                  placeholder="Nama untuk ditampilkan"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
                Phone Number
                <input
                  className="rpb-input"
                  type="text"
                  value={createForm.phoneNumber}
                  onChange={(event) =>
                    setCreateForm((value) => ({ ...value, phoneNumber: event.target.value }))
                  }
                  placeholder="+62..."
                />
                <span className="text-xs text-rpb-ink-soft">
                  Opsional. Gunakan angka, spasi, dan karakter + - ( ).
                </span>
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
                Role
                <select
                  className="rpb-input"
                  value={createForm.role}
                  onChange={(event) =>
                    setCreateForm((value) => ({ ...value, role: event.target.value as AdminRole }))
                  }
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft md:col-span-2">
                Password Awal
                <input
                  className="rpb-input"
                  type="password"
                  value={createForm.password}
                  onChange={(event) =>
                    setCreateForm((value) => ({ ...value, password: event.target.value }))
                  }
                  placeholder="Minimal 6 karakter"
                  required
                />
                <span className="text-xs text-rpb-ink-soft">
                  Password awal minimal 6 karakter. User bisa mengganti setelah login.
                </span>
              </label>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="rpb-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                  disabled={busyAction === "create"}
                >
                  <Plus size={15} />
                  {busyAction === "create" ? "Membuat..." : "Buat User"}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </section>

      {deleteDialog ? (
        <div className="rpb-modal-backdrop fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#15172b]/45 p-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] backdrop-blur-[2px] md:items-center md:pb-6">
          <div className="rpb-modal-panel w-full max-w-lg overflow-hidden rounded-xl border border-rpb-border bg-white shadow-xl">
            <div className="border-b border-rpb-border px-4 py-3">
              <h3 className="rpb-h-title text-base font-semibold text-foreground">Konfirmasi Hapus User</h3>
              <p className="mt-1 text-xs text-rpb-ink-soft">
                Aksi ini permanen. Data akun tidak bisa dipulihkan setelah dihapus.
              </p>
            </div>

            <div className="space-y-3 px-4 py-4">
              <p className="text-sm text-foreground">
                Anda akan menghapus user <span className="font-semibold">{deleteDialog.label}</span> (
                <span className="font-semibold">{deleteDialog.email}</span>) dengan role{" "}
                <span className="font-semibold">{deleteDialog.role.toUpperCase()}</span>.
              </p>
              <p className="text-sm text-rpb-ink-soft">Ketik email berikut untuk konfirmasi:</p>
              <p className="rounded-lg border border-rpb-border bg-rpb-primary-soft px-3 py-2 text-sm font-semibold text-rpb-primary">
                {deleteDialog.email}
              </p>
              <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
                Konfirmasi Email
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
                  placeholder="Ketik email target"
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
                {deleteDialogBusy ? "Menghapus..." : "Hapus User Sekarang"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
