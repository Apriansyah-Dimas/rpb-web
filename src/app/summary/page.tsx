"use client";

import {
  formatRupiah,
} from "@/lib/rpb-calculator";
import { RpbUserActions } from "@/components/rpb-user-actions";
import { useRpbMasterData } from "@/hooks/use-rpb-master-data";
import { buildSummaryLineItems } from "@/lib/rpb-line-items";
import { saveSummaryHistory } from "@/lib/rpb-db";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRpbStore } from "@/store/rpb-store";
import { ArrowLeft, Download, FileText, History, Minus, Plus, Save } from "lucide-react";
import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";
import Link from "next/link";
import type { FocusEvent } from "react";
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

  const saveState = async () => {
    const title =
      window.prompt(
        "Nama history (opsional).",
        `${projectName || "RPB"} - ${new Intl.DateTimeFormat("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(new Date())}`,
      ) ?? "";

    setSaveBusy(true);
    setSaveMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await saveSummaryHistory(supabase, {
        title: title.trim() || projectName || "RPB Summary",
        customerName,
        projectName,
        snapshot: getSnapshot(),
      });
      setSaveMessage("History berhasil disimpan ke database.");
    } catch (error) {
      setSaveMessage(
        error instanceof Error ? `Gagal menyimpan history: ${error.message}` : "Gagal menyimpan.",
      );
    } finally {
      setSaveBusy(false);
    }
  };

  const downloadPdf = () => {
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

    autoTable(doc, {
      startY: 45,
      head: tableHead,
      body: tableBody,
      theme: "grid",
      styles: {
        fontSize: 8.5,
        cellPadding: 2.2,
        lineColor: [217, 219, 239],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [99, 101, 185],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 22 },
        2: { cellWidth: 48 },
        3: { cellWidth: 16 },
        4: { cellWidth: 28 },
        5: { cellWidth: 12, halign: "right" },
        6: { cellWidth: 26, halign: "right" },
        7: { cellWidth: 28, halign: "right" },
      },
    });

    const lineItemsTable = (doc as jsPDF & { lastAutoTable?: { finalY: number } })
      .lastAutoTable;
    const summaryRows = [
      ["Subtotal Items", formatRupiah(subtotalIdr)],
      ["Stock Return", formatRupiah(stockReturnIdr)],
      ["Marketing Cost", formatRupiah(marketingCostIdr)],
      ["Services", formatRupiah(servicesIdr)],
      ["Base After Adjust", formatRupiah(baseAfterAdjustIdr)],
      ["Profit", formatRupiah(profitIdr)],
      ["Grand Total", formatRupiah(grandTotalIdr)],
    ];

    autoTable(doc, {
      startY: (lineItemsTable?.finalY ?? 45) + 7,
      head: [["Ringkasan Perhitungan", "Nilai"]],
      body: summaryRows,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 2.4,
        lineColor: [217, 219, 239],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [99, 101, 185],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 55, halign: "right" },
      },
      didParseCell: (data) => {
        const grandTotalRowIndex = summaryRows.length - 1;
        if (data.section === "body" && data.row.index === grandTotalRowIndex) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [238, 240, 255];
          data.cell.styles.textColor = [31, 35, 64];
        }
      },
    });

    const safeProjectName = (projectName || "summary")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "");
    doc.save(`RPB-${safeProjectName || "summary"}.pdf`);
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl p-4 md:px-10 md:py-5 lg:px-12">
      <main className="rpb-shell rpb-compact overflow-hidden">
        <header className="rpb-topbar flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-white md:px-6">
          <h1 className="rpb-h-title text-xl font-semibold md:text-2xl">RPB</h1>
          <RpbUserActions />
        </header>

        <div className="space-y-4 p-5 md:space-y-3 md:px-10 md:py-6 lg:px-12">
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

          <section className="rpb-section p-4 md:p-4">
            <h3 className="rpb-h-title mb-2 text-base font-semibold">Line Items</h3>
            <div className="overflow-x-auto">
              <table className="rpb-table min-w-[960px] w-full text-sm">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Jenis</th>
                    <th>Keterangan</th>
                    <th>Satuan</th>
                    <th>Jenis Spec</th>
                    <th>Qty</th>
                    <th>Harga</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => {
                    const isEditable = item.id.startsWith("stock-") || item.id.startsWith("custom-");
                    const lineTotalIdr = item.qty * item.hargaIdr;

                    return (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td className="font-semibold">{item.jenis}</td>
                        <td>{item.keterangan}</td>
                        <td>{item.satuan}</td>
                        <td>{item.jenisSpec}</td>
                        <td>
                          {isEditable ? (
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                className="rpb-btn-ghost inline-flex h-8 w-8 items-center justify-center"
                                onClick={() => updateQty(item.id, item.qty - 1)}
                                aria-label={`Kurangi qty ${item.jenisSpec}`}
                              >
                                <Minus size={14} />
                              </button>
                              <span className="min-w-8 text-center font-semibold">
                                {item.qty}
                              </span>
                              <button
                                type="button"
                                className="rpb-btn-primary inline-flex h-8 w-8 items-center justify-center"
                                onClick={() => updateQty(item.id, item.qty + 1)}
                                aria-label={`Tambah qty ${item.jenisSpec}`}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="font-semibold">{item.qty}</span>
                          )}
                        </td>
                        <td>{formatRupiah(item.hargaIdr)}</td>
                        <td className="font-semibold">
                          {formatRupiah(lineTotalIdr)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <div className="rpb-section p-4">
                <p className="mb-2 font-semibold">Ringkasan Perhitungan</p>
                <div className="space-y-1 text-rpb-ink-soft">
                  <div className="flex items-center justify-between">
                    <span>Subtotal Items</span>
                    <span>{formatRupiah(subtotalIdr)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Stock Return</span>
                    <span>{formatRupiah(stockReturnIdr)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Marketing Cost</span>
                    <span>{formatRupiah(marketingCostIdr)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Services</span>
                    <span>{formatRupiah(servicesIdr)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-rpb-border pt-2 font-semibold text-foreground">
                    <span>Base After Adjust</span>
                    <span>{formatRupiah(baseAfterAdjustIdr)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Profit</span>
                    <span>{formatRupiah(profitIdr)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start md:justify-end">
                <div className="rpb-price-pill inline-flex w-fit flex-col gap-0.5 px-5 py-3">
                  <span className="text-sm font-semibold">Grand Total</span>
                  <span className="text-xl font-bold">
                    {formatRupiah(grandTotalIdr)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div className="no-print flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="rpb-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
            >
              <ArrowLeft size={16} />
              Back
            </Link>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/quotation"
                className="rpb-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
              >
                <FileText size={15} />
                Quotation
              </Link>
              <button
                type="button"
                className="rpb-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                onClick={saveState}
                disabled={saveBusy}
              >
                <Save size={15} />
                {saveBusy ? "Saving..." : "Save"}
              </button>
              <Link
                href="/history"
                className="rpb-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
              >
                <History size={15} />
                Save History
              </Link>
              <button
                type="button"
                className="rpb-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                onClick={downloadPdf}
              >
                <Download size={15} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
