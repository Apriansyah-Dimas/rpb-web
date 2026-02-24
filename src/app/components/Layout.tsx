import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Calculator,
  FileText,
  History,
  Quote,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { clearSession } from "../lib/storage";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/input", icon: Calculator, label: "New Estimate" },
  { to: "/summary", icon: FileText, label: "Summary" },
  { to: "/history", icon: History, label: "History" },
  { to: "/quotation", icon: Quote, label: "Quotation" },
];

const ADMIN_ITEMS = [
  { to: "/admin", icon: Settings, label: "Admin Panel" },
];

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function Layout({ children, title, subtitle }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser, setCurrentUser } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
    navigate("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: "#ffde55" }}
          >
            <Calculator size={18} color="#6365b9" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-white text-sm leading-tight" style={{ fontWeight: 800 }}>
              RPB Estimator
            </div>
            <div className="text-indigo-300 text-xs">Quotation Builder</div>
          </div>
        </div>
      </div>

      {/* User badge */}
      <div className="mx-4 mb-4 rounded-xl px-3 py-2.5" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
        <div className="text-xs text-indigo-300 mb-0.5">Logged in as</div>
        <div className="text-white text-sm truncate" style={{ fontWeight: 600 }}>
          {currentUser?.name}
        </div>
        <span
          className="text-xs px-1.5 py-0.5 rounded-full"
          style={{
            backgroundColor: currentUser?.role === "admin" ? "#ffde55" : "rgba(255,255,255,0.15)",
            color: currentUser?.role === "admin" ? "#4a4a0a" : "#c7d2fe",
            fontWeight: 600,
          }}
        >
          {currentUser?.role === "admin" ? "Admin" : "User"}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        <p className="text-xs text-indigo-400 px-3 mb-2 mt-1 uppercase tracking-wider" style={{ fontWeight: 600 }}>
          Menu
        </p>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? "text-white"
                  : "text-indigo-300 hover:text-white hover:bg-white/10"
              }`
            }
            style={({ isActive }) =>
              isActive ? { backgroundColor: "#ffde55", color: "#2d2d6b", fontWeight: 600 } : {}
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                <span>{label}</span>
                {isActive && <ChevronRight size={14} className="ml-auto" />}
              </>
            )}
          </NavLink>
        ))}

        {currentUser?.role === "admin" && (
          <>
            <p className="text-xs text-indigo-400 px-3 mb-2 mt-4 uppercase tracking-wider" style={{ fontWeight: 600 }}>
              Administration
            </p>
            {ADMIN_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive
                      ? "text-white"
                      : "text-indigo-300 hover:text-white hover:bg-white/10"
                  }`
                }
                style={({ isActive }) =>
                  isActive ? { backgroundColor: "#ffde55", color: "#2d2d6b", fontWeight: 600 } : {}
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{label}</span>
                    {isActive && <ChevronRight size={14} className="ml-auto" />}
                  </>
                )}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-indigo-300 hover:text-white hover:bg-white/10 transition-all"
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#f4f4fb" }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col w-60 shrink-0 h-full"
        style={{ background: "linear-gradient(180deg, #4a4d9e 0%, #6365b9 100%)" }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="relative w-64 h-full flex flex-col"
            style={{ background: "linear-gradient(180deg, #4a4d9e 0%, #6365b9 100%)" }}
          >
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-4 md:px-8 h-16 bg-white border-b border-gray-200 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            {title && (
              <div>
                <h1 className="text-gray-900 leading-tight" style={{ fontSize: "1rem", fontWeight: 700 }}>
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-gray-400 text-xs leading-tight">{subtitle}</p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
                style={{ backgroundColor: "#6365b9", fontWeight: 700 }}
              >
                {currentUser?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-gray-700 text-sm" style={{ fontWeight: 500 }}>
                {currentUser?.name}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
