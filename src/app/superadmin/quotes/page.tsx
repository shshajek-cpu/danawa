"use client";

import { useState, useEffect } from "react";

interface SubmittedQuote {
  id: string;
  car_id?: string;
  car_name: string;
  trim_name: string;
  trim_price: number;
  duration: number;
  mileage: number;
  deposit_rate: number;
  estimated_monthly?: number;
  status: string;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
  color_name?: string;
  options?: Array<{
    id: string;
    name: string;
    price: number;
  }>;
}

interface ChatRoom {
  id: string;
  quoteId: string;
  customerId: string;
  customerName: string;
  agentId: string;
  agentName: string;
  lastMessage?: string;
  lastMessageAt?: string;
}

interface PurchasedLead {
  quoteId: string;
  purchasedAt: string;
}

type StatusFilter = "all" | "open" | "contacted" | "completed";
type DateFilter = "all" | "today" | "week" | "month";

export default function QuotesManagementPage() {
  const [quotes, setQuotes] = useState<SubmittedQuote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<SubmittedQuote[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedQuote, setExpandedQuote] = useState<string | null>(null);
  const [purchasedLeads, setPurchasedLeads] = useState<PurchasedLead[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);

  useEffect(() => {
    loadQuotes();
    loadPurchasedLeads();
    loadChatRooms();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [quotes, statusFilter, dateFilter, searchQuery]);

  function loadQuotes() {
    const data = localStorage.getItem("submitted_quotes");
    const loadedQuotes: SubmittedQuote[] = data ? JSON.parse(data) : [];
    setQuotes(loadedQuotes);
  }

  function loadPurchasedLeads() {
    const data = localStorage.getItem("purchasedLeads");
    if (data) {
      try {
        const parsed = JSON.parse(data);
        // Handle both array of strings and array of objects
        if (Array.isArray(parsed)) {
          if (typeof parsed[0] === "string") {
            setPurchasedLeads(parsed.map(quoteId => ({ quoteId, purchasedAt: "" })));
          } else {
            setPurchasedLeads(parsed);
          }
        }
      } catch (e) {
        setPurchasedLeads([]);
      }
    }
  }

  function loadChatRooms() {
    const data = localStorage.getItem("chat_rooms");
    const rooms: ChatRoom[] = data ? JSON.parse(data) : [];
    setChatRooms(rooms);
  }

  function applyFilters() {
    let filtered = [...quotes];

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(q => q.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(q => {
        const quoteDate = new Date(q.created_at);

        if (dateFilter === "today") {
          return quoteDate >= today;
        } else if (dateFilter === "week") {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return quoteDate >= weekAgo;
        } else if (dateFilter === "month") {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return quoteDate >= monthAgo;
        }
        return true;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q =>
        (q.customer_name?.toLowerCase().includes(query)) ||
        (q.car_name.toLowerCase().includes(query))
      );
    }

    // Sort by created_at descending
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setFilteredQuotes(filtered);
  }

  function updateQuoteStatus(quoteId: string, newStatus: string) {
    const updatedQuotes = quotes.map(q =>
      q.id === quoteId ? { ...q, status: newStatus } : q
    );
    setQuotes(updatedQuotes);
    localStorage.setItem("submitted_quotes", JSON.stringify(updatedQuotes));
  }

  function deleteQuote(quoteId: string) {
    if (!confirm("이 견적을 삭제하시겠습니까?\n관련 채팅방과 메시지도 함께 삭제됩니다.")) {
      return;
    }

    // Remove quote
    const updatedQuotes = quotes.filter(q => q.id !== quoteId);
    setQuotes(updatedQuotes);
    localStorage.setItem("submitted_quotes", JSON.stringify(updatedQuotes));

    // Remove related chat rooms
    const relatedRooms = chatRooms.filter(room => room.quoteId === quoteId);
    const remainingRooms = chatRooms.filter(room => room.quoteId !== quoteId);
    setChatRooms(remainingRooms);
    localStorage.setItem("chat_rooms", JSON.stringify(remainingRooms));

    // Remove chat messages for those rooms
    relatedRooms.forEach(room => {
      localStorage.removeItem(`chat_messages_${room.id}`);
      // Clear last read keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`chat_last_read_${room.id}`)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    });

    // Remove from purchased leads
    const updatedLeads = purchasedLeads.filter(lead => lead.quoteId !== quoteId);
    setPurchasedLeads(updatedLeads);
    localStorage.setItem("purchasedLeads", JSON.stringify(updatedLeads));

    setExpandedQuote(null);
  }

  function getPartnerViewers(quoteId: string): number {
    return purchasedLeads.filter(lead => lead.quoteId === quoteId).length;
  }

  function getRelatedChats(quoteId: string): ChatRoom[] {
    return chatRooms.filter(room => room.quoteId === quoteId);
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  }

  function formatPhoneNumber(phone?: string) {
    if (!phone) return "-";
    const numbers = phone.replace(/[^\d]/g, "");
    if (numbers.length === 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    }
    return phone;
  }

  function getStatusBadgeClass(status: string) {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-700";
      case "contacted":
        return "bg-yellow-100 text-yellow-700";
      case "completed":
        return "bg-green-100 text-green-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "open":
        return "미열람";
      case "contacted":
        return "상담중";
      case "completed":
        return "완료";
      default:
        return status;
    }
  }

  const statusCounts = {
    all: quotes.length,
    open: quotes.filter(q => q.status === "open").length,
    contacted: quotes.filter(q => q.status === "contacted").length,
    completed: quotes.filter(q => q.status === "completed").length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">견적 관리</h1>
          <p className="text-slate-600 mt-1">총 {quotes.length}건의 견적 요청</p>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {/* Status Filter Tabs */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              전체 ({statusCounts.all})
            </button>
            <button
              onClick={() => setStatusFilter("open")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === "open"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              미열람 ({statusCounts.open})
            </button>
            <button
              onClick={() => setStatusFilter("contacted")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === "contacted"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              상담중 ({statusCounts.contacted})
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === "completed"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              완료 ({statusCounts.completed})
            </button>
          </div>

          <div className="flex gap-4 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="고객명 또는 차량명 검색"
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">전체 기간</option>
              <option value="today">오늘</option>
              <option value="week">이번 주</option>
              <option value="month">이번 달</option>
            </select>
          </div>
        </div>

        {/* Quotes Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {filteredQuotes.length === 0 ? (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">
                inbox
              </span>
              <p className="text-slate-500">
                {searchQuery || statusFilter !== "all" || dateFilter !== "all"
                  ? "조건에 맞는 견적이 없습니다"
                  : "등록된 견적이 없습니다"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-600 w-12">#</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-600">고객명</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-600">연락처</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-600">차량</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-600">트림</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-600">차량가격</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-600">계약조건</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-600">상태</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-600">요청일</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-slate-600">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotes.map((quote, index) => (
                    <>
                      <tr
                        key={quote.id}
                        onClick={() => setExpandedQuote(expandedQuote === quote.id ? null : quote.id)}
                        className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-slate-600">{index + 1}</td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">
                          {quote.customer_name || "-"}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-700">
                          {formatPhoneNumber(quote.customer_phone)}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">
                          {quote.car_name}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-700">
                          {quote.trim_name}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-slate-900">
                          {(quote.trim_price / 10000).toLocaleString()}만원
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-700">
                          {quote.duration}개월 / {(quote.mileage / 10000).toFixed(0)}만km / 선납{quote.deposit_rate}%
                        </td>
                        <td className="py-3 px-4">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              const newStatus = prompt(
                                "상태 변경 (open, contacted, completed):",
                                quote.status
                              );
                              if (newStatus && ["open", "contacted", "completed"].includes(newStatus)) {
                                updateQuoteStatus(quote.id, newStatus);
                              }
                            }}
                            className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${getStatusBadgeClass(quote.status)}`}
                          >
                            {getStatusLabel(quote.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {formatDate(quote.created_at)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <select
                              value={quote.status}
                              onChange={(e) => updateQuoteStatus(quote.id, e.target.value)}
                              className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="open">미열람</option>
                              <option value="contacted">상담중</option>
                              <option value="completed">완료</option>
                            </select>
                            <button
                              onClick={() => deleteQuote(quote.id)}
                              className="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Quote Detail */}
                      {expandedQuote === quote.id && (
                        <tr>
                          <td colSpan={10} className="bg-slate-50 border-b border-slate-200">
                            <div className="p-6 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Quote Info Card */}
                                <div className="bg-white rounded-lg border border-slate-200 p-4">
                                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">description</span>
                                    견적 상세 정보
                                  </h3>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">차량:</span>
                                      <span className="font-medium text-slate-900">{quote.car_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">트림:</span>
                                      <span className="font-medium text-slate-900">{quote.trim_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">차량가격:</span>
                                      <span className="font-semibold text-slate-900">
                                        {(quote.trim_price / 10000).toLocaleString()}만원
                                      </span>
                                    </div>
                                    {quote.color_name && (
                                      <div className="flex justify-between">
                                        <span className="text-slate-600">색상:</span>
                                        <span className="font-medium text-slate-900">{quote.color_name}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">계약기간:</span>
                                      <span className="font-medium text-slate-900">{quote.duration}개월</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">연간주행:</span>
                                      <span className="font-medium text-slate-900">
                                        {(quote.mileage / 10000).toFixed(0)}만km
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">선납금:</span>
                                      <span className="font-medium text-slate-900">{quote.deposit_rate}%</span>
                                    </div>
                                    {quote.estimated_monthly && (
                                      <div className="flex justify-between pt-2 border-t border-slate-200">
                                        <span className="text-slate-600">예상 월 납입금:</span>
                                        <span className="font-bold text-blue-600">
                                          {quote.estimated_monthly.toLocaleString()}원/월
                                        </span>
                                      </div>
                                    )}
                                    {quote.options && quote.options.length > 0 && (
                                      <div className="pt-2 border-t border-slate-200">
                                        <span className="text-slate-600 block mb-1">옵션:</span>
                                        <div className="space-y-1 pl-2">
                                          {quote.options.map(option => (
                                            <div key={option.id} className="flex justify-between text-xs">
                                              <span className="text-slate-700">{option.name}</span>
                                              <span className="text-slate-900">
                                                +{(option.price / 10000).toLocaleString()}만원
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Customer Info Card */}
                                <div className="bg-white rounded-lg border border-slate-200 p-4">
                                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">person</span>
                                    고객 정보
                                  </h3>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">이름:</span>
                                      <span className="font-medium text-slate-900">
                                        {quote.customer_name || "-"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">연락처:</span>
                                      <span className="font-medium text-slate-900">
                                        {formatPhoneNumber(quote.customer_phone)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-600">요청일시:</span>
                                      <span className="font-medium text-slate-900">
                                        {formatDate(quote.created_at)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Partner Views */}
                              <div className="bg-white rounded-lg border border-slate-200 p-4">
                                <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-lg">visibility</span>
                                  파트너 열람 현황
                                </h3>
                                <p className="text-sm text-slate-600">
                                  {getPartnerViewers(quote.id)}명의 파트너가 이 견적을 열람했습니다.
                                </p>
                              </div>

                              {/* Related Chats */}
                              {getRelatedChats(quote.id).length > 0 && (
                                <div className="bg-white rounded-lg border border-slate-200 p-4">
                                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">chat</span>
                                    연결된 채팅방 ({getRelatedChats(quote.id).length})
                                  </h3>
                                  <div className="space-y-2">
                                    {getRelatedChats(quote.id).map(room => (
                                      <div
                                        key={room.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                                      >
                                        <div className="flex-1">
                                          <p className="text-sm font-medium text-slate-900">
                                            {room.customerName} ↔ {room.agentName}
                                          </p>
                                          {room.lastMessage && (
                                            <p className="text-xs text-slate-600 mt-1 truncate">
                                              {room.lastMessage}
                                            </p>
                                          )}
                                        </div>
                                        {room.lastMessageAt && (
                                          <span className="text-xs text-slate-500 ml-4">
                                            {formatDate(room.lastMessageAt)}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
