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
  const bottomPaddingClass = showBottomNav ? "pb-16 md:pb-20" : "";
  const contentOffsetClass = "pt-[92px] md:pt-[106px]";
  const contentMinHeightClass = "min-h-[calc(100vh-92px)] md:min-h-[calc(100vh-106px)]";

  return (
    <div className={`min-h-screen w-full bg-rpb-primary ${containerClassName}`.trim()}>
      <RpbAppHeader className={headerClassName} />
      <main className={`relative min-h-screen ${contentOffsetClass}`}>
        <div className={`rpb-shell relative -mt-[2px] bg-white ${contentMinHeightClass} ${shellClassName}`.trim()}>
          <div className={`relative bg-white px-3 sm:px-8 md:px-28 lg:px-40 xl:px-52 2xl:px-64 ${bottomPaddingClass}`.trim()}>
            <div className="pointer-events-none absolute top-0 right-0 left-0 h-px bg-white" />
            {children}
          </div>
        </div>
      </main>
      {showBottomNav ? <RpbBottomNav /> : null}
    </div>
  );
}
