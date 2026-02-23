"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { fetchCurrentUserRole } from "@/lib/rpb-db";

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
  const [info, setInfo] = useState<string | null>(null);

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
    setInfo(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        throw signInError;
      }

      const role = await fetchCurrentUserRole(supabase);
      setInfo(`Login berhasil sebagai ${role === "admin" ? "Admin" : "User"}.`);
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-5xl p-4 md:px-10 md:py-8">
      <main className="rpb-shell overflow-hidden">
        <header className="rpb-topbar flex items-center justify-center px-4 py-4 text-white md:px-6">
          <h1 className="rpb-h-title text-xl font-semibold md:text-2xl">RPB Login</h1>
        </header>

        <div className="grid gap-6 p-5 md:grid-cols-[1.1fr_1fr] md:px-8 md:py-8">
          <section className="rpb-section p-5">
            <h2 className="rpb-h-title mb-3 text-lg font-semibold">Estimator & Quotation</h2>
            <p className="text-sm leading-6 text-rpb-ink-soft">
              Login untuk mengakses estimator RPB, summary, quotation builder, dan history save
              per akun. Admin memiliki akses tambahan untuk mengelola master data dan membuat
              akun user.
            </p>
            <div className="mt-4 space-y-2 text-sm text-rpb-ink-soft">
              <p>Role:</p>
              <p>- Admin: kelola Profile, Konstruksi, Other (permanen), user</p>
              <p>- User: buat estimasi, quotation, dan simpan history pribadi</p>
            </div>
          </section>

          <section className="rpb-section p-5">
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
                  placeholder="••••••••"
                  required
                />
              </label>

              {error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              {info ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {info}
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

            <div className="mt-4 text-xs text-rpb-ink-soft">
              Akun user dibuat oleh admin. Tidak ada self-signup.
            </div>
            <div className="mt-2 text-xs text-rpb-ink-soft">
              <Link className="underline" href="/">
                Kembali ke app
              </Link>{" "}
              (akan diminta login jika belum ada session)
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto min-h-screen w-full max-w-5xl p-4 md:px-10 md:py-8">
          <main className="rpb-shell overflow-hidden">
            <header className="rpb-topbar flex items-center justify-center px-4 py-4 text-white md:px-6">
              <h1 className="rpb-h-title text-xl font-semibold md:text-2xl">RPB Login</h1>
            </header>
            <div className="p-6 text-sm text-rpb-ink-soft">Memuat halaman login...</div>
          </main>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
