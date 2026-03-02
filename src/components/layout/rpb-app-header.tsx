export function RpbAppHeader({ className = "" }: { className?: string }) {
  return (
    <header
      className={`rpb-topbar sticky top-0 z-40 flex items-center justify-center px-4 py-3 text-white md:px-6 ${className}`.trim()}
    >
      <h1 className="rpb-h-title text-xl font-semibold md:text-2xl">RPB</h1>
    </header>
  );
}
