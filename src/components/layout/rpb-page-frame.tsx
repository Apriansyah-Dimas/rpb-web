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
    <div className={`min-h-screen w-full ${bottomPaddingClass} ${containerClassName}`.trim()}>
      <main className={`rpb-shell min-h-screen overflow-hidden ${shellClassName}`.trim()}>
        <RpbAppHeader className={headerClassName} />
        <div className="px-8 sm:px-10 md:px-16 lg:px-24 xl:px-32">{children}</div>
      </main>
      {showBottomNav ? <RpbBottomNav /> : null}
    </div>
  );
}
