export interface MasterItem {
  id: string;
  name: string;
  unit: string;
  formula: string; // uses L, W, H, T variables
  unitPrice: number;
}

export interface OtherMasterItem {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
}

export interface AppUser {
  id: string;
  email: string;
  password: string;
  role: "admin" | "user";
  name: string;
}

export const DEFAULT_PROFILE_ITEMS: MasterItem[] = [
  { id: "p1", name: "Panel Dinding", unit: "m²", formula: "2*(L+W)*H/1000000", unitPrice: 155000 },
  { id: "p2", name: "Panel Atap", unit: "m²", formula: "L*W/1000000", unitPrice: 180000 },
  { id: "p3", name: "Panel Lantai", unit: "m²", formula: "L*W/1000000", unitPrice: 165000 },
  { id: "p4", name: "Profile U 50", unit: "m", formula: "2*(L+W+H)/1000", unitPrice: 28000 },
  { id: "p5", name: "Profile U 30", unit: "m", formula: "4*(L+W)/1000", unitPrice: 22000 },
  { id: "p6", name: "Cam Lock", unit: "pcs", formula: "Math.ceil(2*(L+W+H)/500)", unitPrice: 15000 },
  { id: "p7", name: "Engsel Pintu", unit: "pcs", formula: "4", unitPrice: 35000 },
  { id: "p8", name: "Handle Pintu", unit: "pcs", formula: "2", unitPrice: 85000 },
  { id: "p9", name: "Karet Seal", unit: "m", formula: "2*(H+W)*2/1000", unitPrice: 18000 },
];

export const DEFAULT_KONSTRUKSI_ITEMS: MasterItem[] = [
  { id: "k1", name: "Besi Hollow 40x40", unit: "m", formula: "(2*(L+W)+4*H)/1000", unitPrice: 55000 },
  { id: "k2", name: "Besi Hollow 20x40", unit: "m", formula: "(L+W)*3/1000", unitPrice: 38000 },
  { id: "k3", name: "Besi Siku 40x40", unit: "m", formula: "2*(L+W)/1000", unitPrice: 42000 },
  { id: "k4", name: "Plat Besi 3mm", unit: "m²", formula: "L*W/1000000", unitPrice: 95000 },
  { id: "k5", name: "Cat Besi", unit: "kg", formula: "Math.ceil((2*(L+W)*H+L*W*2)/1000000*0.5)", unitPrice: 65000 },
  { id: "k6", name: "Elektroda Las", unit: "kg", formula: "Math.ceil((2*(L+W)*H)/1000000*2)", unitPrice: 45000 },
  { id: "k7", name: "Mur & Baut M10", unit: "set", formula: "Math.ceil((L+W)/200)", unitPrice: 8500 },
];

export const DEFAULT_OTHER_ITEMS: OtherMasterItem[] = [
  { id: "o1", name: "Blower Axial", unit: "unit", unitPrice: 1500000 },
  { id: "o2", name: "Motor 1 HP", unit: "unit", unitPrice: 2500000 },
  { id: "o3", name: "Motor 2 HP", unit: "unit", unitPrice: 3500000 },
  { id: "o4", name: "Rotor Fan", unit: "unit", unitPrice: 850000 },
  { id: "o5", name: "Thermostat Digital", unit: "unit", unitPrice: 450000 },
  { id: "o6", name: "Kontaktor 3P", unit: "unit", unitPrice: 350000 },
  { id: "o7", name: "MCB 3 Phase", unit: "unit", unitPrice: 280000 },
  { id: "o8", name: "Kabel NYY 4x4", unit: "m", unitPrice: 65000 },
];

export const DEFAULT_USERS: AppUser[] = [
  { id: "u1", email: "admin@rpb.com", password: "admin123", role: "admin", name: "Admin RPB" },
  { id: "u2", email: "sales@rpb.com", password: "sales123", role: "user", name: "Sales Team" },
];
