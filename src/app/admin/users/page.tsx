import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { RpbPageFrame } from "@/components/layout/rpb-page-frame";

export default async function AdminUsersPage() {
  await requireAdmin();

  return (
    <RpbPageFrame>
      <div className="space-y-4 pt-4 pb-0 md:pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="rpb-h-title text-lg font-semibold">User Management</h2>
          <Link
            href="/admin"
            className="rpb-btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold"
          >
            <ArrowLeft size={14} />
            Kembali ke Admin
          </Link>
        </div>
      </div>
      <AdminUsersPanel />
    </RpbPageFrame>
  );
}
