import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { AdminConfigPanel } from "@/components/admin/admin-config-panel";
import { RpbPageFrame } from "@/components/layout/rpb-page-frame";
import { fetchRpbMasterData } from "@/lib/rpb-db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminConfigPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const initialData = await fetchRpbMasterData(supabase);

  return (
    <RpbPageFrame>
      <div className="space-y-3 pt-4 pb-0 md:pt-6">
        <div className="rpb-section flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
          <div>
            <h2 className="rpb-h-title text-lg font-semibold">Konfigurasi RPB</h2>
            <p className="text-sm text-rpb-ink-soft">Kelola formula dan harga master secara terstruktur.</p>
          </div>
          <Link
            href="/admin"
            className="rpb-btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold"
          >
            <ArrowLeft size={14} />
            Kembali ke Admin
          </Link>
        </div>
      </div>
      <AdminConfigPanel initialData={initialData} />
    </RpbPageFrame>
  );
}
