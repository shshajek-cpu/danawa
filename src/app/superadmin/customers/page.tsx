"use client";

import { useState, useMemo } from "react";

interface QuoteOption {
  id: string;
  name: string;
  price: number;
}

interface Quote {
  id: string;
  car_id: string;
  car_name: string;
  trim_name: string;
  trim_price: number;
  duration: number;
  mileage: number;
  deposit_rate: number;
  estimated_monthly: number;
  status: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  color_name?: string;
  options?: QuoteOption[];
}

interface ChatRoom {
  id: string;
  quoteId: string;
  customerId: string;
  customerName: string;
  agentId?: string;
  agentName?: string;
  agentCompany?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  isConfirmed: boolean;
}

interface CustomerData {
  name: string;
  phone: string;
  quoteCount: number;
  lastQuoteDate: string;
  quotes: Quote[];
}

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "count" | "name">("recent");
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  // Load data from localStorage
  const quotes = useMemo(() => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem("submitted_quotes");
    return data ? JSON.parse(data) : [];
  }, []);

  const chatRooms = useMemo(() => {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem("chat_rooms");
    return data ? JSON.parse(data) : [];
  }, []);

  // Aggregate customers from quotes
  const customers = useMemo(() => {
    const customerMap = new Map<string, CustomerData>();

    quotes.forEach((quote: Quote) => {
      const phone = quote.customer_phone || "알 수 없음";
      const existing = customerMap.get(phone);

      if (existing) {
        existing.quotes.push(quote);
        existing.quoteCount++;
        if (new Date(quote.created_at) > new Date(existing.lastQuoteDate)) {
          existing.lastQuoteDate = quote.created_at;
        }
      } else {
        customerMap.set(phone, {
          name: quote.customer_name || "이름 없음",
          phone,
          quoteCount: 1,
          lastQuoteDate: quote.created_at,
          quotes: [quote],
        });
      }
    });

    return Array.from(customerMap.values());
  }, [quotes]);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const newThisMonth = customers.filter((customer) => {
      const firstQuoteDate = new Date(customer.quotes[0]?.created_at);
      return (
        firstQuoteDate.getMonth() === thisMonth &&
        firstQuoteDate.getFullYear() === thisYear
      );
    }).length;

    return {
      totalCustomers: customers.length,
      newThisMonth,
      totalQuotes: quotes.length,
    };
  }, [customers, quotes.length]);

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let filtered = customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery.replace(/-/g, ""))
    );

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "recent") {
        return new Date(b.lastQuoteDate).getTime() - new Date(a.lastQuoteDate).getTime();
      } else if (sortBy === "count") {
        return b.quoteCount - a.quoteCount;
      } else {
        return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [customers, searchQuery, sortBy]);

  // Format helpers
  const formatPhone = (phone: string) => {
    if (!phone || phone === "알 수 없음") return phone;
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
      date.getDate()
    ).padStart(2, "0")}`;
  };

  const formatPrice = (price: number) => {
    return `${(price / 10000).toLocaleString()}만원`;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "대기중":
        return "bg-yellow-100 text-yellow-800";
      case "확인중":
        return "bg-blue-100 text-blue-800";
      case "상담완료":
        return "bg-green-100 text-green-800";
      case "계약완료":
        return "bg-purple-100 text-purple-800";
      case "취소":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getChatRoomsForQuote = (quoteId: string) => {
    return chatRooms.filter((room: ChatRoom) => room.quoteId === quoteId);
  };

  const handleStatusChange = (quoteId: string, newStatus: string) => {
    const updatedQuotes = quotes.map((q: Quote) =>
      q.id === quoteId ? { ...q, status: newStatus } : q
    );
    localStorage.setItem("submitted_quotes", JSON.stringify(updatedQuotes));
    window.location.reload();
  };

  const handleDeleteQuote = (quoteId: string) => {
    if (!confirm("이 견적을 삭제하시겠습니까?")) return;

    const updatedQuotes = quotes.filter((q: Quote) => q.id !== quoteId);
    localStorage.setItem("submitted_quotes", JSON.stringify(updatedQuotes));

    // Also delete related chat rooms
    const updatedChatRooms = chatRooms.filter((room: ChatRoom) => room.quoteId !== quoteId);
    localStorage.setItem("chat_rooms", JSON.stringify(updatedChatRooms));

    window.location.reload();
  };

  const handleDeleteCustomerData = (phone: string) => {
    if (
      !confirm(
        "이 고객의 모든 견적과 채팅 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다."
      )
    )
      return;

    // Find all quote IDs for this customer
    const customerQuotes = quotes.filter((q: Quote) => q.customer_phone === phone);
    const quoteIds = customerQuotes.map((q: Quote) => q.id);

    // Delete quotes
    const updatedQuotes = quotes.filter((q: Quote) => q.customer_phone !== phone);
    localStorage.setItem("submitted_quotes", JSON.stringify(updatedQuotes));

    // Delete related chat rooms
    const updatedChatRooms = chatRooms.filter(
      (room: ChatRoom) => !quoteIds.includes(room.quoteId)
    );
    localStorage.setItem("chat_rooms", JSON.stringify(updatedChatRooms));

    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">고객 관리</h1>
        <p className="text-slate-600 mt-1">총 {stats.totalCustomers}명의 고객</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">총 고객</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {stats.totalCustomers}명
              </p>
            </div>
            <span className="material-symbols-outlined text-4xl text-slate-400">person</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">이번 달 신규</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.newThisMonth}명</p>
            </div>
            <span className="material-symbols-outlined text-4xl text-blue-400">
              person_add
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">총 견적 요청</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalQuotes}건</p>
            </div>
            <span className="material-symbols-outlined text-4xl text-slate-400">
              description
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="고객 이름 또는 전화번호 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "recent" | "count" | "name")}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="recent">최근 요청순</option>
              <option value="count">견적 많은순</option>
              <option value="name">이름순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="space-y-4">
        {filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 border border-slate-200 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-300">
              person_off
            </span>
            <p className="text-slate-600 mt-4">고객이 없습니다</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => (
            <div
              key={customer.phone}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              {/* Customer Header */}
              <div
                className="p-6 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() =>
                  setExpandedCustomer(
                    expandedCustomer === customer.phone ? null : customer.phone
                  )
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-slate-600">person</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {customer.name}
                      </h3>
                      <p className="text-sm text-slate-600">{formatPhone(customer.phone)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-slate-400">
                          description
                        </span>
                        <span className="font-semibold text-slate-900">
                          {customer.quoteCount}건
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        최근: {formatDate(customer.lastQuoteDate)}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">
                      {expandedCustomer === customer.phone
                        ? "expand_less"
                        : "expand_more"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expanded Customer Detail */}
              {expandedCustomer === customer.phone && (
                <div className="border-t border-slate-200 bg-slate-50 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-slate-900">견적 내역</h4>
                    <button
                      onClick={() => handleDeleteCustomerData(customer.phone)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      고객 데이터 삭제
                    </button>
                  </div>

                  <div className="space-y-4">
                    {customer.quotes
                      .sort(
                        (a, b) =>
                          new Date(b.created_at).getTime() -
                          new Date(a.created_at).getTime()
                      )
                      .map((quote) => {
                        const relatedChatRooms = getChatRoomsForQuote(quote.id);
                        return (
                          <div
                            key={quote.id}
                            className="bg-white rounded-lg p-4 border border-slate-200"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h5 className="font-semibold text-slate-900">
                                  {quote.car_name} {quote.trim_name}
                                </h5>
                                <p className="text-sm text-slate-600 mt-1">
                                  {formatDate(quote.created_at)}
                                </p>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                                  quote.status
                                )}`}
                              >
                                {quote.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <p className="text-xs text-slate-600">차량 가격</p>
                                <p className="text-sm font-semibold text-slate-900">
                                  {formatPrice(quote.trim_price)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-600">월 예상 리스료</p>
                                <p className="text-sm font-semibold text-blue-600">
                                  {formatPrice(quote.estimated_monthly)}/월
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-600">계약 조건</p>
                                <p className="text-sm text-slate-900">
                                  {quote.duration}개월 / {quote.mileage}만km
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-600">선납금</p>
                                <p className="text-sm text-slate-900">{quote.deposit_rate}%</p>
                              </div>
                            </div>

                            {quote.color_name && (
                              <div className="mb-3">
                                <p className="text-xs text-slate-600">선택 색상</p>
                                <p className="text-sm text-slate-900">{quote.color_name}</p>
                              </div>
                            )}

                            {quote.options && quote.options.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs text-slate-600 mb-1">선택 옵션</p>
                                <div className="flex flex-wrap gap-2">
                                  {quote.options.map((option) => (
                                    <span
                                      key={option.id}
                                      className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded"
                                    >
                                      {option.name} (+{formatPrice(option.price)})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {relatedChatRooms.length > 0 && (
                              <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-xs text-blue-900 font-semibold mb-2">
                                  연결된 채팅방
                                </p>
                                {relatedChatRooms.map((room: ChatRoom) => (
                                  <div
                                    key={room.id}
                                    className="text-xs text-blue-800 flex items-center gap-2"
                                  >
                                    <span className="material-symbols-outlined text-sm">
                                      chat
                                    </span>
                                    {room.agentName && room.agentCompany ? (
                                      <span>
                                        {room.agentCompany} - {room.agentName}
                                      </span>
                                    ) : (
                                      <span>상담사 배정 대기중</span>
                                    )}
                                    {room.isConfirmed && (
                                      <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded">
                                        확정
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex gap-2 pt-3 border-t border-slate-200">
                              <select
                                value={quote.status}
                                onChange={(e) =>
                                  handleStatusChange(quote.id, e.target.value)
                                }
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="대기중">대기중</option>
                                <option value="확인중">확인중</option>
                                <option value="상담완료">상담완료</option>
                                <option value="계약완료">계약완료</option>
                                <option value="취소">취소</option>
                              </select>
                              <button
                                onClick={() => handleDeleteQuote(quote.id)}
                                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  delete
                                </span>
                                삭제
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
