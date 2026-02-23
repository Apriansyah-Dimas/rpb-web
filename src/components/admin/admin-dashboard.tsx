"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Plus, Save, UserPlus } from "lucide-react";
import { RpbUserActions } from "@/components/rpb-user-actions";
import { useRpbMasterData } from "@/hooks/use-rpb-master-data";
import {
  upsertKonstruksiMasterItem,
  upsertOtherMasterItem,
  upsertProfileMasterItem,
} from "@/lib/rpb-db";
import { validateFormulaExpression } from "@/lib/rpb-formula";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  KonstruksiMasterItem,
  OtherItem,
  ProfileMasterItem,
  StockCategory,
} from "@/types/rpb";

type AdminRole = "admin" | "user";
type AdminSection = "profile" | "konstruksi" | "other" | "users" | "security";

interface UserProfileRow {
  id: string;
  email: string;
  role: AdminRole;
  created_at: string | null;
}

const ADMIN_NAV_ITEMS: Array<{ key: AdminSection; label: string; description: string }> = [
  { key: "profile", label: "Profile", description: "Formula & harga profile" },
  { key: "konstruksi", label: "Konstruksi", description: "Formula & harga konstruksi" },
  { key: "other", label: "Other", description: "Master item permanen" },
  { key: "users", label: "User", description: "Buat akun & lihat user" },
  { key: "security", label: "Security", description: "Ganti password admin" },
];

const parseNumber = (value: string) => {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const newOtherDefault = {
  name: "",
  category: "Blower" as StockCategory,
  model: "-",
  unit: "pc",
  priceIdr: 0,
};

export function AdminDashboard() {
  const { data, loading, error, refresh } = useRpbMasterData();
  const [profileRows, setProfileRows] = useState<ProfileMasterItem[]>([]);
  const [konstruksiRows, setKonstruksiRows] = useState<KonstruksiMasterItem[]>([]);
  const [otherRows, setOtherRows] = useState<OtherItem[]>([]);
  const [newOther, setNewOther] = useState(newOtherDefault);
  const [users, setUsers] = useState<UserProfileRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userForm, setUserForm] = useState({ email: "", password: "", role: "user" as AdminRole });
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>("profile");

  useEffect(() => {
    if (!data) {
      return;
    }
    setProfileRows(data.profileItems.slice().sort((a, b) => a.sortOrder - b.sortOrder));
    setKonstruksiRows(data.konstruksiItems.slice().sort((a, b) => a.sortOrder - b.sortOrder));
    setOtherRows(data.otherItems.slice());
  }, [data]);

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: rows, error: selectError } = await supabase
        .from("user_profiles")
        .select("id, email, role, created_at")
        .order("created_at", { ascending: false });
      if (selectError) {
        throw selectError;
      }
      setUsers((rows ?? []) as UserProfileRow[]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal memuat user.");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const saveAllProfile = async () => {
    for (const row of profileRows) {
      const validation = validateFormulaExpression(row.formulaExpr);
      if (validation) {
        setMessage(`Formula PROFILE ${row.code} tidak valid: ${validation}`);
        return;
      }
    }

    setBusy("profile");
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      for (const row of profileRows) {
        await upsertProfileMasterItem(supabase, row);
      }
      setMessage("Master PROFILE berhasil disimpan.");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal simpan PROFILE.");
    } finally {
      setBusy(null);
    }
  };

  const saveAllKonstruksi = async () => {
    for (const row of konstruksiRows) {
      const validation = validateFormulaExpression(row.formulaExpr);
      if (validation) {
        setMessage(`Formula KONSTRUKSI ${row.code} tidak valid: ${validation}`);
        return;
      }
    }

    setBusy("konstruksi");
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      for (const row of konstruksiRows) {
        await upsertKonstruksiMasterItem(supabase, row);
      }
      setMessage("Master KONSTRUKSI berhasil disimpan.");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal simpan KONSTRUKSI.");
    } finally {
      setBusy(null);
    }
  };

  const saveOtherRow = async (row: OtherItem) => {
    setBusy(`other:${row.id}`);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await upsertOtherMasterItem(supabase, {
        id: row.id,
        name: row.name,
        category: row.category,
        model: row.model,
        unit: row.unit,
        priceIdr: row.priceIdr,
      });
      setMessage(`Other item ${row.name} disimpan.`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal simpan item other.");
    } finally {
      setBusy(null);
    }
  };

  const addOtherPermanent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newOther.name.trim()) {
      setMessage("Nama item other wajib diisi.");
      return;
    }

    setBusy("other:new");
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await upsertOtherMasterItem(supabase, {
        name: newOther.name.trim(),
        category: newOther.category,
        model: newOther.model.trim() || "-",
        unit: newOther.unit.trim() || "pc",
        priceIdr: Math.max(0, newOther.priceIdr),
      });
      setNewOther(newOtherDefault);
      setMessage("Other item permanen berhasil ditambahkan.");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal menambah other item.");
    } finally {
      setBusy(null);
    }
  };

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("create-user");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error || "Gagal membuat user.");
      }
      setUserForm({ email: "", password: "", role: "user" });
      setMessage("Akun user berhasil dibuat.");
      await loadUsers();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal membuat user.");
    } finally {
      setBusy(null);
    }
  };

  const changeOwnPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!passwordForm.password || passwordForm.password !== passwordForm.confirm) {
      setMessage("Password baru dan konfirmasi harus sama.");
      return;
    }

    setBusy("password");
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.password,
      });
      if (updateError) {
        throw updateError;
      }
      setPasswordForm({ password: "", confirm: "" });
      setMessage("Password berhasil diubah.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal ubah password.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1400px] p-4 md:px-8 md:py-5">
      <main className="rpb-shell overflow-hidden">
        <header className="rpb-topbar flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-white md:px-6">
          <div>
            <h1 className="rpb-h-title text-xl font-semibold md:text-2xl">Admin Panel</h1>
            <p className="text-xs text-white/85">Master data, formula, user management</p>
          </div>
          <RpbUserActions />
        </header>

        <div className="space-y-4 p-4 md:p-6">
          {loading ? <div className="rpb-section p-4 text-sm text-rpb-ink-soft">Memuat data master...</div> : null}
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {message ? <div className="rounded-xl border border-rpb-border bg-white px-4 py-3 text-sm text-rpb-ink-soft">{message}</div> : null}

          <nav className="rpb-section p-2">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {ADMIN_NAV_ITEMS.map((item) => {
                const isActive = activeSection === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`rounded-xl border px-3 py-2 text-left transition ${
                      isActive
                        ? "border-rpb-primary bg-rpb-primary text-white"
                        : "border-rpb-border bg-white text-foreground hover:border-rpb-primary/40"
                    }`}
                    onClick={() => setActiveSection(item.key)}
                    aria-pressed={isActive}
                  >
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className={`text-[11px] ${isActive ? "text-white/85" : "text-rpb-ink-soft"}`}>
                      {item.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </nav>

          {activeSection === "profile" ? (
          <section className="rpb-section p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="rpb-h-title text-base font-semibold">PROFILE (fixed items)</h2>
              <button type="button" className="rpb-btn-primary px-4 py-2 text-sm font-semibold" onClick={() => void saveAllProfile()} disabled={busy === "profile"}>
                {busy === "profile" ? "Menyimpan..." : "Simpan Semua PROFILE"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="rpb-table min-w-[1180px] w-full text-sm">
                <thead>
                  <tr>
                    <th>Code</th><th>Name</th><th>Unit</th><th>Formula Qty</th><th>Harga 30 (Rp)</th><th>Harga 45 (Rp)</th><th>Aktif (Tampil)</th>
                  </tr>
                </thead>
                <tbody>
                  {profileRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.code}</td>
                      <td>{row.name}</td>
                      <td>{row.unit}</td>
                      <td>
                        <input
                          className="rpb-input min-w-[320px]"
                          value={row.formulaExpr}
                          onChange={(event) =>
                            setProfileRows((list) => list.map((item) => item.id === row.id ? { ...item, formulaExpr: event.target.value } : item))
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="rpb-input min-w-[110px]"
                          type="number"
                          step="any"
                          value={row.priceIdr30}
                          onChange={(event) =>
                            setProfileRows((list) => list.map((item) => item.id === row.id ? { ...item, priceIdr30: parseNumber(event.target.value) } : item))
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="rpb-input min-w-[110px]"
                          type="number"
                          step="any"
                          value={row.priceIdr45}
                          onChange={(event) =>
                            setProfileRows((list) => list.map((item) => item.id === row.id ? { ...item, priceIdr45: parseNumber(event.target.value) } : item))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={row.isActive}
                          onChange={(event) =>
                            setProfileRows((list) => list.map((item) => item.id === row.id ? { ...item, isActive: event.target.checked } : item))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-rpb-ink-soft">Support formula: operator matematika, kurung, `10%`, fungsi `ROUND`, `CEIL`, `FLOOR`, `PCT/PERSEN`.</p>
          </section>
          ) : null}

          {activeSection === "konstruksi" ? (
          <section className="rpb-section p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="rpb-h-title text-base font-semibold">KONSTRUKSI (fixed items)</h2>
              <button type="button" className="rpb-btn-primary px-4 py-2 text-sm font-semibold" onClick={() => void saveAllKonstruksi()} disabled={busy === "konstruksi"}>
                {busy === "konstruksi" ? "Menyimpan..." : "Simpan Semua KONSTRUKSI"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="rpb-table min-w-[1080px] w-full text-sm">
                <thead>
                  <tr>
                    <th>Code</th><th>Name</th><th>Unit</th><th>Formula Qty</th><th>Harga Satuan (Rp)</th><th>Aktif (Tampil)</th>
                  </tr>
                </thead>
                <tbody>
                  {konstruksiRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.code}</td>
                      <td>{row.name}</td>
                      <td>{row.unit}</td>
                      <td>
                        <input
                          className="rpb-input min-w-[360px]"
                          value={row.formulaExpr}
                          onChange={(event) =>
                            setKonstruksiRows((list) => list.map((item) => item.id === row.id ? { ...item, formulaExpr: event.target.value } : item))
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="rpb-input min-w-[140px]"
                          type="number"
                          step="any"
                          value={row.unitPriceIdr}
                          onChange={(event) =>
                            setKonstruksiRows((list) => list.map((item) => item.id === row.id ? { ...item, unitPriceIdr: parseNumber(event.target.value) } : item))
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={row.isActive}
                          onChange={(event) =>
                            setKonstruksiRows((list) => list.map((item) => item.id === row.id ? { ...item, isActive: event.target.checked } : item))
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          ) : null}

          {activeSection === "other" ? (
          <section className="rpb-section p-4">
            <h2 className="rpb-h-title mb-3 text-base font-semibold">OTHER (permanen)</h2>
            <form className="mb-4 grid gap-3 md:grid-cols-6" onSubmit={addOtherPermanent}>
              <input className="rpb-input md:col-span-2" placeholder="Name" value={newOther.name} onChange={(e) => setNewOther((v) => ({ ...v, name: e.target.value }))} />
              <select className="rpb-input" value={newOther.category} onChange={(e) => setNewOther((v) => ({ ...v, category: e.target.value as StockCategory }))}>
                <option value="Blower">Blower</option><option value="Motor">Motor</option><option value="Rotor">Rotor</option>
              </select>
              <input className="rpb-input" placeholder="Model" value={newOther.model} onChange={(e) => setNewOther((v) => ({ ...v, model: e.target.value }))} />
              <input className="rpb-input" placeholder="Unit" value={newOther.unit} onChange={(e) => setNewOther((v) => ({ ...v, unit: e.target.value }))} />
              <div className="flex gap-2">
                <input className="rpb-input" type="number" step="any" placeholder="Harga (Rp)" value={newOther.priceIdr} onChange={(e) => setNewOther((v) => ({ ...v, priceIdr: parseNumber(e.target.value) }))} />
                <button type="submit" className="rpb-btn-primary inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold" disabled={busy === "other:new"}>
                  <Plus size={14} />{busy === "other:new" ? "..." : "Tambah"}
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="rpb-table min-w-[980px] w-full text-sm">
                <thead>
                  <tr>
                    <th>Category</th><th>Name</th><th>Model</th><th>Unit</th><th>Harga (Rp)</th><th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {otherRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <select className="rpb-input min-w-[120px]" value={row.category} onChange={(e) => setOtherRows((list) => list.map((x) => x.id === row.id ? { ...x, category: e.target.value as StockCategory } : x))}>
                          <option value="Blower">Blower</option><option value="Motor">Motor</option><option value="Rotor">Rotor</option>
                        </select>
                      </td>
                      <td><input className="rpb-input min-w-[180px]" value={row.name} onChange={(e) => setOtherRows((list) => list.map((x) => x.id === row.id ? { ...x, name: e.target.value } : x))} /></td>
                      <td><input className="rpb-input min-w-[220px]" value={row.model} onChange={(e) => setOtherRows((list) => list.map((x) => x.id === row.id ? { ...x, model: e.target.value } : x))} /></td>
                      <td><input className="rpb-input min-w-[90px]" value={row.unit} onChange={(e) => setOtherRows((list) => list.map((x) => x.id === row.id ? { ...x, unit: e.target.value } : x))} /></td>
                      <td><input className="rpb-input min-w-[120px]" type="number" step="any" value={row.priceIdr} onChange={(e) => setOtherRows((list) => list.map((x) => x.id === row.id ? { ...x, priceIdr: parseNumber(e.target.value) } : x))} /></td>
                      <td>
                        <button type="button" className="rpb-btn-primary px-3 py-2 text-xs font-semibold" onClick={() => void saveOtherRow(row)} disabled={busy === `other:${row.id}`}>
                          {busy === `other:${row.id}` ? "..." : "Simpan"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          ) : null}

          {activeSection === "users" ? (
          <section className="rpb-section p-4">
              <h2 className="rpb-h-title mb-3 text-base font-semibold">Buat User (Admin only)</h2>
              <form className="grid gap-3 md:grid-cols-2" onSubmit={createUser}>
                <input className="rpb-input md:col-span-2" type="email" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm((v) => ({ ...v, email: e.target.value }))} required />
                <input className="rpb-input" type="password" placeholder="Password" value={userForm.password} onChange={(e) => setUserForm((v) => ({ ...v, password: e.target.value }))} required />
                <select className="rpb-input" value={userForm.role} onChange={(e) => setUserForm((v) => ({ ...v, role: e.target.value as AdminRole }))}>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
                <button type="submit" className="rpb-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold md:col-span-2" disabled={busy === "create-user"}>
                  <UserPlus size={14} />{busy === "create-user" ? "Membuat..." : "Buat Akun"}
                </button>
              </form>

              <div className="mt-4 overflow-x-auto">
                <table className="rpb-table min-w-[480px] w-full text-sm">
                  <thead><tr><th>Email</th><th>Role</th><th>Created</th></tr></thead>
                  <tbody>
                    {usersLoading ? (
                      <tr><td colSpan={3}>Memuat user...</td></tr>
                    ) : users.length === 0 ? (
                      <tr><td colSpan={3}>Belum ada user.</td></tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.email}</td>
                          <td className="font-semibold uppercase">{user.role}</td>
                          <td>{user.created_at ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(user.created_at)) : "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
          </section>
          ) : null}

          {activeSection === "security" ? (
          <section className="rpb-section p-4">
              <h2 className="rpb-h-title mb-3 text-base font-semibold">Ganti Password Saya</h2>
              <form className="space-y-3" onSubmit={changeOwnPassword}>
                <input className="rpb-input" type="password" placeholder="Password baru" value={passwordForm.password} onChange={(e) => setPasswordForm((v) => ({ ...v, password: e.target.value }))} required />
                <input className="rpb-input" type="password" placeholder="Konfirmasi password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((v) => ({ ...v, confirm: e.target.value }))} required />
                <button type="submit" className="rpb-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold" disabled={busy === "password"}>
                  <Save size={14} />{busy === "password" ? "Menyimpan..." : "Ubah Password"}
                </button>
              </form>
          </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
