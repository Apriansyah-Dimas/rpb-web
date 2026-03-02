import type { ReactNode } from "react";
import { RpbAppHeader } from "@/components/layout/rpb-app-header";
import { RpbBottomNav } from "@/components/layout/rpb-bottom-nav";

interface RpbPageFrameProps {
  children: ReactNode;
  containerClassName?: string;
  shellClassName?: string;
  headerClassName?: string;
  showBottomNav?: boolean;
}

export function RpbPageFrame({
  children,
  containerClassName = "",
  shellClassName = "",
  headerClassName = "",
  showBottomNav = true,
}: RpbPageFrameProps) {
  const bottomPaddingClass = showBottomNav ? "pb-24 md:pb-28" : "";

  return (
    <div className={`min-h-screen w-full bg-rpb-primary ${containerClassName}`.trim()}>
      <RpbAppHeader className={headerClassName} />
      <div className="no-print pointer-events-none fixed top-[72px] right-0 left-0 z-[55] md:top-[82px]">
        <div className="h-5 rounded-t-[28px] bg-white md:h-6 md:rounded-t-[34px]" />
      </div>
      <main className="min-h-screen pt-[92px] md:pt-[106px]">
        <div className={`rpb-shell min-h-[calc(100vh-92px)] md:min-h-[calc(100vh-106px)] ${shellClassName}`.trim()}>
          <div className={`bg-white px-3 sm:px-8 md:px-28 lg:px-40 xl:px-52 2xl:px-64 ${bottomPaddingClass}`.trim()}>
            {children}
          </div>
        </div>
      </main>
      {showBottomNav ? <RpbBottomNav /> : null}
    </div>
  );
}
