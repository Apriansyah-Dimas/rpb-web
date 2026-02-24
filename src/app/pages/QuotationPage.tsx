import React, { useRef, useEffect, useMemo } from "react";
import { Printer, Table2, Bold, Italic, Underline, AlignLeft, AlignCenter, RotateCcw } from "lucide-react";
import { Layout } from "../components/Layout";
import { useAppStore } from "../store/useAppStore";
import { formatRupiah, formatNumber } from "../lib/formulaEval";

export default function QuotationPage() {
  const editorRef = useRef<HTMLDivElement>(null);
  const { summaryItems, percentages, projectInput, quotationContent, setQuotationContent } = useAppStore();

  const subtotal = useMemo(() => summaryItems.reduce((s, i) => s + i.total, 0), [summaryItems]);
  const stockReturnAmt = subtotal * (percentages.stockReturn / 100);
  const marketingAmt = subtotal * (percentages.marketing / 100);
  const servicesAmt = subtotal * (percentages.services / 100);
  const profitAmt = subtotal * (percentages.profit / 100);
  const grandTotal = subtotal + stockReturnAmt + marketingAmt + servicesAmt + profitAmt;

  useEffect(() => {
    if (editorRef.current && quotationContent) {
      editorRef.current.innerHTML = quotationContent;
    }
  }, []);

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const saveContent = () => {
    if (editorRef.current) {
      setQuotationContent(editorRef.current.innerHTML);
    }
  };

  const generateTableHTML = () => {
    const categories = [
      { key: "profile", label: "Profile" },
      { key: "konstruksi", label: "Konstruksi" },
      { key: "other", label: "Other / Tambahan" },
    ];

    let rows = "";
    let no = 1;

    categories.forEach(({ key, label }) => {
      const items = summaryItems.filter((i) => i.category === key);
      if (items.length === 0) return;

      rows += `
        <tr style="background:#ededfb;">
          <td colspan="5" style="padding:8px 12px;font-weight:700;color:#6365b9;font-size:12px;">${label}</td>
        </tr>`;

      items.forEach((item) => {
        rows += `
          <tr>
            <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:center;color:#888;font-size:12px;">${no++}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;">${item.name}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:12px;">${formatNumber(item.qty)} ${item.unit}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:12px;">${formatRupiah(item.unitPrice)}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;font-size:12px;">${formatRupiah(item.total)}</td>
          </tr>`;
      });
    });

    const table = `
      <div style="margin:20px 0;">
        <table style="width:100%;border-collapse:collapse;font-family:sans-serif;border:1px solid #e0e0ef;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#6365b9;">
              <th style="padding:10px 12px;color:#fff;text-align:center;font-size:12px;width:40px;">No</th>
              <th style="padding:10px 12px;color:#fff;text-align:left;font-size:12px;">Nama Item</th>
              <th style="padding:10px 12px;color:#fff;text-align:center;font-size:12px;">Qty</th>
              <th style="padding:10px 12px;color:#fff;text-align:right;font-size:12px;">Harga Satuan</th>
              <th style="padding:10px 12px;color:#fff;text-align:right;font-size:12px;">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="padding:8px 12px;text-align:right;font-size:12px;color:#666;border-top:1px solid #e0e0f0;">Subtotal</td>
              <td style="padding:8px 12px;text-align:right;font-weight:600;font-size:12px;border-top:1px solid #e0e0f0;">${formatRupiah(subtotal)}</td>
            </tr>
            <tr><td colspan="4" style="padding:4px 12px;text-align:right;font-size:12px;color:#888;">Stock Return (${percentages.stockReturn}%)</td><td style="padding:4px 12px;text-align:right;font-size:12px;">${formatRupiah(stockReturnAmt)}</td></tr>
            <tr><td colspan="4" style="padding:4px 12px;text-align:right;font-size:12px;color:#888;">Marketing (${percentages.marketing}%)</td><td style="padding:4px 12px;text-align:right;font-size:12px;">${formatRupiah(marketingAmt)}</td></tr>
            <tr><td colspan="4" style="padding:4px 12px;text-align:right;font-size:12px;color:#888;">Services (${percentages.services}%)</td><td style="padding:4px 12px;text-align:right;font-size:12px;">${formatRupiah(servicesAmt)}</td></tr>
            <tr><td colspan="4" style="padding:4px 12px;text-align:right;font-size:12px;color:#888;">Profit (${percentages.profit}%)</td><td style="padding:4px 12px;text-align:right;font-size:12px;">${formatRupiah(profitAmt)}</td></tr>
            <tr style="background:#6365b9;">
              <td colspan="4" style="padding:10px 12px;text-align:right;color:#fff;font-weight:800;font-size:13px;">GRAND TOTAL</td>
              <td style="padding:10px 12px;text-align:right;color:#fff;font-weight:800;font-size:14px;">${formatRupiah(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;

    return table;
  };

  const insertTable = () => {
    if (!editorRef.current) return;
    const tableHTML = generateTableHTML();
    editorRef.current.focus();
    document.execCommand("insertHTML", false, tableHTML);
    saveContent();
  };

  const resetEditor = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
      setQuotationContent("");
    }
  };

  const handlePrint = () => {
    saveContent();
    window.print();
  };

  const toolbarButtons = [
    { icon: Bold, cmd: "bold", title: "Bold" },
    { icon: Italic, cmd: "italic", title: "Italic" },
    { icon: Underline, cmd: "underline", title: "Underline" },
  ];

  return (
    <Layout title="Quotation Builder" subtitle="Buat surat penawaran profesional">
      <div className="max-w-4xl mx-auto">

        {/* Toolbar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 px-4 py-3 flex flex-wrap items-center gap-2 print:hidden">
          {/* Heading select */}
          <select
            onChange={(e) => {
              if (e.target.value) execCmd("formatBlock", e.target.value);
              e.target.value = "";
            }}
            defaultValue=""
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-700 outline-none focus:border-indigo-400 bg-gray-50"
          >
            <option value="" disabled>Heading</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="p">Paragraph</option>
          </select>

          <div className="w-px h-6 bg-gray-200" />

          {toolbarButtons.map(({ icon: Icon, cmd, title }) => (
            <button
              key={cmd}
              onMouseDown={(e) => {
                e.preventDefault();
                execCmd(cmd);
              }}
              title={title}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all"
            >
              <Icon size={15} />
            </button>
          ))}

          <div className="w-px h-6 bg-gray-200" />

          <button
            onMouseDown={(e) => { e.preventDefault(); execCmd("justifyLeft"); }}
            title="Align Left"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-all"
          >
            <AlignLeft size={15} />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); execCmd("justifyCenter"); }}
            title="Align Center"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 transition-all"
          >
            <AlignCenter size={15} />
          </button>

          <div className="w-px h-6 bg-gray-200" />

          {/* Insert Table */}
          <button
            onClick={insertTable}
            disabled={summaryItems.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-white transition-all disabled:opacity-40"
            style={{ backgroundColor: "#6365b9", fontWeight: 600 }}
            title={summaryItems.length === 0 ? "Buat estimasi dulu di halaman Input" : "Insert tabel RPB dari Summary"}
          >
            <Table2 size={15} />
            Insert Tabel RPB
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={resetEditor}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
            >
              <RotateCcw size={14} />
              Reset
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-white transition-all"
              style={{ backgroundColor: "#7c3aed", fontWeight: 600 }}
            >
              <Printer size={15} />
              Print / PDF
            </button>
          </div>
        </div>

        {/* Info if no summary */}
        {summaryItems.length === 0 && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2 print:hidden"
            style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
          >
            ⚠️ Belum ada data estimasi. Buat estimasi di halaman <strong>New Estimate</strong> agar bisa insert tabel RPB.
          </div>
        )}

        {/* Editor */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden print:shadow-none print:border-none">
          {/* Paper-like editor */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={saveContent}
            className="min-h-[600px] p-8 outline-none text-gray-800 leading-relaxed"
            style={{
              fontSize: "14px",
              fontFamily: "'Segoe UI', sans-serif",
              lineHeight: "1.8",
            }}
            data-placeholder="Ketik isi penawaran di sini, lalu klik 'Insert Tabel RPB' untuk memasukkan tabel harga otomatis..."
          />
        </div>
      </div>

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable] h1 { font-size: 1.6rem; font-weight: 800; margin: 1rem 0 0.5rem; color: #1f1f3a; }
        [contenteditable] h2 { font-size: 1.25rem; font-weight: 700; margin: 1rem 0 0.5rem; color: #2d2d6b; }
        [contenteditable] h3 { font-size: 1.05rem; font-weight: 600; margin: 0.75rem 0 0.4rem; color: #4a4a9a; }
        [contenteditable] p { margin: 0.5rem 0; }
        [contenteditable] strong { font-weight: 700; }
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          header, aside { display: none !important; }
        }
      `}</style>
    </Layout>
  );
}
