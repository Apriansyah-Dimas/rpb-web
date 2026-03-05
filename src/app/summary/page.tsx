"use client";

import {
  formatRupiah,
} from "@/lib/rpb-calculator";
import { RpbPageFrame } from "@/components/layout/rpb-page-frame";
import { useRpbMasterData } from "@/hooks/use-rpb-master-data";
import { buildSummaryLineItems } from "@/lib/rpb-line-items";
import { saveSummaryHistory } from "@/lib/rpb-db";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRpbStore } from "@/store/rpb-store";
import { ArrowLeft, Download, FileText, History, Minus, Plus, Save } from "lucide-react";
import type { RowInput } from "jspdf-autotable";
import Link from "next/link";
import type { FocusEvent, FormEvent } from "react";
import { useMemo, useState } from "react";

const normalizeNumericInput = (value: string): string => {
  const normalizedDot = value.replace(",", ".");

  if (normalizedDot === "" || normalizedDot === "." || normalizedDot === "-") {
    return normalizedDot;
  }

  if (normalizedDot.startsWith("0.") || normalizedDot.startsWith("-0.")) {
    return normalizedDot;
  }

  return normalizedDot.replace(/^(-?)0+(?=\d)/, "$1");
};

const parsePercentInput = (value: string): number => {
  const parsed = Number.parseFloat(normalizeNumericInput(value));
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
};

const pctToValue = (subtotal: number, pct: number): number => subtotal * (pct / 100);

const selectInputOnFocus = (event: FocusEvent<HTMLInputElement>) => {
  event.currentTarget.select();
};

const buildDefaultHistoryTitle = (projectName: string): string =>
  `${projectName || "RPB"} - ${new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date())}`;

interface CalculationRow {
  key: string;
  label: string;
  value: number;
  highlight?: boolean;
}

export default function SummaryPage() {
  const { data: masterData, loading: masterLoading, error: masterError } = useRpbMasterData();
  const customerName = useRpbStore((state) => state.customerName);
  const projectName = useRpbStore((state) => state.projectName);
  const dimensions = useRpbStore((state) => state.dimensions);
  const panelThickness = useRpbStore((state) => state.panelThickness);
  const selectedOther = useRpbStore((state) => state.selectedOther);
  const customOtherItems = useRpbStore((state) => state.customOtherItems);
  const adjustments = useRpbStore((state) => state.adjustments);
  const setOtherQty = useRpbStore((state) => state.setOtherQty);
  const setCustomOtherItemQty = useRpbStore((state) => state.setCustomOtherItemQty);
  const setAdjustment = useRpbStore((state) => state.setAdjustment);
  const getSnapshot = useRpbStore((state) => state.getSnapshot);
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveTitleInput, setSaveTitleInput] = useState("");

  const { lineItems } = useMemo(
    () =>
      buildSummaryLineItems({
        dimensions,
        panelThickness,
        profileItems: masterData?.profileItems ?? [],
        konstruksiItems: masterData?.konstruksiItems ?? [],
        otherItems: masterData?.otherItems ?? [],
        selectedOther,
        customOtherItems,
      }),
    [
      customOtherItems,
      dimensions,
      masterData?.konstruksiItems,
      masterData?.otherItems,
      masterData?.profileItems,
      panelThickness,
      selectedOther,
    ],
  );

  const subtotalIdr = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.hargaIdr * item.qty, 0),
    [lineItems],
  );

  const stockReturnIdr = pctToValue(subtotalIdr, adjustments.stockReturn);
  const marketingCostIdr = pctToValue(subtotalIdr, adjustments.marketingCost);
  const servicesIdr = pctToValue(subtotalIdr, adjustments.services);
  const baseAfterAdjustIdr = subtotalIdr + stockReturnIdr + marketingCostIdr + servicesIdr;
  const profitIdr = pctToValue(baseAfterAdjustIdr, adjustments.profit);
  const grandTotalIdr = baseAfterAdjustIdr + profitIdr;

  const calculationRows: CalculationRow[] = [
    { key: "subtotal", label: "Subtotal", value: subtotalIdr },
    { key: "stock", label: `Stock Return (${adjustments.stockReturn}%)`, value: stockReturnIdr },
    {
      key: "marketing",
      label: `Marketing Cost (${adjustments.marketingCost}%)`,
      value: marketingCostIdr,
    },
    { key: "services", label: `Services (${adjustments.services}%)`, value: servicesIdr },
    { key: "profit", label: `Profit (${adjustments.profit}%)`, value: profitIdr },
    { key: "grand", label: "GRAND TOTAL", value: grandTotalIdr, highlight: true },
  ];

  const updateQty = (itemId: string, qty: number) => {
    if (itemId.startsWith("stock-")) {
      const stockId = itemId.replace("stock-", "");
      setOtherQty(stockId, Math.max(0, qty));
      return;
    }

    if (itemId.startsWith("custom-")) {
      const customId = itemId.replace("custom-", "");
      setCustomOtherItemQty(customId, Math.max(0, qty));
    }
  };

  const submitSaveState = async (rawTitle: string) => {
    setSaveBusy(true);
    setSaveMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await saveSummaryHistory(supabase, {
        title: rawTitle.trim() || projectName || "RPB Summary",
        customerName,
        projectName,
        snapshot: getSnapshot(),
      });
      setSaveMessage("History berhasil disimpan ke database.");
      setSaveModalOpen(false);
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? `Gagal menyimpan history: ${error.message}` : "Gagal menyimpan.",
      );
    } finally {
      setSaveBusy(false);
    }
  };

  const openSaveModal = () => {
    setSaveMessage(null);
    setSaveTitleInput(buildDefaultHistoryTitle(projectName));
    setSaveModalOpen(true);
  };

  const closeSaveModal = () => {
    if (saveBusy) {
      return;
    }
    setSaveModalOpen(false);
  };

  const handleSaveModalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitSaveState(saveTitleInput);
  };

  const downloadPdf = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const dateText = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date());

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("RPB Summary", 14, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Customer Name : ${customerName || "-"}`, 14, 26);
    doc.text(`Project Name    : ${projectName || "-"}`, 14, 32);
    doc.text(`Date                 : ${dateText}`, 14, 38);

    const tableHead = [
      ["No", "Jenis", "Keterangan", "Satuan", "Jenis Spec", "Qty", "Harga", "Total"],
    ];
    const tableBody = lineItems.map((item, index) => [
      String(index + 1),
      item.jenis,
      item.keterangan,
      item.satuan,
      item.jenisSpec,
      String(item.qty),
      formatRupiah(item.hargaIdr),
      formatRupiah(item.hargaIdr * item.qty),
    ]);
    const tableFoot: RowInput[] = calculationRows.map((row) => {
      const fillColor = row.highlight
        ? ([46, 49, 146] as [number, number, number])
        : ([245, 251, 255] as [number, number, number]);
      const textColor = row.highlight
        ? ([255, 255, 255] as [number, number, number])
        : ([75, 82, 122] as [number, number, number]);
      const valueTextColor = row.highlight
        ? ([255, 255, 255] as [number, number, number])
        : ([31, 35, 64] as [number, number, number]);

      return [
        {
          content: "",
          colSpan: 6,
          styles: {
            fillColor,
            lineColor: [217, 219, 239],
            lineWidth: 0.15,
          },
        },
        {
          content: row.label,
          styles: {
            fillColor,
            textColor,
            halign: "right",
            fontStyle: row.highlight ? "bold" : "normal",
            lineColor: [217, 219, 239],
            lineWidth: 0.15,
          },
        },
        {
          content: formatRupiah(row.value),
          styles: {
            fillColor,
            textColor: valueTextColor,
            halign: "right",
            fontStyle: "bold",
            lineColor: [217, 219, 239],
            lineWidth: 0.15,
          },
        },
      ] as RowInput;
    });

    autoTable(doc, {
      startY: 45,
      head: tableHead,
      body: tableBody,
      foot: tableFoot,
      showFoot: "lastPage",
      theme: "grid",
      styles: {
        fontSize: 8.5,
        cellPadding: 2.2,
        lineColor: [217, 219, 239],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [46, 49, 146],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 22, halign: "left" },
        2: { cellWidth: 48, halign: "left" },
        3: { cellWidth: 16, halign: "left" },
        4: { cellWidth: 28, halign: "left" },
        5: { cellWidth: 12, halign: "center" },
        6: { cellWidth: 26, halign: "right" },
        7: { cellWidth: 28, halign: "right" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          data.cell.styles.fontStyle = "bold";
        }
        if (data.section === "body" && data.column.index === 7) {
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    const safeProjectName = (projectName || "summary")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "");
    doc.save(`RPB-${safeProjectName || "summary"}.pdf`);
  };

  return (
    <RpbPageFrame shellClassName="rpb-compact">
      <div className="space-y-4 py-5 md:space-y-3 md:py-6">
          {masterLoading ? (
            <div className="rpb-section p-4 text-sm text-rpb-ink-soft">
              Memuat master data dari database...
            </div>
          ) : null}
          {masterError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {masterError}
            </div>
          ) : null}
          {saveMessage ? (
            <div className="rounded-xl border border-rpb-border bg-white px-4 py-3 text-sm text-rpb-ink-soft">
              {saveMessage}
            </div>
          ) : null}
          <section className="rpb-section p-4 md:p-4">
            <div className="grid gap-2 md:grid-cols-4">
              <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
                Stock Return (%)
                <input
                  className="rpb-input"
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={adjustments.stockReturn}
                  onFocus={selectInputOnFocus}
                  onChange={(event) =>
                    setAdjustment("stockReturn", parsePercentInput(event.target.value))
                  }
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
                Marketing Cost (%)
                <input
                  className="rpb-input"
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={adjustments.marketingCost}
                  onFocus={selectInputOnFocus}
                  onChange={(event) =>
                    setAdjustment("marketingCost", parsePercentInput(event.target.value))
                  }
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
                Services (%)
                <input
                  className="rpb-input"
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={adjustments.services}
                  onFocus={selectInputOnFocus}
                  onChange={(event) =>
                    setAdjustment("services", parsePercentInput(event.target.value))
                  }
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
                Profit (%)
                <input
                  className="rpb-input"
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  value={adjustments.profit}
                  onFocus={selectInputOnFocus}
                  onChange={(event) =>
                    setAdjustment("profit", parsePercentInput(event.target.value))
                  }
                />
              </label>
            </div>
          </section>

          <section className="rpb-section p-3 md:p-4">
            <h3 className="rpb-h-title mb-2 text-base font-semibold">Line Items</h3>
            <div className="hidden lg:block">
              <table className="rpb-table w-full text-sm" style={{ tableLayout: "fixed" }}>
                <thead>
                  <tr>
                    <th style={{ width: "5%", textAlign: "center" }}>No</th>
                    <th style={{ width: "13%", textAlign: "center" }}>Jenis</th>
                    <th style={{ width: "22%", textAlign: "center" }}>Keterangan</th>
                    <th style={{ width: "7%", textAlign: "center" }}>Satuan</th>
                    <th style={{ width: "13%", textAlign: "center" }}>Jenis Spec</th>
                    <th style={{ width: "11%", textAlign: "center" }}>Qty</th>
                    <th style={{ width: "14.5%", textAlign: "right" }}>Harga</th>
                    <th style={{ width: "14.5%", textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => {
                    const isEditable =
                      item.id.startsWith("stock-") || item.id.startsWith("custom-");
                    const lineTotalIdr = item.qty * item.hargaIdr;

                    return (
                      <tr key={item.id}>
                        <td className="text-center align-top">{index + 1}</td>
                        <td className="align-top font-semibold leading-tight">
                          {item.jenis}
                        </td>
                        <td className="align-top leading-tight">
                          {item.keterangan}
                        </td>
                        <td className="align-top leading-tight">
                          {item.satuan}
                        </td>
                        <td className="align-top leading-tight">
                          {item.jenisSpec || "-"}
                        </td>
                        <td className="align-middle text-center whitespace-nowrap">
                          {isEditable ? (
                            <div className="inline-flex items-center gap-1 whitespace-nowrap">
                              <button
                                type="button"
                                className="rpb-btn-ghost inline-flex h-6 w-6 items-center justify-center"
                                onClick={() => updateQty(item.id, item.qty - 1)}
                                aria-label={`Kurangi qty ${item.jenisSpec}`}
                              >
                                <Minus size={10} />
                              </button>
                              <span className="min-w-4 text-center text-xs font-semibold">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                className="rpb-btn-primary inline-flex h-6 w-6 items-center justify-center"
                                onClick={() => updateQty(item.id, item.qty + 1)}
                                aria-label={`Tambah qty ${item.jenisSpec}`}
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold">{item.qty}</span>
                          )}
                        </td>
                        <td className="align-top text-right whitespace-nowrap">
                          {formatRupiah(item.hargaIdr)}
                        </td>
                        <td className="align-top text-right font-semibold whitespace-nowrap">
                          {formatRupiah(lineTotalIdr)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  {calculationRows.map((row) => (
                    <tr key={row.key} className={row.highlight ? "bg-[#2e3192]" : ""}>
                      <td
                        colSpan={6}
                        className={`${
                          row.highlight
                            ? "border-t-0 text-white"
                            : "bg-[#6ccff6]"
                        }`}
                      />
                      <td
                        className={`text-right align-top leading-tight whitespace-normal break-words ${
                          row.highlight
                            ? "border-t-0 font-bold text-white"
                            : "bg-[#6ccff6] text-rpb-ink-soft"
                        }`}
                      >
                        {row.label}
                      </td>
                      <td
                        className={`text-right whitespace-nowrap ${
                          row.highlight
                            ? "border-t-0 font-bold text-white"
                            : "bg-[#6ccff6] font-semibold text-foreground"
                        }`}
                      >
                        {formatRupiah(row.value)}
                      </td>
                    </tr>
                  ))}
                </tfoot>
              </table>
            </div>

            <div className="space-y-2 lg:hidden">
              {lineItems.map((item, index) => {
                const isEditable = item.id.startsWith("stock-") || item.id.startsWith("custom-");
                const lineTotalIdr = item.qty * item.hargaIdr;

                return (
                  <article
                    key={item.id}
                    className="rounded-xl border border-rpb-border bg-white px-3 py-2"
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold leading-tight">
                          {index + 1}. {item.jenis}
                        </p>
                        <p className="text-[10px] leading-tight text-rpb-ink-soft">
                          {item.keterangan}
                        </p>
                        <div className="mt-0.5 flex gap-2 text-[10px] leading-tight text-rpb-ink-soft">
                          <span>Spec: {item.jenisSpec || "-"}</span>
                          <span>Satuan: {item.satuan}</span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isEditable ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              className="rpb-btn-ghost inline-flex h-6 w-6 items-center justify-center"
                              onClick={() => updateQty(item.id, item.qty - 1)}
                              aria-label={`Kurangi qty ${item.jenisSpec}`}
                            >
                              <Minus size={11} />
                            </button>
                            <span className="min-w-4 text-center text-[11px] font-semibold">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              className="rpb-btn-primary inline-flex h-6 w-6 items-center justify-center"
                              onClick={() => updateQty(item.id, item.qty + 1)}
                              aria-label={`Tambah qty ${item.jenisSpec}`}
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-semibold">Qty {item.qty}</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-rpb-border pt-1.5 text-[10px]">
                      <div className="text-right">
                        <p className="text-rpb-ink-soft">Harga</p>
                        <p className="font-semibold leading-tight whitespace-nowrap">
                          {formatRupiah(item.hargaIdr)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-rpb-ink-soft">Total</p>
                        <p className="font-semibold leading-tight whitespace-nowrap">
                          {formatRupiah(lineTotalIdr)}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}

              <article className="rounded-xl border border-rpb-border bg-white px-3 py-2">
                <p className="mb-1.5 text-[11px] font-semibold text-foreground">Ringkasan</p>
                <div className="overflow-hidden rounded-md border border-rpb-border bg-white">
                  <div className="divide-y divide-rpb-border">
                    {calculationRows.map((row) => (
                      <div
                        key={row.key}
                        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2.5 py-1.5 ${
                          row.highlight ? "bg-[#2e3192]" : "bg-[#6ccff6]"
                        }`}
                      >
                        <p
                          className={`text-[10px] leading-tight ${
                            row.highlight ? "font-bold text-white" : "text-rpb-ink-soft"
                          }`}
                        >
                          {row.label}
                        </p>
                        <p
                          className={`text-[10px] leading-tight whitespace-nowrap ${
                            row.highlight ? "font-bold text-white" : "font-semibold text-foreground"
                          }`}
                        >
                          {formatRupiah(row.value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </div>
          </section>

          <div className="no-print space-y-3">
            <Link
              href="/"
              className="rpb-btn-ghost inline-flex h-11 items-center gap-2 px-4 py-2 text-sm font-semibold"
            >
              <ArrowLeft size={16} />
              Back
            </Link>

            <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
              <Link
                href="/quotation"
                className="rpb-btn-ghost inline-flex h-11 items-center justify-center gap-2 px-3 py-2 text-sm font-semibold"
              >
                <FileText size={15} />
                Quotation
              </Link>
              <button
                type="button"
                className="rpb-btn-ghost inline-flex h-11 items-center justify-center gap-2 px-3 py-2 text-sm font-semibold"
                onClick={openSaveModal}
                disabled={saveBusy}
              >
                <Save size={15} />
                {saveBusy ? "Saving..." : "Save"}
              </button>
              <Link
                href="/history"
                className="rpb-btn-ghost inline-flex h-11 items-center justify-center gap-2 px-3 py-2 text-sm font-semibold"
              >
                <History size={15} />
                Save History
              </Link>
              <button
                type="button"
                className="rpb-btn-primary col-span-2 inline-flex h-11 items-center justify-center gap-2 px-4 py-2 text-sm font-semibold md:col-span-1"
                onClick={() => void downloadPdf()}
              >
                <Download size={15} />
                Download PDF
              </button>
            </div>
          </div>
      </div>

      {saveModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#15172b]/45 p-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] backdrop-blur-[2px] md:items-center md:pb-6">
          <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-rpb-border bg-white shadow-xl">
            <div className="rpb-topbar px-5 py-4 text-white">
              <h3 className="rpb-h-title text-lg font-semibold">Save History</h3>
            </div>
            <form className="space-y-4 overflow-y-auto p-5" onSubmit={handleSaveModalSubmit}>
              <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
                Nama history (opsional)
                <input
                  className="rpb-input"
                  value={saveTitleInput}
                  onChange={(event) => setSaveTitleInput(event.target.value)}
                  onFocus={selectInputOnFocus}
                  autoFocus
                />
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rpb-btn-ghost px-4 py-2 text-sm font-semibold"
                  onClick={closeSaveModal}
                  disabled={saveBusy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rpb-btn-primary px-4 py-2 text-sm font-semibold"
                  disabled={saveBusy}
                >
                  {saveBusy ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </RpbPageFrame>
  );
}
