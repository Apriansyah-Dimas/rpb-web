import { redirect } from "next/navigation";
import type { UserRole } from "@/types/rpb";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthContext {
  userId: string;
  email: string | null;
  role: UserRole;
}

export const getAuthContext = async (): Promise<AuthContext | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role: UserRole = profile?.role === "admin" ? "admin" : "user";

  return {
    userId: user.id,
    email: user.email ?? null,
    role,
  };
};

export const requireAuth = async (): Promise<AuthContext> => {
  const auth = await getAuthContext();
  if (!auth) {
    redirect("/login");
  }

  return auth;
};

export const requireAdmin = async (): Promise<AuthContext> => {
  const auth = await requireAuth();
  if (auth.role !== "admin") {
    redirect("/");
  }

  return auth;
};
