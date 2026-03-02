import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6">
      <section className="w-full max-w-md rounded-2xl border border-rpb-border bg-white p-6 text-center shadow-lg shadow-black/5">
        <h1 className="rpb-h-title text-2xl font-semibold text-foreground">Anda sedang offline</h1>
        <p className="mt-3 text-sm text-rpb-ink-soft">
          Cek koneksi internet, lalu coba buka aplikasi lagi.
        </p>
        <Link
          href="/"
          className="rpb-btn-primary mt-5 inline-flex items-center justify-center px-4 py-2 text-sm font-semibold"
        >
          Coba lagi
        </Link>
      </section>
    </main>
  );
}
