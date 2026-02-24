import React, { useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Trash2, ChevronDown, Zap } from "lucide-react";
import { Layout } from "../components/Layout";
import { useAppStore } from "../store/useAppStore";
import { evalFormula, formatRupiah } from "../lib/formulaEval";
import { getProfileItems, getKonstruksiItems, getOtherMasterItems } from "../lib/storage";
import type { SummaryLineItem } from "../lib/storage";

interface OtherItem {
  id: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  isCustom: boolean;
}

export default function InputPage() {
  const { projectInput, setProjectInput, setSummaryItems } = useAppStore();
  const navigate = useNavigate();

  const [otherItems, setOtherItems] = useState<OtherItem[]>([]);
  const [showMasterDropdown, setShowMasterDropdown] = useState(false);

  const otherMaster = getOtherMasterItems();

  const handleDimensionChange = (field: "L" | "W" | "H" | "T", val: string) => {
    setProjectInput({ [field]: parseFloat(val) || 0 });
  };

  const addFromMaster = (masterId: string) => {
    const item = otherMaster.find((m) => m.id === masterId);
    if (!item) return;
    const already = otherItems.find((o) => o.id === masterId && !o.isCustom);
    if (already) return;
    setOtherItems([
      ...otherItems,
      { id: masterId, name: item.name, unit: item.unit, qty: 1, unitPrice: item.unitPrice, isCustom: false },
    ]);
    setShowMasterDropdown(false);
  };

  const addCustomItem = () => {
    const id = `custom_${Date.now()}`;
    setOtherItems([
      ...otherItems,
      { id, name: "", unit: "unit", qty: 1, unitPrice: 0, isCustom: true },
    ]);
  };

  const updateOther = (id: string, field: keyof OtherItem, val: string | number) => {
    setOtherItems(otherItems.map((o) => (o.id === id ? { ...o, [field]: val } : o)));
  };

  const removeOther = (id: string) => {
    setOtherItems(otherItems.filter((o) => o.id !== id));
  };

  const handleCalculate = () => {
    const { L, W, H, T } = projectInput;
    const profileMaster = getProfileItems();
    const konstruksiMaster = getKonstruksiItems();

    const profileItems: SummaryLineItem[] = profileMaster.map((item) => {
      const qty = parseFloat(evalFormula(item.formula, L, W, H, T).toFixed(3));
      return {
        id: item.id,
        name: item.name,
        unit: item.unit,
        qty,
        unitPrice: item.unitPrice,
        total: qty * item.unitPrice,
        category: "profile",
        qtyEditable: false,
      };
    });

    const konstruksiItems: SummaryLineItem[] = konstruksiMaster.map((item) => {
      const qty = parseFloat(evalFormula(item.formula, L, W, H, T).toFixed(3));
      return {
        id: item.id,
        name: item.name,
        unit: item.unit,
        qty,
        unitPrice: item.unitPrice,
        total: qty * item.unitPrice,
        category: "konstruksi",
        qtyEditable: false,
      };
    });

    const otherLineItems: SummaryLineItem[] = otherItems.map((o) => ({
      id: o.id,
      name: o.name || "Item Custom",
      unit: o.unit,
      qty: o.qty,
      unitPrice: o.unitPrice,
      total: o.qty * o.unitPrice,
      category: "other",
      qtyEditable: true,
    }));

    setSummaryItems([...profileItems, ...konstruksiItems, ...otherLineItems]);
    navigate("/summary");
  };

  const isValid =
    projectInput.customerName.trim() &&
    projectInput.projectName.trim() &&
    projectInput.L > 0 &&
    projectInput.W > 0 &&
    projectInput.H > 0 &&
    projectInput.T > 0;

  const dims = [
    { label: "Panjang (L)", key: "L" as const, placeholder: "3000", hint: "mm" },
    { label: "Lebar (W)", key: "W" as const, placeholder: "2000", hint: "mm" },
    { label: "Tinggi (H)", key: "H" as const, placeholder: "2500", hint: "mm" },
    { label: "Tebal Panel (T)", key: "T" as const, placeholder: "100", hint: "mm" },
  ];

  return (
    <Layout title="New Estimate" subtitle="Masukkan data proyek dan dimensi RPB">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Project Info Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#6365b9" }} />
            <h2 className="text-gray-800" style={{ fontWeight: 700 }}>
              Informasi Proyek
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>
                Nama Pelanggan *
              </label>
              <input
                type="text"
                value={projectInput.customerName}
                onChange={(e) => setProjectInput({ customerName: e.target.value })}
                placeholder="PT. Maju Bersama"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>
                Nama Proyek *
              </label>
              <input
                type="text"
                value={projectInput.projectName}
                onChange={(e) => setProjectInput({ projectName: e.target.value })}
                placeholder="Cold Room Unit A"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Dimensions Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#6365b9" }} />
            <h2 className="text-gray-800" style={{ fontWeight: 700 }}>
              Dimensi RPB
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {dims.map((d) => (
              <div key={d.key}>
                <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>
                  {d.label}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={projectInput[d.key] || ""}
                    onChange={(e) => handleDimensionChange(d.key, e.target.value)}
                    placeholder={d.placeholder}
                    min={0}
                    className="w-full px-4 py-2.5 pr-12 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" style={{ fontWeight: 600 }}>
                    {d.hint}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Preview formula note */}
          {projectInput.L > 0 && projectInput.W > 0 && projectInput.H > 0 && (
            <div
              className="mt-4 rounded-xl px-4 py-3 text-sm flex gap-2 items-start"
              style={{ backgroundColor: "#f4f4fb" }}
            >
              <Zap size={15} color="#6365b9" className="shrink-0 mt-0.5" />
              <span className="text-indigo-700">
                Dimensi: {projectInput.L} × {projectInput.W} × {projectInput.H} mm | Tebal: {projectInput.T} mm
                — Formula akan dihitung otomatis dari master data.
              </span>
            </div>
          )}
        </div>

        {/* Other Items Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#6365b9" }} />
              <h2 className="text-gray-800" style={{ fontWeight: 700 }}>
                Item Tambahan (Other)
              </h2>
            </div>
            <div className="flex gap-2">
              {/* Add from master dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowMasterDropdown(!showMasterDropdown)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  <Plus size={15} />
                  Dari Master
                  <ChevronDown size={14} />
                </button>
                {showMasterDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
                    {otherMaster.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => addFromMaster(m.id)}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex justify-between items-center transition-colors"
                      >
                        <span>{m.name}</span>
                        <span className="text-gray-400 text-xs">
                          {formatRupiah(m.unitPrice)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Add custom */}
              <button
                onClick={addCustomItem}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white transition-all"
                style={{ backgroundColor: "#6365b9" }}
              >
                <Plus size={15} />
                Custom
              </button>
            </div>
          </div>

          {otherItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm rounded-xl border border-dashed border-gray-200">
              Belum ada item tambahan. Tambahkan dari master data atau buat sendiri.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 uppercase tracking-wider px-1" style={{ fontWeight: 600 }}>
                <span className="col-span-4">Nama Item</span>
                <span className="col-span-2">Satuan</span>
                <span className="col-span-2">Qty</span>
                <span className="col-span-3">Harga Satuan</span>
                <span className="col-span-1"></span>
              </div>
              {otherItems.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    {item.isCustom ? (
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateOther(item.id, "name", e.target.value)}
                        placeholder="Nama item"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                      />
                    ) : (
                      <div className="px-3 py-2 rounded-xl bg-gray-50 text-sm text-gray-700 border border-gray-100">
                        {item.name}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateOther(item.id, "unit", e.target.value)}
                      placeholder="unit"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => updateOther(item.id, "qty", parseFloat(e.target.value) || 0)}
                      min={0}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateOther(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                      min={0}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => removeOther(item.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calculate Button */}
        <button
          onClick={handleCalculate}
          disabled={!isValid}
          className="w-full py-4 rounded-2xl text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          style={{ backgroundColor: "#6365b9", fontWeight: 700, fontSize: "1rem" }}
        >
          <Zap size={18} />
          Hitung & Lihat Summary
        </button>
      </div>
    </Layout>
  );
}
