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
  const quotationCanvasRef = useRef<HTMLDivElement>(null);
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
    const baseCellStyle =
      "padding:4px 5px;border-bottom:1px solid #d9dbef;font-size:8.5pt;line-height:1.3;overflow-wrap:anywhere;word-break:break-word;";

    const rows = lineItems
      .map((item, index) => {
        const lineTotalIdr = item.hargaIdr * item.qty;
        return `
          <tr>
            <td style="${baseCellStyle}text-align:center;">${index + 1}</td>
            <td style="${baseCellStyle}font-weight:600;">${escapeHtml(item.jenis)}</td>
            <td style="${baseCellStyle}">${escapeHtml(item.keterangan)}</td>
            <td style="${baseCellStyle}">${escapeHtml(item.satuan || "-")}</td>
            <td style="${baseCellStyle}">${escapeHtml(item.jenisSpec || "-")}</td>
            <td style="${baseCellStyle}text-align:center;">${item.qty}</td>
            <td style="${baseCellStyle}text-align:right;white-space:nowrap;">${escapeHtml(formatRupiah(item.hargaIdr))}</td>
            <td style="${baseCellStyle}text-align:right;font-weight:700;white-space:nowrap;">${escapeHtml(formatRupiah(lineTotalIdr))}</td>
          </tr>`;
      })
      .join("");

    return `
      <div style="margin:16px 0;">
        <table style="width:100%;table-layout:fixed;border-collapse:collapse;font-family:Arial,sans-serif;border:1px solid #d9dbef;">
          <thead>
            <tr style="background:#6365b9;">
              <th style="padding:5px 4px;color:#fff;text-align:center;font-size:9pt;width:5%;">No</th>
              <th style="padding:5px 4px;color:#fff;text-align:center;font-size:9pt;width:13%;">Jenis</th>
              <th style="padding:5px 4px;color:#fff;text-align:center;font-size:9pt;width:22%;">Keterangan</th>
              <th style="padding:5px 4px;color:#fff;text-align:center;font-size:9pt;width:7%;">Satuan</th>
              <th style="padding:5px 4px;color:#fff;text-align:center;font-size:9pt;width:13%;">Jenis Spec</th>
              <th style="padding:5px 4px;color:#fff;text-align:center;font-size:9pt;width:11%;">Qty</th>
              <th style="padding:5px 4px;color:#fff;text-align:right;font-size:9pt;width:14.5%;">Harga</th>
              <th style="padding:5px 4px;color:#fff;text-align:right;font-size:9pt;width:14.5%;">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="6" style="padding:4px 5px;background:#fbfbff;border-top:1px solid #d9dbef;"></td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;color:#555;">Subtotal</td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;font-weight:600;white-space:nowrap;">${escapeHtml(formatRupiah(subtotalIdr))}</td>
            </tr>
            <tr>
              <td colspan="6" style="padding:4px 5px;background:#fbfbff;"></td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;color:#555;">Stock Return (${adjustments.stockReturn}%)</td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;white-space:nowrap;">${escapeHtml(formatRupiah(stockReturnIdr))}</td>
            </tr>
            <tr>
              <td colspan="6" style="padding:4px 5px;background:#fbfbff;"></td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;color:#555;">Marketing Cost (${adjustments.marketingCost}%)</td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;white-space:nowrap;">${escapeHtml(formatRupiah(marketingCostIdr))}</td>
            </tr>
            <tr>
              <td colspan="6" style="padding:4px 5px;background:#fbfbff;"></td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;color:#555;">Services (${adjustments.services}%)</td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;white-space:nowrap;">${escapeHtml(formatRupiah(servicesIdr))}</td>
            </tr>
            <tr>
              <td colspan="6" style="padding:4px 5px;background:#fbfbff;"></td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;color:#555;">Profit (${adjustments.profit}%)</td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;white-space:nowrap;">${escapeHtml(formatRupiah(profitIdr))}</td>
            </tr>
            <tr style="background:#6365b9;">
              <td colspan="6" style="padding:5px;border-top:0;"></td>
              <td style="padding:5px;text-align:right;color:#fff;font-weight:800;font-size:9pt;border-top:0;">GRAND TOTAL</td>
              <td style="padding:5px;text-align:right;color:#fff;font-weight:800;font-size:10pt;white-space:nowrap;border-top:0;">${escapeHtml(formatRupiah(grandTotalIdr))}</td>
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
    if (!quotationCanvasRef.current || pdfBusy) {
      return;
    }

    setPdfBusy(true);
    setPdfError(null);
    try {
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement) {
        activeElement.blur();
      }

      if ("fonts" in document) {
        await document.fonts.ready;
      }

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      const { default: html2canvas } = await import("html2canvas");
      const sourceCanvas = quotationCanvasRef.current;
      const renderedCanvas = await html2canvas(sourceCanvas, {
        backgroundColor: "#ffffff",
        scale: Math.max(2, window.devicePixelRatio || 1),
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
      });

      if (renderedCanvas.width === 0 || renderedCanvas.height === 0) {
        throw new Error("Konten quotation kosong.");
      }

      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageData = renderedCanvas.toDataURL("image/png");
      const imageWidthMm = pageWidth;
      const imageHeightMm = (renderedCanvas.height * imageWidthMm) / renderedCanvas.width;
      let remainingHeightMm = imageHeightMm;
      let imageOffsetMm = 0;

      pdf.addImage(imageData, "PNG", 0, imageOffsetMm, imageWidthMm, imageHeightMm, undefined, "FAST");
      remainingHeightMm -= pageHeight;

      while (remainingHeightMm > 0) {
        imageOffsetMm = remainingHeightMm - imageHeightMm;
        pdf.addPage();
        pdf.addImage(
          imageData,
          "PNG",
          0,
          imageOffsetMm,
          imageWidthMm,
          imageHeightMm,
          undefined,
          "FAST",
        );
        remainingHeightMm -= pageHeight;
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
            <div className="rpb-quotation-stage">
              <div ref={quotationCanvasRef} className="rpb-doc-canvas rpb-quotation-canvas">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={saveContent}
                className="rpb-plain-editor min-h-[72vh] outline-none"
                data-placeholder="Ketik isi penawaran di sini, lalu klik 'Insert Tabel RPB' untuk memasukkan tabel harga otomatis..."
              />
              </div>
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
        .rpb-quotation-stage {
          display: flex;
          justify-content: center;
          overflow-x: hidden;
        }
        .rpb-quotation-canvas {
          width: min(100%, 210mm);
          min-height: 297mm;
          padding: 10mm;
          border: 1px solid #e2e6f3;
          border-radius: 0;
          background: #fff;
          box-shadow: 0 12px 30px rgba(33, 39, 89, 0.12);
        }
        .rpb-plain-editor {
          color: #1f2340;
          font-size: 11pt;
          line-height: 1.45;
          font-family: Arial, sans-serif;
        }
        .rpb-plain-editor:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .rpb-plain-editor h1 {
          font-size: 18pt;
          font-weight: 800;
          margin: 0.8rem 0 0.45rem;
          color: #1f2340;
        }
        .rpb-plain-editor h2 {
          font-size: 16pt;
          font-weight: 700;
          margin: 0.75rem 0 0.35rem;
          color: #2d3173;
        }
        .rpb-plain-editor h3 {
          font-size: 13pt;
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
          border-radius: 0 !important;
          overflow: visible !important;
        }
        .rpb-plain-editor th,
        .rpb-plain-editor td {
          padding: 5px !important;
          font-size: 8.5pt !important;
          line-height: 1.3 !important;
          overflow-wrap: anywhere;
          word-break: break-word;
          white-space: normal;
        }
        @media (max-width: 820px) {
          .rpb-quotation-canvas {
            min-height: auto;
            padding: 7mm;
            box-shadow: none;
          }
        }
        @media (min-width: 821px) {
          .rpb-plain-editor {
            font-size: 11pt;
          }
        }
      `}</style>
    </RpbPageFrame>
  );
}
