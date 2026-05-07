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
  { key: "quotation", href: "/quotation", label: "Quotation", icon: FileText },
  { key: "history", href: "/history", label: "Riwayat", icon: History },
  { key: "profile", href: "/profile", label: "Profil", icon: UserRound },
];

const ADMIN_NAV_ITEMS: BottomNavItem[] = [
  { key: "home", href: "/", label: "Beranda", icon: House },
  { key: "quotation", href: "/quotation", label: "Quotation", icon: FileText },
  { key: "history", href: "/history", label: "Riwayat", icon: History },
  { key: "admin", href: "/admin", label: "Admin", icon: Settings2 },
  { key: "profile", href: "/profile", label: "Profil", icon: UserRound },
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
  const hideNav = loading && role === null;

  if (hideNav) {
    return null;
  }

  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const items =
    role === "admin" || (loading && isAdminPath) ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS;
  const gridClassName =
    items.length === 5
      ? "mx-auto grid w-full max-w-[620px] grid-cols-5 gap-1 sm:gap-1.5"
      : "mx-auto grid w-full max-w-[460px] grid-cols-4 gap-1.5 sm:max-w-[560px] sm:gap-2";

  return (
    <nav className="no-print fixed right-0 bottom-0 left-0 z-50 border-t border-rpb-border bg-white/98 shadow-[0_-8px_24px_rgba(30,36,88,0.14)] backdrop-blur">
      <div className="mx-auto w-full max-w-screen-2xl px-4 pt-1.5 pb-[calc(0.45rem+env(safe-area-inset-bottom))] sm:px-6 md:px-10 lg:px-14 xl:px-20 2xl:px-24">
        <div className={gridClassName}>
          {items.map((item) => {
            const Icon = item.icon;
            const active = isPathActive(pathname, item.key);

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg bg-transparent px-1 text-[11px] font-semibold transition-all duration-200 ease-out md:min-h-12 md:text-xs active:translate-y-0 focus:bg-transparent hover:-translate-y-0.5 [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(55,61,119,0.25)] ${
                  active
                    ? "bg-rpb-primary-soft/70 text-rpb-primary"
                    : "text-rpb-ink-soft hover:bg-rpb-primary-soft/45 hover:text-rpb-primary"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
