export function RpbAppHeader({ className = "" }: { className?: string }) {
  return (
    <header
      className={`rpb-topbar fixed top-0 right-0 left-0 z-[60] flex h-24 items-center justify-center px-4 text-white md:h-28 md:px-6 ${className}`.trim()}
    >
      <h1 className="rpb-h-title text-xl font-semibold md:text-2xl">RPB</h1>
    </header>
  );
}
