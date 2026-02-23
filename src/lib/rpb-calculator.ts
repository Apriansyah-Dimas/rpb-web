import { buildFormulaContext, evaluateFormulaQuantity } from "@/lib/rpb-formula";
import type {
  Dimensions,
  KonstruksiMasterItem,
  PanelThickness,
  ProfileMasterItem,
} from "@/types/rpb";

const RUPIAH_FORMATTER = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const safe = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(value, 0);
};

export const sanitizeDimensions = (dimensions: Dimensions): Dimensions => ({
  length: safe(dimensions.length),
  width: safe(dimensions.width),
  height: safe(dimensions.height),
});

export interface CalculatedFixedItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  qty: number;
  unitPriceUsd: number;
  totalUsd: number;
}

export const calculateProfileBreakdown = (
  dimensions: Dimensions,
  panelThickness: PanelThickness,
  items: ProfileMasterItem[],
): CalculatedFixedItem[] => {
  const variables: Record<string, number> = {
    ...buildFormulaContext(sanitizeDimensions(dimensions), panelThickness),
  };

  const rows: CalculatedFixedItem[] = [];
  for (const item of items.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder)) {
    const qty = evaluateFormulaQuantity(item.formulaExpr, variables);
    const unitPriceUsd = panelThickness === 45 ? item.priceUsd45 : item.priceUsd30;
    rows.push({
      id: item.id,
      code: item.code,
      name: item.name,
      unit: item.unit,
      qty,
      unitPriceUsd: safe(unitPriceUsd),
      totalUsd: safe(qty) * safe(unitPriceUsd),
    });
    variables[item.code] = qty;
  }

  return rows;
};

export const calculateKonstruksiBreakdown = (
  dimensions: Dimensions,
  panelThickness: PanelThickness,
  items: KonstruksiMasterItem[],
): CalculatedFixedItem[] => {
  const variables: Record<string, number> = {
    ...buildFormulaContext(sanitizeDimensions(dimensions), panelThickness),
  };

  const rows: CalculatedFixedItem[] = [];
  for (const item of items.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder)) {
    const qty = evaluateFormulaQuantity(item.formulaExpr, variables);
    rows.push({
      id: item.id,
      code: item.code,
      name: item.name,
      unit: item.unit,
      qty,
      unitPriceUsd: safe(item.unitPriceUsd),
      totalUsd: safe(qty) * safe(item.unitPriceUsd),
    });
    variables[item.code] = qty;
  }

  return rows;
};

export const calculateProfileTotalUsd = (
  dimensions: Dimensions,
  panelThickness: PanelThickness,
  items: ProfileMasterItem[] = [],
): number => {
  return calculateProfileBreakdown(dimensions, panelThickness, items).reduce(
    (sum, item) => sum + item.totalUsd,
    0,
  );
};

export const calculateKonstruksiTotalUsd = (
  dimensions: Dimensions,
  panelThickness: PanelThickness,
  items: KonstruksiMasterItem[] = [],
): number =>
  calculateKonstruksiBreakdown(dimensions, panelThickness, items).reduce(
    (sum, item) => sum + item.totalUsd,
    0,
  );

export const usdToIdr = (usdValue: number, exchangeRate = 16_900): number =>
  usdValue * exchangeRate;

export const formatRupiah = (value: number): string =>
  RUPIAH_FORMATTER.format(value);

export const formatUsd = (value: number): string => USD_FORMATTER.format(value);
