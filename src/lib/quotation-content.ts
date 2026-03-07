export const DEFAULT_TERMS_CONDITION_LINES = [
  "- The above price loco Jakarta on truck",
  "- The above price Excluding OUTDOOR",
  "- Price Excluded Installation",
  "- The above price valid 15 Days from the date above",
  "- Unit warranty 12 months after testing commissioning or 18 months after factory delivery whichever comes first.",
  "- Time delivery: 8 - 10 weeks after DP",
];

export const DEFAULT_TERMS_PAYMENT_LINES = [
  "- 50% Down Payment DP",
  "- 50% Before Delivery",
];

export const DEFAULT_ADDITIONAL_INFORMATION = [
  "**Term and Condition :**",
  ...DEFAULT_TERMS_CONDITION_LINES,
  "",
  "**Term Payment :**",
  ...DEFAULT_TERMS_PAYMENT_LINES,
].join("\n");

export type AdditionalInformationSections = {
  conditionLines: string[];
  paymentLines: string[];
};

const TERMS_CONDITION_HEADER_PATTERN = /^term(?:s)?\s*(?:and|&)\s*condition(?:s)?\s*:?\s*$/i;
const TERMS_PAYMENT_HEADER_PATTERN = /^term(?:s)?\s*(?:of\s*)?payment\s*:?\s*$/i;

function normalizeHeaderText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[*_`]+/g, "")
    .replace(/^[\s\-\u2022]+/, "")
    .trim();
}

export function stripBoldMarkers(value: string): string {
  return String(value ?? "").replace(/\*\*(.*?)\*\*/g, "$1");
}

function isConditionHeader(value: string): boolean {
  return TERMS_CONDITION_HEADER_PATTERN.test(normalizeHeaderText(stripBoldMarkers(value)));
}

function isPaymentHeader(value: string): boolean {
  return TERMS_PAYMENT_HEADER_PATTERN.test(normalizeHeaderText(stripBoldMarkers(value)));
}

export function parseAdditionalInformationSections(value: string): AdditionalInformationSections {
  const lines = String(value ?? "").replace(/\r\n/g, "\n").split("\n");
  const conditionLines: string[] = [];
  const paymentLines: string[] = [];
  let currentSection: "condition" | "payment" = "condition";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (isConditionHeader(line)) {
      currentSection = "condition";
      continue;
    }
    if (isPaymentHeader(line)) {
      currentSection = "payment";
      continue;
    }

    if (!line) {
      if (currentSection === "payment") {
        paymentLines.push("");
      } else {
        conditionLines.push("");
      }
      continue;
    }

    if (currentSection === "payment") {
      paymentLines.push(line);
    } else {
      conditionLines.push(line);
    }
  }

  let finalConditionLines = conditionLines;
  let finalPaymentLines = paymentLines;
  if (finalPaymentLines.length === 0 && finalConditionLines.length > 7) {
    finalPaymentLines = finalConditionLines.slice(7);
  }

  finalConditionLines = finalConditionLines.slice(0, 7);
  finalPaymentLines = finalPaymentLines.slice(0, 2);

  return {
    conditionLines: finalConditionLines,
    paymentLines: finalPaymentLines,
  };
}

export function buildAdditionalInformationPreviewLines(value: string): string[] {
  const sections = parseAdditionalInformationSections(value);
  if (sections.conditionLines.length === 0 && sections.paymentLines.length === 0) {
    return [];
  }
  if (sections.paymentLines.length === 0) {
    return sections.conditionLines;
  }
  return [...sections.conditionLines, "", ...sections.paymentLines];
}

