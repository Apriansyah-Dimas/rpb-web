export default function Loading() {
  return (
    <div className="min-h-screen w-full bg-rpb-primary pb-24 md:pb-28">
      <div className="rpb-topbar fixed top-0 right-0 left-0 z-[60] flex h-[72px] items-center justify-center px-4 text-white md:h-[82px] md:px-6">
        <h1 className="rpb-h-title text-xl font-semibold md:text-2xl">RPB</h1>
      </div>
      <main className="min-h-screen pt-[72px] md:pt-[82px]">
        <div className="h-5 rounded-t-[28px] bg-white md:h-6 md:rounded-t-[34px]" />
        <div className="rpb-shell min-h-[calc(100vh-72px)] md:min-h-[calc(100vh-82px)]">
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
