import {
  calculateKonstruksiTotalUsd,
  calculateProfileTotalUsd,
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
  profileUsd: number;
  konstruksiUsd: number;
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

  const profileUsd = calculateProfileTotalUsd(dimensions, panelThickness, profileItems);
  const konstruksiUsd = calculateKonstruksiTotalUsd(dimensions, panelThickness, konstruksiItems);

  const baseItems: SummaryLineItem[] = [
    {
      id: "profile",
      jenis: "PROFILE",
      keterangan: "Profile Aluminium - layer 1",
      satuan: "Lot",
      jenisSpec: String(panelThickness),
      qty: 1,
      hargaUsd: profileUsd,
    },
    {
      id: "konstruksi",
      jenis: "KONSTRUKSI",
      keterangan: "Konstruksi",
      satuan: "Lot",
      jenisSpec: "1",
      qty: 1,
      hargaUsd: konstruksiUsd,
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
    hargaUsd: item.priceUsd,
  }));

  const customLines: SummaryLineItem[] = customOtherItems.map((item) => ({
    id: `custom-${item.id}`,
    jenis: item.jenis,
    keterangan: item.keterangan,
    satuan: item.satuan,
    jenisSpec: item.jenisSpec,
    qty: item.qty,
    hargaUsd: item.hargaUsd,
  }));

  return {
    lineItems: [...baseItems, ...stockLines, ...customLines],
    profileUsd,
    konstruksiUsd,
  };
};
