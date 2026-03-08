import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RpbPageFrame } from "@/components/layout/rpb-page-frame";
import { AdminUserDetailPanel } from "@/components/admin/admin-user-detail-panel";
import type { ManagedUser } from "@/components/admin/admin-users-panel";

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

interface AdminUserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, email, username, full_name, phone_number, role, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  const userRow = data as UserProfileRow;
  const initialUser: ManagedUser = {
    id: userRow.id,
    email: userRow.email,
    username: userRow.username ?? "",
    fullName: userRow.full_name ?? "",
    phoneNumber: userRow.phone_number ?? "",
    role: userRow.role === "admin" ? "admin" : "user",
    createdAt: userRow.created_at ?? null,
    updatedAt: userRow.updated_at ?? null,
    lastSignInAt: null,
  };

  const { count, error: adminCountError } = await supabase
    .from("user_profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if (adminCountError) {
    throw new Error(adminCountError.message);
  }

  return (
    <RpbPageFrame>
      <div className="space-y-4 pt-4 pb-0 md:pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="rpb-h-title text-lg font-semibold">User Detail</h2>
          <Link
            href="/admin/users"
            className="rpb-btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold"
          >
            <ArrowLeft size={14} />
            Kembali
          </Link>
        </div>
      </div>
      <AdminUserDetailPanel initialUser={initialUser} initialAdminCount={count ?? 0} />
    </RpbPageFrame>
  );
}
