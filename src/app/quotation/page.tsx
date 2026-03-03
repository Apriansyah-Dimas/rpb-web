"use client";

import { RpbPageFrame } from "@/components/layout/rpb-page-frame";
import { useRpbMasterData } from "@/hooks/use-rpb-master-data";
import { formatRupiah } from "@/lib/rpb-calculator";
import { buildSummaryLineItems } from "@/lib/rpb-line-items";
import { useRpbStore } from "@/store/rpb-store";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Highlighter,
  Download,
  Italic,
  Palette,
  RotateCcw,
  Strikethrough,
  Table2,
  Type,
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const hasInitializedRef = useRef(false);
  const dragStateRef = useRef<{
    node: HTMLDivElement | null;
    mode: "move" | "resize" | null;
    startX: number;
    startY: number;
    left: number;
    top: number;
    width: number;
  }>({
    node: null,
    mode: null,
    startX: 0,
    startY: 0,
    left: 0,
    top: 0,
    width: 0,
  });
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [downloadReady, setDownloadReady] = useState(false);

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
    setDownloadReady((editorRef.current.textContent ?? "").trim().length > 0);
  };

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    saveContent();
    editorRef.current?.focus();
  };

  const applyLineHeight = (value: string) => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      editor.style.lineHeight = value;
      saveContent();
      return;
    }

    const range = selection.getRangeAt(0);
    const common = range.commonAncestorContainer;
    const container = common.nodeType === Node.TEXT_NODE ? common.parentElement : (common as Element);
    if (!container || !editor.contains(container)) {
      editor.style.lineHeight = value;
      saveContent();
      return;
    }

    const blocks = Array.from(
      editor.querySelectorAll("p, div, h1, h2, h3, li, blockquote, table, tbody, thead, tfoot, tr, td, th"),
    );
    const touched = blocks.filter((el) => range.intersectsNode(el));
    if (touched.length === 0) {
      const target = container.closest(
        "p, div, h1, h2, h3, li, blockquote, table, tbody, thead, tfoot, tr, td, th",
      );
      if (target instanceof HTMLElement) {
        target.style.lineHeight = value;
      } else {
        editor.style.lineHeight = value;
      }
    } else {
      touched.forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.lineHeight = value;
        }
      });
    }
    saveContent();
    editor.focus();
  };

  const applyTextEffect = (value: string) => {
    if (value === "none") {
      execCmd("removeFormat");
      return;
    }
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }
    const range = selection.getRangeAt(0);
    if (range.collapsed) {
      return;
    }
    const span = document.createElement("span");
    if (value === "shadow") {
      span.style.textShadow = "0 1px 2px rgba(31,35,64,0.35)";
    } else if (value === "outline") {
      span.style.webkitTextStroke = "0.35px #2d3173";
      span.style.color = "transparent";
    } else if (value === "uppercase") {
      span.style.textTransform = "uppercase";
      span.style.letterSpacing = "0.04em";
    } else if (value === "smallcaps") {
      span.style.fontVariant = "small-caps";
      span.style.letterSpacing = "0.03em";
    } else {
      return;
    }
    try {
      range.surroundContents(span);
    } catch {
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
    }
    saveContent();
    editor.focus();
  };

  const handlePickImage = () => {
    imageInputRef.current?.click();
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editorRef.current) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      window.alert("File harus berupa gambar.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string" || !editorRef.current) {
        return;
      }
      const imageNode = document.createElement("div");
      imageNode.className = "rpb-draggable-image";
      imageNode.setAttribute("contenteditable", "false");
      imageNode.dataset.imageId = `img-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      imageNode.style.left = "24px";
      imageNode.style.top = "24px";
      imageNode.style.width = "180px";

      const image = document.createElement("img");
      image.src = reader.result;
      image.alt = file.name || "quotation-image";
      image.draggable = false;

      const resizeHandle = document.createElement("div");
      resizeHandle.className = "rpb-image-resize-handle";
      resizeHandle.setAttribute("data-resize-handle", "true");

      const removeHandle = document.createElement("button");
      removeHandle.type = "button";
      removeHandle.className = "rpb-image-remove-handle";
      removeHandle.setAttribute("data-remove-handle", "true");
      removeHandle.textContent = "x";

      imageNode.appendChild(image);
      imageNode.appendChild(removeHandle);
      imageNode.appendChild(resizeHandle);
      editorRef.current.appendChild(imageNode);
      saveContent();
      editorRef.current.focus();
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const persistContent = () => {
      if (!editorRef.current) {
        return;
      }
      setQuotationContent(editorRef.current.innerHTML);
    };

    const clampMove = (left: number, top: number, node: HTMLDivElement) => {
      const maxLeft = Math.max(0, editor.clientWidth - node.offsetWidth);
      const maxTop = Math.max(0, editor.scrollHeight - node.offsetHeight);
      return {
        left: Math.max(0, Math.min(left, maxLeft)),
        top: Math.max(0, Math.min(top, maxTop)),
      };
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      const node = target.closest(".rpb-draggable-image") as HTMLDivElement | null;
      if (!node) {
        setSelectedImageId(null);
        editor
          .querySelectorAll(".rpb-draggable-image.is-selected")
          .forEach((el) => el.classList.remove("is-selected"));
        return;
      }
      const removeButton = target.closest("[data-remove-handle='true']");
      if (removeButton) {
        event.preventDefault();
        node.remove();
        setSelectedImageId(null);
        persistContent();
        return;
      }
      editor
        .querySelectorAll(".rpb-draggable-image.is-selected")
        .forEach((el) => el.classList.remove("is-selected"));
      node.classList.add("is-selected");
      setSelectedImageId(node.dataset.imageId ?? null);
      event.preventDefault();
      const style = window.getComputedStyle(node);
      const left = Number.parseFloat(style.left || "0") || 0;
      const top = Number.parseFloat(style.top || "0") || 0;
      const width = node.getBoundingClientRect().width;
      const isResize = Boolean(target.closest("[data-resize-handle='true']"));
      dragStateRef.current = {
        node,
        mode: isResize ? "resize" : "move",
        startX: event.clientX,
        startY: event.clientY,
        left,
        top,
        width,
      };
      node.setPointerCapture(event.pointerId);
      node.classList.add("is-active");
    };

    const onPointerMove = (event: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state.node || !state.mode) {
        return;
      }
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      if (state.mode === "move") {
        const next = clampMove(state.left + dx, state.top + dy, state.node);
        state.node.style.left = `${next.left}px`;
        state.node.style.top = `${next.top}px`;
        return;
      }
      const nextWidth = Math.max(70, Math.min(editor.clientWidth, state.width + dx));
      state.node.style.width = `${nextWidth}px`;
      const next = clampMove(
        Number.parseFloat(state.node.style.left || "0"),
        Number.parseFloat(state.node.style.top || "0"),
        state.node,
      );
      state.node.style.left = `${next.left}px`;
      state.node.style.top = `${next.top}px`;
    };

    const clearDrag = () => {
      const state = dragStateRef.current;
      if (!state.node) {
        return;
      }
      state.node.classList.remove("is-active");
      dragStateRef.current = {
        node: null,
        mode: null,
        startX: 0,
        startY: 0,
        left: 0,
        top: 0,
        width: 0,
      };
      persistContent();
    };

    editor.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", clearDrag);
    window.addEventListener("pointercancel", clearDrag);
    return () => {
      editor.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", clearDrag);
      window.removeEventListener("pointercancel", clearDrag);
    };
  }, [setQuotationContent]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key !== "Delete" && event.key !== "Backspace") || !selectedImageId) {
        return;
      }
      const node = editor.querySelector(`[data-image-id='${selectedImageId}']`);
      if (!node) {
        return;
      }
      event.preventDefault();
      node.remove();
      setSelectedImageId(null);
      setQuotationContent(editor.innerHTML);
    };
    editor.addEventListener("keydown", onKeyDown);
    return () => {
      editor.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedImageId, setQuotationContent]);

  const generateRpbTableHtml = () => {
    const baseCellStyle =
      "padding:4px 5px;border-bottom:1px solid #d9dbef;font-size:8.5pt;line-height:1.3;overflow-wrap:anywhere;word-break:break-word;vertical-align:middle;";

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
              <th style="padding:5px 4px;color:#fff;text-align:center;font-size:9pt;width:13%;vertical-align:middle;">Jenis</th>
              <th style="padding:5px 4px;color:#fff;text-align:center;font-size:9pt;width:22%;vertical-align:middle;">Keterangan</th>
              <th style="padding:5px 4px;color:#fff;text-align:center;font-size:9pt;width:7%;vertical-align:middle;">Satuan</th>
              <th style="padding:5px 4px;color:#fff;text-align:center;font-size:9pt;width:13%;vertical-align:middle;">Jenis Spec</th>
              <th style="padding:5px 4px;color:#fff;text-align:center;font-size:9pt;width:11%;vertical-align:middle;">Qty</th>
              <th style="padding:5px 4px;color:#fff;text-align:right;font-size:9pt;width:14.5%;vertical-align:middle;">Harga</th>
              <th style="padding:5px 4px;color:#fff;text-align:right;font-size:9pt;width:14.5%;vertical-align:middle;">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="6" style="padding:4px 5px;background:#fbfbff;border-top:1px solid #d9dbef;vertical-align:middle;"></td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;color:#555;vertical-align:middle;">Subtotal</td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;font-weight:600;white-space:nowrap;vertical-align:middle;">${escapeHtml(formatRupiah(subtotalIdr))}</td>
            </tr>
            <tr>
              <td colspan="6" style="padding:4px 5px;background:#fbfbff;vertical-align:middle;"></td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;color:#555;vertical-align:middle;">Stock Return (${adjustments.stockReturn}%)</td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;white-space:nowrap;vertical-align:middle;">${escapeHtml(formatRupiah(stockReturnIdr))}</td>
            </tr>
            <tr>
              <td colspan="6" style="padding:4px 5px;background:#fbfbff;vertical-align:middle;"></td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;color:#555;vertical-align:middle;">Marketing Cost (${adjustments.marketingCost}%)</td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;white-space:nowrap;vertical-align:middle;">${escapeHtml(formatRupiah(marketingCostIdr))}</td>
            </tr>
            <tr>
              <td colspan="6" style="padding:4px 5px;background:#fbfbff;vertical-align:middle;"></td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;color:#555;vertical-align:middle;">Services (${adjustments.services}%)</td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;white-space:nowrap;vertical-align:middle;">${escapeHtml(formatRupiah(servicesIdr))}</td>
            </tr>
            <tr>
              <td colspan="6" style="padding:4px 5px;background:#fbfbff;vertical-align:middle;"></td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;color:#555;vertical-align:middle;">Profit (${adjustments.profit}%)</td>
              <td style="padding:4px 5px;background:#fbfbff;text-align:right;font-size:9pt;white-space:nowrap;vertical-align:middle;">${escapeHtml(formatRupiah(profitIdr))}</td>
            </tr>
            <tr style="background:#6365b9;">
              <td colspan="6" style="padding:5px;border-top:0;vertical-align:middle;"></td>
              <td style="padding:5px;text-align:right;color:#fff;font-weight:800;font-size:9pt;border-top:0;vertical-align:middle;">GRAND TOTAL</td>
              <td style="padding:5px;text-align:right;color:#fff;font-weight:800;font-size:10pt;white-space:nowrap;border-top:0;vertical-align:middle;">${escapeHtml(formatRupiah(grandTotalIdr))}</td>
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

  const normalizeTableCellAlignment = () => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const cells = Array.from(editor.querySelectorAll("table th, table td"));
    cells.forEach((cell) => {
      if (!(cell instanceof HTMLElement)) {
        return;
      }
      cell.style.verticalAlign = "middle";
      cell.style.lineHeight = "1.25";
      cell.style.paddingTop = "5px";
      cell.style.paddingBottom = "5px";
    });
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
    if (!quotationCanvasRef.current || pdfBusy || !downloadReady) {
      return;
    }

    setPdfBusy(true);
    setPdfError(null);
    try {
      // Force table cell alignment for both newly inserted and previously existing tables.
      normalizeTableCellAlignment();
      saveContent();

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
      const safeMarginMm = 6;
      const contentWidthMm = pageWidth - safeMarginMm * 2;
      const contentHeightMm = pageHeight - safeMarginMm * 2;
      const imageRatio = renderedCanvas.width / renderedCanvas.height;
      const contentRatio = contentWidthMm / contentHeightMm;
      const imageWidthMm =
        imageRatio > contentRatio ? contentWidthMm : contentHeightMm * imageRatio;
      const imageHeightMm =
        imageRatio > contentRatio ? contentWidthMm / imageRatio : contentHeightMm;
      const x = (pageWidth - imageWidthMm) / 2;
      const y = (pageHeight - imageHeightMm) / 2;

      // Force one-page export to avoid extra/blank second page.
      pdf.addImage(imageData, "PNG", x, y, imageWidthMm, imageHeightMm, undefined, "FAST");

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

  useEffect(() => {
    setDownloadReady((editorRef.current?.textContent ?? "").trim().length > 0);
  }, []);

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

          <section className="rpb-section rpb-quotation-toolbar no-print p-2 md:p-3">
            <div className="mb-2 space-y-2">
              <div className="rpb-toolbar-row flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-rpb-ink-soft">
                  Font
                </span>
                <select
                  defaultValue=""
                  className="rpb-input w-auto min-w-[125px] text-xs sm:min-w-[140px] sm:text-sm"
                  onChange={(event) => {
                    if (event.target.value) {
                      execCmd("fontName", event.target.value);
                    }
                  }}
                >
                  <option value="" disabled>
                    Font Name
                  </option>
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Calibri">Calibri</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                </select>
                <select
                  defaultValue=""
                  className="rpb-input w-auto min-w-[92px] text-xs sm:text-sm"
                  onChange={(event) => {
                    if (event.target.value) {
                      execCmd("fontSize", event.target.value);
                    }
                  }}
                >
                  <option value="" disabled>
                    Size
                  </option>
                  <option value="1">8</option>
                  <option value="2">10</option>
                  <option value="3">12</option>
                  <option value="4">14</option>
                  <option value="5">18</option>
                  <option value="6">24</option>
                  <option value="7">36</option>
                </select>
              </div>

              <div className="rpb-toolbar-row flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-rpb-ink-soft">
                  Basic
                </span>
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
                    execCmd("strikeThrough");
                  }}
                  title="Strikethrough"
                >
                  <Strikethrough size={15} />
                </button>
              </div>

              <div className="rpb-toolbar-row flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-rpb-ink-soft">
                  Color
                </span>
                <label className="rpb-btn-ghost inline-flex h-8 items-center gap-1 px-2 text-xs sm:h-9 sm:text-sm">
                  <Palette size={14} />
                  Text
                  <input
                    type="color"
                    className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
                    onChange={(event) => execCmd("foreColor", event.target.value)}
                  />
                </label>
                <label className="rpb-btn-ghost inline-flex h-8 items-center gap-1 px-2 text-xs sm:h-9 sm:text-sm">
                  <Highlighter size={14} />
                  Highlight
                  <input
                    type="color"
                    className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
                    onChange={(event) => execCmd("hiliteColor", event.target.value)}
                  />
                </label>
              </div>

              <div className="rpb-toolbar-row flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-rpb-ink-soft">
                  Effects
                </span>
                <select
                  defaultValue=""
                  className="rpb-input w-auto min-w-[160px] text-xs sm:text-sm"
                  onChange={(event) => {
                    if (event.target.value) {
                      applyTextEffect(event.target.value);
                      event.target.value = "";
                    }
                  }}
                >
                  <option value="" disabled>
                    Text Effects & Typography
                  </option>
                  <option value="shadow">Shadow</option>
                  <option value="outline">Outline</option>
                  <option value="uppercase">Uppercase</option>
                  <option value="smallcaps">Small Caps</option>
                  <option value="none">Clear Effect</option>
                </select>
              </div>

              <div className="rpb-toolbar-row flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-rpb-ink-soft">
                  Paragraph
                </span>
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
                  className="rpb-btn-ghost inline-flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCmd("justifyRight");
                  }}
                  title="Align Right"
                >
                  <AlignRight size={15} />
                </button>
                <button
                  type="button"
                  className="rpb-btn-ghost inline-flex h-8 w-8 items-center justify-center sm:h-9 sm:w-9"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    execCmd("justifyFull");
                  }}
                  title="Justify"
                >
                  <AlignJustify size={15} />
                </button>

                <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-rpb-ink-soft">
                  Spacing
                </span>
                <select
                  defaultValue="1.45"
                  className="rpb-input w-auto min-w-[104px] text-xs sm:text-sm"
                  onChange={(event) => applyLineHeight(event.target.value)}
                >
                  <option value="1">1.0</option>
                  <option value="1.15">1.15</option>
                  <option value="1.5">1.5</option>
                  <option value="2">2.0</option>
                </select>
              </div>

              <div className="rpb-toolbar-row flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-rpb-ink-soft">
                  Insert
                </span>
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
                <button
                  type="button"
                  className="rpb-btn-primary inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold sm:gap-2 sm:px-3 sm:text-sm"
                  onClick={handlePickImage}
                >
                  <Type size={14} />
                  Upload Gambar
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    className="rpb-btn-ghost inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold sm:gap-2 sm:px-3 sm:text-sm"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execCmd("removeFormat");
                    }}
                  >
                    <Eraser size={14} />
                    Clear Format
                  </button>
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
                    disabled={pdfBusy || !downloadReady}
                    title={downloadReady ? "Download PDF A4 (1 halaman)" : "Isi konten quotation terlebih dahulu."}
                  >
                    <Download size={14} />
                    {pdfBusy ? "Menyiapkan PDF..." : "Download PDF"}
                  </button>
                </div>
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
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .rpb-quotation-canvas {
          width: 210mm;
          min-height: 297mm;
          flex: 0 0 auto;
          padding: 10mm;
          border: 1px solid #e2e6f3;
          border-radius: 0;
          background: #fff;
          box-shadow: 0 12px 30px rgba(33, 39, 89, 0.12);
        }
        .rpb-plain-editor {
          position: relative;
          color: #1f2340;
          font-size: 11pt;
          line-height: 1.45;
          font-family: Arial, sans-serif;
          text-size-adjust: 100%;
          -webkit-text-size-adjust: 100%;
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
          vertical-align: middle !important;
          text-size-adjust: 100%;
          -webkit-text-size-adjust: 100%;
          overflow-wrap: anywhere;
          word-break: break-word;
          white-space: normal;
        }
        .rpb-quotation-toolbar {
          border-top: 1px solid #dfe3f3;
        }
        .rpb-toolbar-row > span {
          min-width: 68px;
        }
        .rpb-quotation-toolbar .rpb-input {
          width: auto;
          min-height: 36px;
          padding: 7px 11px;
        }
        .rpb-quotation-toolbar select.rpb-input {
          padding-right: 34px;
        }
        .rpb-draggable-image {
          position: absolute;
          z-index: 7;
          border: 1px dashed #9ca3d8;
          background: #fff;
          box-shadow: 0 6px 18px rgba(31, 35, 64, 0.14);
          cursor: move;
          touch-action: none;
          user-select: none;
        }
        .rpb-draggable-image.is-active {
          border-color: #6365b9;
        }
        .rpb-draggable-image.is-selected {
          border-color: #6365b9;
          box-shadow: 0 0 0 2px rgba(99, 101, 185, 0.16), 0 6px 18px rgba(31, 35, 64, 0.14);
        }
        .rpb-draggable-image img {
          display: block;
          width: 100%;
          height: auto;
          pointer-events: none;
          user-select: none;
        }
        .rpb-image-resize-handle {
          position: absolute;
          right: -7px;
          bottom: -7px;
          width: 14px;
          height: 14px;
          border-radius: 999px;
          border: 2px solid #fff;
          background: #6365b9;
          box-shadow: 0 1px 8px rgba(22, 27, 70, 0.35);
          cursor: nwse-resize;
          pointer-events: auto;
        }
        .rpb-image-remove-handle {
          position: absolute;
          right: -7px;
          top: -7px;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          border: 2px solid #fff;
          background: #e5484d;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          box-shadow: 0 1px 8px rgba(22, 27, 70, 0.35);
          pointer-events: auto;
        }
        @media (max-width: 820px) {
          .rpb-toolbar-row > span {
            min-width: 56px;
          }
          .rpb-quotation-toolbar .rpb-input {
            min-height: 34px;
            padding: 6px 10px;
          }
          .rpb-quotation-stage {
            justify-content: flex-start;
          }
          .rpb-quotation-canvas {
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
