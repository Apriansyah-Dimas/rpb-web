import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import XlsxPopulate from "xlsx-populate";

export const runtime = "nodejs";

type Payload = {
  preparedFor?: string;
  customerName?: string;
  customerAddressLine1?: string;
  customerAddress?: string;
  customerAddressLine2?: string;
  attn?: string;
  salesName?: string;
  salesPhone?: string;
  itemDescription?: string;
  item1Description?: string;
  quantity?: number | string;
  itemQuantity?: number | string;
  item1Quantity?: number | string;
  price?: number | string;
  itemPrice?: number | string;
  item1Price?: number | string;
  discount?: number | string;
  itemDiscount?: number | string;
  item1Discount?: number | string;
  additionalInformation?: string;
  termsCondition?: string;
  termsPayment?: string;
};

const TEMPLATE_FILE = path.join(process.cwd(), "templates", "Quotation_PT_Jaya_Nurimba.xlsx");

const DEFAULT_TERMS_CONDITION = [
  "- The above price Excluding PPn 11%",
  "- The above price loco Jakarta on truck",
  "- The above price Excluding OUTDOOR",
  "- Price Excluded Installation",
  "- The above price valid 15 Days from the date above",
  "- Unit warranty 12 months after testing commissioning or 18 months after factory delivery whichever comes first.",
  "- Time delivery: 8 - 10 weeks after DP",
];

const DEFAULT_TERMS_PAYMENT = ["- 50% Down Payment DP", "- 50% Before Delivery"];

function toNumber(value: unknown): number {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDiscount(value: unknown): number {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const normalized = raw.replace("%", "");
  let n = toNumber(normalized);
  if (n > 1) n /= 100;
  if (n < 0) n = 0;
  if (n > 1) n = 1;
  return n;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function buildContactPerson(salesName: unknown, salesPhone: unknown): string {
  const name = text(salesName);
  const phone = text(salesPhone);
  if (name && phone) return `${name} / ${phone}`;
  return name || phone;
}

function parseLines(value: unknown, fallbackLines: string[]): string[] {
  const lines = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length > 0 ? lines : fallbackLines;
}

function writeLinesToColumn(
  sheet: any,
  column: string,
  startRow: number,
  endRow: number,
  lines: string[],
): void {
  for (let row = startRow; row <= endRow; row += 1) {
    sheet.cell(`${column}${row}`).value(null);
  }

  const maxRows = endRow - startRow + 1;
  lines.slice(0, maxRows).forEach((line, index) => {
    sheet.cell(`${column}${startRow + index}`).value(line);
  });
}

async function createWorkbookBuffer(payload: Payload): Promise<Buffer> {
  await fs.access(TEMPLATE_FILE);

  const workbook = await XlsxPopulate.fromFileAsync(TEMPLATE_FILE);
  const sheet = workbook.sheet("Quotation") || workbook.sheet(0);
  sheet.pageMarginsPreset("normal");

  const preparedFor = text(payload.preparedFor || payload.customerName);
  const addressLine1 = text(payload.customerAddressLine1 || payload.customerAddress);
  const addressLine2 = text(payload.customerAddressLine2);
  const attn = text(payload.attn);
  const contactPerson = buildContactPerson(payload.salesName, payload.salesPhone);

  const description = text(payload.itemDescription || payload.item1Description);
  const quantity = toNumber(payload.quantity || payload.itemQuantity || payload.item1Quantity);
  const price = toNumber(payload.price || payload.itemPrice || payload.item1Price);
  const discount = toDiscount(payload.discount || payload.itemDiscount || payload.item1Discount);
  const addressCombined = [addressLine1, addressLine2].filter(Boolean).join("\n");
  const discountRateLiteral = Number.isFinite(discount) ? String(discount) : "0";
  const additionalLines = parseLines(payload.additionalInformation, []);
  const termsConditionLines =
    additionalLines.length > 0
      ? additionalLines.slice(0, 7)
      : parseLines(payload.termsCondition, DEFAULT_TERMS_CONDITION);
  const termsPaymentLines =
    additionalLines.length > 0
      ? additionalLines.slice(7, 9)
      : parseLines(payload.termsPayment, DEFAULT_TERMS_PAYMENT);

  ["A26:A36", "B26:D36", "E26:E36", "F26:F36", "G26:G36", "H26:H36"].forEach((range) => {
    sheet.range(range).merged(false);
  });
  ["G15:G25", "H15:H25"].forEach((range) => {
    sheet.range(range).merged(false);
  });
  sheet.column("G").hidden(false);
  sheet.cell("G14").value("Total Price");
  sheet.cell("H14").value("");

  sheet.cell("C9").value(contactPerson);
  sheet.cell("C10").formula(null).value(preparedFor);
  sheet.cell("C11").formula(null).value(addressCombined);
  sheet.cell("C12").formula(null).value(attn);
  sheet.cell("C11").style("wrapText", true);

  sheet.cell("A15").value(1);
  sheet.cell("B15").formula(null).value(description);
  sheet.cell("E15").formula(null).value(quantity);
  sheet.cell("F15").formula(null).value(price);
  sheet.cell("G15").formula('IF(OR(E15="",F15=""),"",E15*F15)');
  sheet.cell("H15").formula(null).value(null);

  ["A26", "B26", "E26", "F26", "G26", "H26"].forEach((address) => {
    sheet.cell(address).formula(null).value(null);
  });
  for (let row = 26; row <= 33; row += 1) {
    sheet.row(row).hidden(true);
  }
  for (let row = 34; row <= 37; row += 1) {
    sheet.row(row).hidden(false);
  }

  ["A", "B", "C", "D", "E", "G", "H"].forEach((col) => {
    for (let row = 34; row <= 36; row += 1) {
      sheet.cell(`${col}${row}`).value(null);
    }
  });

  sheet.cell("G26").formula(null).value(null);
  sheet.cell("H26").formula(null).value(null);
  sheet.cell("F34").value("Subtotal");
  sheet.cell("G34").formula('IF(G15="","",G15)');
  sheet.cell("F35").value("Discount");
  sheet.cell("G35").formula(`IF(G34="","",G34*${discountRateLiteral})`);
  sheet.cell("F36").value("PPN 11%");
  sheet.cell("G36").formula('IF(G34="","",(G34-G35)*11%)');
  sheet.cell("F37").value("Grand Total");
  sheet.cell("G37").formula('IF(G34="","",G34-G35+G36)');

  const numberFormat = "#,##0";
  sheet.cell("E15").style("numberFormat", numberFormat);
  sheet.cell("F15").style("numberFormat", numberFormat);
  sheet.cell("G15").style("numberFormat", numberFormat);
  for (let row = 34; row <= 37; row += 1) {
    sheet.cell(`F${row}`).style("horizontalAlignment", "right");
    sheet.cell(`G${row}`).style("horizontalAlignment", "right");
    sheet.cell(`G${row}`).style("numberFormat", numberFormat);
  }
  sheet.cell("F37").style("bold", true);
  sheet.cell("G37").style("bold", true);

  ["G14:H14", "G34:H34", "G35:H35", "G36:H36", "G37:H37"].forEach((range) => {
    sheet.range(range).merged(true);
    sheet.range(range).style("border", {
      top: true,
      left: true,
      right: true,
      bottom: true,
    });
  });
  sheet.range("G15:H25").merged(true);
  sheet.range("G15:H25").style("border", {
    top: true,
    left: true,
    right: true,
    bottom: true,
  });

  sheet.range("A14:H25").style("border", {
    top: true,
    left: true,
    right: true,
    bottom: true,
  });

  ["A", "B", "C", "D", "E"].forEach((col) => {
    for (let row = 34; row <= 37; row += 1) {
      sheet.cell(`${col}${row}`).style("border", {});
    }
  });
  for (let row = 34; row <= 37; row += 1) {
    sheet.cell(`F${row}`).style("border", {
      top: true,
      left: true,
      right: true,
      bottom: true,
    });
    sheet.range(`G${row}:H${row}`).style("border", {
      top: true,
      left: true,
      right: true,
      bottom: true,
    });
  }

  writeLinesToColumn(sheet, "A", 40, 46, termsConditionLines);
  writeLinesToColumn(sheet, "A", 48, 49, termsPaymentLines);

  ["K58:O58", "L59:O59", "L60:O60", "L61:O61", "L62:O62"].forEach((range) => {
    sheet.range(range).merged(false);
  });
  const inputCols = ["K", "L", "M", "N", "O"];
  for (let row = 58; row <= 66; row += 1) {
    inputCols.forEach((col) => {
      sheet.cell(`${col}${row}`).formula(null).value(null);
    });
    sheet.row(row).hidden(true);
  }
  inputCols.forEach((col) => sheet.column(col).hidden(true));

  return workbook.outputAsync({ type: "nodebuffer" }) as Promise<Buffer>;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = (await request.json()) as Payload;
    const buffer = await createWorkbookBuffer(payload);

    const body = new Uint8Array(buffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="quotation-${Date.now()}.xlsx"`,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "Failed to generate Excel file",
      },
      { status: 500 },
    );
  }
}
