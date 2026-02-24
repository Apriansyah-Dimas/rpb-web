import {
  DEFAULT_PROFILE_ITEMS,
  DEFAULT_KONSTRUKSI_ITEMS,
  DEFAULT_OTHER_ITEMS,
  DEFAULT_USERS,
  type MasterItem,
  type OtherMasterItem,
  type AppUser,
} from "../data/masterData";

const KEYS = {
  PROFILE: "rpb_profile_items",
  KONSTRUKSI: "rpb_konstruksi_items",
  OTHERS: "rpb_other_items",
  USERS: "rpb_users",
  HISTORY: "rpb_history",
  SESSION: "rpb_session",
};

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function set(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Master Data ────────────────────────────────────────────────
export function getProfileItems(): MasterItem[] {
  return get(KEYS.PROFILE, DEFAULT_PROFILE_ITEMS);
}
export function saveProfileItems(items: MasterItem[]) {
  set(KEYS.PROFILE, items);
}

export function getKonstruksiItems(): MasterItem[] {
  return get(KEYS.KONSTRUKSI, DEFAULT_KONSTRUKSI_ITEMS);
}
export function saveKonstruksiItems(items: MasterItem[]) {
  set(KEYS.KONSTRUKSI, items);
}

export function getOtherMasterItems(): OtherMasterItem[] {
  return get(KEYS.OTHERS, DEFAULT_OTHER_ITEMS);
}
export function saveOtherMasterItems(items: OtherMasterItem[]) {
  set(KEYS.OTHERS, items);
}

// ── Users ──────────────────────────────────────────────────────
export function getUsers(): AppUser[] {
  return get(KEYS.USERS, DEFAULT_USERS);
}
export function saveUsers(users: AppUser[]) {
  set(KEYS.USERS, users);
}

// ── Session / Auth ─────────────────────────────────────────────
export function getSession(): AppUser | null {
  return get<AppUser | null>(KEYS.SESSION, null);
}
export function saveSession(user: AppUser) {
  set(KEYS.SESSION, user);
}
export function clearSession() {
  localStorage.removeItem(KEYS.SESSION);
}

export function login(email: string, password: string): AppUser | null {
  const users = getUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (user) {
    saveSession(user);
    return user;
  }
  return null;
}

// ── History ────────────────────────────────────────────────────
export interface HistoryRecord {
  id: string;
  userId: string;
  customerName: string;
  projectName: string;
  savedAt: string;
  dimensions: { L: number; W: number; H: number; T: number };
  items: SummaryLineItem[];
  percentages: PercentageConfig;
  grandTotal: number;
}

export interface SummaryLineItem {
  id: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  total: number;
  category: "profile" | "konstruksi" | "other";
  qtyEditable?: boolean;
}

export interface PercentageConfig {
  stockReturn: number;
  marketing: number;
  services: number;
  profit: number;
}

export function getHistory(userId: string): HistoryRecord[] {
  const all = get<HistoryRecord[]>(KEYS.HISTORY, []);
  return all.filter((r) => r.userId === userId).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export function saveHistoryRecord(record: HistoryRecord) {
  const all = get<HistoryRecord[]>(KEYS.HISTORY, []);
  all.push(record);
  set(KEYS.HISTORY, all);
}

export function deleteHistoryRecord(id: string) {
  const all = get<HistoryRecord[]>(KEYS.HISTORY, []);
  set(KEYS.HISTORY, all.filter((r) => r.id !== id));
}
