export type PanelThickness = 30 | 45;

export type StockCategory = "Blower" | "Motor" | "Rotor";
export type UserRole = "admin" | "user";

export type DimensionKey = "length" | "width" | "height";

export type AdjustmentKey =
  | "stockReturn"
  | "marketingCost"
  | "services"
  | "profit";

export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export interface AdjustmentValues {
  stockReturn: number;
  marketingCost: number;
  services: number;
  profit: number;
}

export interface OtherItem {
  id: string;
  name: string;
  category: StockCategory;
  model: string;
  unit: string;
  priceUsd: number;
}

export interface CustomOtherItem {
  id: string;
  jenis: string;
  keterangan: string;
  satuan: string;
  jenisSpec: string;
  hargaUsd: number;
  qty: number;
}

export interface SummaryLineItem {
  id: string;
  jenis: string;
  keterangan: string;
  satuan: string;
  jenisSpec: string;
  qty: number;
  hargaUsd: number;
}

export interface RpbSettings {
  usdToIdr: number;
}

export interface ProfileMasterItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  sortOrder: number;
  formulaExpr: string;
  priceUsd30: number;
  priceUsd45: number;
  isActive: boolean;
}

export interface KonstruksiMasterItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  sortOrder: number;
  formulaExpr: string;
  unitPriceUsd: number;
  isActive: boolean;
}

export interface RpbMasterData {
  settings: RpbSettings;
  profileItems: ProfileMasterItem[];
  konstruksiItems: KonstruksiMasterItem[];
  otherItems: OtherItem[];
}

export interface RpbDraftSnapshot {
  customerName: string;
  projectName: string;
  dimensions: Dimensions;
  panelThickness: PanelThickness;
  selectedOther: Record<string, number>;
  customOtherItems: CustomOtherItem[];
  adjustments: AdjustmentValues;
}

export interface SavedSummaryRecord {
  id: string;
  title: string;
  customerName: string;
  projectName: string;
  snapshot: RpbDraftSnapshot;
  createdAt: string;
  updatedAt: string;
}
