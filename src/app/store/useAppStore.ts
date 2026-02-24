import { create } from "zustand";
import type { AppUser } from "../data/masterData";
import type { SummaryLineItem, PercentageConfig, HistoryRecord } from "../lib/storage";

interface ProjectInput {
  customerName: string;
  projectName: string;
  L: number;
  W: number;
  H: number;
  T: number;
}

interface AppState {
  // Auth
  currentUser: AppUser | null;
  setCurrentUser: (user: AppUser | null) => void;

  // Project input
  projectInput: ProjectInput;
  setProjectInput: (input: Partial<ProjectInput>) => void;
  resetProjectInput: () => void;

  // Summary
  summaryItems: SummaryLineItem[];
  setSummaryItems: (items: SummaryLineItem[]) => void;
  updateItemQty: (id: string, qty: number) => void;

  percentages: PercentageConfig;
  setPercentages: (p: Partial<PercentageConfig>) => void;

  // Quotation editor content
  quotationContent: string;
  setQuotationContent: (content: string) => void;

  // Loaded history (for editing)
  loadedRecord: HistoryRecord | null;
  setLoadedRecord: (record: HistoryRecord | null) => void;
}

const DEFAULT_INPUT: ProjectInput = {
  customerName: "",
  projectName: "",
  L: 0,
  W: 0,
  H: 0,
  T: 100,
};

const DEFAULT_PCT: PercentageConfig = {
  stockReturn: 5,
  marketing: 3,
  services: 2,
  profit: 15,
};

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  projectInput: DEFAULT_INPUT,
  setProjectInput: (input) =>
    set((s) => ({ projectInput: { ...s.projectInput, ...input } })),
  resetProjectInput: () =>
    set({ projectInput: DEFAULT_INPUT, summaryItems: [], quotationContent: "" }),

  summaryItems: [],
  setSummaryItems: (items) => set({ summaryItems: items }),
  updateItemQty: (id, qty) =>
    set((s) => ({
      summaryItems: s.summaryItems.map((item) =>
        item.id === id ? { ...item, qty, total: qty * item.unitPrice } : item
      ),
    })),

  percentages: DEFAULT_PCT,
  setPercentages: (p) =>
    set((s) => ({ percentages: { ...s.percentages, ...p } })),

  quotationContent: "",
  setQuotationContent: (content) => set({ quotationContent: content }),

  loadedRecord: null,
  setLoadedRecord: (record) => set({ loadedRecord: record }),
}));
