export type PanelThickness = 30 | 45;

export type StockCategory = "Blower" | "Motor" | "Rotor";

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
