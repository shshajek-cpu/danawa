"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// import { supabase, Quote } from "@/lib/supabase";

interface SubmittedQuote {
  id: string;
  car_id?: string;
  car_name: string;
  trim_name: string;
  trim_price: number;
  duration: number;
  mileage: number;
  deposit_rate: number;
  status: string;
  created_at: string;
}

interface DashboardQuote extends SubmittedQuote {
  view_count: number;
  is_purchased: boolean;
}

type FilterTab = "all" | "not_purchased" | "purchased";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<DashboardQuote[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [stats, setStats] = useState({
    today_count: 0,
    purchased_count: 0,
    points: 5000,
  });

  useEffect(() => {
    loadDashboardData();

    // Listen for storage changes (new quotes from customer site)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "submitted_quotes") loadDashboardData();
    };
    window.addEventListener("storage", handleStorage);

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function loadDashboardData() {
    const submittedQuotes: SubmittedQuote[] = JSON.parse(localStorage.getItem("submitted_quotes") || "[]");
    const purchasedLeadsRaw = localStorage.getItem("purchasedLeads") || "[]";
    const purchasedLeads = JSON.parse(purchasedLeadsRaw);

    // Handle both old format (string array) and new format (object array)
    const isPurchased = (quoteId: string) => {
      return purchasedLeads.some((item: any) =>
        typeof item === "string" ? item === quoteId : item.quoteId === quoteId
      );
    };

    const dashboardQuotes: DashboardQuote[] = submittedQuotes.map(q => ({
      ...q,
      view_count: isPurchased(q.id) ? 1 : 0,
      is_purchased: isPurchased(q.id),
    }));

    setQuotes(dashboardQuotes);

    // Load agent points
    const mockAgent = localStorage.getItem("mockAgent");
    const agentPoints = mockAgent ? (JSON.parse(mockAgent).points ?? 5000) : 5000;

    setStats({
      today_count: submittedQuotes.length,
      purchased_count: dashboardQuotes.filter(q => q.is_purchased).length,
      points: agentPoints,
    });
  }

  const getTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const diff = now - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  };

  const filteredQuotes = quotes.filter((quote) => {
    if (filter === "not_purchased") return !quote.is_purchased;
    if (filter === "purchased") return quote.is_purchased;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4">
        <h1 className="text-xl font-bold text-slate-900">대시보드</h1>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block bg-white border-b border-slate-200 px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
        <p className="text-slate-600 mt-1">실시간 견적 현황을 확인하세요</p>
      </div>

      <div className="p-4 md:p-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* New Quotes Today */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">신규 견적</p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.today_count}
                </p>
                <p className="text-xs text-slate-500 mt-1">오늘 등록됨</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600 text-2xl">
                  description
                </span>
              </div>
            </div>
          </div>

          {/* Purchased Leads */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">열람한 견적</p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.purchased_count}
                </p>
                <p className="text-xs text-slate-500 mt-1">이번 달</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-2xl">
                  visibility
                </span>
              </div>
            </div>
          </div>

          {/* Points Balance */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">보유 포인트</p>
                <p className="text-3xl font-bold text-slate-900">
                  {stats.points.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">P</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600 text-2xl">
                  account_balance_wallet
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quotes List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          {/* Filter Tabs */}
          <div className="border-b border-slate-200 px-4 md:px-6">
            <div className="flex gap-6">
              <button
                onClick={() => setFilter("all")}
                className={`py-4 px-2 border-b-2 transition-colors ${
                  filter === "all"
                    ? "border-blue-600 text-blue-600 font-medium"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                전체 ({quotes.length})
              </button>
              <button
                onClick={() => setFilter("not_purchased")}
                className={`py-4 px-2 border-b-2 transition-colors ${
                  filter === "not_purchased"
                    ? "border-blue-600 text-blue-600 font-medium"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                미열람 ({quotes.filter((q) => !q.is_purchased).length})
              </button>
              <button
                onClick={() => setFilter("purchased")}
                className={`py-4 px-2 border-b-2 transition-colors ${
                  filter === "purchased"
                    ? "border-blue-600 text-blue-600 font-medium"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                열람완료 ({quotes.filter((q) => q.is_purchased).length})
              </button>
            </div>
          </div>

          {/* Quotes Cards */}
          <div className="p-4 md:p-6 space-y-3">
            {filteredQuotes.length === 0 ? (
              <div className="py-16 text-center">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">
                  inbox
                </span>
                <p className="text-slate-500">아직 등록된 견적이 없습니다</p>
              </div>
            ) : (
              filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  onClick={() => router.push(`/partner/quotes/${quote.id}`)}
                  className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900">
                        {quote.car_name}
                      </h3>
                      <p className="text-sm text-slate-600">{quote.trim_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">차량가격</p>
                      <p className="text-lg font-bold text-slate-900">
                        {(quote.trim_price / 10000).toLocaleString()}
                        <span className="text-sm font-normal text-slate-600">
                          만원
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Contract Details */}
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      {quote.duration}개월
                    </span>
                    <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      {(quote.mileage / 10000).toFixed(0)}만km
                    </span>
                    <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      선납{quote.deposit_rate}%
                    </span>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-600">
                        <span className="font-semibold text-blue-600">
                          {quote.view_count}
                        </span>
                        명 열람
                      </span>
                      {quote.is_purchased ? (
                        <div className="flex items-center gap-2">
                          <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                            열람완료
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/partner/chat/${quote.id}`);
                            }}
                            className="flex items-center gap-1 bg-blue-500 text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-blue-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">chat</span>
                            채팅
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/partner/quotes/${quote.id}`);
                          }}
                          className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-blue-700 transition-colors"
                        >
                          500P 열람
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {getTimeAgo(quote.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
