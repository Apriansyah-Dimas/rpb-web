import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import type { ManagedUser } from "@/components/admin/admin-users-panel";
import { RpbPageFrame } from "@/components/layout/rpb-page-frame";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AdminRole = "admin" | "user";

interface UserProfileRow {
  id: string;
  email: string;
  username: string;
  full_name: string;
  phone_number: string;
  role: AdminRole;
  created_at: string | null;
  updated_at: string | null;
}

export default async function AdminUsersPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, email, username, full_name, phone_number, role, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const initialUsers: ManagedUser[] = ((data ?? []) as UserProfileRow[]).map((row) => {
    const role: ManagedUser["role"] = row.role === "admin" ? "admin" : "user";
    return {
      id: row.id,
      email: row.email,
      username: row.username ?? "",
      fullName: row.full_name ?? "",
      phoneNumber: row.phone_number ?? "",
      role,
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
      lastSignInAt: null,
    };
  });

  return (
    <RpbPageFrame>
      <div className="space-y-4 pt-4 pb-0 md:pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="rpb-h-title text-lg font-semibold">User</h2>
          <Link
            href="/admin"
            className="rpb-btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold"
          >
            <ArrowLeft size={14} />
            Kembali
          </Link>
        </div>
      </div>
      <AdminUsersPanel initialUsers={initialUsers} />
    </RpbPageFrame>
  );
}
