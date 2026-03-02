import type { ReactNode } from "react";
import { RpbAppHeader } from "@/components/layout/rpb-app-header";
import { RpbBottomNav } from "@/components/layout/rpb-bottom-nav";

interface RpbPageFrameProps {
  children: ReactNode;
  containerClassName?: string;
  shellClassName?: string;
  headerClassName?: string;
  maxWidthClassName?: string;
  showBottomNav?: boolean;
}

export function RpbPageFrame({
  children,
  containerClassName = "",
  shellClassName = "",
  headerClassName = "",
  maxWidthClassName = "max-w-6xl",
  showBottomNav = true,
}: RpbPageFrameProps) {
  return (
    <div
      className={`mx-auto min-h-screen w-full ${maxWidthClassName} p-4 pb-28 md:px-10 md:pt-5 md:pb-32 lg:px-12 ${containerClassName}`.trim()}
    >
      <main className={`rpb-shell overflow-hidden ${shellClassName}`.trim()}>
        <RpbAppHeader className={headerClassName} />
        {children}
      </main>
      {showBottomNav ? <RpbBottomNav /> : null}
    </div>
  );
}
