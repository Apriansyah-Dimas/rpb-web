import React from "react";
import { useNavigate } from "react-router";
import {
  Calculator,
  History,
  TrendingUp,
  FileText,
  ArrowRight,
  PlusCircle,
  Quote,
} from "lucide-react";
import { Layout } from "../components/Layout";
import { useAppStore } from "../store/useAppStore";
import { getHistory } from "../lib/storage";
import { formatRupiah } from "../lib/formulaEval";

export default function DashboardPage() {
  const { currentUser, resetProjectInput } = useAppStore();
  const navigate = useNavigate();
  const history = currentUser ? getHistory(currentUser.id) : [];

  const totalProjects = history.length;
  const totalValue = history.reduce((s, h) => s + h.grandTotal, 0);
  const lastProject = history[0] ?? null;

  const stats = [
    {
      label: "Total Proyek",
      value: totalProjects.toString(),
      icon: FileText,
      color: "#6365b9",
      bg: "#ededfb",
    },
    {
      label: "Total Nilai Estimasi",
      value: formatRupiah(totalValue),
      icon: TrendingUp,
      color: "#059669",
      bg: "#d1fae5",
    },
    {
      label: "Estimasi Terakhir",
      value: lastProject ? lastProject.projectName : "—",
      icon: History,
      color: "#d97706",
      bg: "#fef3c7",
    },
  ];

  const quickActions = [
    {
      label: "Buat Estimasi Baru",
      desc: "Mulai kalkulasi biaya dari dimensi",
      icon: PlusCircle,
      color: "#6365b9",
      bg: "#ededfb",
      action: () => {
        resetProjectInput();
        navigate("/input");
      },
    },
    {
      label: "Lihat History",
      desc: "Buka estimasi yang tersimpan",
      icon: History,
      color: "#059669",
      bg: "#d1fae5",
      action: () => navigate("/history"),
    },
    {
      label: "Quotation Builder",
      desc: "Buat surat penawaran",
      icon: Quote,
      color: "#7c3aed",
      bg: "#ede9fe",
      action: () => navigate("/quotation"),
    },
  ];

  return (
    <Layout title="Dashboard" subtitle={`Selamat datang, ${currentUser?.name}`}>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-sm mb-1">{s.label}</p>
                  <p
                    className="text-gray-900"
                    style={{
                      fontSize: s.label === "Total Nilai Estimasi" ? "1rem" : "1.5rem",
                      fontWeight: 800,
                      wordBreak: "break-word",
                    }}
                  >
                    {s.value}
                  </p>
                </div>
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: s.bg }}
                >
                  <Icon size={22} color={s.color} strokeWidth={2} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-gray-800 mb-4" style={{ fontWeight: 700 }}>
          Aksi Cepat
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.label}
                onClick={a.action}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-left hover:shadow-md transition-all group"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: a.bg }}
                >
                  <Icon size={22} color={a.color} strokeWidth={2} />
                </div>
                <div className="text-gray-900 mb-1" style={{ fontWeight: 700 }}>
                  {a.label}
                </div>
                <div className="text-gray-500 text-sm mb-3">{a.desc}</div>
                <div
                  className="flex items-center gap-1 text-sm group-hover:gap-2 transition-all"
                  style={{ color: a.color, fontWeight: 600 }}
                >
                  Mulai <ArrowRight size={15} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-800" style={{ fontWeight: 700 }}>
            Estimasi Terbaru
          </h2>
          <button
            onClick={() => navigate("/history")}
            className="text-sm flex items-center gap-1"
            style={{ color: "#6365b9", fontWeight: 600 }}
          >
            Lihat semua <ArrowRight size={14} />
          </button>
        </div>

        {history.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 shadow-sm">
            <Calculator size={40} color="#c7d2fe" className="mx-auto mb-3" />
            <p className="text-gray-500">Belum ada estimasi tersimpan.</p>
            <button
              onClick={() => { resetProjectInput(); navigate("/input"); }}
              className="mt-4 px-5 py-2.5 rounded-xl text-sm text-white"
              style={{ backgroundColor: "#6365b9", fontWeight: 600 }}
            >
              Buat Estimasi Pertama
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3.5 text-left text-gray-500 text-xs uppercase tracking-wider" style={{ fontWeight: 600 }}>
                    Pelanggan
                  </th>
                  <th className="px-5 py-3.5 text-left text-gray-500 text-xs uppercase tracking-wider" style={{ fontWeight: 600 }}>
                    Proyek
                  </th>
                  <th className="px-5 py-3.5 text-right text-gray-500 text-xs uppercase tracking-wider" style={{ fontWeight: 600 }}>
                    Total
                  </th>
                  <th className="px-5 py-3.5 text-right text-gray-500 text-xs uppercase tracking-wider" style={{ fontWeight: 600 }}>
                    Tanggal
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 5).map((h, i) => (
                  <tr
                    key={h.id}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate("/history")}
                  >
                    <td className="px-5 py-3.5 text-gray-800" style={{ fontWeight: 600 }}>
                      {h.customerName}
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{h.projectName}</td>
                    <td className="px-5 py-3.5 text-right text-gray-900" style={{ fontWeight: 700 }}>
                      {formatRupiah(h.grandTotal)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-400 text-xs">
                      {new Date(h.savedAt).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
