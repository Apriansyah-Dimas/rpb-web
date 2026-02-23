import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  KonstruksiMasterItem,
  OtherItem,
  RpbDraftSnapshot,
  RpbMasterData,
  RpbSettings,
  SavedSummaryRecord,
  UserRole,
  ProfileMasterItem,
} from "@/types/rpb";

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

const defaultSettings: RpbSettings = {
  usdToIdr: 16_900,
};

const mapProfileItem = (row: Record<string, unknown>): ProfileMasterItem => ({
  id: String(row.id ?? ""),
  code: String(row.code ?? ""),
  name: String(row.name ?? ""),
  unit: String(row.unit ?? "pc"),
  sortOrder: Number(row.sort_order ?? 0),
  formulaExpr: String(row.formula_expr ?? "0"),
  priceUsd30: toNumber(row.price_usd_30),
  priceUsd45: toNumber(row.price_usd_45),
  isActive: Boolean(row.is_active ?? true),
});

const mapKonstruksiItem = (row: Record<string, unknown>): KonstruksiMasterItem => ({
  id: String(row.id ?? ""),
  code: String(row.code ?? ""),
  name: String(row.name ?? ""),
  unit: String(row.unit ?? "pc"),
  sortOrder: Number(row.sort_order ?? 0),
  formulaExpr: String(row.formula_expr ?? "0"),
  unitPriceUsd: toNumber(row.unit_price_usd),
  isActive: Boolean(row.is_active ?? true),
});

const mapOtherItem = (row: Record<string, unknown>): OtherItem => ({
  id: String(row.id ?? ""),
  name: String(row.name ?? ""),
  category: (row.category === "Motor" || row.category === "Rotor" ? row.category : "Blower"),
  model: String(row.model ?? "-"),
  unit: String(row.unit ?? "pc"),
  priceUsd: toNumber(row.price_usd),
});

export const fetchRpbMasterData = async (supabase: SupabaseClient): Promise<RpbMasterData> => {
  const [{ data: settingsRows, error: settingsError }, { data: profileRows, error: profileError }, { data: konstruksiRows, error: konstruksiError }, { data: otherRows, error: otherError }] =
    await Promise.all([
      supabase.from("rpb_settings").select("usd_to_idr").limit(1),
      supabase
        .from("rpb_profile_items")
        .select(
          "id, code, name, unit, sort_order, formula_expr, price_usd_30, price_usd_45, is_active",
        ),
      supabase
        .from("rpb_konstruksi_items")
        .select("id, code, name, unit, sort_order, formula_expr, unit_price_usd, is_active"),
      supabase
        .from("rpb_other_items")
        .select("id, name, category, model, unit, price_usd, is_active")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true }),
    ]);

  if (settingsError) {
    throw settingsError;
  }
  if (profileError) {
    throw profileError;
  }
  if (konstruksiError) {
    throw konstruksiError;
  }
  if (otherError) {
    throw otherError;
  }

  const settingsRow = settingsRows?.[0] as Record<string, unknown> | undefined;
  const settings: RpbSettings = {
    usdToIdr: toNumber(settingsRow?.usd_to_idr, defaultSettings.usdToIdr),
  };

  return {
    settings,
    profileItems: ((profileRows ?? []) as Record<string, unknown>[]).map(mapProfileItem),
    konstruksiItems: ((konstruksiRows ?? []) as Record<string, unknown>[]).map(mapKonstruksiItem),
    otherItems: ((otherRows ?? []) as Record<string, unknown>[]).map(mapOtherItem),
  };
};

export const fetchCurrentUserRole = async (
  supabase: SupabaseClient,
): Promise<UserRole | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.role === "admin" ? "admin" : "user";
};

export const saveSummaryHistory = async (
  supabase: SupabaseClient,
  payload: {
    title: string;
    customerName: string;
    projectName: string;
    snapshot: RpbDraftSnapshot;
  },
): Promise<SavedSummaryRecord> => {
  const { data, error } = await supabase
    .from("rpb_saved_summaries")
    .insert({
      title: payload.title,
      customer_name: payload.customerName,
      project_name: payload.projectName,
      snapshot_json: payload.snapshot,
    })
    .select("id, title, customer_name, project_name, snapshot_json, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: String(data.id),
    title: String(data.title ?? "Untitled"),
    customerName: String(data.customer_name ?? ""),
    projectName: String(data.project_name ?? ""),
    snapshot: data.snapshot_json as RpbDraftSnapshot,
    createdAt: String(data.created_at ?? ""),
    updatedAt: String(data.updated_at ?? ""),
  };
};

export const fetchSummaryHistory = async (
  supabase: SupabaseClient,
): Promise<SavedSummaryRecord[]> => {
  const { data, error } = await supabase
    .from("rpb_saved_summaries")
    .select("id, title, customer_name, project_name, snapshot_json, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    title: String(row.title ?? "Untitled"),
    customerName: String(row.customer_name ?? ""),
    projectName: String(row.project_name ?? ""),
    snapshot: row.snapshot_json as RpbDraftSnapshot,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  }));
};

export const deleteSummaryHistory = async (
  supabase: SupabaseClient,
  id: string,
): Promise<void> => {
  const { error } = await supabase.from("rpb_saved_summaries").delete().eq("id", id);
  if (error) {
    throw error;
  }
};

export const upsertProfileMasterItem = async (
  supabase: SupabaseClient,
  item: ProfileMasterItem,
): Promise<void> => {
  const { error } = await supabase.from("rpb_profile_items").upsert({
    id: item.id,
    code: item.code,
    name: item.name,
    unit: item.unit,
    sort_order: item.sortOrder,
    formula_expr: item.formulaExpr,
    price_usd_30: item.priceUsd30,
    price_usd_45: item.priceUsd45,
    is_active: item.isActive,
  });

  if (error) {
    throw error;
  }
};

export const upsertKonstruksiMasterItem = async (
  supabase: SupabaseClient,
  item: KonstruksiMasterItem,
): Promise<void> => {
  const { error } = await supabase.from("rpb_konstruksi_items").upsert({
    id: item.id,
    code: item.code,
    name: item.name,
    unit: item.unit,
    sort_order: item.sortOrder,
    formula_expr: item.formulaExpr,
    unit_price_usd: item.unitPriceUsd,
    is_active: item.isActive,
  });

  if (error) {
    throw error;
  }
};

export const upsertOtherMasterItem = async (
  supabase: SupabaseClient,
  item: {
    id?: string;
    name: string;
    category: OtherItem["category"];
    model: string;
    unit: string;
    priceUsd: number;
    isActive?: boolean;
  },
): Promise<void> => {
  const payload = {
    name: item.name,
    category: item.category,
    model: item.model,
    unit: item.unit,
    price_usd: item.priceUsd,
    is_active: item.isActive ?? true,
  };

  const query = item.id
    ? supabase.from("rpb_other_items").update(payload).eq("id", item.id)
    : supabase.from("rpb_other_items").insert(payload);

  const { error } = await query;
  if (error) {
    throw error;
  }
};

export const setRpbSettings = async (
  supabase: SupabaseClient,
  settings: RpbSettings,
): Promise<void> => {
  const { error } = await supabase.from("rpb_settings").upsert(
    {
      id: 1,
      usd_to_idr: settings.usdToIdr,
    },
    { onConflict: "id" },
  );

  if (error) {
    throw error;
  }
};
