import React, { useState } from "react";
import { useNavigate } from "react-router";
import { History, Search, Trash2, Eye, ChevronDown, ChevronUp, Calendar, Package } from "lucide-react";
import { Layout } from "../components/Layout";
import { useAppStore } from "../store/useAppStore";
import { getHistory, deleteHistoryRecord } from "../lib/storage";
import { formatRupiah } from "../lib/formulaEval";
import type { HistoryRecord } from "../lib/storage";

export default function HistoryPage() {
  const { currentUser, setSummaryItems, setPercentages, setProjectInput } = useAppStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [records, setRecords] = useState<HistoryRecord[]>(
    currentUser ? getHistory(currentUser.id) : []
  );

  const filtered = records.filter(
    (r) =>
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.projectName.toLowerCase().includes(search.toLowerCase())
  );

  const handleLoad = (record: HistoryRecord) => {
    setProjectInput({
      customerName: record.customerName,
      projectName: record.projectName,
      L: record.dimensions.L,
      W: record.dimensions.W,
      H: record.dimensions.H,
      T: record.dimensions.T,
    });
    setSummaryItems(record.items);
    setPercentages(record.percentages);
    navigate("/summary");
  };

  const handleDelete = (id: string) => {
    deleteHistoryRecord(id);
    setRecords(records.filter((r) => r.id !== id));
  };

  const toggleExpand = (id: string) => {
    setExpanded(expanded === id ? null : id);
  };

  return (
    <Layout title="History" subtitle="Riwayat estimasi yang tersimpan">
      <div className="max-w-4xl mx-auto">

        {/* Search bar */}
        <div className="relative mb-6">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pelanggan atau nama proyek..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 bg-white shadow-sm text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16">
            <History size={44} color="#c7d2fe" className="mx-auto mb-3" />
            <p className="text-gray-500 mb-1" style={{ fontWeight: 600 }}>
              {records.length === 0 ? "Belum ada history tersimpan" : "Tidak ada hasil pencarian"}
            </p>
            <p className="text-gray-400 text-sm">
              {records.length === 0
                ? "Buat estimasi dan klik Simpan untuk menyimpan riwayat."
                : "Coba kata kunci lain."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((record) => (
              <div
                key={record.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all"
              >
                {/* Header row */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "#ededfb" }}
                    >
                      <Package size={18} color="#6365b9" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-900 truncate" style={{ fontWeight: 700 }}>
                        {record.customerName}
                      </p>
                      <p className="text-gray-500 text-sm truncate">{record.projectName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>
                        {formatRupiah(record.grandTotal)}
                      </p>
                      <p className="text-gray-400 text-xs flex items-center gap-1 justify-end">
                        <Calendar size={11} />
                        {new Date(record.savedAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleLoad(record)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white transition-all"
                        style={{ backgroundColor: "#6365b9", fontWeight: 600 }}
                        title="Load ke Summary"
                      >
                        <Eye size={14} />
                        <span className="hidden sm:inline">Load</span>
                      </button>
                      <button
                        onClick={() => toggleExpand(record.id)}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                        title="Detail"
                      >
                        {expanded === record.id ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="p-2 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Hapus"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded === record.id && (
                  <div className="px-5 pb-5 border-t border-gray-100">
                    {/* Dimensions */}
                    <div className="flex flex-wrap gap-3 pt-4 mb-4">
                      {[
                        { label: "Panjang", value: `${record.dimensions.L} mm` },
                        { label: "Lebar", value: `${record.dimensions.W} mm` },
                        { label: "Tinggi", value: `${record.dimensions.H} mm` },
                        { label: "Tebal", value: `${record.dimensions.T} mm` },
                      ].map((d) => (
                        <div
                          key={d.label}
                          className="px-3 py-2 rounded-xl text-sm"
                          style={{ backgroundColor: "#f4f4fb" }}
                        >
                          <span className="text-gray-400 text-xs">{d.label}: </span>
                          <span className="text-indigo-700" style={{ fontWeight: 600 }}>
                            {d.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Items table */}
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ backgroundColor: "#f4f4fb" }}>
                            <th className="px-4 py-2 text-left text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                              Item
                            </th>
                            <th className="px-4 py-2 text-right text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                              Qty
                            </th>
                            <th className="px-4 py-2 text-right text-xs text-gray-500 uppercase tracking-wider" style={{ fontWeight: 600 }}>
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {record.items.map((item) => (
                            <tr key={item.id} className="border-t border-gray-50">
                              <td className="px-4 py-2 text-gray-700">
                                <span
                                  className="text-xs px-1.5 py-0.5 rounded-full mr-2"
                                  style={{
                                    backgroundColor:
                                      item.category === "profile"
                                        ? "#ededfb"
                                        : item.category === "konstruksi"
                                        ? "#d1fae5"
                                        : "#fef3c7",
                                    color:
                                      item.category === "profile"
                                        ? "#6365b9"
                                        : item.category === "konstruksi"
                                        ? "#059669"
                                        : "#d97706",
                                    fontWeight: 600,
                                  }}
                                >
                                  {item.category}
                                </span>
                                {item.name}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-600">
                                {item.qty} {item.unit}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-900" style={{ fontWeight: 600 }}>
                                {formatRupiah(item.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Percentage summary */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(record.percentages).map(([k, v]) => (
                        <span
                          key={k}
                          className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600"
                          style={{ fontWeight: 500 }}
                        >
                          {k === "stockReturn" ? "Stock Return" : k === "marketing" ? "Marketing" : k === "services" ? "Services" : "Profit"}: {v}%
                        </span>
                      ))}
                    </div>

                    <div
                      className="mt-3 flex justify-between px-4 py-3 rounded-xl"
                      style={{ backgroundColor: "#6365b9" }}
                    >
                      <span className="text-white" style={{ fontWeight: 700 }}>
                        Grand Total
                      </span>
                      <span className="text-white" style={{ fontWeight: 800 }}>
                        {formatRupiah(record.grandTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
