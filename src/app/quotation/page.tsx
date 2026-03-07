"use client";

import { RpbPageFrame } from "@/components/layout/rpb-page-frame";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  buildAdditionalInformationPreviewLines,
  DEFAULT_ADDITIONAL_INFORMATION,
  parseAdditionalInformationSections,
} from "@/lib/quotation-content";
import { useRpbMasterData } from "@/hooks/use-rpb-master-data";
import { buildSummaryLineItems } from "@/lib/rpb-line-items";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRpbStore } from "@/store/rpb-store";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type QuotationForm = {
  attn: string;
  itemDescription: string;
  quantity: string;
  discount: string;
  additionalInformation: string;
};

const numberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});
const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const pctToValue = (subtotal: number, pct: number): number => subtotal * (pct / 100);

function toNumber(value: string): number {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDiscount(value: string): number {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.replace("%", "");
  let n = toNumber(normalized);
  if (n > 1) n /= 100;
  if (n < 0) n = 0;
  if (n > 1) n = 1;
  return n;
}

function renderBoldInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g).filter((part) => part.length > 0);
  return parts.map((part, index) => {
    const boldMatch = /^\*\*(.*)\*\*$/.exec(part);
    if (boldMatch) {
      return <strong key={`b-${index}`}>{boldMatch[1]}</strong>;
    }
    return <span key={`n-${index}`}>{part}</span>;
  });
}

function renderRichMultilineText(value: string) {
  const normalized = String(value ?? "").replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (lines.length === 0) {
    return "-";
  }
  return lines.map((line, index) => (
    <span key={`line-${index}`}>
      {line.length > 0 ? renderBoldInline(line) : "\u00A0"}
      {index < lines.length - 1 ? <br /> : null}
    </span>
  ));
}

export default function QuotationPage() {
  const { user } = useAuthSession();
  const { data: masterData } = useRpbMasterData();

  const customerName = useRpbStore((state) => state.customerName);
  const customerAddress = useRpbStore((state) => state.customerAddress);
  const projectName = useRpbStore((state) => state.projectName);
  const dimensions = useRpbStore((state) => state.dimensions);
  const panelThickness = useRpbStore((state) => state.panelThickness);
  const selectedOther = useRpbStore((state) => state.selectedOther);
  const customOtherItems = useRpbStore((state) => state.customOtherItems);
  const adjustments = useRpbStore((state) => state.adjustments);

  const [accountName, setAccountName] = useState("");
  const [accountPhone, setAccountPhone] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const attnInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const additionalInfoRef = useRef<HTMLTextAreaElement>(null);
  const [form, setForm] = useState<QuotationForm>({
    attn: "",
    itemDescription: projectName || "",
    quantity: "1",
    discount: "25%",
    additionalInformation: DEFAULT_ADDITIONAL_INFORMATION,
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!user) {
      setAccountName("");
      setAccountPhone("");
      setAccountEmail("");
      return;
    }

    const loadProfile = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase
          .from("user_profiles")
          .select("full_name, phone_number, email")
          .eq("id", user.id)
          .maybeSingle();

        const fallbackName =
          String(user.user_metadata?.full_name ?? "").trim() ||
          String(user.user_metadata?.name ?? "").trim() ||
          String(user.email ?? "").trim();

        setAccountName(String(data?.full_name ?? fallbackName).trim());
        setAccountPhone(String(data?.phone_number ?? "").trim());
        setAccountEmail(String(data?.email ?? user.email ?? "").trim());
      } catch {
        const fallbackName =
          String(user.user_metadata?.full_name ?? "").trim() ||
          String(user.user_metadata?.name ?? "").trim() ||
          String(user.email ?? "").trim();
        setAccountName(fallbackName);
        setAccountPhone("");
        setAccountEmail(String(user.email ?? "").trim());
      }
    };

    void loadProfile();
  }, [user]);

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

  const grandTotalRpb = useMemo(() => {
    const subtotalIdr = lineItems.reduce((sum, item) => sum + item.hargaIdr * item.qty, 0);
    const stockReturnIdr = pctToValue(subtotalIdr, adjustments.stockReturn);
    const marketingCostIdr = pctToValue(subtotalIdr, adjustments.marketingCost);
    const servicesIdr = pctToValue(subtotalIdr, adjustments.services);
    const baseAfterAdjustIdr = subtotalIdr + stockReturnIdr + marketingCostIdr + servicesIdr;
    const profitIdr = pctToValue(baseAfterAdjustIdr, adjustments.profit);
    return baseAfterAdjustIdr + profitIdr;
  }, [adjustments, lineItems]);

  const preview = useMemo(() => {
    const quantity = Math.max(0, toNumber(form.quantity));
    const price = grandTotalRpb;
    const subtotal = quantity * price;
    const discountRate = toDiscount(form.discount);
    const discountAmount = subtotal * discountRate;
    const ppn = (subtotal - discountAmount) * 0.11;
    const grandTotal = subtotal - discountAmount + ppn;
    const additionalInformationLines = buildAdditionalInformationPreviewLines(
      form.additionalInformation,
    );

    return {
      quantity,
      price,
      discountRate,
      subtotal,
      discountAmount,
      ppn,
      grandTotal,
      additionalInformationLines,
      contactPerson: [accountName, accountPhone].filter(Boolean).join(" / "),
    };
  }, [accountName, accountPhone, form, grandTotalRpb]);

  const quotationDate = useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );

  const quotationNo = useMemo(() => {
    const date = new Date();
    return `Q-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const setField = (key: keyof QuotationForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDescriptionTab = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab") {
      return;
    }
    event.preventDefault();
    const el = event.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const next = `${form.itemDescription.slice(0, start)}\t${form.itemDescription.slice(end)}`;
    setField("itemDescription", next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + 1;
      el.setSelectionRange(cursor, cursor);
    });
  };

  const applyBoldToControl = (
    control: HTMLInputElement | HTMLTextAreaElement | null,
    field: keyof QuotationForm,
  ) => {
    if (!control) return;

    const start = control.selectionStart ?? 0;
    const end = control.selectionEnd ?? 0;
    const currentValue = form[field] as string;
    const selected = currentValue.slice(start, end);

    if (!selected) {
      const nextValue = `${currentValue.slice(0, start)}****${currentValue.slice(end)}`;
      setField(field, nextValue);
      requestAnimationFrame(() => {
        control.focus();
        control.setSelectionRange(start + 2, start + 2);
      });
      return;
    }

    const wrapped = `**${selected}**`;
    const nextValue = `${currentValue.slice(0, start)}${wrapped}${currentValue.slice(end)}`;
    setField(field, nextValue);
    requestAnimationFrame(() => {
      control.focus();
      control.setSelectionRange(start + 2, end + 2);
    });
  };

  const downloadExcel = async () => {
    setBusy(true);
    setError(null);

    try {
      const sections = parseAdditionalInformationSections(form.additionalInformation);
      const response = await fetch("/api/quotation/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quotationDate,
          quotationNo,
          preparedFor: customerName,
          customerAddress: customerAddress,
          attn: form.attn,
          salesName: accountName,
          salesEmail: accountEmail,
          salesPhone: accountPhone,
          itemDescription: form.itemDescription,
          quantity: Math.max(0, toNumber(form.quantity)),
          price: grandTotalRpb,
          discount: form.discount,
          termsCondition: sections.conditionLines.join("\n"),
          termsPayment: sections.paymentLines.join("\n"),
          additionalInformation: form.additionalInformation,
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "Gagal generate file Excel");
      }

      const blob = await response.blob();
      const fileUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = fileUrl;
      anchor.download = `quotation-${Date.now()}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(fileUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal generate file Excel");
    } finally {
      setBusy(false);
    }
  };

  if (!isHydrated) {
    return (
      <RpbPageFrame noContentPadding>
        <div className="quotation-page py-4 md:py-5">
          <div className="quotation-grid">
            <section className="quotation-panel">
              <h1>Quotation</h1>
              <p className="muted">Menyiapkan data quotation...</p>
            </section>
          </div>
        </div>
      </RpbPageFrame>
    );
  }

  return (
    <RpbPageFrame noContentPadding>
      <div className="quotation-page py-4 md:py-5">
        <div className="quotation-grid">
          <section className="quotation-panel">
            <h1>Quotation</h1>
            <p className="muted">
              Data customer dan Contact Person diambil otomatis dari RPB dan informasi akun. Price
              otomatis pakai Grand Total RPB.
            </p>

            <div className="form-grid">
              <div className="auto-box">
                <div className="auto-row">
                  <span>Prepared For (Customer Name)</span>
                  <strong>{customerName || "-"}</strong>
                </div>
                <div className="auto-row">
                  <span>Customer Address</span>
                  <strong>{customerAddress || "-"}</strong>
                </div>
                <div className="auto-row">
                  <span>Contact Person</span>
                  <strong>{accountName || "-"}</strong>
                </div>
                <div className="auto-row">
                  <span>Phone Number</span>
                  <strong>{accountPhone || "-"}</strong>
                </div>
              </div>

              <label>
                Attn
                <div className="field-toolbar">
                  <button
                    type="button"
                    className="rpb-btn-ghost text-style-btn"
                    onClick={() => applyBoldToControl(attnInputRef.current, "attn")}
                    title="Bold teks terpilih"
                  >
                    B
                  </button>
                </div>
                <input
                  ref={attnInputRef}
                  className="rpb-input"
                  value={form.attn}
                  onChange={(event) => setField("attn", event.target.value)}
                />
              </label>

              <fieldset className="item-box">
                <legend>Item</legend>
                <label>
                  Quotation Description
                  <div className="field-toolbar">
                    <button
                      type="button"
                      className="rpb-btn-ghost text-style-btn"
                      onClick={() => applyBoldToControl(descriptionRef.current, "itemDescription")}
                      title="Bold teks terpilih"
                    >
                      B
                    </button>
                  </div>
                  <textarea
                    ref={descriptionRef}
                    className="rpb-input"
                    rows={4}
                    value={form.itemDescription}
                    onChange={(event) => setField("itemDescription", event.target.value)}
                    onKeyDown={handleDescriptionTab}
                  />
                </label>
                <label>
                  Quantity
                  <input
                    className="rpb-input"
                    value={form.quantity}
                    onChange={(event) => setField("quantity", event.target.value)}
                  />
                </label>
                <label>
                  Grand Total RPB (Auto)
                  <input
                    className="rpb-input"
                    value={currencyFormatter.format(grandTotalRpb)}
                    readOnly
                  />
                </label>
                <label>
                  Discount (%)
                  <input
                    className="rpb-input"
                    value={form.discount}
                    onChange={(event) => setField("discount", event.target.value)}
                  />
                </label>
              </fieldset>

              <fieldset className="item-box">
                <legend>Additional Information</legend>
                <label>
                  <div className="field-toolbar">
                    <button
                      type="button"
                      className="rpb-btn-ghost text-style-btn"
                      onClick={() =>
                        applyBoldToControl(additionalInfoRef.current, "additionalInformation")
                      }
                      title="Bold teks terpilih"
                    >
                      B
                    </button>
                  </div>
                  <textarea
                    ref={additionalInfoRef}
                    className="rpb-input"
                    rows={12}
                    value={form.additionalInformation}
                    onChange={(event) => setField("additionalInformation", event.target.value)}
                  />
                </label>
              </fieldset>

              {error ? <div className="error-box">{error}</div> : null}

              <div className="actions">
                <button
                  type="button"
                  className="rpb-btn-primary action-btn"
                  onClick={() => void downloadExcel()}
                  disabled={busy}
                >
                  {busy ? "Generating..." : "Download Excel"}
                </button>
              </div>
            </div>
          </section>

          <section className="quotation-panel preview">
            <h2>Preview</h2>

            <div className="a4-stage">
              <article className="a4-page">
                <header className="sheet-head">
                  <img src="/assets/template-logo.png" alt="Company Logo" className="sheet-logo" />
                  <div className="sheet-head-right">
                    <h3 className="sheet-title">QUOTATION</h3>
                    <table className="meta-table">
                      <tbody>
                        <tr>
                          <td>Date</td>
                          <td>:</td>
                          <td>{quotationDate}</td>
                        </tr>
                        <tr>
                          <td>Quotation No</td>
                          <td>:</td>
                          <td>{quotationNo}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </header>
                <div className="sheet-divider" />
                <section className="company-block">
                  <div>PT. Klimatek</div>
                  <div>Jl. Tengsaw Kp. Babakan, Desa Tarikolot,</div>
                  <div>RT. 003 RW. 005 Citeureup - Kab. Bogor</div>
                  <div>Jawa Barat - Indonesia</div>
                </section>

                <section className="info-lines">
                  <div className="info-line">
                    <div className="info-label">Contact Person</div>
                    <div className="info-sep">:</div>
                    <div className="info-value">{preview.contactPerson || "-"}</div>
                  </div>
                  <div className="info-line">
                    <div className="info-label">Prepared For</div>
                    <div className="info-sep">:</div>
                    <div className="info-value strong">{customerName || "-"}</div>
                  </div>
                  <div className="info-line info-line-address">
                    <div className="info-label" />
                    <div className="info-sep" />
                    <div className="info-value">
                      <div>{customerAddress || "-"}</div>
                    </div>
                  </div>
                  <div className="info-line info-line-attn">
                    <div className="info-label">Attn</div>
                    <div className="info-sep">:</div>
                    <div className="info-value strong">
                      {form.attn ? renderRichMultilineText(form.attn) : "-"}
                    </div>
                  </div>
                </section>

                <table className="item-grid">
                  <thead>
                    <tr>
                      <th className="w-no">No</th>
                      <th className="w-desc">Description</th>
                      <th className="w-qty">QTY</th>
                      <th className="w-price">Price</th>
                      <th className="w-total">Total Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="item-row">
                      <td>1</td>
                      <td>{form.itemDescription ? renderRichMultilineText(form.itemDescription) : "-"}</td>
                      <td>{numberFormatter.format(preview.quantity)}</td>
                      <td>{currencyFormatter.format(preview.price)}</td>
                      <td>{currencyFormatter.format(preview.subtotal)}</td>
                    </tr>
                    <tr className="summary-row summary-start">
                      <td className="summary-empty" colSpan={2} rowSpan={4} />
                      <td className="summary-label" colSpan={2}>Subtotal</td>
                      <td className="summary-value">{currencyFormatter.format(preview.subtotal)}</td>
                    </tr>
                    <tr className="summary-row">
                      <td className="summary-label" colSpan={2}>
                        Discount ({(preview.discountRate * 100).toFixed(2)}%)
                      </td>
                      <td className="summary-value">{currencyFormatter.format(preview.discountAmount)}</td>
                    </tr>
                    <tr className="summary-row">
                      <td className="summary-label" colSpan={2}>PPN 11%</td>
                      <td className="summary-value">{currencyFormatter.format(preview.ppn)}</td>
                    </tr>
                    <tr className="summary-row strong">
                      <td className="summary-label" colSpan={2}>Grand Total</td>
                      <td className="summary-value">{currencyFormatter.format(preview.grandTotal)}</td>
                    </tr>
                  </tbody>
                </table>

                <section className="terms">
                  <div className="terms-list plain-text">
                    {preview.additionalInformationLines.length > 0
                      ? renderRichMultilineText(preview.additionalInformationLines.join("\n"))
                      : "-"}
                  </div>
                </section>

                <footer className="sign-block">
                  <div>Best Regards</div>
                  <div className="sign-name">{accountName || "-"}</div>
                  <div className="sign-company">PT Klimatek</div>
                  <div className="sign-email">Email : {accountEmail || "-"}</div>
                </footer>
              </article>
            </div>
          </section>
        </div>

        <div className="mt-3 flex justify-end no-print">
          <Link
            href="/summary"
            className="rpb-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
          >
            Back to Summary
          </Link>
        </div>
      </div>

      <style>{`
        .quotation-grid {
          display: grid;
          width: 100%;
          grid-template-columns: minmax(360px, 1fr) minmax(420px, 1.4fr);
          gap: 16px;
          align-items: start;
        }
        .quotation-page {
          width: 100%;
          padding-left: 20px;
          padding-right: 20px;
          overflow-x: hidden;
        }
        @media (min-width: 1024px) {
          .quotation-page {
            padding-left: 28px;
            padding-right: 28px;
          }
        }
        .quotation-panel {
          border: 1px solid var(--rpb-border);
          border-radius: 14px;
          background: #fff;
          padding: 20px;
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
        }
        .quotation-panel h1,
        .quotation-panel h2,
        .quotation-panel h3 {
          margin: 0 0 12px;
        }
        .muted {
          color: var(--rpb-ink-soft);
          margin: 0 0 16px;
          font-size: 13px;
        }
        .form-grid {
          display: grid;
          gap: 12px;
        }
        .auto-box {
          border: 1px solid var(--rpb-border);
          border-radius: 10px;
          background: #f8fafc;
          padding: 10px 12px;
          display: grid;
          gap: 8px;
        }
        .auto-row {
          display: grid;
          gap: 2px;
        }
        .auto-row span {
          color: var(--rpb-ink-soft);
          font-size: 12px;
        }
        .auto-row strong {
          font-size: 14px;
          white-space: pre-line;
          word-break: break-word;
        }
        label {
          display: grid;
          gap: 6px;
          font-size: 14px;
        }
        .field-toolbar {
          display: flex;
          justify-content: flex-end;
          margin-top: -2px;
          margin-bottom: 2px;
        }
        .text-style-btn {
          width: 30px;
          height: 28px;
          font-weight: 800;
          font-size: 14px;
          line-height: 1;
          cursor: pointer;
        }
        textarea {
          resize: vertical;
          min-height: 90px;
        }
        .item-box {
          border: 1px solid var(--rpb-border);
          border-radius: 10px;
          padding: 12px;
          margin: 0;
          display: grid;
          gap: 8px;
        }
        legend {
          padding: 0 8px;
          color: var(--rpb-ink-soft);
          font-weight: 600;
          font-size: 13px;
        }
        .actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          flex-wrap: wrap;
        }
        .action-btn {
          padding: 10px 14px;
          font-weight: 700;
          cursor: pointer;
        }
        .error-box {
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #b91c1c;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          white-space: pre-wrap;
        }
        .a4-stage {
          margin-top: 12px;
          padding: 14px;
          border: 1px solid var(--rpb-border);
          border-radius: 10px;
          background: #eef2f7;
          overflow: hidden;
        }
        .a4-page {
          width: min(100%, 210mm);
          min-height: 297mm;
          margin: 0 auto;
          background: #fff;
          color: #111;
          font-family: Calibri, Arial, sans-serif;
          font-size: clamp(9px, 1.7vw, 11px);
          line-height: 1.2;
          padding: 10mm;
          box-shadow: 0 14px 24px rgba(15, 23, 42, 0.14);
        }
        .sheet-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
        }
        .sheet-logo {
          width: 175px;
          max-width: 48%;
          max-height: 58px;
          object-fit: contain;
        }
        .sheet-head-right {
          min-width: 0;
          max-width: 52%;
        }
        .sheet-title {
          font-size: 16px;
          font-weight: 400;
          margin: 0 0 2px;
          text-align: right;
        }
        .meta-table {
          width: auto;
          margin-left: auto;
          border-collapse: collapse;
        }
        .meta-table td {
          border: none;
          padding: 0 4px;
          font-size: 10px;
        }
        .sheet-divider {
          margin-top: 2px;
          border-top: 1px solid #111;
        }
        .company-block {
          margin-top: 4px;
          margin-bottom: 10px;
        }
        .company-block div {
          margin: 2px 0;
        }
        .info-lines {
          margin: 10px 0 12px;
        }
        .info-line {
          display: grid;
          grid-template-columns: 120px 10px 1fr;
          align-items: start;
          column-gap: 3px;
          margin: 2px 0;
        }
        .info-value {
          white-space: pre-line;
        }
        .info-value.strong {
          font-weight: 700;
        }
        .info-line-attn {
          margin-top: 8px;
        }
        .item-grid {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
          table-layout: fixed;
        }
        .item-grid th,
        .item-grid td {
          border: 1px solid #111;
          padding: 2px 4px;
          vertical-align: top;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .item-grid th {
          font-weight: 700;
          text-align: center;
        }
        .item-grid .w-no {
          width: 36px;
        }
        .item-grid .w-desc {
          width: 58%;
        }
        .item-grid .w-qty {
          width: 11%;
        }
        .item-grid .w-price {
          width: 19%;
        }
        .item-grid .w-total {
          width: 13%;
        }
        .item-grid .item-row td:nth-child(1) {
          text-align: center;
        }
        .item-grid .item-row td:nth-child(2) {
          white-space: pre-wrap;
          tab-size: 4;
          min-height: 180px;
        }
        .item-grid .item-row td:nth-child(3),
        .item-grid .item-row td:nth-child(4),
        .item-grid .item-row td:nth-child(5),
        .summary-label,
        .summary-value {
          text-align: right;
        }
        .summary-label {
          font-weight: 700;
        }
        .summary-empty {
          border: none !important;
          padding: 0;
        }
        .summary-row.strong .summary-label,
        .summary-row.strong .summary-value {
          font-weight: 700;
        }
        .terms {
          margin-top: 6px;
          font-size: 10px;
        }
        .terms-list > div {
          margin: 3px 0;
        }
        .terms-list.plain-text {
          white-space: pre-line;
          line-height: 1.35;
        }
        .terms-title {
          font-weight: 700;
        }
        .terms-title.mt {
          margin-top: 10px;
        }
        .sign-block {
          margin-top: 18px;
          font-size: 10px;
          white-space: pre-line;
        }
        .sign-block div {
          margin: 2px 0;
        }
        .sign-name,
        .sign-company,
        .sign-email {
          font-weight: 700;
        }
        .sign-name {
          margin-top: 20px !important;
        }

        @media (max-width: 980px) {
          .quotation-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .quotation-page {
            padding-left: 12px;
            padding-right: 12px;
          }
          .quotation-panel {
            border-radius: 12px;
            padding: 14px;
          }
          .actions {
            justify-content: stretch;
          }
          .action-btn {
            width: 100%;
          }
          .a4-stage {
            padding: 8px;
          }
          .a4-page {
            min-height: 0;
            padding: 14px;
            font-size: 9px;
            line-height: 1.3;
            box-shadow: 0 10px 18px rgba(15, 23, 42, 0.12);
          }
          .sheet-head {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .sheet-logo {
            width: 130px;
            max-width: 100%;
            max-height: 46px;
          }
          .sheet-head-right {
            width: 100%;
            max-width: 100%;
          }
          .sheet-title {
            text-align: left;
            font-size: 13px;
          }
          .meta-table {
            margin-left: 0;
          }
          .meta-table td {
            padding: 0 2px;
            font-size: 9px;
          }
          .info-line {
            grid-template-columns: 88px 8px 1fr;
            column-gap: 2px;
          }
          .item-grid th,
          .item-grid td {
            padding: 2px;
            font-size: 8.5px;
          }
          .item-grid .w-no {
            width: 7%;
          }
          .item-grid .w-desc {
            width: 42%;
          }
          .item-grid .w-qty {
            width: 12%;
          }
          .item-grid .w-price {
            width: 22%;
          }
          .item-grid .w-total {
            width: 16%;
          }
          .item-grid .item-row td:nth-child(2) {
            min-height: 110px;
          }
          .terms {
            font-size: 9px;
          }
          .sign-block {
            margin-top: 14px;
            font-size: 9px;
          }
          .sign-name {
            margin-top: 14px !important;
          }
        }

        @media (max-width: 375px) {
          .quotation-page {
            padding-left: 10px;
            padding-right: 10px;
          }
          .quotation-panel {
            padding: 12px;
          }
          .a4-stage {
            padding: 6px;
          }
          .a4-page {
            padding: 10px;
          }
          .info-line {
            grid-template-columns: 78px 7px 1fr;
          }
          .item-grid th,
          .item-grid td {
            font-size: 8px;
          }
        }
      `}</style>
    </RpbPageFrame>
  );
}
