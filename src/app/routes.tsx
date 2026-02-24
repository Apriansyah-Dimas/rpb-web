import React, { useEffect } from "react";
import { createBrowserRouter, Navigate, useNavigate } from "react-router";
import { getSession } from "./lib/storage";
import { useAppStore } from "./store/useAppStore";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import InputPage from "./pages/InputPage";
import SummaryPage from "./pages/SummaryPage";
import HistoryPage from "./pages/HistoryPage";
import QuotationPage from "./pages/QuotationPage";
import AdminPage from "./pages/AdminPage";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUser, setCurrentUser } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      const session = getSession();
      if (session) {
        setCurrentUser(session);
      } else {
        navigate("/login");
      }
    }
  }, [currentUser]);

  const session = currentUser || getSession();
  if (!session) return null;

  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: "/dashboard",
    element: (
      <AuthGuard>
        <DashboardPage />
      </AuthGuard>
    ),
  },
  {
    path: "/input",
    element: (
      <AuthGuard>
        <InputPage />
      </AuthGuard>
    ),
  },
  {
    path: "/summary",
    element: (
      <AuthGuard>
        <SummaryPage />
      </AuthGuard>
    ),
  },
  {
    path: "/history",
    element: (
      <AuthGuard>
        <HistoryPage />
      </AuthGuard>
    ),
  },
  {
    path: "/quotation",
    element: (
      <AuthGuard>
        <QuotationPage />
      </AuthGuard>
    ),
  },
  {
    path: "/admin",
    element: (
      <AuthGuard>
        <AdminPage />
      </AuthGuard>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />,
  },
]);
