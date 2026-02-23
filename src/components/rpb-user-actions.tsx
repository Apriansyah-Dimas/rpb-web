"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";

export function RpbUserActions() {
  const router = useRouter();
  const { user, role, loading, signOut } = useAuthSession();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    setBusy(true);
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <span className="text-xs text-white/90">Loading...</span>;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-md border border-white/60 px-3 py-1.5 text-xs font-semibold text-white"
      >
        Login
      </Link>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span className="rounded-md bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-white">
        {role === "admin" ? "ADMIN" : "USER"}
      </span>
      <Link
        href="/history"
        className="rounded-md border border-white/60 px-3 py-1.5 text-xs font-semibold text-white"
      >
        History
      </Link>
      {role === "admin" ? (
        <Link
          href="/admin"
          className="rounded-md border border-white/60 px-3 py-1.5 text-xs font-semibold text-white"
        >
          Admin
        </Link>
      ) : null}
      <button
        type="button"
        className="rounded-md bg-white/14 px-3 py-1.5 text-xs font-semibold text-white"
        onClick={handleLogout}
        disabled={busy}
      >
        {busy ? "..." : "Logout"}
      </button>
    </div>
  );
}
