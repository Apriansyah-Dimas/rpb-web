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
  unitPriceIdr: number;
  totalIdr: number;
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
  for (const item of items.slice().sort((a, b) => a.sortOrder - b.sortOrder)) {
    const qty = evaluateFormulaQuantity(item.formulaExpr, variables);
    const unitPriceIdr = panelThickness === 45 ? item.priceIdr45 : item.priceIdr30;
    rows.push({
      id: item.id,
      code: item.code,
      name: item.name,
      unit: item.unit,
      qty,
      unitPriceIdr: safe(unitPriceIdr),
      totalIdr: safe(qty) * safe(unitPriceIdr),
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
  for (const item of items.slice().sort((a, b) => a.sortOrder - b.sortOrder)) {
    const qty = evaluateFormulaQuantity(item.formulaExpr, variables);
    rows.push({
      id: item.id,
      code: item.code,
      name: item.name,
      unit: item.unit,
      qty,
      unitPriceIdr: safe(item.unitPriceIdr),
      totalIdr: safe(qty) * safe(item.unitPriceIdr),
    });
    variables[item.code] = qty;
  }

  return rows;
};

export const calculateProfileTotalIdr = (
  dimensions: Dimensions,
  panelThickness: PanelThickness,
  items: ProfileMasterItem[] = [],
): number => {
  return calculateProfileBreakdown(dimensions, panelThickness, items).reduce(
    (sum, item) => sum + item.totalIdr,
    0,
  );
};

export const calculateKonstruksiTotalIdr = (
  dimensions: Dimensions,
  panelThickness: PanelThickness,
  items: KonstruksiMasterItem[] = [],
): number =>
  calculateKonstruksiBreakdown(dimensions, panelThickness, items).reduce(
    (sum, item) => sum + item.totalIdr,
    0,
  );

export const formatRupiah = (value: number): string =>
  RUPIAH_FORMATTER.format(value);
