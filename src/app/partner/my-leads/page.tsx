"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type LeadPurchase = {
  id: string;
  agent_id: string;
  quote_id: string;
  points_used: number;
  purchased_at: string;
  quote?: {
    id: string;
    car_name: string;
    trim_name: string;
    customer?: {
      id: string;
      name: string;
      phone: string;
    };
  };
};

type FilterTab = "all" | "week" | "month";

interface Quote {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  car_id: string;
  car_name: string;
  trim_id: string;
  trim_name: string;
  trim_price: number;
  color_id: string | null;
  color_name: string | null;
  options: { id: string; name: string; price: number }[];
  total_price: number;
  duration: number;
  mileage: number;
  deposit_rate: number;
  estimated_monthly: number | null;
  status: string;
  created_at: string;
}

interface PurchasedLead {
  quoteId: string;
  purchasedAt: string;
}

export default function MyLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    loadMyLeads();

    // Listen for localStorage changes (realtime refresh when new lead is purchased)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "purchasedLeads" || e.key === "submitted_quotes") {
        loadMyLeads();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function loadMyLeads() {
    try {
      // Check localStorage auth instead of Supabase
      const mockAgentStr = localStorage.getItem("mockAgent");
      if (!mockAgentStr) {
        router.push("/partner/login");
        return;
      }
      const agentData = JSON.parse(mockAgentStr);

      // Load purchased leads from localStorage
      const purchasedLeadsRaw = localStorage.getItem("purchasedLeads");
      let purchasedLeadsData: (string | PurchasedLead)[] = [];

      if (purchasedLeadsRaw) {
        purchasedLeadsData = JSON.parse(purchasedLeadsRaw);
      }

      // Load all submitted quotes
      const submittedQuotes: Quote[] = JSON.parse(localStorage.getItem("submitted_quotes") || "[]");

      // Build LeadPurchase objects from localStorage data
      const leadsData: LeadPurchase[] = purchasedLeadsData
        .map((item): LeadPurchase | null => {
          // Handle both old format (string array) and new format (object array)
          const quoteId = typeof item === "string" ? item : item.quoteId;
          const purchasedAt = typeof item === "string" ? null : item.purchasedAt;

          // Find the matching quote
          const quote = submittedQuotes.find((q) => q.id === quoteId);
          if (!quote) return null;

          return {
            id: `lead-${quoteId}`,
            agent_id: agentData.id || "agent-1",
            quote_id: quoteId,
            points_used: 500,
            purchased_at: purchasedAt || quote.created_at,
            quote: {
              id: quote.id,
              car_name: quote.car_name,
              trim_name: quote.trim_name,
              customer: {
                id: quote.customer_id,
                name: quote.customer_name || "고객",
                phone: quote.customer_phone || "",
              },
            },
          };
        })
        .filter((lead): lead is LeadPurchase => lead !== null)
        .sort((a, b) => new Date(b.purchased_at).getTime() - new Date(a.purchased_at).getTime());

      setLeads(leadsData);
    } catch (error) {
      console.error("Error loading leads:", error);
    } finally {
      setLoading(false);
    }
  }

  const getFilteredLeads = () => {
    const now = new Date();
    return leads.filter((lead) => {
      const purchasedDate = new Date(lead.purchased_at);
      const diffDays = Math.floor(
        (now.getTime() - purchasedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (activeTab === "all") return true;
      if (activeTab === "week") return diffDays <= 7;
      if (activeTab === "month") return diffDays <= 30;
      return true;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    return "방금 전";
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  };

  const filteredLeads = getFilteredLeads();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 md:p-8">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 -mx-4 px-4 py-4 mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">열람한 견적</h1>
          <Link href="/partner/quotes" className="p-1">
            <span className="material-symbols-outlined text-2xl text-slate-700">close</span>
          </Link>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block bg-white border-b border-slate-200 -mx-8 px-8 py-6 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">열람한 견적</h1>
        <p className="text-slate-600 mt-1">열람한 고객 견적을 관리하세요</p>
      </div>

      {/* Tab Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4">
        <div className="p-4 md:p-6">
          <div className="flex gap-2">
            {[
              { id: "all", label: "전체" },
              { id: "week", label: "최근 1주일" },
              { id: "month", label: "최근 1개월" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FilterTab)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all md:px-6 md:py-2.5 ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leads List - Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {filteredLeads.length > 0 ? (
          filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <p className="text-xs text-slate-500 mb-1">
                    {lead.quote?.car_name || "차량정보 없음"}
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {lead.quote?.trim_name || "트림정보 없음"}
                  </p>
                </div>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
                  열람완료
                </span>
              </div>

              {lead.quote?.customer && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-slate-500">
                      person
                    </span>
                    <p className="text-sm text-slate-700">
                      {lead.quote.customer.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-slate-500">
                      call
                    </span>
                    <p className="text-sm font-semibold text-slate-900">
                      {lead.quote.customer.phone}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-3 mt-3 border-t border-slate-100">
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-1">열람 일시</p>
                  <p className="text-xs font-semibold text-slate-700">
                    {formatDateTime(lead.purchased_at)}
                  </p>
                  <p className="text-xs text-slate-500">{formatDate(lead.purchased_at)}</p>
                </div>
                {lead.quote?.customer && (
                  <div className="flex gap-2">
                    <a
                      href={`tel:${lead.quote.customer.phone}`}
                      className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-lg">call</span>
                      전화하기
                    </a>
                    <button
                      onClick={() => router.push(`/partner/chat/${lead.quote_id}`)}
                      className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-xl active:scale-95 transition-transform"
                    >
                      <span className="material-symbols-outlined text-lg">chat</span>
                      채팅
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <span className="material-symbols-outlined text-6xl text-slate-200 mb-4 block">
              receipt_long
            </span>
            <p className="text-slate-500 text-sm">
              {activeTab === "all"
                ? "아직 열람한 견적이 없습니다"
                : activeTab === "week"
                ? "최근 1주일간 열람한 견적이 없습니다"
                : "최근 1개월간 열람한 견적이 없습니다"}
            </p>
            <Link
              href="/partner/quotes"
              className="inline-block mt-6 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
              견적 둘러보기
            </Link>
          </div>
        )}
      </div>

      {/* Leads List - Desktop Table Layout */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200">
        {filteredLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">차량정보</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">고객명</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">연락처</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">열람일시</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">상태</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-xs text-slate-500">
                          {lead.quote?.car_name || "차량정보 없음"}
                        </p>
                        <p className="text-sm font-semibold text-slate-900 mt-1">
                          {lead.quote?.trim_name || "트림정보 없음"}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900">
                        {lead.quote?.customer?.name || "-"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-900">
                        {lead.quote?.customer?.phone || "-"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-slate-700">
                          {formatDateTime(lead.purchased_at)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDate(lead.purchased_at)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full inline-block">
                        열람완료
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {lead.quote?.customer && (
                        <div className="flex items-center justify-center gap-2">
                          <a
                            href={`tel:${lead.quote.customer.phone}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg shadow-md shadow-primary/20 hover:bg-primary/90 transition-all"
                          >
                            <span className="material-symbols-outlined text-lg">call</span>
                            전화하기
                          </a>
                          <button
                            onClick={() => router.push(`/partner/chat/${lead.quote_id}`)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-all"
                          >
                            <span className="material-symbols-outlined text-lg">chat</span>
                            채팅
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-20 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-200 mb-4 block">
              receipt_long
            </span>
            <p className="text-slate-500 text-sm">
              {activeTab === "all"
                ? "아직 열람한 견적이 없습니다"
                : activeTab === "week"
                ? "최근 1주일간 열람한 견적이 없습니다"
                : "최근 1개월간 열람한 견적이 없습니다"}
            </p>
            <Link
              href="/partner/quotes"
              className="inline-block mt-6 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors"
            >
              견적 둘러보기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
