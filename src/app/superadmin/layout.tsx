"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("superadmin_auth");
    if (auth === "authenticated") {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = () => {
    if (password === "admin1234") {
      localStorage.setItem("superadmin_auth", "authenticated");
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("비밀번호가 올바르지 않습니다");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("superadmin_auth");
    setIsAuthenticated(false);
    setPassword("");
    router.push("/superadmin");
  };

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
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <span className="material-symbols-outlined text-6xl text-blue-600 mb-4">
              admin_panel_settings
            </span>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">슈퍼 관리자</h1>
            <p className="text-slate-600">렌트제로 플랫폼 관리</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                관리자 비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              로그인
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { name: "대시보드", icon: "dashboard", path: "/superadmin" },
    { name: "견적 관리", icon: "description", path: "/superadmin/quotes" },
    { name: "파트너 관리", icon: "groups", path: "/superadmin/partners" },
    { name: "고객 관리", icon: "person", path: "/superadmin/customers" },
    { name: "상담 관리", icon: "chat", path: "/superadmin/chats" },
    { name: "설정", icon: "settings", path: "/superadmin/settings" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-white">
        {/* Brand */}
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-2xl font-bold">RENT ZERO</h1>
          <p className="text-sm text-slate-400 mt-1">관리자</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === item.path
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="font-medium">로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-slate-900 text-white z-50 border-b border-slate-700">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-bold">RENT ZERO</h1>
            <p className="text-xs text-slate-400">관리자</p>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">
              {isMobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-64 bg-slate-900 text-white z-50 transform transition-transform">
            {/* Brand */}
            <div className="p-6 border-b border-slate-700">
              <h1 className="text-2xl font-bold">RENT ZERO</h1>
              <p className="text-sm text-slate-400 mt-1">관리자</p>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    pathname === item.path
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
            </nav>

            {/* Logout Button */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">logout</span>
                <span className="font-medium">로그아웃</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <main className="md:ml-64 min-h-screen pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}
