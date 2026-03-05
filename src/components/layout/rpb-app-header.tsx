import Image from "next/image";
import logoRpbHeader from "@/app/logorpb-header.svg";

export function RpbAppHeader({ className = "" }: { className?: string }) {
  return (
    <header
      className={`rpb-fixed-header fixed top-0 right-0 left-0 z-[60] h-[92px] text-white md:h-[106px] ${className}`.trim()}
    >
      <div className="flex h-[72px] items-center justify-center px-4 md:h-[82px] md:px-6">
        <Image
          src={logoRpbHeader}
          alt="Logo header RPB"
          priority
          className="h-9 w-auto md:h-11"
        />
      </div>
      <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-5 rounded-t-[28px] bg-white md:h-6 md:rounded-t-[34px]" />
    </header>
  );
}
