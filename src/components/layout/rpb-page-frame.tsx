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
    <div className={`min-h-screen w-full bg-rpb-primary ${bottomPaddingClass} ${containerClassName}`.trim()}>
      <RpbAppHeader className={headerClassName} />
      <main className="min-h-screen pt-24 md:pt-28">
        <div
          className={`rpb-shell min-h-[calc(100vh-6rem)] overflow-hidden rounded-t-[28px] md:min-h-[calc(100vh-7rem)] md:rounded-t-[34px] ${shellClassName}`.trim()}
        >
          <div className="px-3 pt-4 sm:px-8 md:px-28 md:pt-5 lg:px-40 xl:px-52 2xl:px-64">{children}</div>
        </div>
      </main>
      {showBottomNav ? <RpbBottomNav /> : null}
    </div>
  );
}
