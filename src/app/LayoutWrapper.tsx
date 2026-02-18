"use client";

import { usePathname } from "next/navigation";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPartner = pathname?.startsWith("/partner");
  const isSuperAdmin = pathname?.startsWith("/superadmin");

  if (isPartner || isSuperAdmin) {
    return <div className="w-full min-h-screen">{children}</div>;
  }

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[430px] bg-background-light dark:bg-background-dark min-h-screen shadow-2xl relative overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
