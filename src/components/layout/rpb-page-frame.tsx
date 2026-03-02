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
        <div className="px-12 sm:px-16 md:px-28 lg:px-40 xl:px-52 2xl:px-64">{children}</div>
      </main>
      {showBottomNav ? <RpbBottomNav /> : null}
    </div>
  );
}
