import { DEFAULT_DIMENSIONS, DEFAULT_PANEL_THICKNESS } from "@/lib/rpb-data";
import type {
  AdjustmentKey,
  CustomOtherItem,
  DimensionKey,
  PanelThickness,
} from "@/types/rpb";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Adjustments {
  stockReturn: number;
  marketingCost: number;
  services: number;
  profit: number;
}

interface RpbStore {
  customerName: string;
  projectName: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  panelThickness: PanelThickness;
  selectedOther: Record<string, number>;
  customOtherItems: CustomOtherItem[];
  adjustments: Adjustments;
  setCustomerName: (value: string) => void;
  setProjectName: (value: string) => void;
  setDimension: (key: DimensionKey, value: number) => void;
  setPanelThickness: (value: PanelThickness) => void;
  addOtherQty: (itemId: string, qty: number) => void;
  setOtherQty: (itemId: string, qty: number) => void;
  addCustomOtherItem: (item: Omit<CustomOtherItem, "id">) => void;
  setCustomOtherItemQty: (itemId: string, qty: number) => void;
  removeCustomOtherItem: (itemId: string) => void;
  removeOther: (itemId: string) => void;
  setAdjustment: (key: AdjustmentKey, value: number) => void;
  resetOtherSelections: () => void;
}

const safeNumber = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
};

const safePercent = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, value));
};

export const useRpbStore = create<RpbStore>()(
  persist(
    (set) => ({
      customerName: "",
      projectName: "",
      dimensions: DEFAULT_DIMENSIONS,
      panelThickness: DEFAULT_PANEL_THICKNESS,
      selectedOther: {},
      customOtherItems: [],
      adjustments: {
        stockReturn: 0,
        marketingCost: 0,
        services: 0,
        profit: 0,
      },
      setCustomerName: (value) => set({ customerName: value }),
      setProjectName: (value) => set({ projectName: value }),
      setDimension: (key, value) =>
        set((state) => ({
          dimensions: {
            ...state.dimensions,
            [key]: safeNumber(value),
          },
        })),
      setPanelThickness: (value) => set({ panelThickness: value }),
      addOtherQty: (itemId, qty) =>
        set((state) => {
          const current = state.selectedOther[itemId] ?? 0;
          const nextQty = safeNumber(current + qty);
          const next = { ...state.selectedOther };

          if (nextQty <= 0) {
            delete next[itemId];
          } else {
            next[itemId] = nextQty;
          }

          return { selectedOther: next };
        }),
      setOtherQty: (itemId, qty) =>
        set((state) => {
          const next = { ...state.selectedOther };
          const nextQty = safeNumber(qty);

          if (nextQty <= 0) {
            delete next[itemId];
          } else {
            next[itemId] = nextQty;
          }

          return { selectedOther: next };
        }),
      addCustomOtherItem: (item) =>
        set((state) => ({
          customOtherItems: [
            ...state.customOtherItems,
            {
              ...item,
              qty: safeNumber(item.qty),
              hargaUsd: safeNumber(item.hargaUsd),
              id: `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            },
          ],
        })),
      setCustomOtherItemQty: (itemId, qty) =>
        set((state) => {
          const nextQty = safeNumber(qty);
          const next = state.customOtherItems
            .map((item) => {
              if (item.id !== itemId) {
                return item;
              }

              return {
                ...item,
                qty: nextQty,
              };
            })
            .filter((item) => item.qty > 0);

          return { customOtherItems: next };
        }),
      removeCustomOtherItem: (itemId) =>
        set((state) => ({
          customOtherItems: state.customOtherItems.filter((item) => item.id !== itemId),
        })),
      removeOther: (itemId) =>
        set((state) => {
          const next = { ...state.selectedOther };
          delete next[itemId];
          return { selectedOther: next };
        }),
      setAdjustment: (key, value) =>
        set((state) => ({
          adjustments: {
            ...state.adjustments,
            [key]: safePercent(value),
          },
        })),
      resetOtherSelections: () => set({ selectedOther: {}, customOtherItems: [] }),
    }),
    {
      name: "rpb-store-v1",
    },
  ),
);
