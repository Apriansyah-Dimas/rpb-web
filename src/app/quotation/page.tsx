"use client";

import { RpbUserActions } from "@/components/rpb-user-actions";
import { useRpbMasterData } from "@/hooks/use-rpb-master-data";
import { formatRupiah } from "@/lib/rpb-calculator";
import { buildSummaryLineItems } from "@/lib/rpb-line-items";
import { useRpbStore } from "@/store/rpb-store";
import {
  AlignCenter,
  AlignLeft,
  Bold,
  FileText,
  Italic,
  Printer,
  RotateCcw,
  Table2,
  Underline,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";

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
<strong>Dimensi:</strong> ${dimensions.length} × ${dimensions.width} × ${dimensions.height} mm | Tebal Panel: ${panelThickness} mm<br/>
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
          <td colspan="8" style="padding:8px 10px;font-weight:700;color:#3b3d79;font-size:12px;">${category.label}</td>
        </tr>`;

      for (const item of items) {
        rows += `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #eceef8;text-align:center;font-size:12px;">${no++}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eceef8;font-size:12px;">${escapeHtml(item.jenis)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eceef8;font-size:12px;">${escapeHtml(item.keterangan)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eceef8;font-size:12px;">${escapeHtml(item.satuan)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eceef8;font-size:12px;">${escapeHtml(item.jenisSpec)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eceef8;text-align:right;font-size:12px;">${item.qty}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eceef8;text-align:right;font-size:12px;">${escapeHtml(formatRupiah(item.hargaIdr))}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eceef8;text-align:right;font-size:12px;font-weight:600;">${escapeHtml(formatRupiah(item.hargaIdr * item.qty))}</td>
          </tr>`;
      }
    }

    const otherItems = lineItems.filter(
      (item) => item.jenis !== "PROFILE" && item.jenis !== "KONSTRUKSI",
    );
    if (otherItems.length > 0) {
      rows += `
        <tr style="background:#fff7cc;">
          <td colspan="8" style="padding:8px 10px;font-weight:700;color:#3b3d79;font-size:12px;">Other / Tambahan</td>
        </tr>`;
      for (const item of otherItems) {
        rows += `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #eceef8;text-align:center;font-size:12px;">${no++}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eceef8;font-size:12px;">${escapeHtml(item.jenis)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eceef8;font-size:12px;">${escapeHtml(item.keterangan)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eceef8;font-size:12px;">${escapeHtml(item.satuan)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eceef8;font-size:12px;">${escapeHtml(item.jenisSpec)}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eceef8;text-align:right;font-size:12px;">${item.qty}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eceef8;text-align:right;font-size:12px;">${escapeHtml(formatRupiah(item.hargaIdr))}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eceef8;text-align:right;font-size:12px;font-weight:600;">${escapeHtml(formatRupiah(item.hargaIdr * item.qty))}</td>
          </tr>`;
      }
    }

    return `
      <div style="margin:16px 0;">
        <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;border:1px solid #d9dbef;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#6365b9;">
              <th style="padding:8px;color:#fff;text-align:center;font-size:11px;width:34px;">No</th>
              <th style="padding:8px;color:#fff;text-align:left;font-size:11px;">Jenis</th>
              <th style="padding:8px;color:#fff;text-align:left;font-size:11px;">Keterangan</th>
              <th style="padding:8px;color:#fff;text-align:left;font-size:11px;">Satuan</th>
              <th style="padding:8px;color:#fff;text-align:left;font-size:11px;">Jenis Spec</th>
              <th style="padding:8px;color:#fff;text-align:right;font-size:11px;">Qty</th>
              <th style="padding:8px;color:#fff;text-align:right;font-size:11px;">Harga</th>
              <th style="padding:8px;color:#fff;text-align:right;font-size:11px;">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="7" style="padding:6px 8px;text-align:right;border-top:1px solid #d9dbef;font-size:12px;">Subtotal</td>
              <td style="padding:6px 8px;text-align:right;border-top:1px solid #d9dbef;font-size:12px;font-weight:600;">${escapeHtml(formatRupiah(subtotalIdr))}</td>
            </tr>
            <tr>
              <td colspan="7" style="padding:4px 8px;text-align:right;font-size:12px;color:#555;">Stock Return (${adjustments.stockReturn}%)</td>
              <td style="padding:4px 8px;text-align:right;font-size:12px;">${escapeHtml(formatRupiah(stockReturnIdr))}</td>
            </tr>
            <tr>
              <td colspan="7" style="padding:4px 8px;text-align:right;font-size:12px;color:#555;">Marketing Cost (${adjustments.marketingCost}%)</td>
              <td style="padding:4px 8px;text-align:right;font-size:12px;">${escapeHtml(formatRupiah(marketingCostIdr))}</td>
            </tr>
            <tr>
              <td colspan="7" style="padding:4px 8px;text-align:right;font-size:12px;color:#555;">Services (${adjustments.services}%)</td>
              <td style="padding:4px 8px;text-align:right;font-size:12px;">${escapeHtml(formatRupiah(servicesIdr))}</td>
            </tr>
            <tr>
              <td colspan="7" style="padding:4px 8px;text-align:right;font-size:12px;color:#555;">Profit (${adjustments.profit}%)</td>
              <td style="padding:4px 8px;text-align:right;font-size:12px;">${escapeHtml(formatRupiah(profitIdr))}</td>
            </tr>
            <tr style="background:#6365b9;">
              <td colspan="7" style="padding:8px;text-align:right;color:#fff;font-weight:800;font-size:12px;">GRAND TOTAL</td>
              <td style="padding:8px;text-align:right;color:#fff;font-weight:800;font-size:13px;">${escapeHtml(formatRupiah(grandTotalIdr))}</td>
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

  const handlePrint = () => {
    saveContent();
    window.print();
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl p-4 md:px-10 md:py-5 lg:px-12">
      <main className="rpb-shell overflow-hidden print-a4">
        <header className="rpb-topbar no-print flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-white md:px-6">
          <h1 className="rpb-h-title text-xl font-semibold md:text-2xl">Quotation Builder</h1>
          <div className="flex flex-wrap items-center gap-2">
            <RpbUserActions />
            <Link
              href="/summary"
              className="rounded-md border border-white/60 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Back
            </Link>
          </div>
        </header>

        <div className="space-y-4 p-4 md:p-6">
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

          <section className="rpb-section no-print p-3 md:p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select
                defaultValue=""
                className="rpb-input w-auto min-w-[130px] text-sm"
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
                className="rpb-btn-ghost inline-flex h-9 w-9 items-center justify-center"
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
                className="rpb-btn-ghost inline-flex h-9 w-9 items-center justify-center"
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
                className="rpb-btn-ghost inline-flex h-9 w-9 items-center justify-center"
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
                className="rpb-btn-ghost inline-flex h-9 w-9 items-center justify-center"
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
                className="rpb-btn-ghost inline-flex h-9 w-9 items-center justify-center"
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
                className="rpb-btn-primary inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold"
                onClick={insertRpbTable}
                disabled={masterLoading || lineItems.length === 0}
                title={
                  lineItems.length === 0 ? "Lengkapi data summary terlebih dahulu." : "Insert tabel RPB"
                }
              >
                <Table2 size={15} />
                Insert Tabel RPB
              </button>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rpb-btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold"
                  onClick={resetEditor}
                >
                  <RotateCcw size={14} />
                  Reset
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#7c3aed] px-3 py-2 text-sm font-semibold text-white"
                  onClick={handlePrint}
                >
                  <Printer size={14} />
                  Print / PDF
                </button>
              </div>
            </div>

            {lineItems.length === 0 ? (
              <div className="rounded-xl border border-[#ffde55] bg-[#fff7cc] px-4 py-3 text-sm text-[#7c5a00]">
                Belum ada data estimasi. Isi data di halaman input/summary agar tombol insert tabel bisa digunakan.
              </div>
            ) : null}
          </section>

          <section className="rpb-section p-4">
            <div className="mb-4 text-sm text-rpb-ink-soft">
              <div>
                <strong>Customer Name:</strong> {customerName || "-"}
              </div>
              <div>
                <strong>Project Name:</strong> {projectName || "-"}
              </div>
              <div>
                <strong>Date:</strong> {formatDate()}
              </div>
            </div>

            <div className="rpb-doc-canvas">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={saveContent}
                className="rpb-plain-editor min-h-[920px] outline-none"
                data-placeholder="Ketik isi penawaran di sini, lalu klik 'Insert Tabel RPB' untuk memasukkan tabel harga otomatis..."
              />
            </div>
          </section>

          <div className="no-print flex justify-end">
            <Link
              href="/summary"
              className="rpb-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
            >
              <FileText size={14} />
              Back to Summary
            </Link>
          </div>
        </div>
      </main>

      <style>{`
        .rpb-plain-editor {
          color: #1f2340;
          font-size: 14px;
          line-height: 1.8;
          font-family: Arial, sans-serif;
        }
        .rpb-plain-editor:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .rpb-plain-editor h1 {
          font-size: 1.6rem;
          font-weight: 800;
          margin: 1rem 0 0.5rem;
          color: #1f2340;
        }
        .rpb-plain-editor h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 0.9rem 0 0.4rem;
          color: #2d3173;
        }
        .rpb-plain-editor h3 {
          font-size: 1.05rem;
          font-weight: 700;
          margin: 0.75rem 0 0.35rem;
          color: #4548a8;
        }
        .rpb-plain-editor p {
          margin: 0.45rem 0;
        }
        .rpb-plain-editor table {
          max-width: 100%;
        }
      `}</style>
    </div>
  );
}
