export function RpbAppHeader({ className = "" }: { className?: string }) {
  return (
    <header
      className={`rpb-fixed-header fixed top-0 right-0 left-0 z-[60] h-[92px] text-white md:h-[106px] ${className}`.trim()}
    >
      <div className="flex h-[72px] items-center justify-center px-4 md:h-[82px] md:px-6">
        <h1 className="rpb-h-title text-xl font-semibold md:text-2xl">RPB</h1>
      </div>
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-5 rounded-t-[28px] bg-white md:h-6 md:rounded-t-[34px]" />
    </header>
  );
}
