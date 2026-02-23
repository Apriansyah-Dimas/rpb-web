import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

export const createSupabaseServerClient = async (): Promise<SupabaseClient> => {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }: {
            name: string;
            value: string;
            options: CookieOptions;
          }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component render, cookie writes are ignored there.
        }
      },
    },
  });
};
