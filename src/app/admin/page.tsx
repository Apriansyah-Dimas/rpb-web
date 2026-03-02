import { requireAdmin } from "@/lib/auth";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { RpbPageFrame } from "@/components/layout/rpb-page-frame";

export default async function AdminPage() {
  await requireAdmin();
  return (
    <RpbPageFrame maxWidthClassName="max-w-[1400px]">
      <AdminDashboard />
    </RpbPageFrame>
  );
}
