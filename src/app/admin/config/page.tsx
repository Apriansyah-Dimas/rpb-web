import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { AdminConfigPanel } from "@/components/admin/admin-config-panel";
import { RpbPageFrame } from "@/components/layout/rpb-page-frame";

export default async function AdminConfigPage() {
  await requireAdmin();

  return (
    <RpbPageFrame>
      <div className="space-y-4 p-4 pb-0 md:px-6 md:pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="rpb-h-title text-lg font-semibold">Konfigurasi RPB</h2>
          <Link
            href="/admin"
            className="rpb-btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold"
          >
            <ArrowLeft size={14} />
            Kembali ke Admin
          </Link>
        </div>
      </div>
      <AdminConfigPanel />
    </RpbPageFrame>
  );
}
