"use client";

import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";

interface KakaoUser {
  id: string;
  nickname: string;
  email: string;
  loginTime: string;
}

export default function MyPage() {
  const [user, setUser] = useState<KakaoUser | null>(null);
  const [showNicknameInput, setShowNicknameInput] = useState(false);
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("kakao_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // ignore malformed data
      }
    }
  }, []);

  const handleKakaoLogin = () => {
    setShowNicknameInput(true);
  };

  const handleNicknameSubmit = () => {
    const finalNickname = nickname.trim() || "카카오 사용자";
    const mockUser: KakaoUser = {
      id: `kakao_${Date.now()}`,
      nickname: finalNickname,
      email: "user@kakao.com",
      loginTime: new Date().toISOString(),
    };
    localStorage.setItem("kakao_user", JSON.stringify(mockUser));
    setUser(mockUser);
    setShowNicknameInput(false);
    setNickname("");
  };

  const handleLogout = () => {
    localStorage.removeItem("kakao_user");
    setUser(null);
  };

  return (
    <div className="pb-[100px] bg-background-light min-h-screen">
      {/* Header */}
      <header className="px-5 py-3 flex justify-between items-center sticky top-0 z-40 bg-white border-b border-slate-100">
        <span className="text-2xl font-black text-primary tracking-tight font-sans">Rent Zero</span>
        <button className="p-1">
          <span className="material-symbols-outlined text-3xl text-slate-700">menu</span>
        </button>
      </header>

      <main className="px-5 py-6">
        {!user ? (
          // Not logged in - show Kakao login
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-slate-500">person</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">로그인이 필요합니다</h2>
            <p className="text-sm text-slate-500 mb-8 text-center">
              카카오 계정으로 간편하게 로그인하세요
            </p>
            <button
              onClick={handleKakaoLogin}
              className="w-full max-w-xs flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-colors"
              style={{ backgroundColor: "#FEE500", color: "#191919" }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 1C4.58 1 1 3.79 1 7.21c0 2.17 1.45 4.08 3.64 5.18-.16.56-.58 2.03-.66 2.34-.11.39.14.38.3.28.12-.08 1.94-1.31 2.73-1.85.64.09 1.3.14 1.99.14 4.42 0 8-2.79 8-6.21S13.42 1 9 1z" fill="#191919"/>
              </svg>
              카카오 로그인
            </button>
          </div>
        ) : (
          // Logged in - show profile
          <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm text-center">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl text-yellow-600">person</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{user.nickname}</h2>
              <p className="text-sm text-slate-500 mt-1">{user.email}</p>
            </div>

            {/* Menu Items */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl text-slate-600">description</span>
                  <span className="text-sm font-medium text-slate-900">내 견적 내역</span>
                </div>
                <span className="material-symbols-outlined text-slate-500">chevron_right</span>
              </div>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl text-slate-600">notifications</span>
                  <span className="text-sm font-medium text-slate-900">알림 설정</span>
                </div>
                <span className="material-symbols-outlined text-slate-500">chevron_right</span>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl text-slate-600">help</span>
                  <span className="text-sm font-medium text-slate-900">고객센터</span>
                </div>
                <span className="material-symbols-outlined text-slate-500">chevron_right</span>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full py-3 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              로그아웃
            </button>
          </div>
        )}
      </main>

      {/* Nickname Input Modal */}
      {showNicknameInput && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={() => setShowNicknameInput(false)}
        >
          <div
            className="bg-white rounded-3xl p-8 mx-5 w-full max-w-[360px] flex flex-col items-center gap-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-[#FEE500] flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="#191919">
                <path d="M16 4C9.373 4 4 8.477 4 14c0 3.647 2.16 6.845 5.4 8.73l-.9 3.27 3.87-2.04A14.1 14.1 0 0016 24c6.627 0 12-4.477 12-10S22.627 4 16 4z"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900">닉네임을 입력해주세요</h2>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="카카오 사용자"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FEE500]/50 focus:border-[#FEE500] text-center"
              onKeyDown={(e) => e.key === "Enter" && handleNicknameSubmit()}
              autoFocus
            />
            <button
              onClick={handleNicknameSubmit}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-colors"
              style={{ backgroundColor: "#FEE500", color: "#191919" }}
            >
              로그인 완료
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
