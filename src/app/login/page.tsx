"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const getSafeNextPath = (value: string | null): string => {
  if (!value || !value.startsWith("/")) {
    return "/";
  }

  return value;
};

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(
    () => getSafeNextPath(searchParams.get("next")),
    [searchParams],
  );

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        router.replace(nextPath);
      }
    })();
  }, [nextPath, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-4 md:px-10 md:py-8">
      <div className="w-full max-w-xl">
        <h1 className="rpb-h-title mb-4 text-center text-2xl font-semibold text-rpb-ink-soft md:text-3xl">
          RPB Login
        </h1>

        <section className="rpb-section p-5 md:p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
              Email
              <input
                className="rpb-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@domain.com"
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
              Password
              <input
                className="rpb-input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                required
              />
            </label>

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="rpb-btn-primary inline-flex w-full items-center justify-center px-4 py-3 text-sm font-semibold"
              disabled={loading}
            >
              {loading ? "Memproses..." : "Login"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center p-4 md:px-10 md:py-8">
          <div className="w-full max-w-xl">
            <h1 className="rpb-h-title mb-4 text-center text-2xl font-semibold text-rpb-ink-soft md:text-3xl">
              RPB Login
            </h1>
            <div className="rpb-section p-6 text-sm text-rpb-ink-soft">
              Memuat halaman login...
            </div>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
