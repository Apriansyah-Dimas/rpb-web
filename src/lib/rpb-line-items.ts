import {
  calculateKonstruksiTotalIdr,
  calculateProfileTotalIdr,
} from "@/lib/rpb-calculator";
import type {
  CustomOtherItem,
  Dimensions,
  KonstruksiMasterItem,
  OtherItem,
  PanelThickness,
  ProfileMasterItem,
  SummaryLineItem,
} from "@/types/rpb";

export const buildSummaryLineItems = (params: {
  dimensions: Dimensions;
  panelThickness: PanelThickness;
  profileItems: ProfileMasterItem[];
  konstruksiItems: KonstruksiMasterItem[];
  otherItems: OtherItem[];
  selectedOther: Record<string, number>;
  customOtherItems: CustomOtherItem[];
}): {
  lineItems: SummaryLineItem[];
  profileIdr: number;
  konstruksiIdr: number;
} => {
  const {
    dimensions,
    panelThickness,
    profileItems,
    konstruksiItems,
    otherItems,
    selectedOther,
    customOtherItems,
  } = params;

  const profileIdr = calculateProfileTotalIdr(dimensions, panelThickness, profileItems);
  const konstruksiIdr = calculateKonstruksiTotalIdr(dimensions, panelThickness, konstruksiItems);

  const baseItems: SummaryLineItem[] = [
    {
      id: "profile",
      jenis: "PROFILE",
      keterangan: "Profile Aluminium - layer 1",
      satuan: "Lot",
      jenisSpec: String(panelThickness),
      qty: 1,
      hargaIdr: profileIdr,
    },
    {
      id: "konstruksi",
      jenis: "KONSTRUKSI",
      keterangan: "Konstruksi",
      satuan: "Lot",
      jenisSpec: "1",
      qty: 1,
      hargaIdr: konstruksiIdr,
    },
  ];

  const selectedStockItems = otherItems.filter((item) => (selectedOther[item.id] ?? 0) > 0);
  const stockLines: SummaryLineItem[] = selectedStockItems.map((item) => ({
    id: `stock-${item.id}`,
    jenis: item.category,
    keterangan: item.model === "-" ? item.name : item.model,
    satuan: item.unit,
    jenisSpec: item.name,
    qty: selectedOther[item.id] ?? 0,
    hargaIdr: item.priceIdr,
  }));

  const customLines: SummaryLineItem[] = customOtherItems.map((item) => ({
    id: `custom-${item.id}`,
    jenis: item.jenis,
    keterangan: item.keterangan,
    satuan: item.satuan,
    jenisSpec: item.jenisSpec,
    qty: item.qty,
    hargaIdr: item.hargaIdr,
  }));

  return {
    lineItems: [...baseItems, ...stockLines, ...customLines],
    profileIdr,
    konstruksiIdr,
  };
};
