import React, { useState } from "react";
import { Plus, Trash2, Save, UserPlus, Key, CheckCircle } from "lucide-react";
import { Layout } from "../components/Layout";
import { useAppStore } from "../store/useAppStore";
import {
  getProfileItems,
  saveProfileItems,
  getKonstruksiItems,
  saveKonstruksiItems,
  getOtherMasterItems,
  saveOtherMasterItems,
  getUsers,
  saveUsers,
  saveSession,
} from "../lib/storage";
import type { MasterItem, OtherMasterItem, AppUser } from "../data/masterData";
import { formatRupiah } from "../lib/formulaEval";
import { useNavigate } from "react-router";

type Tab = "profile" | "konstruksi" | "others" | "users" | "password";

const TABS: { key: Tab; label: string }[] = [
  { key: "profile", label: "Master Profile" },
  { key: "konstruksi", label: "Master Konstruksi" },
  { key: "others", label: "Item Lainnya" },
  { key: "users", label: "Kelola User" },
  { key: "password", label: "Ubah Password" },
];

function MasterItemEditor({
  items: initItems,
  onSave,
}: {
  items: MasterItem[];
  onSave: (items: MasterItem[]) => void;
}) {
  const [items, setItems] = useState<MasterItem[]>(initItems);
  const [saved, setSaved] = useState(false);

  const update = (id: string, field: keyof MasterItem, val: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: val } : item)));
  };

  const addItem = () => {
    const newItem: MasterItem = {
      id: `new_${Date.now()}`,
      name: "",
      unit: "m",
      formula: "0",
      unitPrice: 0,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const handleSave = () => {
    onSave(items);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm mb-4">
          <thead>
            <tr style={{ backgroundColor: "#f4f4fb" }}>
              <th className="px-4 py-2.5 text-left text-xs text-gray-500 uppercase tracking-wider rounded-l-xl" style={{ fontWeight: 600 }}>Nama Item</th>
              <th className="px-4 py-2.5 text-left text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Satuan</th>
              <th className="px-4 py-2.5 text-left text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Formula (L,W,H,T)</th>
              <th className="px-4 py-2.5 text-left text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Harga / Sat (Rp)</th>
              <th className="px-4 py-2.5 rounded-r-xl"></th>
            </tr>
          </thead>
          <tbody className="space-y-2">
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-50">
                <td className="px-2 py-2">
                  <input
                    value={item.name}
                    onChange={(e) => update(item.id, "name", e.target.value)}
                    placeholder="Nama item"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={item.unit}
                    onChange={(e) => update(item.id, "unit", e.target.value)}
                    placeholder="m"
                    className="w-20 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={item.formula}
                    onChange={(e) => update(item.id, "formula", e.target.value)}
                    placeholder="2*(L+W)*H/1000000"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
                    style={{ fontFamily: "monospace" }}
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    value={item.unitPrice}
                    min={0}
                    onChange={(e) =>
                      update(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                    }
                    className="w-32 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={addItem}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
        >
          <Plus size={15} />
          Tambah Item
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-white transition-all"
          style={{ backgroundColor: saved ? "#059669" : "#6365b9", fontWeight: 600 }}
        >
          {saved ? <CheckCircle size={15} /> : <Save size={15} />}
          {saved ? "Tersimpan!" : "Simpan Perubahan"}
        </button>
      </div>

      {/* Formula hint */}
      <div
        className="mt-4 rounded-xl px-4 py-3 text-xs"
        style={{ backgroundColor: "#f4f4fb", color: "#6365b9" }}
      >
        <strong>Variabel formula:</strong> L = Panjang (mm), W = Lebar (mm), H = Tinggi (mm), T = Tebal Panel (mm).<br />
        Gunakan ekspresi JavaScript: contoh{" "}
        <code
          className="bg-indigo-100 px-1.5 py-0.5 rounded"
          style={{ fontFamily: "monospace" }}
        >
          2*(L+W)*H/1000000
        </code>{" "}
        atau{" "}
        <code
          className="bg-indigo-100 px-1.5 py-0.5 rounded"
          style={{ fontFamily: "monospace" }}
        >
          Math.ceil(2*(L+W)/500)
        </code>
      </div>
    </div>
  );
}

function OtherItemsEditor({
  items: initItems,
  onSave,
}: {
  items: OtherMasterItem[];
  onSave: (items: OtherMasterItem[]) => void;
}) {
  const [items, setItems] = useState<OtherMasterItem[]>(initItems);
  const [saved, setSaved] = useState(false);

  const update = (id: string, field: keyof OtherMasterItem, val: string | number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: val } : item)));
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: `o_${Date.now()}`, name: "", unit: "unit", unitPrice: 0 },
    ]);
  };

  const removeItem = (id: string) => setItems(items.filter((i) => i.id !== id));

  const handleSave = () => {
    onSave(items);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm mb-4">
          <thead>
            <tr style={{ backgroundColor: "#f4f4fb" }}>
              <th className="px-4 py-2.5 text-left text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Nama Item</th>
              <th className="px-4 py-2.5 text-left text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Satuan</th>
              <th className="px-4 py-2.5 text-left text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>Harga Satuan</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-50">
                <td className="px-2 py-2">
                  <input
                    value={item.name}
                    onChange={(e) => update(item.id, "name", e.target.value)}
                    placeholder="Nama item"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={item.unit}
                    onChange={(e) => update(item.id, "unit", e.target.value)}
                    className="w-20 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    value={item.unitPrice}
                    min={0}
                    onChange={(e) =>
                      update(item.id, "unitPrice", parseFloat(e.target.value) || 0)
                    }
                    className="w-36 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
                  />
                </td>
                <td className="px-2 py-2">
                  <button
                    onClick={() => removeItem(item.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <button
          onClick={addItem}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
        >
          <Plus size={15} />
          Tambah Item
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-white transition-all"
          style={{ backgroundColor: saved ? "#059669" : "#6365b9", fontWeight: 600 }}
        >
          {saved ? <CheckCircle size={15} /> : <Save size={15} />}
          {saved ? "Tersimpan!" : "Simpan"}
        </button>
      </div>
    </div>
  );
}

function UsersManager() {
  const [users, setUsers] = useState<AppUser[]>(getUsers());
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [saved, setSaved] = useState(false);

  const addUser = () => {
    if (!newEmail || !newPw || !newName) return;
    const user: AppUser = {
      id: `u_${Date.now()}`,
      email: newEmail.trim(),
      password: newPw,
      role: newRole,
      name: newName.trim(),
    };
    const updated = [...users, user];
    setUsers(updated);
    saveUsers(updated);
    setNewEmail(""); setNewPw(""); setNewName("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const removeUser = (id: string) => {
    const updated = users.filter((u) => u.id !== id);
    setUsers(updated);
    saveUsers(updated);
  };

  return (
    <div>
      {/* Add user form */}
      <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-100">
        <h3 className="text-gray-800 mb-4 flex items-center gap-2" style={{ fontWeight: 700 }}>
          <UserPlus size={17} color="#6365b9" />
          Tambah User Baru
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            placeholder="Nama lengkap"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
          />
          <input
            type="email"
            placeholder="Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
          />
          <input
            type="password"
            placeholder="Password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as "admin" | "user")}
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          onClick={addUser}
          disabled={!newEmail || !newPw || !newName}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-white transition-all disabled:opacity-40"
          style={{ backgroundColor: saved ? "#059669" : "#6365b9", fontWeight: 600 }}
        >
          {saved ? <CheckCircle size={15} /> : <UserPlus size={15} />}
          {saved ? "User Ditambahkan!" : "Tambah User"}
        </button>
      </div>

      {/* User list */}
      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between px-5 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm"
                style={{ backgroundColor: "#6365b9", fontWeight: 700 }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-gray-800" style={{ fontWeight: 600 }}>
                  {user.name}
                </p>
                <p className="text-gray-400 text-xs">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-xs px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: user.role === "admin" ? "#fef3c7" : "#ededfb",
                  color: user.role === "admin" ? "#d97706" : "#6365b9",
                  fontWeight: 600,
                }}
              >
                {user.role === "admin" ? "Admin" : "User"}
              </span>
              <button
                onClick={() => removeUser(user.id)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PasswordChange() {
  const { currentUser, setCurrentUser } = useAppStore();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = () => {
    setError("");
    if (!currentUser) return;
    if (currentPw !== currentUser.password) {
      setError("Password saat ini salah.");
      return;
    }
    if (newPw.length < 6) {
      setError("Password baru minimal 6 karakter.");
      return;
    }
    if (newPw !== confirmPw) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    const users = getUsers();
    const updated = users.map((u) =>
      u.id === currentUser.id ? { ...u, password: newPw } : u
    );
    saveUsers(updated);
    const updatedUser = { ...currentUser, password: newPw };
    saveSession(updatedUser);
    setCurrentUser(updatedUser);
    setSuccess(true);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="max-w-md">
      <div className="space-y-4">
        {[
          { label: "Password Saat Ini", val: currentPw, set: setCurrentPw },
          { label: "Password Baru", val: newPw, set: setNewPw },
          { label: "Konfirmasi Password Baru", val: confirmPw, set: setConfirmPw },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <label className="block text-sm text-gray-700 mb-1.5" style={{ fontWeight: 600 }}>
              {label}
            </label>
            <input
              type="password"
              value={val}
              onChange={(e) => set(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all"
            />
          </div>
        ))}

        {error && (
          <div className="text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleChange}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm text-white transition-all"
          style={{ backgroundColor: success ? "#059669" : "#6365b9", fontWeight: 600 }}
        >
          {success ? <CheckCircle size={15} /> : <Key size={15} />}
          {success ? "Password Berhasil Diubah!" : "Ubah Password"}
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { currentUser } = useAppStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  if (currentUser?.role !== "admin") {
    return (
      <Layout title="Admin Panel">
        <div className="text-center py-20">
          <p className="text-red-500" style={{ fontWeight: 600 }}>
            Akses ditolak. Hanya Admin yang dapat mengakses halaman ini.
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 px-5 py-2.5 rounded-xl text-white text-sm"
            style={{ backgroundColor: "#6365b9", fontWeight: 600 }}
          >
            Kembali ke Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Admin Panel" subtitle="Kelola master data, user, dan pengaturan sistem">
      <div className="max-w-5xl mx-auto">

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="px-4 py-2.5 rounded-xl text-sm transition-all"
              style={
                activeTab === key
                  ? { backgroundColor: "#6365b9", color: "#fff", fontWeight: 700 }
                  : { backgroundColor: "#fff", color: "#6b7280", border: "1px solid #e5e7eb", fontWeight: 500 }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {activeTab === "profile" && (
            <>
              <h2 className="text-gray-800 mb-5" style={{ fontWeight: 700 }}>
                Master Data — Profile
              </h2>
              <MasterItemEditor
                items={getProfileItems()}
                onSave={(items) => saveProfileItems(items)}
              />
            </>
          )}

          {activeTab === "konstruksi" && (
            <>
              <h2 className="text-gray-800 mb-5" style={{ fontWeight: 700 }}>
                Master Data — Konstruksi
              </h2>
              <MasterItemEditor
                items={getKonstruksiItems()}
                onSave={(items) => saveKonstruksiItems(items)}
              />
            </>
          )}

          {activeTab === "others" && (
            <>
              <h2 className="text-gray-800 mb-5" style={{ fontWeight: 700 }}>
                Master Data — Item Lainnya (Blower, Motor, dll.)
              </h2>
              <OtherItemsEditor
                items={getOtherMasterItems()}
                onSave={(items) => saveOtherMasterItems(items)}
              />
            </>
          )}

          {activeTab === "users" && (
            <>
              <h2 className="text-gray-800 mb-5" style={{ fontWeight: 700 }}>
                Kelola User
              </h2>
              <UsersManager />
            </>
          )}

          {activeTab === "password" && (
            <>
              <h2 className="text-gray-800 mb-5 flex items-center gap-2" style={{ fontWeight: 700 }}>
                <Key size={18} color="#6365b9" />
                Ubah Password Admin
              </h2>
              <PasswordChange />
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
