"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center z-50">
        <Link href="/" className="flex flex-col items-center gap-1 group">
          <span className={`material-symbols-outlined ${pathname === "/" ? "text-primary" : "text-slate-500"}`}>
            home
          </span>
          <span className={`text-[10px] font-sans ${pathname === "/" ? "text-primary font-bold" : "text-slate-500 font-medium"}`}>
            홈
          </span>
        </Link>

        <Link href="/my-quotes" className="flex flex-col items-center gap-1 group">
          <span className={`material-symbols-outlined ${pathname === "/my-quotes" ? "text-primary" : "text-slate-500"}`}>
            receipt_long
          </span>
          <span className={`text-[10px] font-sans ${pathname === "/my-quotes" ? "text-primary font-bold" : "text-slate-500 font-medium"}`}>
            내 견적함
          </span>
        </Link>

        <Link href="/my" className="flex flex-col items-center gap-1 group">
          <span className={`material-symbols-outlined ${pathname === "/my" ? "text-primary" : "text-slate-500"}`}>
            person_outline
          </span>
          <span className={`text-[10px] font-sans ${pathname === "/my" ? "text-primary font-bold" : "text-slate-500 font-medium"}`}>
            마이
          </span>
        </Link>
      </nav>

      <div className="fixed bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-200 rounded-full z-[60]"></div>
    </>
  );
}
