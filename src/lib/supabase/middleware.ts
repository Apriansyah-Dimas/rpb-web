import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { isInvalidAuthSessionError } from "@/lib/supabase/auth-errors";

const clearSupabaseAuthCookies = (request: NextRequest, response: NextResponse): void => {
  request.cookies
    .getAll()
    .filter((cookie) => cookie.name.startsWith("sb-"))
    .forEach((cookie) => {
      request.cookies.delete(cookie.name);
      response.cookies.set(cookie.name, "", {
        maxAge: 0,
        path: "/",
      });
    });
};

export const updateSupabaseSession = async (request: NextRequest) => {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }: { name: string; value: string }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(
          ({
            name,
            value,
            options,
          }: {
            name: string;
            value: string;
            options: CookieOptions;
          }) => {
            response.cookies.set(name, value, options);
          },
        );
      },
    },
  });

  const { error } = await supabase.auth.getUser();

  if (isInvalidAuthSessionError(error)) {
    clearSupabaseAuthCookies(request, response);
  }

  return response;
};
