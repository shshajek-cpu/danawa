"use client";

import { useState, useEffect } from "react";

interface SubmittedQuote {
  id: string;
  car_name: string;
  trim_name: string;
  trim_price: number;
  duration: number;
  mileage: number;
  deposit_rate: number;
  status: string;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
}

interface PurchasedLead {
  quoteId: string;
  purchasedAt: string;
}

interface ChatRoom {
  id: string;
  quoteId: string;
  customerId: string;
  customerName: string;
  agentId: string;
  agentName: string;
  lastMessage: string;
  lastMessageAt: string;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalPartners: 0,
    totalCustomers: 0,
    todayQuotes: 0,
    totalViews: 0,
  });

  const [quickStats, setQuickStats] = useState({
    activePartners: 0,
    weekQuotes: 0,
    unpurchasedQuotes: 0,
  });

  const [recentQuotes, setRecentQuotes] = useState<SubmittedQuote[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  function loadDashboardData() {
    const submittedQuotes: SubmittedQuote[] = JSON.parse(
      localStorage.getItem("submitted_quotes") || "[]"
    );
    const mockAgent = localStorage.getItem("mockAgent");
    const purchasedLeadsRaw = localStorage.getItem("purchasedLeads");
    const chatRooms: ChatRoom[] = JSON.parse(
      localStorage.getItem("chat_rooms") || "[]"
    );

    // Parse purchased leads (handle both array formats)
    let purchasedLeads: string[] = [];
    if (purchasedLeadsRaw) {
      const parsed = JSON.parse(purchasedLeadsRaw);
      if (Array.isArray(parsed)) {
        purchasedLeads = parsed.map((item) =>
          typeof item === "string" ? item : item.quoteId
        );
      }
    }

    // Count unique customers
    const uniqueCustomers = new Set(
      submittedQuotes.map((q) => q.customer_phone || "unknown")
    );

    // Count partners
    const totalPartners = mockAgent ? 1 : 0;
    const activePartners = mockAgent
      ? JSON.parse(mockAgent).isActive !== false
        ? 1
        : 0
      : 0;

    // Count today's quotes
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayQuotes = submittedQuotes.filter(
      (q) => new Date(q.created_at) >= today
    ).length;

    // Count this week's quotes
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekQuotes = submittedQuotes.filter(
      (q) => new Date(q.created_at) >= weekAgo
    ).length;

    // Count unpurchased quotes
    const unpurchasedQuotes = submittedQuotes.filter(
      (q) => !purchasedLeads.includes(q.id)
    ).length;

    setStats({
      totalPartners,
      totalCustomers: uniqueCustomers.size,
      todayQuotes,
      totalViews: purchasedLeads.length,
    });

    setQuickStats({
      activePartners,
      weekQuotes,
      unpurchasedQuotes,
    });

    // Get recent 10 quotes, sorted by date
    const sorted = [...submittedQuotes].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setRecentQuotes(sorted.slice(0, 10));
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  }

  function getStatusBadge(status: string) {
    const statusMap: Record<
      string,
      { label: string; color: string }
    > = {
      open: { label: "대기", color: "bg-blue-100 text-blue-700" },
      pending: { label: "보류", color: "bg-yellow-100 text-yellow-700" },
      contacted: { label: "연락완료", color: "bg-green-100 text-green-700" },
      completed: { label: "완료", color: "bg-slate-100 text-slate-700" },
    };

    const config = statusMap[status] || {
      label: status,
      color: "bg-slate-100 text-slate-700",
    };

    return (
      <span
        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">대시보드</h1>
        <p className="text-slate-600 mt-1">플랫폼 전체 현황을 확인하세요</p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">총 파트너 수</p>
              <p className="text-3xl font-bold text-slate-900">
                {stats.totalPartners}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600 text-2xl">
                groups
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">총 고객 수</p>
              <p className="text-3xl font-bold text-slate-900">
                {stats.totalCustomers}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600 text-2xl">
                person
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">오늘 견적 요청</p>
              <p className="text-3xl font-bold text-slate-900">
                {stats.todayQuotes}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-600 text-2xl">
                description
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">총 열람 건수</p>
              <p className="text-3xl font-bold text-slate-900">
                {stats.totalViews}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-orange-600 text-2xl">
                visibility
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-green-600">
                check_circle
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-600">활성 파트너</p>
              <p className="text-2xl font-bold text-slate-900">
                {quickStats.activePartners}
                <span className="text-sm font-normal text-slate-500 ml-1">
                  / {stats.totalPartners}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600">
                calendar_month
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-600">이번 주 견적</p>
              <p className="text-2xl font-bold text-slate-900">
                {quickStats.weekQuotes}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-yellow-600">
                pending
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-600">미열람 견적</p>
              <p className="text-2xl font-bold text-slate-900">
                {quickStats.unpurchasedQuotes}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">최근 견적 요청</h2>
          <p className="text-sm text-slate-600 mt-1">
            최근 10건의 견적 요청 내역
          </p>
        </div>

        <div className="p-6">
          {recentQuotes.length === 0 ? (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">
                inbox
              </span>
              <p className="text-slate-500">등록된 견적 요청이 없습니다</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      고객명
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      차량
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      트림
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      요청일
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentQuotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="py-3 px-4 text-sm font-medium text-slate-900">
                        {quote.customer_name || "알 수 없음"}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">
                        {quote.car_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">
                        {quote.trim_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {formatDate(quote.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(quote.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
