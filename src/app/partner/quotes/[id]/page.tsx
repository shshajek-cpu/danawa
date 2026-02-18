"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import carDetails from "@/constants/generated-car-details.json";

interface PageProps {
  params: Promise<{ id: string }>;
}

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

interface LeadPurchase {
  id: string;
  quote_id: string;
  agent_id: string;
  purchased_at: string;
}

interface PointTransaction {
  id: string;
  agent_id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

export default function QuoteDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isPurchased, setIsPurchased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    loadQuoteData();
  }, [id]);

  async function loadQuoteData() {
    try {
      // Load purchased status (handle both old and new format)
      const purchasedLeadsRaw = localStorage.getItem("purchasedLeads") || "[]";
      const purchasedLeads = JSON.parse(purchasedLeadsRaw);
      const isPurchasedValue = purchasedLeads.some((item: any) =>
        typeof item === "string" ? item === id : item.quoteId === id
      );
      setIsPurchased(isPurchasedValue);

      // Load agent points
      const mockAgent = localStorage.getItem("mockAgent");
      if (mockAgent) {
        const agentData = JSON.parse(mockAgent);
        setPoints(agentData.points ?? 5000);
      }

      // Load quote from localStorage
      const submittedQuotes = JSON.parse(localStorage.getItem("submitted_quotes") || "[]");
      const found = submittedQuotes.find((q: Quote) => q.id === id);

      if (found) {
        setQuote({
          ...found,
          options: found.options || [],
        });
      } else {
        setQuote(null);
      }

      // TODO: Add Supabase integration
    } catch (error) {
      console.error("Error loading quote:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchaseLead() {
    if (!quote || purchasing) return;

    const LEAD_PRICE = 500;

    if (points < LEAD_PRICE) {
      alert("포인트가 부족합니다.");
      return;
    }

    if (!confirm(`${LEAD_PRICE}P를 사용하여 고객 정보를 열람하시겠습니까?`)) {
      return;
    }

    setPurchasing(true);
    try {
      // Mock mode: update localStorage with new format (includes timestamp)
      const purchasedLeadsRaw = localStorage.getItem("purchasedLeads") || "[]";
      const purchasedLeads = JSON.parse(purchasedLeadsRaw);

      // Support both old format (string array) and new format (object array)
      const newPurchase = {
        quoteId: id,
        purchasedAt: new Date().toISOString(),
      };

      // Check if already purchased (handle both formats)
      const alreadyPurchased = purchasedLeads.some((item: any) =>
        typeof item === "string" ? item === id : item.quoteId === id
      );

      if (!alreadyPurchased) {
        purchasedLeads.push(newPurchase);
        localStorage.setItem("purchasedLeads", JSON.stringify(purchasedLeads));
      }

      // Update agent points
      const mockAgent = localStorage.getItem("mockAgent");
      if (mockAgent) {
        const agentData = JSON.parse(mockAgent);
        agentData.points = (agentData.points ?? 10000) - LEAD_PRICE;
        localStorage.setItem("mockAgent", JSON.stringify(agentData));
        setPoints(agentData.points);
      }

      setIsPurchased(true);
      alert("고객 정보가 열람되었습니다.");

      // TODO: Add Supabase integration
      // Insert lead_purchase
      // await supabase.from("lead_purchases").insert({
      //   quote_id: id,
      //   agent_id: currentAgentId,
      // });
      //
      // Update agent points
      // await supabase
      //   .from("agents")
      //   .update({ points: currentPoints - LEAD_PRICE })
      //   .eq("id", currentAgentId);
      //
      // Insert point transaction
      // await supabase.from("point_transactions").insert({
      //   agent_id: currentAgentId,
      //   amount: -LEAD_PRICE,
      //   type: "purchase",
      //   description: `견적 ${id} 고객 정보 열람`,
      // });

    } catch (error) {
      console.error("Error purchasing lead:", error);
      alert("고객 정보 열람 중 오류가 발생했습니다.");
    } finally {
      setPurchasing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">error</span>
          <p className="text-slate-500">견적을 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  const carImage = quote.car_id ? `/cars/${quote.car_id}.png` : "/placeholder-car.png";

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1">
          <span className="material-symbols-outlined text-2xl text-slate-700">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold text-slate-900">견적 상세</h1>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex bg-white border-b border-slate-200 px-8 py-6 items-center gap-4">
        <button onClick={() => router.back()} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-2xl text-slate-700">arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">견적 상세</h1>
          <p className="text-slate-600 mt-1">고객 견적 상세 정보를 확인하세요</p>
        </div>
      </div>

      <main className="p-4 md:p-8 pb-32 md:pb-8">
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Car Info, Color/Options, Contract Terms */}
          <div className="md:col-span-2 space-y-4 md:space-y-6">
            {/* Car Info Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex gap-4 items-center mb-4">
              <div className="w-24 h-16 flex-shrink-0 flex items-center justify-center bg-slate-50 rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={carImage}
                  alt={quote.car_name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-1">{quote.car_name}</p>
                <p className="text-base font-bold text-slate-900">{quote.trim_name}</p>
              </div>
            </div>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-sm text-slate-600">
                  차량 가격: <span className="font-bold text-slate-900">{(quote.trim_price / 10000).toLocaleString()}만원</span>
                </p>
              </div>
            </div>

            {/* Color & Options Card */}
            {(quote.color_name || quote.options.length > 0) && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg text-blue-600">palette</span>
                  색상 / 옵션
                </h3>
                <div className="space-y-2 text-sm">
                  {quote.color_name && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">외장 색상</span>
                      <span className="font-semibold text-slate-900">{quote.color_name}</span>
                    </div>
                  )}
                  {quote.options.length > 0 && (
                    <>
                      <div className="pt-2 border-t border-slate-100 mt-2">
                        <p className="text-slate-500 mb-2">선택 옵션</p>
                        <div className="space-y-1.5">
                          {quote.options.map((opt) => (
                            <div key={opt.id} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded-lg">
                              <span className="text-slate-700">{opt.name}</span>
                              <span className="font-semibold text-slate-900">+{(opt.price / 10000).toLocaleString()}만원</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-100">
                        <span className="text-slate-700 font-semibold">총 차량 가격</span>
                        <span className="font-bold text-blue-600">{(quote.total_price / 10000).toLocaleString()}만원</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Contract Terms Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1">
                <span className="material-symbols-outlined text-lg text-blue-600">description</span>
                계약 조건
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">계약 기간</span>
                  <span className="font-semibold text-slate-900">{quote.duration}개월</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">연간 주행거리</span>
                  <span className="font-semibold text-slate-900">{quote.mileage.toLocaleString()}km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">선납금 비율</span>
                  <span className="font-semibold text-slate-900">{quote.deposit_rate}%</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-700 font-semibold">고객 예상 월 렌트료</span>
                  <span className="font-bold text-blue-600 text-base">
                    {quote.estimated_monthly ? `${(quote.estimated_monthly / 10000).toLocaleString()}만원` : "미정"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Customer Info */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1">
                <span className="material-symbols-outlined text-lg text-blue-600">
                  {isPurchased ? "person" : "lock"}
                </span>
                고객 정보
              </h3>
              {isPurchased ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">고객명</span>
                    <span className="font-semibold text-slate-900">{quote.customer_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">연락처</span>
                    <span className="font-semibold text-slate-900">{quote.customer_phone}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-100 md:hidden">
                    <a
                      href={`tel:${quote.customer_phone}`}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">call</span>
                      전화 걸기
                    </a>
                  </div>

                  {/* Desktop Actions */}
                  <div className="hidden md:block pt-3 border-t border-slate-100 space-y-3">
                    <a
                      href={`tel:${quote.customer_phone}`}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">call</span>
                      전화 걸기
                    </a>
                    <button
                      onClick={() => router.push(`/partner/chat/${quote.id}`)}
                      className="w-full flex items-center justify-center gap-1 py-3 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">chat</span>
                      채팅 상담
                    </button>
                    <button
                      onClick={() => router.push("/partner")}
                      className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors"
                    >
                      목록으로
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-3xl text-slate-500">lock</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">500P를 사용하여 고객 정보를 열람하세요</p>
                  <button
                    onClick={handlePurchaseLead}
                    disabled={purchasing || points < 500}
                    className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                      purchasing || points < 500
                        ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {purchasing ? "처리 중..." : points < 500 ? "포인트 부족" : "500P로 열람하기"}
                  </button>

                  {/* Desktop Points Display */}
                  <div className="hidden md:block pt-4 mt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">현재 보유 포인트</span>
                      <span className="font-bold text-blue-600">{points.toLocaleString()}P</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Fixed Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-5 shadow-lg">
        {isPurchased ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <a
                href={`tel:${quote.customer_phone}`}
                className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl bg-green-600 text-white font-bold text-sm active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-lg">call</span>
                전화하기
              </a>
              <button
                onClick={() => router.push(`/partner/chat/${quote.id}`)}
                className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl bg-blue-500 text-white font-bold text-sm active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-lg">chat</span>
                채팅 상담
              </button>
            </div>
            <button
              onClick={() => router.push("/partner")}
              className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm active:scale-95 transition-transform"
            >
              목록으로
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">현재 보유 포인트</span>
              <span className="font-bold text-blue-600">{points.toLocaleString()}P</span>
            </div>
            <button
              onClick={handlePurchaseLead}
              disabled={purchasing || points < 500}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
                purchasing || points < 500
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
              }`}
            >
              {purchasing ? "처리 중..." : points < 500 ? "포인트가 부족합니다" : "500P로 고객 정보 열람"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
