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
const QTY_FORMATTER = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
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

const roundQty1Digit = (value: number): number => {
  const safeValue = safe(value);
  return Math.round(safeValue * 10) / 10;
};

const calculateRowsWithSharedVariables = <
  T extends {
    id: string;
    code: string;
    name: string;
    unit: string;
    sortOrder: number;
    formulaExpr: string;
  },
>(
  items: T[],
  variables: Record<string, number>,
  getUnitPriceIdr: (item: T) => number,
): CalculatedFixedItem[] => {
  const rows: CalculatedFixedItem[] = [];
  for (const item of items.slice().sort((a, b) => a.sortOrder - b.sortOrder)) {
    const qty = roundQty1Digit(evaluateFormulaQuantity(item.formulaExpr, variables));
    const unitPriceIdr = safe(getUnitPriceIdr(item));
    rows.push({
      id: item.id,
      code: item.code,
      name: item.name,
      unit: item.unit,
      qty,
      unitPriceIdr,
      totalIdr: safe(qty) * unitPriceIdr,
    });
    variables[item.code] = qty;
  }

  return rows;
};

export const calculateFixedBreakdowns = (
  dimensions: Dimensions,
  panelThickness: PanelThickness,
  profileItems: ProfileMasterItem[],
  konstruksiItems: KonstruksiMasterItem[],
): {
  profileRows: CalculatedFixedItem[];
  konstruksiRows: CalculatedFixedItem[];
  profileTotalIdr: number;
  konstruksiTotalIdr: number;
} => {
  const variables: Record<string, number> = {
    ...buildFormulaContext(sanitizeDimensions(dimensions), panelThickness),
  };

  const profileRows = calculateRowsWithSharedVariables(
    profileItems,
    variables,
    (item) => (panelThickness === 45 ? item.priceIdr45 : item.priceIdr30),
  );
  const konstruksiRows = calculateRowsWithSharedVariables(
    konstruksiItems,
    variables,
    (item) => item.unitPriceIdr,
  );

  return {
    profileRows,
    konstruksiRows,
    profileTotalIdr: profileRows.reduce((sum, item) => sum + item.totalIdr, 0),
    konstruksiTotalIdr: konstruksiRows.reduce((sum, item) => sum + item.totalIdr, 0),
  };
};

export const calculateProfileBreakdown = (
  dimensions: Dimensions,
  panelThickness: PanelThickness,
  items: ProfileMasterItem[],
): CalculatedFixedItem[] => {
  return calculateFixedBreakdowns(dimensions, panelThickness, items, []).profileRows;
};

export const calculateKonstruksiBreakdown = (
  dimensions: Dimensions,
  panelThickness: PanelThickness,
  items: KonstruksiMasterItem[],
  profileItemsContext: ProfileMasterItem[] = [],
): CalculatedFixedItem[] => {
  return calculateFixedBreakdowns(dimensions, panelThickness, profileItemsContext, items)
    .konstruksiRows;
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
  profileItemsContext: ProfileMasterItem[] = [],
): number =>
  calculateKonstruksiBreakdown(dimensions, panelThickness, items, profileItemsContext).reduce(
    (sum, item) => sum + item.totalIdr,
    0,
  );

export const formatRupiah = (value: number): string =>
  RUPIAH_FORMATTER.format(value);

export const formatQty = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return QTY_FORMATTER.format(value);
};
