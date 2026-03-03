import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = new Set([
  "/login",
  "/manifest.webmanifest",
  "/sw.js",
  "/offline",
]);
const PUBLIC_PREFIXES = ["/_next", "/favicon.ico"];

const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const hasSupabaseAuthCookie = (request: NextRequest): boolean =>
  request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token"));

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return updateSupabaseSession(request);
  }

  if (pathname.startsWith("/api/")) {
    return updateSupabaseSession(request);
  }

  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdminPath) {
    if (!hasSupabaseAuthCookie(request)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Avoid duplicate Supabase auth round-trip on admin pages.
    // Role/auth validation is already enforced by requireAdmin() in the page.
    return NextResponse.next();
  }

  const response = await updateSupabaseSession(request);
  const hasAuthCookie = hasSupabaseAuthCookie(request);

  if (!hasAuthCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
