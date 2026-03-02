import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isInvalidAuthSessionError } from "@/lib/supabase/auth-errors";
import type {
  KonstruksiMasterItem,
  OtherItem,
  RpbDraftSnapshot,
  RpbMasterData,
  SavedSummaryRecord,
  UserRole,
  ProfileMasterItem,
} from "@/types/rpb";

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed =
    typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};

const LEGACY_USD_TO_IDR = 16_900;

const mapProfileItem = (row: Record<string, unknown>): ProfileMasterItem => ({
  id: String(row.id ?? ""),
  code: String(row.code ?? ""),
  name: String(row.name ?? ""),
  unit: String(row.unit ?? "pc"),
  sortOrder: Number(row.sort_order ?? 0),
  formulaExpr: String(row.formula_expr ?? "0"),
  priceIdr30: toNumber(
    row.price_idr_30,
    toNumber(row.price_usd_30) * LEGACY_USD_TO_IDR,
  ),
  priceIdr45: toNumber(
    row.price_idr_45,
    toNumber(row.price_usd_45) * LEGACY_USD_TO_IDR,
  ),
  isActive: Boolean(row.is_active ?? true),
});

const mapKonstruksiItem = (row: Record<string, unknown>): KonstruksiMasterItem => ({
  id: String(row.id ?? ""),
  code: String(row.code ?? ""),
  name: String(row.name ?? ""),
  unit: String(row.unit ?? "pc"),
  sortOrder: Number(row.sort_order ?? 0),
  formulaExpr: String(row.formula_expr ?? "0"),
  unitPriceIdr: toNumber(
    row.unit_price_idr,
    toNumber(row.unit_price_usd) * LEGACY_USD_TO_IDR,
  ),
  isActive: Boolean(row.is_active ?? true),
});

const mapOtherItem = (row: Record<string, unknown>): OtherItem => ({
  id: String(row.id ?? ""),
  name: String(row.name ?? ""),
  category: (row.category === "Motor" || row.category === "Rotor" ? row.category : "Blower"),
  model: String(row.model ?? "-"),
  unit: String(row.unit ?? "pc"),
  priceIdr: toNumber(row.price_idr, toNumber(row.price_usd) * LEGACY_USD_TO_IDR),
});

export const fetchRpbMasterData = async (supabase: SupabaseClient): Promise<RpbMasterData> => {
  const [{ data: profileRows, error: profileError }, { data: konstruksiRows, error: konstruksiError }, { data: otherRows, error: otherError }] =
    await Promise.all([
      supabase
        .from("rpb_profile_items")
        .select("id, code, name, unit, sort_order, formula_expr, price_idr_30, price_idr_45, is_active"),
      supabase
        .from("rpb_konstruksi_items")
        .select("id, code, name, unit, sort_order, formula_expr, unit_price_idr, is_active"),
      supabase
        .from("rpb_other_items")
        .select("id, name, category, model, unit, price_idr, is_active")
        .order("category", { ascending: true })
        .order("name", { ascending: true }),
    ]);

  if (profileError) {
    throw profileError;
  }
  if (konstruksiError) {
    throw konstruksiError;
  }
  if (otherError) {
    throw otherError;
  }

  return {
    profileItems: ((profileRows ?? []) as Record<string, unknown>[]).map(mapProfileItem),
    konstruksiItems: ((konstruksiRows ?? []) as Record<string, unknown>[]).map(mapKonstruksiItem),
    otherItems: ((otherRows ?? []) as Record<string, unknown>[]).map(mapOtherItem),
  };
};

export const fetchCurrentUserRole = async (
  supabase: SupabaseClient,
  userOverride?: User | null,
): Promise<UserRole | null> => {
  let user = userOverride ?? null;

  if (userOverride === undefined) {
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (isInvalidAuthSessionError(error)) {
      return null;
    }

    if (error) {
      throw error;
    }

    user = authUser ?? null;
  }

  if (!user) {
    return null;
  }

  const metadataRole = user.user_metadata?.role;
  if (metadataRole === "admin" || metadataRole === "user") {
    return metadataRole;
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
    price_idr_30: item.priceIdr30,
    price_idr_45: item.priceIdr45,
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
    unit_price_idr: item.unitPriceIdr,
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
    priceIdr: number;
    isActive?: boolean;
  },
): Promise<void> => {
  const payload = {
    name: item.name,
    category: item.category,
    model: item.model,
    unit: item.unit,
    price_idr: item.priceIdr,
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
