"use client";

import { RpbPageFrame } from "@/components/layout/rpb-page-frame";
import { useRpbMasterData } from "@/hooks/use-rpb-master-data";
import { formatRupiah } from "@/lib/rpb-calculator";
import { buildSummaryLineItems } from "@/lib/rpb-line-items";
import { useRpbStore } from "@/store/rpb-store";
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Download,
  Italic,
  RotateCcw,
  Table2,
  Underline,
} from "lucide-react";
import autoTable from "jspdf-autotable";
import jsPDF from "jspdf";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatDate = () =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

export default function QuotationPage() {
  const { data: masterData, loading: masterLoading, error: masterError } = useRpbMasterData();
  const customerName = useRpbStore((state) => state.customerName);
  const projectName = useRpbStore((state) => state.projectName);
  const dimensions = useRpbStore((state) => state.dimensions);
  const panelThickness = useRpbStore((state) => state.panelThickness);
  const selectedOther = useRpbStore((state) => state.selectedOther);
  const customOtherItems = useRpbStore((state) => state.customOtherItems);
  const adjustments = useRpbStore((state) => state.adjustments);
  const quotationContent = useRpbStore((state) => state.quotationContent);
  const setQuotationContent = useRpbStore((state) => state.setQuotationContent);

  const editorRef = useRef<HTMLDivElement>(null);
  const hasInitializedRef = useRef(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

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
  const stockReturnIdr = subtotalIdr * (adjustments.stockReturn / 100);
  const marketingCostIdr = subtotalIdr * (adjustments.marketingCost / 100);
  const servicesIdr = subtotalIdr * (adjustments.services / 100);
  const profitIdr = subtotalIdr * (adjustments.profit / 100);
  const grandTotalIdr =
    subtotalIdr + stockReturnIdr + marketingCostIdr + servicesIdr + profitIdr;

  useEffect(() => {
    if (!editorRef.current || hasInitializedRef.current) {
      return;
    }

    const initialContent =
      quotationContent.trim() ||
      `<h2>PENAWARAN HARGA</h2>
<p><strong>Kepada:</strong> ${escapeHtml(customerName || "-")}<br/>
<strong>Proyek:</strong> ${escapeHtml(projectName || "-")}<br/>
<strong>Dimensi:</strong> ${dimensions.length} x ${dimensions.width} x ${dimensions.height} mm | Tebal Panel: ${panelThickness} mm<br/>
<strong>Tanggal:</strong> ${escapeHtml(formatDate())}</p>
<p>Dengan hormat, bersama ini kami sampaikan penawaran harga sebagai berikut:</p>`;

    editorRef.current.innerHTML = initialContent;
    if (!quotationContent.trim()) {
      setQuotationContent(initialContent);
    }
    hasInitializedRef.current = true;
  }, [
    customerName,
    dimensions.height,
    dimensions.length,
    dimensions.width,
    panelThickness,
    projectName,
    quotationContent,
    setQuotationContent,
  ]);

  const saveContent = () => {
    if (!editorRef.current) {
      return;
    }
    setQuotationContent(editorRef.current.innerHTML);
  };

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    saveContent();
    editorRef.current?.focus();
  };

  const generateRpbTableHtml = () => {
    let rows = "";
    const cellBaseStyle =
      "padding:4px 5px;border-bottom:1px solid #eceef8;font-size:9px;line-height:1.35;overflow-wrap:anywhere;word-break:break-word;";

    const categories = [
      { key: "PROFILE", label: "Profile" },
      { key: "KONSTRUKSI", label: "Konstruksi" },
    ] as const;

    let no = 1;
    for (const category of categories) {
      const items = lineItems.filter((item) => item.jenis === category.key);
      if (items.length === 0) {
        continue;
      }

      rows += `
        <tr style="background:#fff7cc;">
          <td colspan="6" style="padding:6px 8px;font-weight:700;color:#3b3d79;font-size:10px;">${category.label}</td>
        </tr>`;

      for (const item of items) {
        rows += `
          <tr>
            <td style="${cellBaseStyle}text-align:center;width:24px;">${no++}</td>
            <td style="${cellBaseStyle}font-weight:600;">${escapeHtml(item.jenis)}<br/><span style="font-weight:400;color:#5b6186;">${escapeHtml(item.keterangan)}</span></td>
            <td style="${cellBaseStyle}">${escapeHtml(item.jenisSpec)}<br/><span style="color:#6d739a;">${escapeHtml(item.satuan)}</span></td>
            <td style="${cellBaseStyle}text-align:right;">${item.qty}</td>
            <td style="${cellBaseStyle}text-align:right;">${escapeHtml(formatRupiah(item.hargaIdr))}</td>
            <td style="${cellBaseStyle}text-align:right;font-weight:700;">${escapeHtml(formatRupiah(item.hargaIdr * item.qty))}</td>
          </tr>`;
      }
    }

    const otherItems = lineItems.filter(
      (item) => item.jenis !== "PROFILE" && item.jenis !== "KONSTRUKSI",
    );
    if (otherItems.length > 0) {
      rows += `
        <tr style="background:#fff7cc;">
          <td colspan="6" style="padding:6px 8px;font-weight:700;color:#3b3d79;font-size:10px;">Other / Tambahan</td>
        </tr>`;
      for (const item of otherItems) {
        rows += `
          <tr>
            <td style="${cellBaseStyle}text-align:center;width:24px;">${no++}</td>
            <td style="${cellBaseStyle}font-weight:600;">${escapeHtml(item.jenis)}<br/><span style="font-weight:400;color:#5b6186;">${escapeHtml(item.keterangan)}</span></td>
            <td style="${cellBaseStyle}">${escapeHtml(item.jenisSpec)}<br/><span style="color:#6d739a;">${escapeHtml(item.satuan)}</span></td>
            <td style="${cellBaseStyle}text-align:right;">${item.qty}</td>
            <td style="${cellBaseStyle}text-align:right;">${escapeHtml(formatRupiah(item.hargaIdr))}</td>
            <td style="${cellBaseStyle}text-align:right;font-weight:700;">${escapeHtml(formatRupiah(item.hargaIdr * item.qty))}</td>
          </tr>`;
      }
    }

    return `
      <div style="margin:16px 0;">
        <table style="width:100%;table-layout:fixed;border-collapse:collapse;font-family:Arial,sans-serif;border:1px solid #d9dbef;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#6365b9;">
              <th style="padding:5px 4px;color:#fff;text-align:center;font-size:9px;width:24px;">No</th>
              <th style="padding:5px 4px;color:#fff;text-align:left;font-size:9px;">Item</th>
              <th style="padding:5px 4px;color:#fff;text-align:left;font-size:9px;">Spec</th>
              <th style="padding:5px 4px;color:#fff;text-align:right;font-size:9px;width:44px;">Qty</th>
              <th style="padding:5px 4px;color:#fff;text-align:right;font-size:9px;width:68px;">Harga</th>
              <th style="padding:5px 4px;color:#fff;text-align:right;font-size:9px;width:68px;">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="padding:4px 5px;text-align:right;border-top:1px solid #d9dbef;font-size:9px;">Subtotal</td>
              <td style="padding:4px 5px;text-align:right;border-top:1px solid #d9dbef;font-size:9px;font-weight:600;">${escapeHtml(formatRupiah(subtotalIdr))}</td>
            </tr>
            <tr>
              <td colspan="5" style="padding:4px 5px;text-align:right;font-size:9px;color:#555;">Stock Return (${adjustments.stockReturn}%)</td>
              <td style="padding:4px 5px;text-align:right;font-size:9px;">${escapeHtml(formatRupiah(stockReturnIdr))}</td>
            </tr>
            <tr>
              <td colspan="5" style="padding:4px 5px;text-align:right;font-size:9px;color:#555;">Marketing Cost (${adjustments.marketingCost}%)</td>
              <td style="padding:4px 5px;text-align:right;font-size:9px;">${escapeHtml(formatRupiah(marketingCostIdr))}</td>
            </tr>
            <tr>
              <td colspan="5" style="padding:4px 5px;text-align:right;font-size:9px;color:#555;">Services (${adjustments.services}%)</td>
              <td style="padding:4px 5px;text-align:right;font-size:9px;">${escapeHtml(formatRupiah(servicesIdr))}</td>
            </tr>
            <tr>
              <td colspan="5" style="padding:4px 5px;text-align:right;font-size:9px;color:#555;">Profit (${adjustments.profit}%)</td>
              <td style="padding:4px 5px;text-align:right;font-size:9px;">${escapeHtml(formatRupiah(profitIdr))}</td>
            </tr>
            <tr style="background:#6365b9;">
              <td colspan="5" style="padding:5px;text-align:right;color:#fff;font-weight:800;font-size:9px;">GRAND TOTAL</td>
              <td style="padding:5px;text-align:right;color:#fff;font-weight:800;font-size:10px;">${escapeHtml(formatRupiah(grandTotalIdr))}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;
  };

  const insertRpbTable = () => {
    if (!editorRef.current) {
      return;
    }
    editorRef.current.focus();
    document.execCommand("insertHTML", false, generateRpbTableHtml());
    saveContent();
  };

  const resetEditor = () => {
    if (!editorRef.current) {
      return;
    }
    editorRef.current.innerHTML = "";
    setQuotationContent("");
    hasInitializedRef.current = false;
  };

  const handleDownloadPdf = async () => {
    saveContent();
    if (!editorRef.current || pdfBusy) {
      return;
    }

    setPdfBusy(true);
    setPdfError(null);
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const pageBottom = pageHeight - margin;
      let cursorY = margin;

      const ensureSpace = (requiredHeight: number) => {
        if (cursorY + requiredHeight <= pageBottom) {
          return;
        }
        pdf.addPage();
        cursorY = margin;
      };

      const toWrappedLines = (rawText: string) => {
        const normalized = rawText.replace(/\u00a0/g, " ").trim();
        if (!normalized) {
          return [] as string[];
        }

        const segments = normalized.split(/\r?\n/);
        const lines: string[] = [];
        for (const segment of segments) {
          const text = segment.trim();
          if (!text) {
            lines.push("");
            continue;
          }
          lines.push(...pdf.splitTextToSize(text, contentWidth));
        }
        return lines;
      };

      const drawTextBlock = (
        rawText: string,
        options: { fontSize: number; fontStyle?: "normal" | "bold"; marginBottom: number },
      ) => {
        const lines = toWrappedLines(rawText);
        if (lines.length === 0) {
          cursorY += options.marginBottom;
          return;
        }

        const lineHeight = Math.max(4, options.fontSize * 0.45);
        ensureSpace(lines.length * lineHeight + options.marginBottom);
        pdf.setFont("helvetica", options.fontStyle ?? "normal");
        pdf.setFontSize(options.fontSize);
        pdf.text(lines, margin, cursorY);
        cursorY += lines.length * lineHeight + options.marginBottom;
      };

      const container = document.createElement("div");
      container.innerHTML = editorRef.current.innerHTML;
      const blocks = Array.from(container.children);
      if (blocks.length === 0) {
        throw new Error("Konten quotation kosong.");
      }

      for (const block of blocks) {
        const tag = block.tagName.toLowerCase();
        const tableElement =
          tag === "table" ? (block as HTMLTableElement) : block.querySelector("table");

        if (tableElement) {
          let tableHead: string[] | null = null;
          const tableRows: string[][] = [];

          for (const row of Array.from(tableElement.querySelectorAll("tr"))) {
            const cells = Array.from(row.children).filter((cell) => {
              const cellTag = cell.tagName.toLowerCase();
              return cellTag === "th" || cellTag === "td";
            });
            if (cells.length === 0) {
              continue;
            }

            const rowValues = cells.map((cell) =>
              ((cell as HTMLElement).innerText || cell.textContent || "")
                .replace(/\u00a0/g, " ")
                .replace(/\s+/g, " ")
                .trim(),
            );
            const hasHeaderCell = cells.some((cell) => cell.tagName.toLowerCase() === "th");

            if (!tableHead && hasHeaderCell) {
              tableHead = rowValues;
              continue;
            }
            tableRows.push(rowValues);
          }

          const maxColumns = Math.max(
            tableHead?.length ?? 0,
            ...tableRows.map((row) => row.length),
            1,
          );
          const normalizeRow = (row: string[]) =>
            Array.from({ length: maxColumns }, (_, index) => row[index] ?? "");
          const normalizedHead = normalizeRow(
            tableHead ??
              Array.from({ length: maxColumns }, (_, index) => `Kolom ${index + 1}`),
          );
          const normalizedBody = tableRows.map(normalizeRow);
          const sectionRows = new Set<number>();

          normalizedBody.forEach((row, index) => {
            if (row[0] && row.slice(1).every((cell) => !cell)) {
              sectionRows.add(index);
            }
          });

          ensureSpace(20);
          autoTable(pdf, {
            startY: cursorY,
            head: [normalizedHead],
            body: normalizedBody,
            margin: { left: margin, right: margin },
            theme: "grid",
            styles: {
              fontSize: 8.5,
              cellPadding: 1.8,
              lineColor: [217, 219, 239],
              lineWidth: 0.1,
            },
            headStyles: {
              fillColor: [99, 101, 185],
              textColor: [255, 255, 255],
              fontStyle: "bold",
            },
            didParseCell: (data) => {
              if (data.section === "body" && sectionRows.has(data.row.index)) {
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fillColor = [255, 247, 204];
                data.cell.styles.textColor = [59, 61, 121];
              }
              if (data.section === "head" || data.section === "body") {
                if (data.column.index >= Math.max(0, maxColumns - 3)) {
                  data.cell.styles.halign = "right";
                }
              }
            },
          });
          cursorY =
            ((pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
              cursorY) + 5;
          continue;
        }

        const text = (block as HTMLElement).innerText || block.textContent || "";
        if (tag === "h1") {
          drawTextBlock(text, { fontSize: 18, fontStyle: "bold", marginBottom: 3 });
          continue;
        }
        if (tag === "h2") {
          drawTextBlock(text, { fontSize: 16, fontStyle: "bold", marginBottom: 3 });
          continue;
        }
        if (tag === "h3") {
          drawTextBlock(text, { fontSize: 13, fontStyle: "bold", marginBottom: 2.6 });
          continue;
        }
        drawTextBlock(text, { fontSize: 11, marginBottom: 2.6 });
      }

      if (cursorY === margin) {
        drawTextBlock(editorRef.current.textContent || "", {
          fontSize: 11,
          marginBottom: 2.6,
        });
      }

      if (cursorY === margin) {
        throw new Error("Konten quotation kosong.");
      }

      const safeProjectName = (projectName || "quotation")
        .replace(/[^a-z0-9-_]+/gi, "-")
        .replace(/^-+|-+$/g, "");
      pdf.save(`Quotation-${safeProjectName || "quotation"}.pdf`);
    } catch (error) {
      setPdfError(
        error instanceof Error ? `Gagal download PDF: ${error.message}` : "Gagal download PDF.",
      );
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <RpbPageFrame shellClassName="print-a4" headerClassName="no-print">
      <div className="space-y-3 py-3 md:py-4">
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
          {pdfError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {pdfError}
            </div>
          ) : null}

          <section className="rpb-section no-print p-2 md:p-3">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <select
                defaultValue=""
                className="rpb-input w-auto min-w-[108px] text-xs sm:min-w-[130px] sm:text-sm"
                onChange={(event) => {
                  if (event.target.value) {
                    execCmd("formatBlock", event.target.value);
                    event.target.value = "";
                  }
                }}
              >
                <option value="" disabled>
                  Heading
                </option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="p">Paragraph</option>
              </select>

              <button
                type="button"
                className="rpb-btn-ghost inline-flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execCmd("bold");
                }}
                title="Bold"
              >
                <Bold size={15} />
              </button>
              <button
                type="button"
                className="rpb-btn-ghost inline-flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execCmd("italic");
                }}
                title="Italic"
              >
                <Italic size={15} />
              </button>
              <button
                type="button"
                className="rpb-btn-ghost inline-flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execCmd("underline");
                }}
                title="Underline"
              >
                <Underline size={15} />
              </button>
              <button
                type="button"
                className="rpb-btn-ghost inline-flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execCmd("justifyLeft");
                }}
                title="Align Left"
              >
                <AlignLeft size={15} />
              </button>
              <button
                type="button"
                className="rpb-btn-ghost inline-flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9"
                onMouseDown={(e) => {
                  e.preventDefault();
                  execCmd("justifyCenter");
                }}
                title="Align Center"
              >
                <AlignCenter size={15} />
              </button>

              <button
                type="button"
                className="rpb-btn-primary inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold sm:gap-2 sm:px-3 sm:text-sm"
                onClick={insertRpbTable}
                disabled={masterLoading || lineItems.length === 0}
                title={
                  lineItems.length === 0 ? "Lengkapi data summary terlebih dahulu." : "Insert tabel RPB"
                }
              >
                <Table2 size={15} />
                Insert Tabel
              </button>

              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  className="rpb-btn-ghost inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold sm:gap-2 sm:px-3 sm:text-sm"
                  onClick={resetEditor}
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#7c3aed] px-2.5 py-2 text-xs font-semibold text-white sm:gap-2 sm:px-3 sm:text-sm"
                  onClick={() => void handleDownloadPdf()}
                  disabled={pdfBusy}
                >
                  <Download size={14} />
                  {pdfBusy ? "Menyiapkan PDF..." : "Download PDF"}
                </button>
              </div>
            </div>

            {lineItems.length === 0 ? (
              <div className="rounded-xl border border-[#ffde55] bg-[#fff7cc] px-4 py-3 text-sm text-[#7c5a00]">
                Belum ada data estimasi. Isi data di halaman input/summary agar tombol insert tabel bisa digunakan.
              </div>
            ) : null}
          </section>

          <section className="rpb-section rpb-paper-wrap p-2 sm:p-3">
            <div className="rpb-doc-canvas">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={saveContent}
                className="rpb-plain-editor min-h-[72vh] outline-none"
                data-placeholder="Ketik isi penawaran di sini, lalu klik 'Insert Tabel RPB' untuk memasukkan tabel harga otomatis..."
              />
            </div>
          </section>

          <div className="no-print flex justify-end">
            <Link
              href="/summary"
              className="rpb-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
            >
              Back to Summary
            </Link>
          </div>
      </div>

      <style>{`
        .rpb-plain-editor {
          color: #1f2340;
          font-size: 13px;
          line-height: 1.6;
          font-family: Arial, sans-serif;
        }
        .rpb-plain-editor:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .rpb-plain-editor h1 {
          font-size: 1.3rem;
          font-weight: 800;
          margin: 0.8rem 0 0.45rem;
          color: #1f2340;
        }
        .rpb-plain-editor h2 {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0.75rem 0 0.35rem;
          color: #2d3173;
        }
        .rpb-plain-editor h3 {
          font-size: 0.98rem;
          font-weight: 700;
          margin: 0.65rem 0 0.3rem;
          color: #4548a8;
        }
        .rpb-plain-editor p {
          margin: 0.4rem 0;
        }
        .rpb-plain-editor table {
          width: 100% !important;
          max-width: 100% !important;
          table-layout: fixed;
          border-collapse: collapse;
        }
        .rpb-plain-editor th,
        .rpb-plain-editor td {
          padding: 4px !important;
          font-size: 9px !important;
          line-height: 1.3 !important;
          overflow-wrap: anywhere;
          word-break: break-word;
          white-space: normal;
        }
        @media (min-width: 768px) {
          .rpb-plain-editor {
            font-size: 14px;
            line-height: 1.7;
          }
          .rpb-plain-editor th,
          .rpb-plain-editor td {
            padding: 5px !important;
            font-size: 10px !important;
          }
        }
      `}</style>
    </RpbPageFrame>
  );
}
