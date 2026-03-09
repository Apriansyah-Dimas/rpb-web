"use client";

import { useAuthSession } from "@/hooks/use-auth-session";
import { Plus } from "lucide-react";
import Link from "next/link";
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

interface InlineNotice {
  tone: "success" | "error" | "info";
  text: string;
}

interface CreateFormState {
  email: string;
  username: string;
  fullName: string;
  phoneNumber: string;
  password: string;
  role: AdminRole;
}

const defaultCreateForm = (): CreateFormState => ({
  email: "",
  username: "",
  fullName: "",
  phoneNumber: "",
  password: "",
  role: "user",
});

const buildUserLabel = (user: Pick<ManagedUser, "fullName" | "username" | "email">): string =>
  user.fullName || user.username || user.email;

const normalizeEmail = (value: string): string =>
  value.trim().toLowerCase();

const normalizeUsernameInput = (value: string): string => {
  const noSpace = value.replace(/\s+/g, "");
  if (!noSpace) {
    return "";
  }
  return `${noSpace.charAt(0).toUpperCase()}${noSpace.slice(1).toLowerCase()}`;
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
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [listNotice, setListNotice] = useState<InlineNotice | null>(null);
  const [createNotice, setCreateNotice] = useState<InlineNotice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(() => defaultCreateForm());

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
        throw new Error(body.error || "Gagal memuat user.");
      }

      setUsers(body.users);
      return body.users;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memuat user.";
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
        text: "Diperbarui.",
      });
    } catch {
      // Error sudah ditangani di refreshUsers.
    }
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
        user?: { email?: string };
      };

      if (!response.ok) {
        throw new Error(body.error || "Gagal membuat user.");
      }

      const createdEmail = body.user?.email ?? normalizeEmail(createForm.email);
      setCreateForm(defaultCreateForm());
      setShowCreateModal(false);

      try {
        await refreshUsers();
        setListNotice({
          tone: "success",
          text: `${createdEmail} dibuat.`,
        });
      } catch {
        setListNotice({
          tone: "info",
          text: `${createdEmail} dibuat. Refresh list.`,
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

  return (
    <div className="space-y-4 p-4 md:p-6">
      <section className="rpb-section p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="rpb-h-title text-base font-semibold">User</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rpb-btn-primary inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold"
              onClick={() => {
                setCreateNotice(null);
                setShowCreateModal(true);
              }}
            >
              <Plus size={14} />
              Add User
            </button>
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
        <p className="text-xs text-rpb-ink-soft">{sortedUsers.length} user.</p>

        {listNotice ? (
          <div className={noticeClassName(listNotice.tone)} role={listNotice.tone === "error" ? "alert" : "status"}>
            {listNotice.text}
          </div>
        ) : null}

        {loading ? (
          <p className="rpb-delayed-loader mt-3 text-sm text-rpb-ink-soft">Memuat...</p>
        ) : sortedUsers.length === 0 ? (
          <p className="mt-3 text-sm text-rpb-ink-soft">Belum ada user.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {sortedUsers.map((managedUser) => {
              const isCurrentUser = managedUser.id === user?.id;

              return (
                <Link
                  key={managedUser.id}
                  href={`/admin/users/${managedUser.id}`}
                  className="block rounded-xl border border-rpb-border bg-white px-3 py-3 transition-colors hover:border-rpb-primary/45 hover:bg-rpb-primary-soft/40"
                >
                  <p className="truncate text-sm font-semibold text-foreground">
                    {buildUserLabel(managedUser)}
                  </p>
                  <p className="truncate text-xs text-rpb-ink-soft">{managedUser.email}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="rpb-chip px-2 py-0.5 text-[11px] font-semibold text-rpb-ink-soft">
                      {managedUser.role.toUpperCase()}
                    </span>
                    {isCurrentUser ? (
                      <span className="rounded-full bg-rpb-primary-soft px-2 py-0.5 text-[11px] font-semibold text-rpb-primary">
                        Anda
                      </span>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {showCreateModal ? (
        <div className="rpb-modal-backdrop fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#15172b]/45 p-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] backdrop-blur-[2px] md:items-center md:pb-6">
          <div className="rpb-modal-panel w-full max-w-lg overflow-hidden rounded-xl border border-rpb-border bg-white shadow-xl">
            <div className="border-b border-rpb-border px-4 py-3">
              <h3 className="rpb-h-title text-base font-semibold text-foreground">Add User</h3>
            </div>

            <form className="grid gap-3 px-4 py-4 md:grid-cols-2" onSubmit={createUser}>
              {createNotice ? (
                <div
                  className={`${noticeClassName(createNotice.tone)} md:col-span-2`}
                  role={createNotice.tone === "error" ? "alert" : "status"}
                >
                  {createNotice.text}
                </div>
              ) : null}

              <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft md:col-span-2">
                Email
                <input
                  className="rpb-input"
                  type="email"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((value) => ({ ...value, email: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
                Username
                <input
                  className="rpb-input"
                  type="text"
                  value={createForm.username}
                  onChange={(event) =>
                    setCreateForm((value) => ({
                      ...value,
                      username: normalizeUsernameInput(event.target.value),
                    }))
                  }
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
                  value={createForm.fullName}
                  onChange={(event) =>
                    setCreateForm((value) => ({ ...value, fullName: event.target.value }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft">
                Phone
                <input
                  className="rpb-input"
                  type="text"
                  value={createForm.phoneNumber}
                  onChange={(event) =>
                    setCreateForm((value) => ({ ...value, phoneNumber: event.target.value }))
                  }
                />
              </label>
              <fieldset className="flex flex-col gap-1 md:col-span-2">
                <legend className="text-sm font-semibold text-rpb-ink-soft">Role</legend>
                <div className="inline-flex w-fit items-center gap-1 rounded-2xl border border-rpb-border bg-[#f3f4f6] p-1">
                  <button
                    type="button"
                    className={`min-w-[84px] rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                      createForm.role === "user"
                        ? "border-[#d5dae4] bg-white text-[#0f2a55] shadow-sm"
                        : "border-transparent text-rpb-ink-soft hover:bg-white/80"
                    }`}
                    onClick={() => setCreateForm((value) => ({ ...value, role: "user" }))}
                    aria-pressed={createForm.role === "user"}
                  >
                    User
                  </button>
                  <button
                    type="button"
                    className={`min-w-[84px] rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
                      createForm.role === "admin"
                        ? "border-[#d5dae4] bg-white text-[#0f2a55] shadow-sm"
                        : "border-transparent text-rpb-ink-soft hover:bg-white/80"
                    }`}
                    onClick={() => setCreateForm((value) => ({ ...value, role: "admin" }))}
                    aria-pressed={createForm.role === "admin"}
                  >
                    Admin
                  </button>
                </div>
              </fieldset>
              <label className="flex flex-col gap-1 text-sm font-semibold text-rpb-ink-soft md:col-span-2">
                Password
                <input
                  className="rpb-input"
                  type="password"
                  value={createForm.password}
                  onChange={(event) =>
                    setCreateForm((value) => ({ ...value, password: event.target.value }))
                  }
                  required
                />
              </label>

              <div className="flex flex-wrap justify-end gap-2 border-t border-rpb-border pt-3 md:col-span-2">
                <button
                  type="button"
                  className="rpb-btn-ghost px-4 py-2 text-sm font-semibold"
                  onClick={() => {
                    if (busyAction === "create") {
                      return;
                    }
                    setCreateNotice(null);
                    setShowCreateModal(false);
                  }}
                  disabled={busyAction === "create"}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rpb-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                  disabled={busyAction === "create"}
                >
                  <Plus size={15} />
                  {busyAction === "create" ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
