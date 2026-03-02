import { RpbAppHeader } from "@/components/layout/rpb-app-header";

export default function Loading() {
  return (
    <div className="min-h-screen w-full bg-rpb-primary pb-24 md:pb-28">
      <RpbAppHeader />
      <main className="relative z-0 min-h-screen pt-[92px] md:pt-[106px]">
        <div className="rpb-shell relative z-0 -mt-px min-h-[calc(100vh-92px)] bg-white md:min-h-[calc(100vh-106px)]">
          <div className="bg-white px-3 sm:px-8 md:px-28 lg:px-40 xl:px-52 2xl:px-64">
            <div className="rpb-section p-4 text-sm text-rpb-ink-soft">
              Memuat halaman...
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
