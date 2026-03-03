"use client";

import type { TextareaHTMLAttributes } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useRpbMasterData } from "@/hooks/use-rpb-master-data";
import {
  deleteFormulaVariableSetting,
  upsertFormulaVariableSetting,
  upsertKonstruksiMasterItem,
  upsertOtherMasterItem,
  upsertProfileMasterItem,
} from "@/lib/rpb-db";
import { validateFormulaExpression } from "@/lib/rpb-formula";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  FormulaVariableSection,
  FormulaVariableSetting,
  KonstruksiMasterItem,
  OtherItem,
  ProfileMasterItem,
} from "@/types/rpb";

type ConfigSection = "profile" | "konstruksi" | "other";

const CONFIG_NAV_ITEMS: Array<{
  key: ConfigSection;
  label: string;
  description: string;
}> = [
  { key: "profile", label: "Profile", description: "Formula qty + harga panel 30/45" },
  { key: "konstruksi", label: "Konstruksi", description: "Formula qty + harga satuan" },
  { key: "other", label: "Other", description: "Master item tambahan permanen" },
];

const IDR_INPUT_FORMATTER = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

const formatIdrInput = (value: number) =>
  IDR_INPUT_FORMATTER.format(Number.isFinite(value) ? Math.max(0, value) : 0);

const parseIdrInput = (value: string) => {
  const digitsOnly = value.replace(/[^\d]/g, "");
  if (!digitsOnly) {
    return 0;
  }

  const parsed = Number.parseInt(digitsOnly, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseDecimalInput = (value: string) => {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const OTHER_CATEGORY_DATALIST_ID = "other-category-options";

const toVariableKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "");

const newOtherDefault = {
  name: "",
  category: "",
  model: "",
  unit: "",
  priceIdr: 0,
};

function FormulaHelpBox() {
  const functionDescriptions = [
    { name: "ROUND(x, digit)", desc: "Membulatkan nilai ke jumlah desimal tertentu." },
    { name: "CEIL(x)", desc: "Membulatkan ke atas ke bilangan bulat terdekat." },
    { name: "FLOOR(x)", desc: "Membulatkan ke bawah ke bilangan bulat terdekat." },
    { name: "ABS(x)", desc: "Mengubah nilai negatif menjadi positif." },
    { name: "MIN(a,b,...)", desc: "Mengambil nilai paling kecil." },
    { name: "MAX(a,b,...)", desc: "Mengambil nilai paling besar." },
    { name: "PCT(base,persen)", desc: "Menghitung persentase dari nilai dasar." },
    { name: "PERSEN(base,persen)", desc: "Sama seperti PCT, alias bahasa Indonesia." },
  ];

  return (
    <div className="mt-3 rounded-xl border border-rpb-border bg-[#fbfbff] p-3 text-xs text-rpb-ink-soft">
      <p className="font-semibold text-foreground">Fungsi Formula yang didukung</p>
      <p className="mt-1">
        Operator: <span className="font-mono">+, -, *, /, ^</span>, kurung, dan literal persen
        seperti <span className="font-mono">10%</span>.
      </p>
      <p className="mt-1">
        Variabel yang bisa dipakai: <span className="font-mono">width</span>,{" "}
        <span className="font-mono">length</span>, <span className="font-mono">height</span>,{" "}
        <span className="font-mono">panel_thickness</span>, dan kode item sebelumnya.
      </p>
      <div className="mt-2 space-y-1">
        {functionDescriptions.map((item) => (
          <p key={item.name}>
            <span className="font-mono text-foreground">{item.name}</span>
            {" - "}
            {item.desc}
          </p>
        ))}
      </div>
      <p className="mt-2 font-mono text-[11px]">Contoh: ROUND(((width * length) / 1000000), 2)</p>
    </div>
  );
}

function AutoSizeFormulaTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const value = typeof props.value === "string" ? props.value : "";

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 40)}px`;
  }, [value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      rows={1}
      className={`${props.className ?? ""} resize-none overflow-hidden`.trim()}
    />
  );
}

function VariableSettingsCard({
  section,
  rows,
  busy,
  onChange,
  onSave,
  onDelete,
  onAdd,
}: {
  section: FormulaVariableSection;
  rows: FormulaVariableSetting[];
  busy: string | null;
  onChange: (id: string, patch: Partial<FormulaVariableSetting>) => void;
  onSave: (row: FormulaVariableSetting) => Promise<void>;
  onDelete: (row: FormulaVariableSetting) => Promise<void>;
  onAdd: () => void;
}) {
  const title = section === "profile" ? "Variable Setting Profile" : "Variable Setting Konstruksi";
  const defaultRows = rows.filter((row) => row.isDefault);
  const customRows = rows.filter((row) => !row.isDefault);

  return (
    <div className="mt-4 rounded-xl border border-rpb-border bg-white p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <button
          type="button"
          className="rpb-btn-ghost inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold"
          onClick={onAdd}
        >
          <Plus size={14} />
          Variabel
        </button>
      </div>

      <div className="rounded-lg border border-rpb-border bg-[#fcfcff] p-2.5">
        <p className="text-xs font-semibold text-rpb-ink-soft">Variabel Default (read-only)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {defaultRows.map((row) => (
            <span
              key={row.id}
              className="inline-flex items-center rounded-full border border-rpb-border bg-white px-3 py-1 text-xs font-semibold text-foreground"
            >
              {row.label}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-rpb-ink-soft">
          Diambil dari input user pada halaman utama.
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {customRows.map((row) => {
          const rowBusyKey = `variable:${row.id}`;
          const deleteBusyKey = `variable:delete:${row.id}`;

          return (
            <div key={row.id} className="rounded-lg border border-rpb-border bg-[#fcfcff] p-2.5">
              <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_120px_auto]">
                <input
                  className="rpb-input"
                  placeholder="Nama Variabel"
                  value={row.label}
                  onChange={(event) => {
                    const label = event.target.value;
                    onChange(row.id, { label, key: toVariableKey(label) });
                  }}
                />
                <input
                  className="rpb-input"
                  type="number"
                  step="any"
                  value={row.defaultValue}
                  onChange={(event) => onChange(row.id, { defaultValue: parseDecimalInput(event.target.value) })}
                />
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    className="rpb-btn-primary px-3 py-2 text-xs font-semibold"
                    onClick={() => void onSave(row)}
                    disabled={busy === rowBusyKey}
                  >
                    {busy === rowBusyKey ? "..." : "Simpan"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600"
                    onClick={() => void onDelete(row)}
                    disabled={busy === deleteBusyKey}
                    aria-label={`Hapus variabel ${row.label || row.key}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-rpb-ink-soft">
                Nama variabel tidak boleh mengandung spasi.
              </p>
            </div>
          );
        })}
        {customRows.length === 0 ? (
          <p className="text-xs text-rpb-ink-soft">Belum ada variabel custom. Tambah lewat tombol `+ Variabel`.</p>
        ) : null}
      </div>
    </div>
  );
}

export function AdminConfigPanel() {
  const { data, loading, error, refresh } = useRpbMasterData();
  const [profileRows, setProfileRows] = useState<ProfileMasterItem[]>([]);
  const [konstruksiRows, setKonstruksiRows] = useState<KonstruksiMasterItem[]>([]);
  const [otherRows, setOtherRows] = useState<OtherItem[]>([]);
  const [variableRows, setVariableRows] = useState<FormulaVariableSetting[]>([]);
  const [newOther, setNewOther] = useState(newOtherDefault);
  const [isOtherModalOpen, setIsOtherModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<ConfigSection>("profile");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      return;
    }
    setProfileRows((data.profileItems ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder));
    setKonstruksiRows((data.konstruksiItems ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder));
    setOtherRows((data.otherItems ?? []).slice());
    setVariableRows((data.formulaVariables ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder));
  }, [data]);

  const profileVariables = useMemo(
    () => variableRows.filter((row) => row.section === "profile").sort((a, b) => a.sortOrder - b.sortOrder),
    [variableRows],
  );
  const konstruksiVariables = useMemo(
    () =>
      variableRows.filter((row) => row.section === "konstruksi").sort((a, b) => a.sortOrder - b.sortOrder),
    [variableRows],
  );
  const otherCategoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          otherRows
            .map((row) => row.category.trim())
            .filter((category) => category.length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [otherRows],
  );

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
      setMessage("Konfigurasi PROFILE berhasil disimpan.");
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
      setMessage("Konfigurasi KONSTRUKSI berhasil disimpan.");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal simpan KONSTRUKSI.");
    } finally {
      setBusy(null);
    }
  };

  const saveVariable = async (row: FormulaVariableSetting) => {
    const label = row.label.trim();
    if (!label) {
      setMessage("Nama variabel wajib diisi.");
      return;
    }
    if (/\s/.test(label)) {
      setMessage("Nama variabel tidak boleh mengandung spasi.");
      return;
    }
    const normalizedKey = toVariableKey(label);
    if (!normalizedKey) {
      setMessage("Nama variabel harus berisi huruf/angka yang valid.");
      return;
    }

    setBusy(`variable:${row.id}`);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await upsertFormulaVariableSetting(supabase, {
        id: row.id.startsWith("temp-") ? undefined : row.id,
        section: row.section,
        key: normalizedKey,
        label,
        defaultValue: row.defaultValue,
        isDefault: row.isDefault,
        sortOrder: row.sortOrder,
      });
      setMessage(`Variabel ${row.label} berhasil disimpan.`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal simpan variabel.");
    } finally {
      setBusy(null);
    }
  };

  const deleteVariable = async (row: FormulaVariableSetting) => {
    if (row.isDefault) {
      setMessage("Variabel default tidak bisa dihapus.");
      return;
    }

    if (row.id.startsWith("temp-")) {
      setVariableRows((list) => list.filter((item) => item.id !== row.id));
      return;
    }

    setBusy(`variable:delete:${row.id}`);
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await deleteFormulaVariableSetting(supabase, row.id);
      setMessage(`Variabel ${row.label} berhasil dihapus.`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal hapus variabel.");
    } finally {
      setBusy(null);
    }
  };

  const addVariable = (section: FormulaVariableSection) => {
    const nextOrder =
      Math.max(0, ...variableRows.filter((row) => row.section === section).map((row) => row.sortOrder)) + 1;
    setVariableRows((list) => [
      ...list,
      {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        section,
        key: "",
        label: "",
        defaultValue: 0,
        isDefault: false,
        sortOrder: nextOrder,
      },
    ]);
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
      setMessage(`Item ${row.name} berhasil disimpan.`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal simpan item other.");
    } finally {
      setBusy(null);
    }
  };

  const addOtherPermanent = async () => {
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
        category: newOther.category.trim() || "Other",
        model: newOther.model.trim() || "-",
        unit: newOther.unit.trim() || "pc",
        priceIdr: Math.max(0, newOther.priceIdr),
      });
      setNewOther(newOtherDefault);
      setIsOtherModalOpen(false);
      setMessage("Item other permanen berhasil ditambahkan.");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal menambah item other.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4 p-3 md:p-6">
      {loading ? <div className="rpb-section p-4 text-sm text-rpb-ink-soft">Memuat data master...</div> : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-rpb-border bg-white px-4 py-3 text-sm text-rpb-ink-soft">
          {message}
        </div>
      ) : null}

      <nav className="rpb-section p-2">
        <div className="overflow-x-auto">
          <div className="inline-flex min-w-full rounded-xl border border-rpb-border bg-[#f6f7ff] p-1">
            {CONFIG_NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`flex-1 rounded-lg px-3 py-2 text-left transition ${
                    isActive ? "bg-rpb-primary text-white" : "text-rpb-ink-soft hover:text-rpb-primary"
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
        </div>
      </nav>

      {activeSection === "profile" ? (
        <section className="rpb-section p-3 md:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="rpb-h-title text-base font-semibold">PROFILE</h2>
            <button
              type="button"
              className="rpb-btn-primary px-4 py-2 text-sm font-semibold"
              onClick={() => void saveAllProfile()}
              disabled={busy === "profile"}
            >
              {busy === "profile" ? "Menyimpan..." : "Simpan Semua"}
            </button>
          </div>

          <div className="space-y-2 md:hidden">
            {profileRows.map((row) => (
              <article key={row.id} className="rounded-xl border border-rpb-border p-3">
                <p className="text-xs text-rpb-ink-soft">{row.code}</p>
                <p className="text-sm font-semibold">{row.name}</p>
                <p className="text-xs text-rpb-ink-soft">Unit: {row.unit}</p>
                <label className="mt-2 block text-xs font-semibold text-rpb-ink-soft">
                  Formula Qty
                  <AutoSizeFormulaTextarea
                    className="rpb-input mt-1 whitespace-pre-wrap break-words font-mono"
                    value={row.formulaExpr}
                    onChange={(event) =>
                      setProfileRows((list) =>
                        list.map((item) => (item.id === row.id ? { ...item, formulaExpr: event.target.value } : item)),
                      )
                    }
                  />
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="text-xs font-semibold text-rpb-ink-soft">
                    Harga 30
                    <input
                      className="rpb-input mt-1"
                      type="text"
                      inputMode="numeric"
                      value={formatIdrInput(row.priceIdr30)}
                      onChange={(event) =>
                        setProfileRows((list) =>
                          list.map((item) =>
                            item.id === row.id ? { ...item, priceIdr30: parseIdrInput(event.target.value) } : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="text-xs font-semibold text-rpb-ink-soft">
                    Harga 45
                    <input
                      className="rpb-input mt-1"
                      type="text"
                      inputMode="numeric"
                      value={formatIdrInput(row.priceIdr45)}
                      onChange={(event) =>
                        setProfileRows((list) =>
                          list.map((item) =>
                            item.id === row.id ? { ...item, priceIdr45: parseIdrInput(event.target.value) } : item,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-xl border border-rpb-border">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-[#f6f7ff]">
                  <tr className="text-left text-xs font-semibold text-rpb-ink-soft">
                    <th className="w-[12%] px-3 py-2">Code</th>
                    <th className="w-[19%] px-3 py-2">Name</th>
                    <th className="w-[8%] px-3 py-2">Unit</th>
                    <th className="w-[30%] px-3 py-2">Formula Qty</th>
                    <th className="w-[15.5%] px-3 py-2">Harga 30</th>
                    <th className="w-[15.5%] px-3 py-2">Harga 45</th>
                  </tr>
                </thead>
                <tbody>
                  {profileRows.map((row) => (
                    <tr key={row.id} className="border-t border-rpb-border align-top">
                      <td className="px-3 py-2 text-xs text-rpb-ink-soft break-all">{row.code}</td>
                      <td className="px-3 py-2 break-words">{row.name}</td>
                      <td className="px-3 py-2 break-words">{row.unit}</td>
                      <td className="px-3 py-2">
                        <AutoSizeFormulaTextarea
                          className="rpb-input w-full whitespace-pre-wrap break-words font-mono text-xs"
                          value={row.formulaExpr}
                          onChange={(event) =>
                            setProfileRows((list) =>
                              list.map((item) => (item.id === row.id ? { ...item, formulaExpr: event.target.value } : item)),
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="rpb-input w-full"
                          type="text"
                          inputMode="numeric"
                          value={formatIdrInput(row.priceIdr30)}
                          onChange={(event) =>
                            setProfileRows((list) =>
                              list.map((item) =>
                                item.id === row.id ? { ...item, priceIdr30: parseIdrInput(event.target.value) } : item,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="rpb-input w-full"
                          type="text"
                          inputMode="numeric"
                          value={formatIdrInput(row.priceIdr45)}
                          onChange={(event) =>
                            setProfileRows((list) =>
                              list.map((item) =>
                                item.id === row.id ? { ...item, priceIdr45: parseIdrInput(event.target.value) } : item,
                              ),
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <FormulaHelpBox />
          <VariableSettingsCard
            section="profile"
            rows={profileVariables}
            busy={busy}
            onAdd={() => addVariable("profile")}
            onChange={(id, patch) =>
              setVariableRows((list) => list.map((row) => (row.id === id ? { ...row, ...patch } : row)))
            }
            onSave={saveVariable}
            onDelete={deleteVariable}
          />
        </section>
      ) : null}

      {activeSection === "konstruksi" ? (
        <section className="rpb-section p-3 md:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="rpb-h-title text-base font-semibold">KONSTRUKSI</h2>
            <button
              type="button"
              className="rpb-btn-primary px-4 py-2 text-sm font-semibold"
              onClick={() => void saveAllKonstruksi()}
              disabled={busy === "konstruksi"}
            >
              {busy === "konstruksi" ? "Menyimpan..." : "Simpan Semua"}
            </button>
          </div>

          <div className="space-y-2 md:hidden">
            {konstruksiRows.map((row) => (
              <article key={row.id} className="rounded-xl border border-rpb-border p-3">
                <p className="text-xs text-rpb-ink-soft">{row.code}</p>
                <p className="text-sm font-semibold">{row.name}</p>
                <p className="text-xs text-rpb-ink-soft">Unit: {row.unit}</p>
                <label className="mt-2 block text-xs font-semibold text-rpb-ink-soft">
                  Formula Qty
                  <AutoSizeFormulaTextarea
                    className="rpb-input mt-1 whitespace-pre-wrap break-words font-mono"
                    value={row.formulaExpr}
                    onChange={(event) =>
                      setKonstruksiRows((list) =>
                        list.map((item) => (item.id === row.id ? { ...item, formulaExpr: event.target.value } : item)),
                      )
                    }
                  />
                </label>
                <label className="mt-2 block text-xs font-semibold text-rpb-ink-soft">
                  Harga Satuan
                  <input
                    className="rpb-input mt-1"
                    type="text"
                    inputMode="numeric"
                    value={formatIdrInput(row.unitPriceIdr)}
                    onChange={(event) =>
                      setKonstruksiRows((list) =>
                        list.map((item) =>
                          item.id === row.id ? { ...item, unitPriceIdr: parseIdrInput(event.target.value) } : item,
                        ),
                      )
                    }
                  />
                </label>
              </article>
            ))}
          </div>
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-xl border border-rpb-border">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-[#f6f7ff]">
                  <tr className="text-left text-xs font-semibold text-rpb-ink-soft">
                    <th className="w-[12%] px-3 py-2">Code</th>
                    <th className="w-[24%] px-3 py-2">Name</th>
                    <th className="w-[10%] px-3 py-2">Unit</th>
                    <th className="w-[30%] px-3 py-2">Formula Qty</th>
                    <th className="w-[24%] px-3 py-2">Harga Satuan</th>
                  </tr>
                </thead>
                <tbody>
                  {konstruksiRows.map((row) => (
                    <tr key={row.id} className="border-t border-rpb-border align-top">
                      <td className="px-3 py-2 text-xs text-rpb-ink-soft break-all">{row.code}</td>
                      <td className="px-3 py-2 break-words">{row.name}</td>
                      <td className="px-3 py-2 break-words">{row.unit}</td>
                      <td className="px-3 py-2">
                        <AutoSizeFormulaTextarea
                          className="rpb-input w-full whitespace-pre-wrap break-words font-mono text-xs"
                          value={row.formulaExpr}
                          onChange={(event) =>
                            setKonstruksiRows((list) =>
                              list.map((item) => (item.id === row.id ? { ...item, formulaExpr: event.target.value } : item)),
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="rpb-input w-full"
                          type="text"
                          inputMode="numeric"
                          value={formatIdrInput(row.unitPriceIdr)}
                          onChange={(event) =>
                            setKonstruksiRows((list) =>
                              list.map((item) =>
                                item.id === row.id ? { ...item, unitPriceIdr: parseIdrInput(event.target.value) } : item,
                              ),
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <FormulaHelpBox />
          <VariableSettingsCard
            section="konstruksi"
            rows={konstruksiVariables}
            busy={busy}
            onAdd={() => addVariable("konstruksi")}
            onChange={(id, patch) =>
              setVariableRows((list) => list.map((row) => (row.id === id ? { ...row, ...patch } : row)))
            }
            onSave={saveVariable}
            onDelete={deleteVariable}
          />
        </section>
      ) : null}

      {activeSection === "other" ? (
        <section className="rpb-section p-3 md:p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="rpb-h-title text-base font-semibold">OTHER (permanen)</h2>
            <button
              type="button"
              className="rpb-btn-primary inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold"
              onClick={() => {
                setNewOther(newOtherDefault);
                setIsOtherModalOpen(true);
              }}
            >
              <Plus size={14} />
              Tambah Item
            </button>
          </div>

          <datalist id={OTHER_CATEGORY_DATALIST_ID}>
            {otherCategoryOptions.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>

          <div className="space-y-2 md:hidden">
            {otherRows.map((row) => (
              <article key={row.id} className="rounded-xl border border-rpb-border p-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    className="rpb-input"
                    list={OTHER_CATEGORY_DATALIST_ID}
                    placeholder="Category"
                    value={row.category}
                    onChange={(event) =>
                      setOtherRows((list) =>
                        list.map((item) =>
                          item.id === row.id ? { ...item, category: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <input
                    className="rpb-input"
                    value={row.name}
                    onChange={(event) =>
                      setOtherRows((list) =>
                        list.map((item) => (item.id === row.id ? { ...item, name: event.target.value } : item)),
                      )
                    }
                  />
                  <input
                    className="rpb-input"
                    value={row.model}
                    onChange={(event) =>
                      setOtherRows((list) =>
                        list.map((item) => (item.id === row.id ? { ...item, model: event.target.value } : item)),
                      )
                    }
                  />
                  <input
                    className="rpb-input"
                    value={row.unit}
                    onChange={(event) =>
                      setOtherRows((list) =>
                        list.map((item) => (item.id === row.id ? { ...item, unit: event.target.value } : item)),
                      )
                    }
                  />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    className="rpb-input"
                    type="text"
                    inputMode="numeric"
                    value={formatIdrInput(row.priceIdr)}
                    onChange={(event) =>
                      setOtherRows((list) =>
                        list.map((item) =>
                          item.id === row.id ? { ...item, priceIdr: parseIdrInput(event.target.value) } : item,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="rpb-btn-primary px-3 py-2 text-xs font-semibold"
                    onClick={() => void saveOtherRow(row)}
                    disabled={busy === `other:${row.id}`}
                  >
                    {busy === `other:${row.id}` ? "..." : "Simpan"}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden md:block">
            <div className="overflow-hidden rounded-xl border border-rpb-border">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-[#f6f7ff]">
                  <tr className="text-left text-xs font-semibold text-rpb-ink-soft">
                    <th className="w-[14%] px-3 py-2">Category</th>
                    <th className="w-[22%] px-3 py-2">Name</th>
                    <th className="w-[28%] px-3 py-2">Model</th>
                    <th className="w-[10%] px-3 py-2">Unit</th>
                    <th className="w-[14%] px-3 py-2">Harga</th>
                    <th className="w-[12%] px-3 py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {otherRows.map((row) => (
                    <tr key={row.id} className="border-t border-rpb-border align-top">
                      <td className="px-3 py-2">
                        <input
                          className="rpb-input w-full"
                          list={OTHER_CATEGORY_DATALIST_ID}
                          placeholder="Category"
                          value={row.category}
                          onChange={(event) =>
                            setOtherRows((list) =>
                              list.map((item) =>
                                item.id === row.id ? { ...item, category: event.target.value } : item,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="rpb-input w-full"
                          value={row.name}
                          onChange={(event) =>
                            setOtherRows((list) =>
                              list.map((item) => (item.id === row.id ? { ...item, name: event.target.value } : item)),
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="rpb-input w-full"
                          value={row.model}
                          onChange={(event) =>
                            setOtherRows((list) =>
                              list.map((item) => (item.id === row.id ? { ...item, model: event.target.value } : item)),
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="rpb-input w-full"
                          value={row.unit}
                          onChange={(event) =>
                            setOtherRows((list) =>
                              list.map((item) => (item.id === row.id ? { ...item, unit: event.target.value } : item)),
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="rpb-input w-full"
                          type="text"
                          inputMode="numeric"
                          value={formatIdrInput(row.priceIdr)}
                          onChange={(event) =>
                            setOtherRows((list) =>
                              list.map((item) =>
                                item.id === row.id ? { ...item, priceIdr: parseIdrInput(event.target.value) } : item,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="rpb-btn-primary w-full px-3 py-2 text-xs font-semibold"
                          onClick={() => void saveOtherRow(row)}
                          disabled={busy === `other:${row.id}`}
                        >
                          {busy === `other:${row.id}` ? "..." : "Simpan"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {isOtherModalOpen ? (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#15172b]/45 p-4 backdrop-blur-[2px]">
              <div className="w-full max-w-4xl rounded-xl border border-rpb-border bg-white p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="rpb-h-title text-base font-semibold">Tambah Item Other</h3>
                  <button
                    type="button"
                    className="rpb-btn-ghost px-3 py-2 text-xs font-semibold"
                    onClick={() => setIsOtherModalOpen(false)}
                  >
                    Tutup
                  </button>
                </div>
                <form
                  className="grid gap-3 md:grid-cols-7"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void addOtherPermanent();
                  }}
                >
                  <input
                    className="rpb-input md:col-span-2"
                    placeholder="Name"
                    value={newOther.name}
                    onChange={(event) => setNewOther((value) => ({ ...value, name: event.target.value }))}
                  />
                  <input
                    className="rpb-input"
                    list={OTHER_CATEGORY_DATALIST_ID}
                    placeholder="Category"
                    value={newOther.category}
                    onChange={(event) => setNewOther((value) => ({ ...value, category: event.target.value }))}
                  />
                  <input
                    className="rpb-input"
                    placeholder="Model"
                    value={newOther.model}
                    onChange={(event) => setNewOther((value) => ({ ...value, model: event.target.value }))}
                  />
                  <input
                    className="rpb-input"
                    placeholder="Unit"
                    value={newOther.unit}
                    onChange={(event) => setNewOther((value) => ({ ...value, unit: event.target.value }))}
                  />
                  <div className="flex gap-2 md:col-span-2">
                    <input
                      className="rpb-input flex-1 min-w-0"
                      type="text"
                      inputMode="numeric"
                      placeholder="Harga (Rp)"
                      value={formatIdrInput(newOther.priceIdr)}
                      onChange={(event) =>
                        setNewOther((value) => ({ ...value, priceIdr: parseIdrInput(event.target.value) }))
                      }
                    />
                    <button
                      type="submit"
                      className="rpb-btn-primary inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold"
                      disabled={busy === "other:new"}
                    >
                      <Plus size={14} />
                      {busy === "other:new" ? "..." : "Tambah"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
