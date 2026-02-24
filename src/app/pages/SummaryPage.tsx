import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Save, FileText, Printer, ArrowLeft, CheckCircle } from "lucide-react";
import { Layout } from "../components/Layout";
import { useAppStore } from "../store/useAppStore";
import { formatRupiah, formatNumber } from "../lib/formulaEval";
import { saveHistoryRecord } from "../lib/storage";
import type { SummaryLineItem } from "../lib/storage";

const CATEGORIES = [
  { key: "profile", label: "Profile", color: "#6365b9", bg: "#ededfb" },
  { key: "konstruksi", label: "Konstruksi", color: "#059669", bg: "#d1fae5" },
  { key: "other", label: "Other / Tambahan", color: "#d97706", bg: "#fef3c7" },
] as const;

export default function SummaryPage() {
  const {
    projectInput,
    summaryItems,
    updateItemQty,
    percentages,
    setPercentages,
    currentUser,
    setSummaryItems,
    setQuotationContent,
  } = useAppStore();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [saveName, setSaveName] = useState("");

  const subtotal = useMemo(
    () => summaryItems.reduce((s, i) => s + i.total, 0),
    [summaryItems]
  );

  const stockReturnAmt = subtotal * (percentages.stockReturn / 100);
  const marketingAmt = subtotal * (percentages.marketing / 100);
  const servicesAmt = subtotal * (percentages.services / 100);
  const profitAmt = subtotal * (percentages.profit / 100);
  const grandTotal = subtotal + stockReturnAmt + marketingAmt + servicesAmt + profitAmt;

  const handleSave = () => {
    if (!currentUser) return;
    const record = {
      id: `hist_${Date.now()}`,
      userId: currentUser.id,
      customerName: projectInput.customerName || "—",
      projectName: projectInput.projectName || "—",
      savedAt: new Date().toISOString(),
      dimensions: {
        L: projectInput.L,
        W: projectInput.W,
        H: projectInput.H,
        T: projectInput.T,
      },
      items: summaryItems,
      percentages,
      grandTotal,
    };
    saveHistoryRecord(record);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleGoToQuotation = () => {
    // Pre-fill quotation content with project header
    const header = `<h2>PENAWARAN HARGA</h2>
<p><strong>Kepada:</strong> ${projectInput.customerName}<br/>
<strong>Proyek:</strong> ${projectInput.projectName}<br/>
<strong>Dimensi RPB:</strong> ${projectInput.L} × ${projectInput.W} × ${projectInput.H} mm | Tebal Panel: ${projectInput.T} mm</p>
<p>Dengan hormat, kami mengajukan penawaran harga sebagai berikut:</p>`;
    setQuotationContent(header);
    navigate("/quotation");
  };

  const handlePrint = () => window.print();

  if (summaryItems.length === 0) {
    return (
      <Layout title="Summary" subtitle="Ringkasan kalkulasi biaya">
        <div className="max-w-3xl mx-auto text-center py-20">
          <FileText size={48} color="#c7d2fe" className="mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Belum ada data kalkulasi. Buat estimasi terlebih dahulu.</p>
          <button
            onClick={() => navigate("/input")}
            className="px-5 py-2.5 rounded-xl text-white text-sm"
            style={{ backgroundColor: "#6365b9", fontWeight: 600 }}
          >
            Buat Estimasi
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Summary" subtitle={`${projectInput.customerName} — ${projectInput.projectName}`}>
      <div className="max-w-4xl mx-auto print:max-w-full">

        {/* Header actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
          <button
            onClick={() => navigate("/input")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Kembali ke Input
          </button>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
            >
              <Printer size={15} />
              Print / PDF
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white transition-all"
              style={{ backgroundColor: saved ? "#059669" : "#6365b9", fontWeight: 600 }}
            >
              {saved ? <CheckCircle size={15} /> : <Save size={15} />}
              {saved ? "Tersimpan!" : "Simpan"}
            </button>
            <button
              onClick={handleGoToQuotation}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white transition-all"
              style={{ backgroundColor: "#7c3aed", fontWeight: 600 }}
            >
              <FileText size={15} />
              Buat Quotation
            </button>
          </div>
        </div>

        {/* Project info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 print:shadow-none print:border-gray-300">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            {[
              { label: "Pelanggan", value: projectInput.customerName },
              { label: "Proyek", value: projectInput.projectName },
              {
                label: "Dimensi",
                value: `${projectInput.L} × ${projectInput.W} × ${projectInput.H} mm`,
              },
              { label: "Tebal Panel", value: `${projectInput.T} mm` },
            ].map((info) => (
              <div key={info.label}>
                <p className="text-gray-400 text-xs mb-0.5" style={{ fontWeight: 600 }}>
                  {info.label}
                </p>
                <p className="text-gray-800" style={{ fontWeight: 700 }}>
                  {info.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Item Tables by Category */}
        {CATEGORIES.map(({ key, label, color, bg }) => {
          const items = summaryItems.filter((i) => i.category === key);
          if (items.length === 0) return null;
          const catTotal = items.reduce((s, i) => s + i.total, 0);

          return (
            <div
              key={key}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden print:shadow-none print:border-gray-300"
            >
              <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ backgroundColor: bg }}
              >
                <span style={{ color, fontWeight: 700, fontSize: "0.9rem" }}>
                  {label}
                </span>
                <span style={{ color, fontWeight: 700, fontSize: "0.9rem" }}>
                  {formatRupiah(catTotal)}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-2.5 text-left text-gray-400 text-xs uppercase tracking-wider" style={{ fontWeight: 600 }}>
                      Nama Item
                    </th>
                    <th className="px-4 py-2.5 text-center text-gray-400 text-xs uppercase tracking-wider" style={{ fontWeight: 600 }}>
                      Qty
                    </th>
                    <th className="px-4 py-2.5 text-center text-gray-400 text-xs uppercase tracking-wider" style={{ fontWeight: 600 }}>
                      Sat
                    </th>
                    <th className="px-4 py-2.5 text-right text-gray-400 text-xs uppercase tracking-wider" style={{ fontWeight: 600 }}>
                      Harga Sat
                    </th>
                    <th className="px-4 py-2.5 text-right text-gray-400 text-xs uppercase tracking-wider" style={{ fontWeight: 600 }}>
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-50 ${idx % 2 === 1 ? "bg-gray-50/50" : ""}`}
                    >
                      <td className="px-4 py-2.5 text-gray-800" style={{ fontWeight: 500 }}>
                        {item.name}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {item.qtyEditable ? (
                          <input
                            type="number"
                            value={item.qty}
                            min={0}
                            onChange={(e) =>
                              updateItemQty(item.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-20 px-2 py-1 rounded-lg border border-gray-200 text-center text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 print:border-0 print:bg-transparent"
                          />
                        ) : (
                          <span className="text-gray-700">{formatNumber(item.qty)}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-500 text-xs">
                        {item.unit}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {formatRupiah(item.unitPrice)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-900" style={{ fontWeight: 700 }}>
                        {formatRupiah(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Percentage Additions + Grand Total */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:shadow-none print:border-gray-300">
          <div className="px-5 py-3 border-b border-gray-100" style={{ backgroundColor: "#f8f8fd" }}>
            <span className="text-gray-700" style={{ fontWeight: 700 }}>
              Perhitungan Akhir
            </span>
          </div>

          {/* Subtotal */}
          <div className="flex justify-between px-5 py-3 border-b border-gray-100">
            <span className="text-gray-600">Subtotal Item</span>
            <span className="text-gray-900" style={{ fontWeight: 700 }}>
              {formatRupiah(subtotal)}
            </span>
          </div>

          {/* Percentage rows */}
          {[
            { label: "Stock Return", key: "stockReturn" as const, amount: stockReturnAmt },
            { label: "Marketing Cost", key: "marketing" as const, amount: marketingAmt },
            { label: "Services", key: "services" as const, amount: servicesAmt },
            { label: "Profit", key: "profit" as const, amount: profitAmt },
          ].map(({ label, key, amount }) => (
            <div
              key={key}
              className="flex items-center justify-between px-5 py-3 border-b border-gray-50"
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-600">{label}</span>
                <div className="flex items-center gap-1.5 print:hidden">
                  <input
                    type="number"
                    value={percentages[key]}
                    min={0}
                    max={100}
                    step={0.5}
                    onChange={(e) =>
                      setPercentages({ [key]: parseFloat(e.target.value) || 0 })
                    }
                    className="w-16 px-2 py-1 rounded-lg border border-gray-200 text-center text-sm outline-none focus:border-indigo-400"
                  />
                  <span className="text-gray-400 text-sm">%</span>
                </div>
                <span className="hidden print:inline text-gray-500 text-sm">
                  ({percentages[key]}%)
                </span>
              </div>
              <span className="text-gray-700" style={{ fontWeight: 600 }}>
                + {formatRupiah(amount)}
              </span>
            </div>
          ))}

          {/* Grand Total */}
          <div
            className="flex justify-between px-5 py-4"
            style={{ backgroundColor: "#6365b9" }}
          >
            <span className="text-white" style={{ fontWeight: 800, fontSize: "1rem" }}>
              GRAND TOTAL
            </span>
            <span className="text-white" style={{ fontWeight: 800, fontSize: "1.1rem" }}>
              {formatRupiah(grandTotal)}
            </span>
          </div>
        </div>

        <div className="h-10 print:hidden" />
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </Layout>
  );
}
