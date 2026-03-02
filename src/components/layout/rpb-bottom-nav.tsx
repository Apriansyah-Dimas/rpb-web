"use client";

import { useAuthSession } from "@/hooks/use-auth-session";
import {
  FileText,
  History,
  House,
  Settings2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomNavItem {
  key: "home" | "history" | "quotation" | "profile" | "admin";
  href: string;
  label: string;
  icon: typeof House;
}

const USER_NAV_ITEMS: BottomNavItem[] = [
  { key: "home", href: "/", label: "Beranda", icon: House },
  { key: "history", href: "/history", label: "History", icon: History },
  { key: "quotation", href: "/quotation", label: "Quotation", icon: FileText },
  { key: "profile", href: "/profile", label: "Profile", icon: UserRound },
];

const ADMIN_NAV_ITEMS: BottomNavItem[] = [
  { key: "home", href: "/", label: "Beranda", icon: House },
  { key: "history", href: "/history", label: "History", icon: History },
  { key: "quotation", href: "/quotation", label: "Quotation", icon: FileText },
  { key: "admin", href: "/admin", label: "Admin", icon: Settings2 },
];

const isPathActive = (pathname: string, key: BottomNavItem["key"]): boolean => {
  if (key === "home") {
    return pathname === "/" || pathname.startsWith("/summary");
  }
  if (key === "admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/");
  }
  if (key === "profile") {
    return pathname === "/profile";
  }
  return pathname === `/${key}`;
};

export function RpbBottomNav() {
  const pathname = usePathname();
  const { loading, role } = useAuthSession();

  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const items =
    role === "admin" || (loading && isAdminPath) ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;

  return (
    <nav className="no-print fixed right-0 bottom-0 left-0 z-50 border-t border-rpb-border bg-white/98 shadow-[0_-8px_24px_rgba(30,36,88,0.14)] backdrop-blur">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-4 px-2 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2 md:px-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isPathActive(pathname, item.key);

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-semibold transition ${
                active
                  ? "bg-rpb-primary-soft text-rpb-primary"
                  : "text-rpb-ink-soft hover:bg-[#f3f5ff]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
