"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    // Skip auth check on login page
    if (pathname === "/partner/login") {
      setIsLoading(false);
      return;
    }

    // Check authentication
    const checkAuth = async () => {
      try {
        // Try to get mock agent from localStorage (for development)
        const mockAgent = localStorage.getItem("mockAgent");
        if (mockAgent) {
          setIsAuthenticated(true);
          const agentData = JSON.parse(mockAgent);
          setPoints(agentData.points || 0);
          setIsLoading(false);
          return;
        }

        // TODO: Add Supabase auth check
        // const { data: { session } } = await supabase.auth.getSession();
        // if (!session) {
        //   router.push("/partner/login");
        //   return;
        // }
        // setIsAuthenticated(true);

        // For now, redirect to login if no mock auth
        router.push("/partner/login");
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/partner/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem("mockAgent");
    router.push("/partner/login");
  };

  if (pathname === "/partner/login") {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Layout (md+) */}
      <div className="hidden md:flex h-screen">
        {/* Sidebar */}
        <aside className="w-60 bg-white border-r border-slate-200 flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-slate-200">
            <h1 className="text-2xl font-bold text-slate-900">렌트제로 Pro</h1>
            <p className="text-xs text-slate-500 mt-1">파트너 전용</p>
          </div>

          {/* Points Balance */}
          <div className="mx-4 mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <p className="text-xs text-slate-600 mb-1">보유 포인트</p>
            <p className="text-2xl font-bold text-blue-600">
              {points.toLocaleString()}
              <span className="text-sm font-normal text-slate-600 ml-1">P</span>
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <Link
              href="/partner"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === "/partner"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="material-symbols-outlined">home</span>
              <span className="font-medium">대시보드</span>
            </Link>

            <Link
              href="/partner/my-leads"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname?.startsWith("/partner/my-leads") || pathname?.startsWith("/partner/quotes")
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="material-symbols-outlined">visibility</span>
              <span className="font-medium">열람 목록</span>
            </Link>

            <Link
              href="/partner/profile"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === "/partner/profile"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="material-symbols-outlined">person</span>
              <span className="font-medium">프로필</span>
            </Link>
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t border-slate-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="font-medium">로그아웃</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden min-h-screen pb-20">
        {/* Main Content */}
        <main className="min-h-screen">{children}</main>

        {/* Bottom Tab Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-around items-center z-50">
          <Link
            href="/partner"
            className="flex flex-col items-center gap-1 min-w-[60px]"
          >
            <span
              className={`material-symbols-outlined text-2xl ${
                pathname === "/partner" ? "text-blue-600" : "text-slate-500"
              }`}
            >
              home
            </span>
            <span
              className={`text-[10px] font-medium ${
                pathname === "/partner" ? "text-blue-600" : "text-slate-500"
              }`}
            >
              대시보드
            </span>
          </Link>

          <Link
            href="/partner/my-leads"
            className="flex flex-col items-center gap-1 min-w-[60px]"
          >
            <span
              className={`material-symbols-outlined text-2xl ${
                pathname?.startsWith("/partner/my-leads") || pathname?.startsWith("/partner/quotes")
                  ? "text-blue-600"
                  : "text-slate-500"
              }`}
            >
              visibility
            </span>
            <span
              className={`text-[10px] font-medium ${
                pathname?.startsWith("/partner/my-leads") || pathname?.startsWith("/partner/quotes")
                  ? "text-blue-600"
                  : "text-slate-500"
              }`}
            >
              열람목록
            </span>
          </Link>

          <Link
            href="/partner/notifications"
            className="flex flex-col items-center gap-1 min-w-[60px]"
          >
            <span
              className={`material-symbols-outlined text-2xl ${
                pathname === "/partner/notifications"
                  ? "text-blue-600"
                  : "text-slate-500"
              }`}
            >
              notifications
            </span>
            <span
              className={`text-[10px] font-medium ${
                pathname === "/partner/notifications"
                  ? "text-blue-600"
                  : "text-slate-500"
              }`}
            >
              알림
            </span>
          </Link>

          <Link
            href="/partner/profile"
            className="flex flex-col items-center gap-1 min-w-[60px]"
          >
            <span
              className={`material-symbols-outlined text-2xl ${
                pathname === "/partner/profile" ? "text-blue-600" : "text-slate-500"
              }`}
            >
              person
            </span>
            <span
              className={`text-[10px] font-medium ${
                pathname === "/partner/profile" ? "text-blue-600" : "text-slate-500"
              }`}
            >
              프로필
            </span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
