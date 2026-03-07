"use client";

import { useAuthSession } from "@/hooks/use-auth-session";
import { ChevronDown, ChevronUp, Plus, Save, Trash2, UserRound } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

type AdminRole = "admin" | "user";

interface ManagedUser {
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

interface UserDraft {
  email: string;
  username: string;
  fullName: string;
  phoneNumber: string;
  role: AdminRole;
  password: string;
  confirmPassword: string;
}

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

export function AdminUsersPanel() {
  const { user } = useAuthSession();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
        const aLabel = a.fullName || a.username || a.email;
        const bLabel = b.fullName || b.username || b.email;
        return aLabel.localeCompare(bLabel);
      }),
    [user?.id, users],
  );

  const refreshUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", { method: "GET" });
      const body = (await response.json()) as {
        error?: string;
        users?: ManagedUser[];
      };

      if (!response.ok || !body.users) {
        throw new Error(body.error || "Gagal memuat data user.");
      }

      setUsers(body.users);
      setDrafts(toDraftMap(body.users));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data user.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshUsers();
  }, []);

  const updateDraft = (id: string, next: Partial<UserDraft>) => {
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

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusyAction("create");
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Gagal membuat user.");
      }

      setCreateForm({
        email: "",
        username: "",
        fullName: "",
        phoneNumber: "",
        password: "",
        role: "user",
      });
      setMessage("User baru berhasil dibuat.");
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat user.");
    } finally {
      setBusyAction(null);
    }
  };

  const saveUserInfo = async (id: string) => {
    const draft = drafts[id];
    if (!draft) {
      return;
    }

    setBusyAction(`save:${id}`);
    setMessage(null);
    setError(null);
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

      setMessage("Informasi user berhasil diperbarui.");
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal update user.");
    } finally {
      setBusyAction(null);
    }
  };

  const changePassword = async (id: string) => {
    const draft = drafts[id];
    if (!draft) {
      return;
    }

    if (!draft.password || draft.password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (draft.password !== draft.confirmPassword) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    setBusyAction(`password:${id}`);
    setMessage(null);
    setError(null);
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

      setDrafts((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          password: "",
          confirmPassword: "",
        },
      }));
      setMessage("Password user berhasil diubah.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal ganti password.");
    } finally {
      setBusyAction(null);
    }
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm("Hapus user ini? Tindakan ini tidak bisa dibatalkan.")) {
      return;
    }

    setBusyAction(`delete:${id}`);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Gagal menghapus user.");
      }

      setMessage("User berhasil dihapus.");
      if (expandedUserId === id) {
        setExpandedUserId(null);
      }
      await refreshUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus user.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      {message ? (
        <div className="rounded-xl border border-rpb-border bg-white px-4 py-3 text-sm text-rpb-ink-soft">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rpb-section p-4">
        <h2 className="rpb-h-title mb-3 text-base font-semibold">Create User</h2>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={createUser}>
          <label className="md:col-span-3">
            <input
              className="rpb-input"
              type="email"
              placeholder="Email"
              value={createForm.email}
              onChange={(event) =>
                setCreateForm((value) => ({ ...value, email: event.target.value }))
              }
              required
            />
          </label>
          <label>
            <input
              className="rpb-input"
              type="text"
              placeholder="Nama user"
              value={createForm.username}
              onChange={(event) =>
                setCreateForm((value) => ({ ...value, username: event.target.value }))
              }
            />
          </label>
          <label>
            <input
              className="rpb-input"
              type="text"
              placeholder="Nama lengkap"
              value={createForm.fullName}
              onChange={(event) =>
                setCreateForm((value) => ({ ...value, fullName: event.target.value }))
              }
            />
          </label>
          <label>
            <input
              className="rpb-input"
              type="text"
              placeholder="Phone number"
              value={createForm.phoneNumber}
              onChange={(event) =>
                setCreateForm((value) => ({ ...value, phoneNumber: event.target.value }))
              }
            />
          </label>
          <label>
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
          <label className="md:col-span-2">
            <input
              className="rpb-input"
              type="password"
              placeholder="Password minimal 6 karakter"
              value={createForm.password}
              onChange={(event) =>
                setCreateForm((value) => ({ ...value, password: event.target.value }))
              }
              required
            />
          </label>
          <button
            type="submit"
            className="rpb-btn-primary inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold"
            disabled={busyAction === "create"}
          >
            <Plus size={15} />
            {busyAction === "create" ? "Membuat..." : "Create User"}
          </button>
        </form>
      </section>

      <section className="rpb-section p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="rpb-h-title text-base font-semibold">User Management</h2>
          <button
            type="button"
            className="rpb-btn-ghost px-3 py-2 text-xs font-semibold"
            onClick={() => void refreshUsers()}
            disabled={loading}
          >
            {loading ? "Memuat..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <p className="rpb-delayed-loader text-sm text-rpb-ink-soft">Memuat user...</p>
        ) : sortedUsers.length === 0 ? (
          <p className="text-sm text-rpb-ink-soft">Belum ada user terdaftar.</p>
        ) : (
          <div className="space-y-3">
            {sortedUsers.map((managedUser) => {
              const draft = drafts[managedUser.id];
              if (!draft) {
                return null;
              }

              const expanded = expandedUserId === managedUser.id;
              const isCurrentUser = managedUser.id === user?.id;

              return (
                <article key={managedUser.id} className="rounded-2xl border border-rpb-border bg-white">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-4 py-4 text-left"
                    onClick={() =>
                      setExpandedUserId((current) =>
                        current === managedUser.id ? null : managedUser.id,
                      )
                    }
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {managedUser.fullName || managedUser.username || managedUser.email}
                      </p>
                      <p className="truncate text-xs text-rpb-ink-soft">
                        {managedUser.email}
                      </p>
                      <p className="text-xs text-rpb-ink-soft">
                        Role: {managedUser.role.toUpperCase()} | Phone: {managedUser.phoneNumber || "-"}
                        {isCurrentUser ? " (Anda)" : ""}
                      </p>
                    </div>
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>

                  {expanded ? (
                    <div className="space-y-4 border-t border-rpb-border px-4 py-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
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
                        <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
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
                        <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
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
                        <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
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
                        <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
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

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
                          Password Baru
                          <input
                            className="rpb-input"
                            type="password"
                            value={draft.password}
                            onChange={(event) =>
                              updateDraft(managedUser.id, { password: event.target.value })
                            }
                            placeholder="Kosongkan jika tidak diubah"
                          />
                        </label>
                        <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
                          Konfirmasi Password
                          <input
                            className="rpb-input"
                            type="password"
                            value={draft.confirmPassword}
                            onChange={(event) =>
                              updateDraft(managedUser.id, {
                                confirmPassword: event.target.value,
                              })
                            }
                            placeholder="Ulangi password baru"
                          />
                        </label>
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

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rpb-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                          onClick={() => void saveUserInfo(managedUser.id)}
                          disabled={busyAction === `save:${managedUser.id}`}
                        >
                          <Save size={14} />
                          {busyAction === `save:${managedUser.id}` ? "Menyimpan..." : "Simpan Info"}
                        </button>
                        <button
                          type="button"
                          className="rpb-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                          onClick={() => void changePassword(managedUser.id)}
                          disabled={busyAction === `password:${managedUser.id}`}
                        >
                          <UserRound size={14} />
                          {busyAction === `password:${managedUser.id}`
                            ? "Memproses..."
                            : "Ganti Password"}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700"
                          onClick={() => void deleteUser(managedUser.id)}
                          disabled={busyAction === `delete:${managedUser.id}`}
                        >
                          <Trash2 size={14} />
                          {busyAction === `delete:${managedUser.id}` ? "Menghapus..." : "Hapus User"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
