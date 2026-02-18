"use client";

import { useState, useEffect } from "react";

interface Partner {
  id: string;
  phone: string;
  name: string;
  company: string;
  userType: "individual" | "business";
  document?: string;
  points: number;
  isActive: boolean;
  createdAt: string;
  viewCount: number;
}

interface PointHistoryEntry {
  id: string;
  type: "charge" | "use" | "refund" | "bonus";
  amount: number;
  balance: number;
  description: string;
  createdAt: string;
}

interface PurchasedLead {
  quoteId: string;
  purchasedAt: string;
}

interface ChatRoom {
  id: string;
  quoteId: string;
  agentId: string;
  agentName: string;
  agentCompany: string;
  lastMessage: string;
  lastMessageAt: string;
}

type StatusFilter = "all" | "active" | "inactive";
type TypeFilter = "all" | "business" | "individual";

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPointModal, setShowPointModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  const [newPartner, setNewPartner] = useState({
    name: "",
    company: "",
    phone: "",
    userType: "individual" as "individual" | "business",
  });

  const [pointAdjustment, setPointAdjustment] = useState({
    amount: "",
    reason: "charge" as "charge" | "use" | "refund" | "bonus",
    description: "",
  });

  useEffect(() => {
    loadPartners();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [partners, statusFilter, typeFilter, searchQuery]);

  function loadPartners() {
    const mockAgent = localStorage.getItem("mockAgent");
    const allPartners: Partner[] = JSON.parse(localStorage.getItem("all_partners") || "[]");
    const purchasedLeads: PurchasedLead[] = JSON.parse(localStorage.getItem("purchasedLeads") || "[]");
    const chatRooms: ChatRoom[] = JSON.parse(localStorage.getItem("chat_rooms") || "[]");

    const partnersList: Partner[] = [];

    // Add the mock agent if exists
    if (mockAgent) {
      const agent = JSON.parse(mockAgent);
      const agentId = agent.id || "mock-agent-id";
      const viewCount = chatRooms.filter((room: ChatRoom) => room.agentId === agentId).length;

      partnersList.push({
        id: agentId,
        phone: agent.phone || "",
        name: agent.name || "",
        company: agent.company || "",
        userType: agent.userType || "individual",
        document: agent.document,
        points: agent.points || 5000,
        isActive: agent.isActive !== false,
        createdAt: agent.createdAt || new Date().toISOString(),
        viewCount: viewCount,
      });
    }

    // Add other partners
    partnersList.push(...allPartners);

    // Add demo partners if no real data exists
    if (partnersList.length === 0) {
      const demoPartners: Partner[] = [
        {
          id: "partner-1",
          phone: "01011112222",
          name: "김영업",
          company: "서울렌트카",
          userType: "business",
          points: 3500,
          isActive: true,
          createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
          viewCount: 12,
        },
        {
          id: "partner-2",
          phone: "01033334444",
          name: "이딜러",
          company: "강남오토",
          userType: "individual",
          points: 1500,
          isActive: true,
          createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
          viewCount: 5,
        },
        {
          id: "partner-3",
          phone: "01055556666",
          name: "박중개",
          company: "부산카센터",
          userType: "business",
          points: 0,
          isActive: false,
          createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
          viewCount: 3,
        },
      ];
      partnersList.push(...demoPartners);
    }

    setPartners(partnersList);
  }

  function applyFilters() {
    let filtered = [...partners];

    // Status filter
    if (statusFilter === "active") {
      filtered = filtered.filter(p => p.isActive);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter(p => !p.isActive);
    }

    // Type filter
    if (typeFilter === "business") {
      filtered = filtered.filter(p => p.userType === "business");
    } else if (typeFilter === "individual") {
      filtered = filtered.filter(p => p.userType === "individual");
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.company.toLowerCase().includes(query) ||
        p.phone.includes(query)
      );
    }

    setFilteredPartners(filtered);
  }

  function handleAddPartner() {
    if (!newPartner.name || !newPartner.phone) {
      alert("이름과 연락처를 입력하세요");
      return;
    }

    const partner: Partner = {
      id: `partner-${Date.now()}`,
      name: newPartner.name,
      company: newPartner.company,
      phone: newPartner.phone,
      userType: newPartner.userType,
      points: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      viewCount: 0,
    };

    const allPartners = JSON.parse(localStorage.getItem("all_partners") || "[]");
    allPartners.push(partner);
    localStorage.setItem("all_partners", JSON.stringify(allPartners));

    loadPartners();
    setShowAddModal(false);
    setNewPartner({ name: "", company: "", phone: "", userType: "individual" });
  }

  function handleToggleStatus(partner: Partner) {
    if (!confirm(`${partner.name}님을 ${partner.isActive ? "비활성화" : "활성화"}하시겠습니까?`)) {
      return;
    }

    if (partner.id === "mock-agent-id") {
      const mockAgent = JSON.parse(localStorage.getItem("mockAgent") || "{}");
      mockAgent.isActive = !partner.isActive;
      localStorage.setItem("mockAgent", JSON.stringify(mockAgent));
    } else {
      const allPartners = JSON.parse(localStorage.getItem("all_partners") || "[]");
      const updated = allPartners.map((p: Partner) =>
        p.id === partner.id ? { ...p, isActive: !p.isActive } : p
      );
      localStorage.setItem("all_partners", JSON.stringify(updated));
    }

    loadPartners();
  }

  function handleOpenPointModal(partner: Partner) {
    setSelectedPartner(partner);
    setPointAdjustment({ amount: "", reason: "charge", description: "" });
    setShowPointModal(true);
  }

  function handleAdjustPoints() {
    if (!selectedPartner) return;

    const amount = parseInt(pointAdjustment.amount);
    if (isNaN(amount) || amount === 0) {
      alert("올바른 포인트를 입력하세요");
      return;
    }

    const actualAmount = pointAdjustment.reason === "use" ? -Math.abs(amount) : Math.abs(amount);
    const newBalance = Math.max(0, selectedPartner.points + actualAmount);

    // Update partner points
    if (selectedPartner.id === "mock-agent-id") {
      const mockAgent = JSON.parse(localStorage.getItem("mockAgent") || "{}");
      mockAgent.points = newBalance;
      localStorage.setItem("mockAgent", JSON.stringify(mockAgent));
    } else {
      const allPartners = JSON.parse(localStorage.getItem("all_partners") || "[]");
      const updated = allPartners.map((p: Partner) =>
        p.id === selectedPartner.id ? { ...p, points: newBalance } : p
      );
      localStorage.setItem("all_partners", JSON.stringify(updated));
    }

    // Add to point history
    const historyKey = `point_history_${selectedPartner.id}`;
    const history: PointHistoryEntry[] = JSON.parse(localStorage.getItem(historyKey) || "[]");

    const entry: PointHistoryEntry = {
      id: `pt-${Date.now()}`,
      type: pointAdjustment.reason,
      amount: actualAmount,
      balance: newBalance,
      description: pointAdjustment.description || getDefaultDescription(pointAdjustment.reason),
      createdAt: new Date().toISOString(),
    };

    history.unshift(entry);
    localStorage.setItem(historyKey, JSON.stringify(history));

    loadPartners();
    setShowPointModal(false);
    setSelectedPartner(null);
  }

  function getDefaultDescription(reason: string): string {
    switch (reason) {
      case "charge": return "포인트 충전";
      case "bonus": return "보너스 지급";
      case "refund": return "환불";
      case "use": return "포인트 사용";
      default: return "기타";
    }
  }

  function handleViewDetails(partner: Partner) {
    setSelectedPartner(partner);
    setShowDetailModal(true);
  }

  function getPointHistory(partnerId: string): PointHistoryEntry[] {
    const historyKey = `point_history_${partnerId}`;
    return JSON.parse(localStorage.getItem(historyKey) || "[]");
  }

  function getPurchasedLeads(partnerId: string): PurchasedLead[] {
    const purchasedLeads: PurchasedLead[] = JSON.parse(localStorage.getItem("purchasedLeads") || "[]");
    // For demo, return all leads if it's mock-agent-id
    if (partnerId === "mock-agent-id") {
      return purchasedLeads;
    }
    return [];
  }

  function getChatRooms(partnerId: string): ChatRoom[] {
    const chatRooms: ChatRoom[] = JSON.parse(localStorage.getItem("chat_rooms") || "[]");
    return chatRooms.filter(room => room.agentId === partnerId);
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  }

  function formatPhoneNumber(phone: string) {
    const numbers = phone.replace(/[^\d]/g, "");
    if (numbers.length === 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    }
    return phone;
  }

  const stats = {
    totalPartners: partners.length,
    activePartners: partners.filter(p => p.isActive).length,
    totalPoints: partners.reduce((sum, p) => sum + p.points, 0),
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">파트너 관리</h1>
            <p className="text-slate-600 mt-1">렌트카 파트너를 관리하세요</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span className="material-symbols-outlined">add</span>
            <span className="font-medium">파트너 추가</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">총 파트너</p>
                <p className="text-3xl font-bold text-slate-900">{stats.totalPartners}</p>
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
                <p className="text-sm text-slate-600 mb-1">활성 파트너</p>
                <p className="text-3xl font-bold text-slate-900">{stats.activePartners}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-green-600 text-2xl">
                  check_circle
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">총 포인트 잔액</p>
                <p className="text-3xl font-bold text-slate-900">{stats.totalPoints.toLocaleString()}P</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600 text-2xl">
                  monetization_on
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">상태:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-700">유형:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체</option>
              <option value="business">사업자</option>
              <option value="individual">개인</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <input
                type="text"
                placeholder="이름, 회사명, 연락처로 검색"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-xl">
                search
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Partners Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredPartners.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">
              inbox
            </span>
            <p className="text-slate-500">조건에 맞는 파트너가 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">이름</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">회사명</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">연락처</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">유형</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">포인트</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">열람수</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">가입일</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">상태</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">액션</th>
                </tr>
              </thead>
              <tbody>
                {filteredPartners.map((partner) => (
                  <tr key={partner.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{partner.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{partner.company}</td>
                    <td className="py-3 px-4 text-sm text-slate-700">{formatPhoneNumber(partner.phone)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                        partner.userType === "business"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {partner.userType === "business" ? "사업자" : "개인"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-slate-900">
                      {partner.points.toLocaleString()}P
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">{partner.viewCount}건</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{formatDate(partner.createdAt)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                        partner.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {partner.isActive ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleStatus(partner)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            partner.isActive
                              ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                              : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                          }`}
                        >
                          {partner.isActive ? "비활성" : "활성"}
                        </button>
                        <button
                          onClick={() => handleOpenPointModal(partner)}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors border border-blue-200"
                        >
                          포인트
                        </button>
                        <button
                          onClick={() => handleViewDetails(partner)}
                          className="px-3 py-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors border border-slate-200"
                        >
                          상세
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Partner Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">파트너 추가</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">이름 *</label>
                <input
                  type="text"
                  value={newPartner.name}
                  onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="이름을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">회사명</label>
                <input
                  type="text"
                  value={newPartner.company}
                  onChange={(e) => setNewPartner({ ...newPartner, company: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="회사명을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">연락처 *</label>
                <input
                  type="tel"
                  value={newPartner.phone}
                  onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="010-0000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">유형</label>
                <select
                  value={newPartner.userType}
                  onChange={(e) => setNewPartner({ ...newPartner, userType: e.target.value as "individual" | "business" })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="individual">개인</option>
                  <option value="business">사업자</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAddPartner}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Point Adjustment Modal */}
      {showPointModal && selectedPartner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">포인트 조정</h2>
              <p className="text-sm text-slate-600 mt-1">
                {selectedPartner.name} - 현재 포인트: {selectedPartner.points.toLocaleString()}P
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">조정 유형</label>
                <select
                  value={pointAdjustment.reason}
                  onChange={(e) => setPointAdjustment({ ...pointAdjustment, reason: e.target.value as any })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="charge">충전</option>
                  <option value="bonus">보너스</option>
                  <option value="refund">환불</option>
                  <option value="use">차감</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">포인트</label>
                <input
                  type="number"
                  value={pointAdjustment.amount}
                  onChange={(e) => setPointAdjustment({ ...pointAdjustment, amount: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="포인트를 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">사유</label>
                <input
                  type="text"
                  value={pointAdjustment.description}
                  onChange={(e) => setPointAdjustment({ ...pointAdjustment, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="사유를 입력하세요 (선택)"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowPointModal(false)}
                className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleAdjustPoints}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                조정
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPartner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{selectedPartner.name}</h2>
                  <p className="text-sm text-slate-600">{selectedPartner.company}</p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-medium text-slate-900 mb-3">기본 정보</h3>
                <div className="bg-slate-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600">연락처</p>
                    <p className="text-sm font-medium text-slate-900">{formatPhoneNumber(selectedPartner.phone)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">유형</p>
                    <p className="text-sm font-medium text-slate-900">
                      {selectedPartner.userType === "business" ? "사업자" : "개인"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">포인트 잔액</p>
                    <p className="text-sm font-medium text-slate-900">{selectedPartner.points.toLocaleString()}P</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">열람 건수</p>
                    <p className="text-sm font-medium text-slate-900">{selectedPartner.viewCount}건</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">가입일</p>
                    <p className="text-sm font-medium text-slate-900">{formatDate(selectedPartner.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">상태</p>
                    <p className="text-sm font-medium text-slate-900">
                      {selectedPartner.isActive ? "활성" : "비활성"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Point History */}
              <div>
                <h3 className="text-sm font-medium text-slate-900 mb-3">포인트 내역</h3>
                <div className="space-y-2">
                  {getPointHistory(selectedPartner.id).length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">포인트 내역이 없습니다</p>
                  ) : (
                    getPointHistory(selectedPartner.id).slice(0, 10).map((entry) => (
                      <div key={entry.id} className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              entry.type === "charge" || entry.type === "bonus"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {entry.type === "charge" ? "충전" : entry.type === "bonus" ? "보너스" : entry.type === "refund" ? "환불" : "사용"}
                            </span>
                            <span className="text-xs text-slate-500">{formatDate(entry.createdAt)}</span>
                          </div>
                          <p className="text-sm text-slate-700">{entry.description}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${entry.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                            {entry.amount > 0 ? "+" : ""}{entry.amount.toLocaleString()}P
                          </p>
                          <p className="text-xs text-slate-500">잔액: {entry.balance.toLocaleString()}P</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Purchased Leads */}
              <div>
                <h3 className="text-sm font-medium text-slate-900 mb-3">열람한 견적</h3>
                <div className="space-y-2">
                  {getPurchasedLeads(selectedPartner.id).length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">열람한 견적이 없습니다</p>
                  ) : (
                    getPurchasedLeads(selectedPartner.id).slice(0, 5).map((lead, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-900">견적 ID: {lead.quoteId}</p>
                          <p className="text-xs text-slate-500">{formatDate(lead.purchasedAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Chat Rooms */}
              <div>
                <h3 className="text-sm font-medium text-slate-900 mb-3">채팅방</h3>
                <div className="space-y-2">
                  {getChatRooms(selectedPartner.id).length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">참여한 채팅방이 없습니다</p>
                  ) : (
                    getChatRooms(selectedPartner.id).map((room) => (
                      <div key={room.id} className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-slate-900">견적 ID: {room.quoteId}</p>
                          <p className="text-xs text-slate-500">{formatDate(room.lastMessageAt)}</p>
                        </div>
                        <p className="text-xs text-slate-600">{room.lastMessage}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
