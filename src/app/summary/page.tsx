"use client";

import {
  calculateKonstruksiTotalUsd,
  calculateProfileTotalUsd,
  formatRupiah,
  usdToIdr,
} from "@/lib/rpb-calculator";
import { OTHER_ITEMS } from "@/lib/rpb-data";
import { useRpbStore } from "@/store/rpb-store";
import type { SummaryLineItem } from "@/types/rpb";
import { ArrowLeft, Download, Minus, Plus, Save } from "lucide-react";
import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";
import Link from "next/link";
import { useMemo } from "react";

const parsePercentInput = (value: string): number => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
};

const pctToValue = (subtotal: number, pct: number): number => subtotal * (pct / 100);

export default function SummaryPage() {
  const customerName = useRpbStore((state) => state.customerName);
  const projectName = useRpbStore((state) => state.projectName);
  const dimensions = useRpbStore((state) => state.dimensions);
  const panelThickness = useRpbStore((state) => state.panelThickness);
  const selectedOther = useRpbStore((state) => state.selectedOther);
  const adjustments = useRpbStore((state) => state.adjustments);
  const setOtherQty = useRpbStore((state) => state.setOtherQty);
  const setAdjustment = useRpbStore((state) => state.setAdjustment);

  const profileUsd = useMemo(
    () => calculateProfileTotalUsd(dimensions, panelThickness),
    [dimensions, panelThickness],
  );

  const konstruksiUsd = useMemo(() => calculateKonstruksiTotalUsd(), []);

  const lineItems = useMemo(() => {
    const baseItems: SummaryLineItem[] = [
      {
        id: "profile",
        jenis: "PROFILE",
        keterangan: "Profile Aluminium - layer 1",
        satuan: "Lot",
        jenisSpec: String(panelThickness),
        qty: 1,
        hargaUsd: profileUsd,
      },
      {
        id: "konstruksi",
        jenis: "KONSTRUKSI",
        keterangan: "Plat BJS & konstruksi, paint, etc",
        satuan: "Lot",
        jenisSpec: "1",
        qty: 1,
        hargaUsd: konstruksiUsd,
      },
    ];

    const selectedStockItems = OTHER_ITEMS.filter((item) => (selectedOther[item.id] ?? 0) > 0);
    const stockLines: SummaryLineItem[] = selectedStockItems.map((item) => ({
      id: `other-${item.id}`,
      jenis: item.category,
      keterangan: item.model === "-" ? item.name : item.model,
      satuan: item.unit,
      jenisSpec: item.name,
      qty: selectedOther[item.id] ?? 0,
      hargaUsd: item.priceUsd,
    }));

    return [...baseItems, ...stockLines];
  }, [konstruksiUsd, panelThickness, profileUsd, selectedOther]);

  const subtotalUsd = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.hargaUsd * item.qty, 0),
    [lineItems],
  );

  const stockReturnUsd = pctToValue(subtotalUsd, adjustments.stockReturn);
  const marketingCostUsd = pctToValue(subtotalUsd, adjustments.marketingCost);
  const servicesUsd = pctToValue(subtotalUsd, adjustments.services);
  const baseAfterAdjustUsd = subtotalUsd + stockReturnUsd + marketingCostUsd + servicesUsd;
  const profitUsd = pctToValue(baseAfterAdjustUsd, adjustments.profit);
  const grandTotalUsd = baseAfterAdjustUsd + profitUsd;

  const updateQty = (itemId: string, qty: number) => {
    if (!itemId.startsWith("other-")) {
      return;
    }

    const stockId = itemId.replace("other-", "");
    setOtherQty(stockId, Math.max(0, qty));
  };

  const saveState = () => {
    window.alert("Data tersimpan di browser (local storage).");
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
      formatRupiah(usdToIdr(item.hargaUsd)),
      formatRupiah(usdToIdr(item.hargaUsd * item.qty)),
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
      ["Subtotal Items", formatRupiah(usdToIdr(subtotalUsd))],
      ["Stock Return", formatRupiah(usdToIdr(stockReturnUsd))],
      ["Marketing Cost", formatRupiah(usdToIdr(marketingCostUsd))],
      ["Services", formatRupiah(usdToIdr(servicesUsd))],
      ["Base After Adjust", formatRupiah(usdToIdr(baseAfterAdjustUsd))],
      ["Profit", formatRupiah(usdToIdr(profitUsd))],
      ["Grand Total", formatRupiah(usdToIdr(grandTotalUsd))],
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
        <header className="rpb-topbar flex items-center justify-center px-4 py-3 text-white md:px-6">
          <h1 className="rpb-h-title text-xl font-semibold md:text-2xl">RPB</h1>
        </header>

        <div className="space-y-4 p-5 md:space-y-3 md:px-10 md:py-6 lg:px-12">
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
                    const isEditable = item.id.startsWith("other-");
                    const lineTotalUsd = item.qty * item.hargaUsd;

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
                        <td>{formatRupiah(usdToIdr(item.hargaUsd))}</td>
                        <td className="font-semibold">
                          {formatRupiah(usdToIdr(lineTotalUsd))}
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
                    <span>{formatRupiah(usdToIdr(subtotalUsd))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Stock Return</span>
                    <span>{formatRupiah(usdToIdr(stockReturnUsd))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Marketing Cost</span>
                    <span>{formatRupiah(usdToIdr(marketingCostUsd))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Services</span>
                    <span>{formatRupiah(usdToIdr(servicesUsd))}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-rpb-border pt-2 font-semibold text-foreground">
                    <span>Base After Adjust</span>
                    <span>{formatRupiah(usdToIdr(baseAfterAdjustUsd))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Profit</span>
                    <span>{formatRupiah(usdToIdr(profitUsd))}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start md:justify-end">
                <div className="rpb-price-pill inline-flex w-fit flex-col gap-0.5 px-5 py-3">
                  <span className="text-sm font-semibold">Grand Total</span>
                  <span className="text-xl font-bold">
                    {formatRupiah(usdToIdr(grandTotalUsd))}
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
              <button
                type="button"
                className="rpb-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
                onClick={saveState}
              >
                <Save size={15} />
                Save
              </button>
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
