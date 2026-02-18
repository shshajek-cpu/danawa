"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, Agent } from "@/lib/supabase";

export default function ProfilePage() {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [stats, setStats] = useState({
    totalViews: 0,
    viewCount: 0,
  });
  const [points, setPoints] = useState(5000);
  const [pointHistory, setPointHistory] = useState<Array<{
    id: string;
    date: string;
    type: "charge" | "use" | "refund";
    amount: number;
    description: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
  const [chargeAmount, setChargeAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState("");
  const [showBankInfo, setShowBankInfo] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      // Check localStorage for mock agent first
      const mockAgentStr = localStorage.getItem("mockAgent");
      if (!mockAgentStr) {
        router.push("/partner/login");
        return;
      }

      const agentData = JSON.parse(mockAgentStr);
      setAgent(agentData);
      setEditName(agentData.name);
      setEditCompany(agentData.company);
      setPoints(agentData.points || 5000);

      // Load point history from localStorage
      const historyKey = `point_history_${agentData.id}`;
      const savedHistory = localStorage.getItem(historyKey);
      if (savedHistory) {
        setPointHistory(JSON.parse(savedHistory));
      } else {
        // Default history
        const defaultHistory = [
          {
            id: "1",
            date: new Date().toISOString(),
            type: "use" as const,
            amount: -500,
            description: "포터2 견적 열람",
          },
          {
            id: "2",
            date: new Date(Date.now() - 86400000).toISOString(),
            type: "use" as const,
            amount: -500,
            description: "아반떼 견적 열람",
          },
          {
            id: "3",
            date: new Date(Date.now() - 86400000 * 2).toISOString(),
            type: "charge" as const,
            amount: 10000,
            description: "포인트 충전",
          },
          {
            id: "4",
            date: new Date(Date.now() - 86400000 * 7).toISOString(),
            type: "charge" as const,
            amount: 5000,
            description: "가입 축하 보너스",
          },
        ];
        setPointHistory(defaultHistory);
        localStorage.setItem(historyKey, JSON.stringify(defaultHistory));
      }

      setStats({
        totalViews: 15,
        viewCount: 15,
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      router.push("/partner/login");
    } finally {
      setLoading(false);
    }
  }

  function handleChargePoints() {
    setChargeAmount(0);
    setCustomAmount("");
    setShowBankInfo(false);
    setIsChargeModalOpen(true);
  }

  function selectAmount(amount: number) {
    setChargeAmount(amount);
    setCustomAmount("");
    setShowBankInfo(true);
  }

  function handleCustomAmountChange(value: string) {
    const numValue = parseInt(value.replace(/[^0-9]/g, ""));
    if (!isNaN(numValue) && numValue > 0) {
      setChargeAmount(numValue);
      setCustomAmount(value);
      setShowBankInfo(true);
    } else {
      setChargeAmount(0);
      setCustomAmount("");
      setShowBankInfo(false);
    }
  }

  async function handleConfirmCharge() {
    if (!agent || chargeAmount <= 0) return;

    try {
      // Update points in localStorage
      const updatedAgent = {
        ...agent,
        points: (agent.points || 0) + chargeAmount,
      };
      localStorage.setItem("mockAgent", JSON.stringify(updatedAgent));
      setAgent(updatedAgent);
      setPoints(updatedAgent.points);

      // Add to point history
      const newHistory = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type: "charge" as const,
        amount: chargeAmount,
        description: "포인트 충전",
      };
      const updatedHistory = [newHistory, ...pointHistory];
      setPointHistory(updatedHistory);

      // Save history to localStorage
      const historyKey = `point_history_${agent.id}`;
      localStorage.setItem(historyKey, JSON.stringify(updatedHistory));

      // Close modal and show success
      setIsChargeModalOpen(false);
      alert(`${chargeAmount.toLocaleString()}P가 충전되었습니다.`);
    } catch (error) {
      console.error("Error charging points:", error);
      alert("포인트 충전 중 오류가 발생했습니다.");
    }
  }

  function copyAccountNumber() {
    navigator.clipboard.writeText("123-456-789012");
    alert("계좌번호가 복사되었습니다.");
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}.${month}.${day}`;
  };

  const getPointTypeLabel = (type: "charge" | "use" | "refund") => {
    switch (type) {
      case "charge":
        return "충전";
      case "use":
        return "사용";
      case "refund":
        return "환불";
      default:
        return type;
    }
  };

  const getPointTypeColor = (type: "charge" | "use" | "refund") => {
    switch (type) {
      case "charge":
        return "text-green-600";
      case "use":
        return "text-red-600";
      case "refund":
        return "text-blue-600";
      default:
        return "text-slate-600";
    }
  };

  async function handleSaveProfile() {
    if (!agent || !editName || !editCompany) return;

    try {
      // Update in localStorage
      const updatedAgent = {
        ...agent,
        name: editName,
        company: editCompany,
      };
      localStorage.setItem("mockAgent", JSON.stringify(updatedAgent));
      setAgent(updatedAgent);

      alert("프로필이 수정되었습니다.");
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("프로필 수정 중 오류가 발생했습니다.");
    }
  }

  async function handleLogout() {
    if (!confirm("로그아웃 하시겠습니까?")) return;

    try {
      localStorage.removeItem("mockAgent");
      router.push("/partner/login");
    } catch (error) {
      console.error("Error logging out:", error);
      alert("로그아웃 중 오류가 발생했습니다.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">error</span>
          <p className="text-slate-500">프로필을 불러올 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Responsive Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4">
        <h1 className="text-xl font-bold text-slate-900">프로필 관리</h1>
      </div>
      <div className="hidden md:block bg-white border-b border-slate-200 px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-900">프로필 관리</h1>
        <p className="text-slate-600 mt-1">내 정보와 포인트를 관리하세요</p>
      </div>

      <main className="p-4 md:p-8">
        {/* Desktop: 2-column grid, Mobile: single column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Left Column: Profile Card + Action Buttons */}
          <div className="space-y-4 md:space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-3xl">person</span>
                </div>
                <div className="flex-1">
                  <p className="text-lg font-bold text-slate-900">{agent.name}</p>
                  <p className="text-sm text-slate-500">{agent.company}</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">휴대폰 번호</span>
                  <span className="font-semibold text-slate-900">{agent.phone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">가입일</span>
                  <span className="font-semibold text-slate-900">
                    {new Date(agent.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full py-4 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">edit</span>
                정보 수정
              </button>
              <button
                onClick={handleLogout}
                className="w-full py-4 rounded-xl bg-slate-100 text-slate-700 font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">logout</span>
                로그아웃
              </button>
            </div>
          </div>

          {/* Right Column: Points + Statistics + History */}
          <div className="space-y-4 md:space-y-6">
            {/* Points Display */}
            <div className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-5 shadow-lg shadow-primary/20">
              <p className="text-white/80 text-xs font-semibold mb-1">보유 포인트</p>
              <p className="text-white text-4xl font-bold mb-3">{points.toLocaleString()}P</p>
              <button
                onClick={handleChargePoints}
                className="w-full py-2.5 bg-white text-primary rounded-xl font-bold text-sm active:scale-95 transition-transform"
              >
                포인트 충전
              </button>
            </div>

            {/* Statistics Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-1">
                <span className="material-symbols-outlined text-lg text-primary">
                  insights
                </span>
                활동 통계
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500 mb-1">총 열람</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.totalViews}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-500 mb-1">열람 건수</p>
                  <p className="text-2xl font-bold text-primary">{stats.viewCount}</p>
                </div>
              </div>
            </div>

            {/* Point History Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-1">
                <span className="material-symbols-outlined text-lg text-primary">
                  history
                </span>
                포인트 사용 이력
              </h3>
              <div className="space-y-3">
                {pointHistory.map((history) => (
                  <div
                    key={history.id}
                    className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 mb-1">
                        {history.description}
                      </p>
                      <p className="text-xs text-slate-500">{formatDate(history.date)}</p>
                    </div>
                    <div className="text-right ml-4">
                      <span
                        className={`inline-block px-2 py-1 bg-slate-50 rounded text-xs font-semibold mb-1 ${getPointTypeColor(
                          history.type
                        )}`}
                      >
                        {getPointTypeLabel(history.type)}
                      </span>
                      <p
                        className={`text-base font-bold ${
                          history.amount > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {history.amount > 0 ? "+" : ""}
                        {history.amount.toLocaleString()}P
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsEditModalOpen(false)}
          />
          <div className="bg-white w-full max-w-[430px] md:max-w-lg mx-auto rounded-t-[32px] md:rounded-2xl p-6 pb-10 md:pb-6 z-10 animate-[slideUp_0.3s_ease-out]">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
            <h3 className="text-xl font-bold text-slate-900 mb-6">프로필 수정</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  이름
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="이름을 입력하세요"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  소속 회사
                </label>
                <input
                  type="text"
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  placeholder="회사명을 입력하세요"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold active:scale-95 transition-transform"
              >
                취소
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={!editName || !editCompany}
                className={`flex-1 py-3 rounded-xl font-bold active:scale-95 transition-transform ${
                  !editName || !editCompany
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-primary text-white shadow-lg shadow-primary/20"
                }`}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charge Points Modal */}
      {isChargeModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsChargeModalOpen(false)}
          />
          <div className="bg-white w-full max-w-[430px] md:max-w-lg mx-auto rounded-t-[32px] md:rounded-2xl p-6 pb-10 md:pb-6 z-10 animate-[slideUp_0.3s_ease-out]">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
            <h3 className="text-xl font-bold text-slate-900 mb-6">포인트 충전</h3>

            {/* Amount Selection */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-slate-700 mb-2 block">
                충전 금액 선택
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[5000, 10000, 30000, 50000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => selectAmount(amount)}
                    className={`py-3 rounded-xl font-bold transition-all ${
                      chargeAmount === amount && !customAmount
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {amount.toLocaleString()}P
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                placeholder="직접 입력 (예: 100000)"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            {/* Bank Transfer Info */}
            {showBankInfo && (
              <div className="bg-slate-100 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-primary">account_balance</span>
                  <p className="font-bold text-slate-900">계좌 이체 정보</p>
                </div>
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">은행</span>
                    <span className="font-semibold text-slate-900">국민은행</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">계좌번호</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">123-456-789012</span>
                      <button
                        onClick={copyAccountNumber}
                        className="p-1 hover:bg-slate-200 rounded active:scale-95 transition-transform"
                      >
                        <span className="material-symbols-outlined text-sm text-primary">content_copy</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">예금주</span>
                    <span className="font-semibold text-slate-900">(주)렌트제로</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-200">
                    <span className="text-slate-600">입금 금액</span>
                    <span className="font-bold text-primary">{chargeAmount.toLocaleString()}원</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  아래 계좌로 입금 후 확인 버튼을 눌러주세요. 입금 확인까지 최대 10분 소요됩니다.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setIsChargeModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold active:scale-95 transition-transform"
              >
                취소
              </button>
              <button
                onClick={handleConfirmCharge}
                disabled={chargeAmount <= 0}
                className={`flex-1 py-3 rounded-xl font-bold active:scale-95 transition-transform ${
                  chargeAmount <= 0
                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                    : "bg-primary text-white shadow-lg shadow-primary/20"
                }`}
              >
                입금 확인 요청
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
