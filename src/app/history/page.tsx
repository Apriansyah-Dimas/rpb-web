"use client";

import { Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RpbPageFrame } from "@/components/layout/rpb-page-frame";
import { deleteSummaryHistory, fetchSummaryHistory } from "@/lib/rpb-db";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRpbStore } from "@/store/rpb-store";
import type { SavedSummaryRecord } from "@/types/rpb";

const formatDateTime = (value: string) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export default function HistoryPage() {
  const router = useRouter();
  const loadSnapshot = useRpbStore((state) => state.loadSnapshot);
  const [items, setItems] = useState<SavedSummaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const rows = await fetchSummaryHistory(supabase);
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const handleUse = (record: SavedSummaryRecord) => {
    loadSnapshot(record.snapshot);
    router.push("/summary");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Hapus history ini?")) {
      return;
    }

    setBusyId(id);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      await deleteSummaryHistory(supabase, id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus history.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <RpbPageFrame shellClassName="rpb-compact">
      <div className="space-y-4 py-5 md:py-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/summary"
              className="rpb-btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
            >
              Kembali ke Summary
            </Link>
            <button
              type="button"
              className="rpb-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
              onClick={() => void refresh()}
              disabled={loading}
            >
              {loading ? "Memuat..." : "Refresh"}
            </button>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <section className="rpb-section p-4">
            {loading ? (
              <p className="text-sm text-rpb-ink-soft">Memuat history...</p>
            ) : items.length === 0 ? (
              <p className="text-sm text-rpb-ink-soft">
                Belum ada history tersimpan untuk akun ini.
              </p>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl border border-rpb-border bg-white p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{item.title}</p>
                      <p className="text-sm text-rpb-ink-soft">
                        Customer: {item.customerName || "-"} | Project: {item.projectName || "-"}
                      </p>
                      <p className="text-xs text-rpb-ink-soft">
                        Update: {formatDateTime(item.updatedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rpb-btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold"
                        onClick={() => handleUse(item)}
                      >
                        <Upload size={14} />
                        Gunakan
                      </button>
                      <button
                        type="button"
                        className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700"
                        onClick={() => void handleDelete(item.id)}
                        disabled={busyId === item.id}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Trash2 size={14} />
                          {busyId === item.id ? "Menghapus..." : "Hapus"}
                        </span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
      </div>
    </RpbPageFrame>
  );
}
