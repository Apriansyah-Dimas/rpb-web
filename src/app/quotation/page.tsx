"use client";

import {
  calculateKonstruksiTotalUsd,
  calculateProfileTotalUsd,
  formatRupiah,
  usdToIdr,
} from "@/lib/rpb-calculator";
import { FontSize, LineHeight, TextTransform } from "@/lib/tiptap-rich-format";
import { OTHER_ITEMS } from "@/lib/rpb-data";
import { useRpbStore } from "@/store/rpb-store";
import type { SummaryLineItem } from "@/types/rpb";
import { mergeAttributes } from "@tiptap/core";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  AlignCenter,
  AlignLeft,
  AlignRight,
  FileDown,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  PaintBucket,
  Pilcrow,
  RemoveFormatting,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table2,
  Underline as UnderlineIcon,
} from "lucide-react";
import jsPDF from "jspdf";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const initialDoc = `
<h2>Quotation</h2>
<p>Tulis isi quotation di sini...</p>
`;

const FONT_OPTIONS = [
  { label: "Aptos (Body)", value: "Aptos, Calibri, Arial, sans-serif" },
  { label: "Calibri", value: "Calibri, Arial, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times New Roman", value: "\"Times New Roman\", serif" },
  { label: "Georgia", value: "Georgia, serif" },
];

const FONT_SIZE_OPTIONS = ["10px", "11px", "12px", "14px", "16px", "18px", "24px", "32px"];
const LINE_HEIGHT_OPTIONS = ["1", "1.15", "1.3", "1.5", "2"];
const CASE_OPTIONS = [
  { label: "Aa", value: "" },
  { label: "UPPER", value: "uppercase" },
  { label: "lower", value: "lowercase" },
  { label: "Title", value: "capitalize" },
];

const EditableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") || "center",
      },
      width: {
        default: 60,
        parseHTML: (element) => {
          const raw = element.getAttribute("data-width");
          const parsed = Number.parseFloat(raw || "60");
          return Number.isFinite(parsed) ? parsed : 60;
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const align = HTMLAttributes.align || "center";
    const width = Number(HTMLAttributes.width || 60);
    const marginStyle =
      align === "left"
        ? "margin: 8px auto 8px 0;"
        : align === "right"
          ? "margin: 8px 0 8px auto;"
          : "margin: 8px auto;";

    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-align": align,
        "data-width": String(width),
        style: `display:block; max-width:100%; width:${width}%; ${marginStyle}`,
      }),
    ];
  },
});

export default function QuotationPage() {
  const customerName = useRpbStore((state) => state.customerName);
  const projectName = useRpbStore((state) => state.projectName);
  const dimensions = useRpbStore((state) => state.dimensions);
  const panelThickness = useRpbStore((state) => state.panelThickness);
  const selectedOther = useRpbStore((state) => state.selectedOther);
  const customOtherItems = useRpbStore((state) => state.customOtherItems);
  const adjustments = useRpbStore((state) => state.adjustments);
  const [quoteTitle, setQuoteTitle] = useState("Quotation");
  const [toolbarState, setToolbarState] = useState({
    fontFamily: FONT_OPTIONS[0].value,
    fontSize: "12px",
    lineHeight: "1.3",
    textTransform: "",
    textColor: "#1f2340",
    highlightColor: "#ffff00",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      id: `stock-${item.id}`,
      jenis: item.category,
      keterangan: item.model === "-" ? item.name : item.model,
      satuan: item.unit,
      jenisSpec: item.name,
      qty: selectedOther[item.id] ?? 0,
      hargaUsd: item.priceUsd,
    }));

    const customLines: SummaryLineItem[] = customOtherItems.map((item) => ({
      id: `custom-${item.id}`,
      jenis: item.jenis,
      keterangan: item.keterangan,
      satuan: item.satuan,
      jenisSpec: item.jenisSpec,
      qty: item.qty,
      hargaUsd: item.hargaUsd,
    }));

    return [...baseItems, ...stockLines, ...customLines];
  }, [customOtherItems, konstruksiUsd, panelThickness, profileUsd, selectedOther]);

  const subtotalUsd = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.hargaUsd * item.qty, 0),
    [lineItems],
  );
  const stockReturnUsd = subtotalUsd * (adjustments.stockReturn / 100);
  const marketingCostUsd = subtotalUsd * (adjustments.marketingCost / 100);
  const servicesUsd = subtotalUsd * (adjustments.services / 100);
  const baseAfterAdjustUsd = subtotalUsd + stockReturnUsd + marketingCostUsd + servicesUsd;
  const profitUsd = baseAfterAdjustUsd * (adjustments.profit / 100);
  const grandTotalUsd = baseAfterAdjustUsd + profitUsd;

  const refreshToolbarState = (instance: {
    getAttributes: (name: string) => Record<string, unknown>;
    isActive: (name: string) => boolean;
  }) => {
    const textStyleAttrs = instance.getAttributes("textStyle");
    const paragraphAttrs = instance.isActive("heading")
      ? instance.getAttributes("heading")
      : instance.getAttributes("paragraph");
    const highlightAttrs = instance.getAttributes("highlight");

    setToolbarState((prev) => ({
      ...prev,
      fontFamily: (textStyleAttrs.fontFamily as string) || prev.fontFamily,
      fontSize: (textStyleAttrs.fontSize as string) || "12px",
      lineHeight: (paragraphAttrs.lineHeight as string) || "1.3",
      textTransform: (textStyleAttrs.textTransform as string) || "",
      textColor: (textStyleAttrs.color as string) || "#1f2340",
      highlightColor: (highlightAttrs.color as string) || "#ffff00",
    }));
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      FontFamily.configure({
        types: ["textStyle"],
      }),
      FontSize,
      Color.configure({
        types: ["textStyle"],
      }),
      TextTransform,
      LineHeight,
      Highlight.configure({
        multicolor: true,
      }),
      Subscript,
      Superscript,
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
      EditableImage.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    content: initialDoc,
    onCreate: ({ editor: instance }) => refreshToolbarState(instance),
    onUpdate: ({ editor: instance }) => refreshToolbarState(instance),
    onSelectionUpdate: ({ editor: instance }) => refreshToolbarState(instance),
  });

  const handleInsertRpbTable = () => {
    if (!editor) {
      return;
    }

    const additionalRows = [
      {
        label: "Pengembalian Saham",
        pct: adjustments.stockReturn,
        value: stockReturnUsd,
      },
      {
        label: "Marketing Cost",
        pct: adjustments.marketingCost,
        value: marketingCostUsd,
      },
      {
        label: "Jasa Kerja",
        pct: adjustments.services,
        value: servicesUsd,
      },
    ];

    const textNode = (text: string) => ({
      type: "text",
      text,
    });

    const paragraphNode = (text: string) => ({
      type: "paragraph",
      content: text ? [textNode(text)] : [],
    });

    const headerCell = (text: string) => ({
      type: "tableHeader",
      content: [paragraphNode(text)],
    });

    const bodyCell = (text: string) => ({
      type: "tableCell",
      content: [paragraphNode(text)],
    });

    const lineItemsTableNode = {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            headerCell("No"),
            headerCell("Jenis"),
            headerCell("Keterangan"),
            headerCell("Satuan"),
            headerCell("Jenis Spec"),
            headerCell("Qty"),
            headerCell("Harga"),
            headerCell("Total"),
          ],
        },
        ...lineItems.map((item, index) => ({
          type: "tableRow",
          content: [
            bodyCell(String(index + 1)),
            bodyCell(item.jenis),
            bodyCell(item.keterangan),
            bodyCell(item.satuan),
            bodyCell(item.jenisSpec),
            bodyCell(String(item.qty)),
            bodyCell(formatRupiah(usdToIdr(item.hargaUsd))),
            bodyCell(formatRupiah(usdToIdr(item.hargaUsd * item.qty))),
          ],
        })),
        ...additionalRows.map((row) => ({
          type: "tableRow",
          content: [
            bodyCell(""),
            bodyCell("ADDITIONAL"),
            bodyCell(row.label),
            bodyCell("%"),
            bodyCell(`${row.pct}%`),
            bodyCell(""),
            bodyCell(""),
            bodyCell(formatRupiah(usdToIdr(row.value))),
          ],
        })),
        {
          type: "tableRow",
          content: [
            bodyCell(""),
            bodyCell(""),
            bodyCell("TOTAL"),
            bodyCell(""),
            bodyCell(""),
            bodyCell(""),
            bodyCell(""),
            bodyCell(formatRupiah(usdToIdr(baseAfterAdjustUsd))),
          ],
        },
        {
          type: "tableRow",
          content: [
            bodyCell(""),
            bodyCell(""),
            bodyCell("PROFIT"),
            bodyCell("%"),
            bodyCell(`${adjustments.profit}%`),
            bodyCell(""),
            bodyCell(""),
            bodyCell(formatRupiah(usdToIdr(profitUsd))),
          ],
        },
        {
          type: "tableRow",
          content: [
            bodyCell(""),
            bodyCell(""),
            bodyCell("GRAND TOTAL"),
            bodyCell(""),
            bodyCell(""),
            bodyCell(""),
            bodyCell(""),
            bodyCell(formatRupiah(usdToIdr(grandTotalUsd))),
          ],
        },
      ],
    };

    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: "heading",
          attrs: { level: 3 },
          content: [textNode("RPB + Additional Charge")],
        },
        lineItemsTableNode,
        { type: "paragraph" },
      ])
      .run();
  };

  const handleInsertImageByFile = (file: File) => {
    if (!editor) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        editor
          .chain()
          .focus()
          .setImage({ src: result })
          .updateAttributes("image", { align: "center", width: 60 })
          .run();
      }
    };
    reader.readAsDataURL(file);
  };

  const setSelectedImageAlign = (align: "left" | "center" | "right") => {
    if (!editor) {
      return;
    }

    editor.chain().focus().updateAttributes("image", { align }).run();
  };

  const setSelectedImageWidth = (width: number) => {
    if (!editor) {
      return;
    }

    editor.chain().focus().updateAttributes("image", { width }).run();
  };

  const applyFontFamily = (value: string) => {
    if (!editor) {
      return;
    }

    editor.chain().focus().setMark("textStyle", { fontFamily: value }).run();
  };

  const applyFontSize = (value: string) => {
    if (!editor) {
      return;
    }

    editor.chain().focus().setMark("textStyle", { fontSize: value }).run();
  };

  const applyLineHeight = (value: string) => {
    if (!editor) {
      return;
    }

    editor
      .chain()
      .focus()
      .updateAttributes("paragraph", { lineHeight: value })
      .updateAttributes("heading", { lineHeight: value })
      .run();
  };

  const applyTextTransform = (value: string) => {
    if (!editor) {
      return;
    }

    editor.chain().focus().setMark("textStyle", { textTransform: value || null }).run();
  };

  const applyTextColor = (value: string) => {
    if (!editor) {
      return;
    }

    editor.chain().focus().setColor(value).run();
  };

  const applyHighlightColor = (value: string) => {
    if (!editor) {
      return;
    }

    editor.chain().focus().setHighlight({ color: value }).run();
  };

  const clearFormatting = () => {
    if (!editor) {
      return;
    }

    editor.chain().focus().clearNodes().unsetAllMarks().run();
  };

  const handleExportPdf = async () => {
    if (!editor) {
      return;
    }

    const dateText = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date());

    const exportEl = document.createElement("div");
    exportEl.className = "rpb-export-doc";
    exportEl.innerHTML = `
      <div style="font-family: Arial, sans-serif; color:#1f2340; font-size:12px; padding:18px;">
        <h2 style="margin:0 0 10px 0;">${escapeHtml(quoteTitle)}</h2>
        <div style="margin-bottom:12px;">
          <div><strong>Customer Name:</strong> ${escapeHtml(customerName || "-")}</div>
          <div><strong>Project Name:</strong> ${escapeHtml(projectName || "-")}</div>
          <div><strong>Date:</strong> ${escapeHtml(dateText)}</div>
        </div>
        <div>${editor.getHTML()}</div>
      </div>
    `;
    document.body.appendChild(exportEl);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    await doc.html(exportEl, {
      x: 8,
      y: 8,
      width: 194,
      autoPaging: "text",
      html2canvas: {
        scale: 0.58,
      },
    });

    exportEl.remove();
    const safeName = (projectName || "quotation")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "");
    doc.save(`${safeName || "quotation"}.pdf`);
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl p-4 md:px-10 md:py-5 lg:px-12">
      <main className="rpb-shell overflow-hidden">
        <header className="rpb-topbar flex items-center justify-between px-4 py-3 text-white md:px-6">
          <h1 className="rpb-h-title text-xl font-semibold md:text-2xl">Quotation Builder</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/summary"
              className="rounded-md border border-white/60 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Back
            </Link>
            <button
              type="button"
              className="rounded-md bg-white/14 px-3 py-1.5 text-xs font-semibold text-white"
              onClick={handleExportPdf}
            >
              <span className="inline-flex items-center gap-1">
                <FileDown size={14} />
                Export PDF
              </span>
            </button>
          </div>
        </header>

        <div className="space-y-3 p-4 md:p-6">
          <section className="rpb-section p-3 md:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-semibold text-rpb-ink-soft">Judul</label>
              <input
                className="rpb-input max-w-md"
                value={quoteTitle}
                onChange={(event) => setQuoteTitle(event.target.value)}
              />
            </div>
          </section>

          <section className="rpb-section p-3 md:p-4">
            <div className="rpb-editor-toolbar mb-3 flex flex-wrap gap-2">
              <select
                className="rpb-input w-auto min-w-[170px]"
                value={toolbarState.fontFamily}
                onChange={(event) => applyFontFamily(event.target.value)}
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
              <select
                className="rpb-input w-auto min-w-[74px]"
                value={toolbarState.fontSize}
                onChange={(event) => applyFontSize(event.target.value)}
              >
                {FONT_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size.replace("px", "")}
                  </option>
                ))}
              </select>
              <select
                className="rpb-input w-auto min-w-[74px]"
                value={toolbarState.lineHeight}
                onChange={(event) => applyLineHeight(event.target.value)}
              >
                {LINE_HEIGHT_OPTIONS.map((height) => (
                  <option key={height} value={height}>
                    {height}
                  </option>
                ))}
              </select>
              <select
                className="rpb-input w-auto min-w-[90px]"
                value={toolbarState.textTransform}
                onChange={(event) => applyTextTransform(event.target.value)}
              >
                {CASE_OPTIONS.map((option) => (
                  <option key={option.label} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button type="button" className="rpb-btn-ghost px-3 py-2 text-sm" onClick={clearFormatting}>
                <span className="inline-flex items-center gap-1"><RemoveFormatting size={14} />Clear</span>
              </button>
              <button type="button" className="rpb-btn-ghost px-3 py-2 text-sm" onClick={() => editor?.chain().focus().toggleBold().run()}>
                <span className="inline-flex items-center gap-1"><Bold size={14} />Bold</span>
              </button>
              <button type="button" className="rpb-btn-ghost px-3 py-2 text-sm" onClick={() => editor?.chain().focus().toggleItalic().run()}>
                <span className="inline-flex items-center gap-1"><Italic size={14} />Italic</span>
              </button>
              <button type="button" className="rpb-btn-ghost px-3 py-2 text-sm" onClick={() => editor?.chain().focus().toggleUnderline().run()}>
                <span className="inline-flex items-center gap-1"><UnderlineIcon size={14} />Underline</span>
              </button>
              <button type="button" className="rpb-btn-ghost px-3 py-2 text-sm" onClick={() => editor?.chain().focus().toggleStrike().run()}>
                <span className="inline-flex items-center gap-1"><Strikethrough size={14} />Strike</span>
              </button>
              <button type="button" className="rpb-btn-ghost px-3 py-2 text-sm" onClick={() => editor?.chain().focus().toggleSubscript().run()}>
                <span className="inline-flex items-center gap-1"><SubscriptIcon size={14} />Sub</span>
              </button>
              <button type="button" className="rpb-btn-ghost px-3 py-2 text-sm" onClick={() => editor?.chain().focus().toggleSuperscript().run()}>
                <span className="inline-flex items-center gap-1"><SuperscriptIcon size={14} />Sup</span>
              </button>
              <button type="button" className="rpb-btn-ghost px-3 py-2 text-sm" onClick={() => editor?.chain().focus().toggleBulletList().run()}>
                <span className="inline-flex items-center gap-1"><List size={14} />Bullet</span>
              </button>
              <button type="button" className="rpb-btn-ghost px-3 py-2 text-sm" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
                <span className="inline-flex items-center gap-1"><ListOrdered size={14} />Number</span>
              </button>
              <label className="rpb-btn-ghost inline-flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                <Pilcrow size={14} />
                Color
                <input
                  type="color"
                  className="h-6 w-6 border-0 bg-transparent p-0"
                  value={toolbarState.textColor}
                  onChange={(event) => applyTextColor(event.target.value)}
                />
              </label>
              <label className="rpb-btn-ghost inline-flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                <PaintBucket size={14} />
                Highlight
                <input
                  type="color"
                  className="h-6 w-6 border-0 bg-transparent p-0"
                  value={toolbarState.highlightColor}
                  onChange={(event) => applyHighlightColor(event.target.value)}
                />
              </label>
              <button type="button" className="rpb-btn-ghost px-3 py-2 text-sm" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 4, withHeaderRow: true }).run()}>
                <span className="inline-flex items-center gap-1"><Table2 size={14} />Table</span>
              </button>
              <button type="button" className="rpb-btn-ghost px-3 py-2 text-sm" onClick={handleInsertRpbTable}>
                Insert Tabel RPB
              </button>
              <button
                type="button"
                className="rpb-btn-ghost px-3 py-2 text-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="inline-flex items-center gap-1"><ImagePlus size={14} />Insert Gambar</span>
              </button>
              <button
                type="button"
                className="rpb-btn-ghost px-3 py-2 text-sm"
                onClick={() => setSelectedImageAlign("left")}
              >
                <span className="inline-flex items-center gap-1"><AlignLeft size={14} />Img Left</span>
              </button>
              <button
                type="button"
                className="rpb-btn-ghost px-3 py-2 text-sm"
                onClick={() => setSelectedImageAlign("center")}
              >
                <span className="inline-flex items-center gap-1"><AlignCenter size={14} />Img Center</span>
              </button>
              <button
                type="button"
                className="rpb-btn-ghost px-3 py-2 text-sm"
                onClick={() => setSelectedImageAlign("right")}
              >
                <span className="inline-flex items-center gap-1"><AlignRight size={14} />Img Right</span>
              </button>
              <button
                type="button"
                className="rpb-btn-ghost px-3 py-2 text-sm"
                onClick={() => setSelectedImageWidth(40)}
              >
                Img S
              </button>
              <button
                type="button"
                className="rpb-btn-ghost px-3 py-2 text-sm"
                onClick={() => setSelectedImageWidth(60)}
              >
                Img M
              </button>
              <button
                type="button"
                className="rpb-btn-ghost px-3 py-2 text-sm"
                onClick={() => setSelectedImageWidth(85)}
              >
                Img L
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    handleInsertImageByFile(file);
                  }
                  event.currentTarget.value = "";
                }}
              />
            </div>

            <div className="rpb-doc-canvas">
              <div className="mb-4 text-sm text-rpb-ink-soft">
                <div><strong>Customer Name:</strong> {customerName || "-"}</div>
                <div><strong>Project Name:</strong> {projectName || "-"}</div>
                <div>
                  <strong>Date:</strong>{" "}
                  {new Intl.DateTimeFormat("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  }).format(new Date())}
                </div>
              </div>
              <EditorContent editor={editor} className="rpb-editor-content" />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
