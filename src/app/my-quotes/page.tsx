"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

interface KakaoUser {
  id: string;
  nickname: string;
  email: string;
  loginTime: string;
}

interface SavedQuote {
  id: string;
  kakao_user_id?: string;
  car_name: string;
  trim_name: string;
  duration: number;
  mileage: number;
  deposit_rate: number;
  total_price?: number;
  status: string;
  final_monthly?: number | null;
  created_at: string;
}

export default function MyQuotesPage() {
  const [user, setUser] = useState<KakaoUser | null>(null);
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNicknameInput, setShowNicknameInput] = useState(false);
  const [nickname, setNickname] = useState("");
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("kakao_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
    setLoading(false);
  }, []);

  const loadQuotes = useCallback(() => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submittedQuotes: any[] = JSON.parse(localStorage.getItem("submitted_quotes") || "[]");

    const myQuotes = submittedQuotes
      .filter((q: SavedQuote) => q.kakao_user_id === user.id)
      .map((q: SavedQuote) => {
        // Derive display status from actual data
        if (q.final_monthly && q.final_monthly > 0) {
          return { ...q, status: "analyzed" };
        }
        return { ...q, status: q.status === "analyzed" ? "analyzing" : q.status };
      });
    setQuotes(myQuotes);
  }, [user]);

  // Load and refresh quotes every 5 seconds for status progression
  useEffect(() => {
    if (!user) return;
    loadQuotes();
    const interval = setInterval(loadQuotes, 5000);
    return () => clearInterval(interval);
  }, [user, loadQuotes]);

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

  const getStatusBadge = (quote: SavedQuote) => {
    if (quote.status === "analyzed" || (quote.final_monthly && quote.final_monthly > 0)) {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
          분석 완료
        </span>
      );
    }
    if (quote.status === "analyzing") {
      return (
        <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
          AI 분석중
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
        접수 완료
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background-light pb-[100px]">
        <header className="px-5 py-3 flex justify-between items-center sticky top-0 z-40 bg-white border-b border-slate-100">
          <span className="text-2xl font-black text-primary tracking-tight font-sans">내 견적함</span>
        </header>

        <div className="flex flex-col items-center justify-center py-20 px-5">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-slate-500">receipt_long</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">로그인이 필요합니다</h2>
          <p className="text-sm text-slate-500 mb-8 text-center">
            카카오 로그인 후 내 견적을 확인하세요
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

  // Logged in - show quotes
  return (
    <div className="min-h-screen bg-background-light pb-[100px]">
      <header className="px-5 py-3 flex justify-between items-center sticky top-0 z-40 bg-white border-b border-slate-100">
        <span className="text-2xl font-black text-primary tracking-tight font-sans">내 견적함</span>
      </header>

      <main className="p-5 max-w-[430px] mx-auto">
        {quotes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-500">receipt_long</span>
            </div>
            <p className="text-slate-600 mb-2 font-medium">아직 견적이 없습니다</p>
            <p className="text-sm text-slate-400 mb-6">견적을 만들어보세요</p>
            <Link
              href="/"
              className="inline-block bg-primary text-white px-6 py-3 rounded-xl font-bold"
            >
              견적 만들기
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className="bg-white rounded-3xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
                onClick={() => router.push(`/my-quotes/${quote.id}`)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{quote.car_name}</h3>
                      <p className="text-sm text-slate-600">{quote.trim_name}</p>
                    </div>
                    {getStatusBadge(quote)}
                  </div>

                  <div className="flex items-center gap-3 text-sm text-slate-500 mb-3">
                    <span>{quote.duration}개월</span>
                    <span>·</span>
                    <span>연 {(quote.mileage / 10000).toFixed(1)}만km</span>
                    <span>·</span>
                    <span>선납 {quote.deposit_rate}%</span>
                  </div>

                  {/* Analyzed: show lowest monthly */}
                  {(quote.status === "analyzed" || (quote.final_monthly && quote.final_monthly > 0)) && quote.final_monthly && (
                    <div className="bg-green-50 rounded-2xl p-4 mb-3">
                      <p className="text-xs text-green-600 font-medium mb-1">최저 월납료</p>
                      <p className="text-2xl font-black text-green-700">
                        {quote.final_monthly.toLocaleString()}
                        <span className="text-sm font-medium ml-1">원/월</span>
                      </p>
                    </div>
                  )}

                  {/* Analyzing: show progress */}
                  {quote.status === "analyzing" && (
                    <div className="bg-orange-50 rounded-2xl p-4 mb-3">
                      <p className="text-xs text-orange-600 font-medium flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                        AI가 최저가를 분석 중입니다...
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400">{formatDate(quote.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
