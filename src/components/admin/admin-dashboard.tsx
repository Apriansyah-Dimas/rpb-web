"use client";

import { Settings2, Users } from "lucide-react";
import Link from "next/link";

export function AdminDashboard() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <section className="grid gap-3 md:grid-cols-2">
        <Link
          href="/admin/config"
          className="rpb-section block rounded-2xl p-5 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(45,52,116,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(55,61,119,0.25)]"
        >
          <p className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rpb-primary-soft text-rpb-primary">
            <Settings2 size={18} />
          </p>
          <h2 className="rpb-h-title text-lg font-semibold text-foreground">Konfigurasi RPB</h2>
          <p className="mt-1 text-sm text-rpb-ink-soft">
            Kelola harga dan rumus perhitungan Profile, Konstruksi, dan Other.
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="rpb-section block rounded-2xl p-5 transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(45,52,116,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(55,61,119,0.25)]"
        >
          <p className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rpb-primary-soft text-rpb-primary">
            <Users size={18} />
          </p>
          <h2 className="rpb-h-title text-lg font-semibold text-foreground">User Management</h2>
          <p className="mt-1 text-sm text-rpb-ink-soft">
            Lihat semua akun, edit info, atur role, ganti password, buat dan hapus user.
          </p>
        </Link>
      </section>
    </div>
  );
}
