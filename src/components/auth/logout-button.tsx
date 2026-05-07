"use client";

import { useAuthSession } from "@/hooks/use-auth-session";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LogoutButtonProps {
  className?: string;
  label?: string;
  confirmMessage?: string;
}

export function LogoutButton({
  className = "",
  label = "Logout",
  confirmMessage,
}: LogoutButtonProps) {
  const router = useRouter();
  const { signOut } = useAuthSession();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    if (busy) {
      return;
    }

    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    setBusy(true);
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 ${className}`.trim()}
      onClick={() => void handleLogout()}
      disabled={busy}
    >
      <LogOut size={15} />
      <span>{busy ? "Keluar..." : label}</span>
    </button>
  );
}
