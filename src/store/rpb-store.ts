import type {
  AdjustmentValues,
  AdjustmentKey,
  CustomOtherItem,
  DimensionKey,
  PanelThickness,
  RpbDraftSnapshot,
} from "@/types/rpb";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const DEFAULT_DIMENSIONS = {
  length: 3550,
  width: 1100,
  height: 950,
} as const;

const DEFAULT_PANEL_THICKNESS: PanelThickness = 30;

const DEFAULT_ADJUSTMENTS: AdjustmentValues = {
  stockReturn: 3,
  marketingCost: 3,
  services: 3,
  profit: 25,
};

interface RpbStore {
  customerName: string;
  projectName: string;
  customerAddress: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  panelThickness: PanelThickness;
  selectedOther: Record<string, number>;
  customOtherItems: CustomOtherItem[];
  adjustments: AdjustmentValues;
  quotationContent: string;
  setCustomerName: (value: string) => void;
  setProjectName: (value: string) => void;
  setCustomerAddress: (value: string) => void;
  setDimension: (key: DimensionKey, value: number) => void;
  setPanelThickness: (value: PanelThickness) => void;
  addOtherQty: (itemId: string, qty: number) => void;
  setOtherQty: (itemId: string, qty: number) => void;
  addCustomOtherItem: (item: Omit<CustomOtherItem, "id">) => void;
  setCustomOtherItemQty: (itemId: string, qty: number) => void;
  removeCustomOtherItem: (itemId: string) => void;
  removeOther: (itemId: string) => void;
  setAdjustment: (key: AdjustmentKey, value: number) => void;
  setQuotationContent: (value: string) => void;
  resetOtherSelections: () => void;
  getSnapshot: () => RpbDraftSnapshot;
  loadSnapshot: (snapshot: RpbDraftSnapshot) => void;
  resetDraft: () => void;
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
    (set, get) => ({
      customerName: "",
      projectName: "",
      customerAddress: "",
      dimensions: DEFAULT_DIMENSIONS,
      panelThickness: DEFAULT_PANEL_THICKNESS,
      selectedOther: {},
      customOtherItems: [],
      adjustments: DEFAULT_ADJUSTMENTS,
      quotationContent: "",
      setCustomerName: (value) => set({ customerName: value }),
      setProjectName: (value) => set({ projectName: value }),
      setCustomerAddress: (value) => set({ customerAddress: value }),
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
              hargaIdr: safeNumber(item.hargaIdr),
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
      setQuotationContent: (value) => set({ quotationContent: value }),
      resetOtherSelections: () => set({ selectedOther: {}, customOtherItems: [] }),
      getSnapshot: () => {
        const state = get();

        return {
          customerName: state.customerName,
          projectName: state.projectName,
          customerAddress: state.customerAddress,
          dimensions: { ...state.dimensions },
          panelThickness: state.panelThickness,
          selectedOther: { ...state.selectedOther },
          customOtherItems: state.customOtherItems.map((item) => ({ ...item })),
          adjustments: { ...state.adjustments },
        };
      },
      loadSnapshot: (snapshot) =>
        set({
          customerName: snapshot.customerName ?? "",
          projectName: snapshot.projectName ?? "",
          customerAddress: snapshot.customerAddress ?? "",
          dimensions: {
            length: safeNumber(snapshot.dimensions?.length ?? DEFAULT_DIMENSIONS.length),
            width: safeNumber(snapshot.dimensions?.width ?? DEFAULT_DIMENSIONS.width),
            height: safeNumber(snapshot.dimensions?.height ?? DEFAULT_DIMENSIONS.height),
          },
          panelThickness: snapshot.panelThickness === 45 ? 45 : 30,
          selectedOther: Object.fromEntries(
            Object.entries(snapshot.selectedOther ?? {}).map(([key, value]) => [
              key,
              safeNumber(value),
            ]),
          ),
          customOtherItems: (snapshot.customOtherItems ?? [])
            .map((item) => ({
              ...item,
              qty: safeNumber(item.qty),
              hargaIdr: safeNumber(
                item.hargaIdr ??
                  // Backward compatibility for old snapshots saved before IDR migration.
                  (((item as unknown as { hargaUsd?: number }).hargaUsd ?? 0) * 16_900),
              ),
            }))
            .filter((item) => item.qty > 0),
          adjustments: {
            stockReturn: safePercent(
              snapshot.adjustments?.stockReturn ?? DEFAULT_ADJUSTMENTS.stockReturn,
            ),
            marketingCost: safePercent(
              snapshot.adjustments?.marketingCost ?? DEFAULT_ADJUSTMENTS.marketingCost,
            ),
            services: safePercent(snapshot.adjustments?.services ?? DEFAULT_ADJUSTMENTS.services),
            profit: safePercent(snapshot.adjustments?.profit ?? DEFAULT_ADJUSTMENTS.profit),
          },
        }),
      resetDraft: () =>
        set({
          customerName: "",
          projectName: "",
          customerAddress: "",
          dimensions: { ...DEFAULT_DIMENSIONS },
          panelThickness: DEFAULT_PANEL_THICKNESS,
          selectedOther: {},
          customOtherItems: [],
          adjustments: { ...DEFAULT_ADJUSTMENTS },
          quotationContent: "",
        }),
    }),
    {
      name: "rpb-store-v1",
    },
  ),
);
