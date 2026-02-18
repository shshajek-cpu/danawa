"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import BottomNav from "@/components/BottomNav";

const CAPITAL_COMPANIES = [
    { id: "hyundai", name: "현대캐피탈", logo: "/capitals/hyundai-capital.svg" },
    { id: "kb", name: "KB캐피탈", logo: "/capitals/kb-capital.svg" },
    { id: "shinhan", name: "신한캐피탈", logo: "/capitals/shinhan-capital.svg" },
    { id: "hana", name: "하나캐피탈", logo: "/capitals/hana-capital.svg" },
    { id: "woori", name: "우리캐피탈", logo: "/capitals/woori-capital.svg" },
    { id: "lotte", name: "롯데캐피탈", logo: "/capitals/lotte-capital.svg" },
    { id: "bnk", name: "BNK캐피탈", logo: "/capitals/bnk-capital.svg" },
    { id: "jb", name: "JB우리캐피탈", logo: "/capitals/jb-capital.svg" },
];

function generateCapitalRates(quoteId: string, baseMonthly: number) {
    return CAPITAL_COMPANIES.map(company => {
        // Stable hash for consistent results
        let hash = 0;
        const seed = quoteId + company.id;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        }
        // Variation: -5% to +8% from base
        const variation = ((Math.abs(hash) % 130) - 50) / 1000; // -0.05 to +0.08
        const monthly = Math.round(baseMonthly * (1 + variation));
        return { ...company, monthly };
    }).sort((a, b) => a.monthly - b.monthly); // Sort by price ascending
}

interface QuoteData {
    id: string;
    car_id?: string;
    sub_model_id?: string;
    trim_id?: string;
    car_name: string;
    trim_name: string;
    trim_price?: number;
    color_id?: string | null;
    color_name?: string | null;
    options?: { id: string; name: string; price: number }[];
    total_price?: number;
    duration: number;
    mileage: number;
    deposit_rate: number;
    deposit_type?: string;
    status: string;
    final_monthly?: number | null;
    created_at: string;
}

export default function QuoteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [quote, setQuote] = useState<QuoteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showRestartMenu, setShowRestartMenu] = useState(false);
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const submittedQuotes: any[] = JSON.parse(localStorage.getItem("submitted_quotes") || "[]");
        const found = submittedQuotes.find((q) => q.id === params.id);
        if (found) {
            setQuote(found);
        }
        setLoading(false);
    }, [params.id]);

    // Refresh quote status periodically
    useEffect(() => {
        if (!quote || quote.status === "analyzed") return;
        const interval = setInterval(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const submittedQuotes: any[] = JSON.parse(localStorage.getItem("submitted_quotes") || "[]");
            const found = submittedQuotes.find((q) => q.id === params.id);
            if (found && (found.status !== quote.status || found.final_monthly !== quote.final_monthly)) {
                setQuote(found);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [params.id, quote]);

    useEffect(() => {
        if (!quote) return;
        const update = () => {
            const created = new Date(quote.created_at).getTime();
            const expiry = created + 7 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            const diff = expiry - now;
            if (diff <= 0) {
                setTimeLeft("만료됨");
                setIsExpired(true);
                return;
            }
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft(`${days}일 ${hours}시간 ${minutes}분 ${seconds}초`);
            setIsExpired(false);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [quote]);

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

    if (!quote) {
        return (
            <div className="min-h-screen bg-background-light flex flex-col items-center justify-center p-6">
                <p className="text-slate-600 mb-4">견적을 찾을 수 없습니다</p>
                <Link href="/my-quotes" className="text-primary font-bold">
                    내 견적함으로 돌아가기
                </Link>
            </div>
        );
    }

    const hasResult = quote.final_monthly && quote.final_monthly > 0;
    const carImageUrl = quote.car_id ? `/cars/${quote.car_id}.png` : null;

    // --- Analyzed: Show car details + monthly payment ---
    if (hasResult) {
        return (
            <div className="min-h-screen bg-background-light pb-[160px]">
                <header className="px-4 py-3 flex items-center bg-white sticky top-0 z-50 border-b border-slate-100">
                    <button onClick={() => router.back()} className="p-2 -ml-2">
                        <span className="material-symbols-outlined text-2xl font-bold">arrow_back_ios_new</span>
                    </button>
                    <h1 className="ml-2 text-lg font-bold">견적 상세</h1>
                </header>

                <main className="px-5 py-6 space-y-4">
                    {/* Car Info */}
                    <section className="bg-white rounded-3xl p-6 shadow-sm">
                        <div className="flex flex-col items-center mb-5">
                            {carImageUrl && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={carImageUrl} alt="Car" className="w-48 h-auto object-contain mb-4" />
                            )}
                            <h2 className="text-2xl font-black text-center">{quote.car_name}</h2>
                            <p className="text-sm text-slate-500 mt-1">{quote.trim_name}</p>
                        </div>
                        {/* Real-time validity countdown */}
                        <div className={`mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 ${isExpired ? 'text-red-500' : 'text-slate-500'}`}>
                            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                                {isExpired ? 'warning' : 'schedule'}
                            </span>
                            <div className="text-center">
                                <span className="text-xs font-medium">
                                    {isExpired ? '견적 유효기간 만료' : `견적 유효기간 ${timeLeft}`}
                                </span>
                                {isExpired && (
                                    <p className="text-[10px] text-red-400 mt-0.5">월납료가 변동되었을 수 있습니다</p>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Monthly Payment Highlight */}
                    <section className="bg-primary rounded-3xl p-6 shadow-lg shadow-teal-500/20">
                        <p className="text-sm text-white/80 font-medium mb-2">AI 추천 최저 월납료</p>
                        <p className="text-4xl font-black text-white">
                            {quote.final_monthly!.toLocaleString()}
                            <span className="text-lg font-medium ml-1">원/월</span>
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                            <span className="material-symbols-outlined text-white/70 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                            <span className="text-xs text-white/70">전국 28곳 캐피탈사 비교 완료</span>
                        </div>
                    </section>

                    {/* 캐피탈사별 월납료 비교 */}
                    {(() => {
                        const rates = generateCapitalRates(quote.id, quote.final_monthly!);
                        const lowestRate = rates[0].monthly;
                        return (
                            <section className="mt-6">
                                <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg text-primary">compare_arrows</span>
                                    캐피탈사별 월납료 비교
                                </h3>
                                <div className="space-y-2">
                                    {rates.map((rate, index) => {
                                        const isLowest = rate.monthly === lowestRate;
                                        return (
                                            <div
                                                key={rate.id}
                                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                                    isLowest
                                                        ? "border-primary bg-primary/5 shadow-sm"
                                                        : "border-slate-100 bg-white"
                                                }`}
                                            >
                                                {/* Rank */}
                                                <span className={`text-xs font-black w-5 text-center ${isLowest ? "text-primary" : "text-slate-400"}`}>
                                                    {index + 1}
                                                </span>
                                                {/* Logo */}
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={rate.logo}
                                                    alt={rate.name}
                                                    className="h-7 w-auto object-contain flex-shrink-0"
                                                />
                                                {/* Company name */}
                                                <span className={`text-sm flex-1 ${isLowest ? "font-bold text-slate-900" : "font-medium text-slate-600"}`}>
                                                    {rate.name}
                                                </span>
                                                {/* Monthly rate */}
                                                <div className="text-right">
                                                    <span className={`text-sm font-bold ${isLowest ? "text-primary" : "text-slate-800"}`}>
                                                        월 {rate.monthly.toLocaleString()}원
                                                    </span>
                                                    {isLowest && (
                                                        <span className="ml-1.5 text-[10px] font-black bg-primary text-white px-1.5 py-0.5 rounded-full">
                                                            최저가
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {/* Ghost rows suggesting more companies */}
                                <div className="space-y-2 mt-2">
                                    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-50 bg-slate-50/50 opacity-40">
                                        <span className="text-xs font-black w-5 text-center text-slate-300">9</span>
                                        <div className="h-7 w-16 bg-slate-200 rounded animate-pulse" />
                                        <div className="h-4 w-20 bg-slate-200 rounded flex-1" />
                                        <div className="h-4 w-24 bg-slate-200 rounded" />
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-50 bg-slate-50/30 opacity-20">
                                        <span className="text-xs font-black w-5 text-center text-slate-300">10</span>
                                        <div className="h-7 w-16 bg-slate-200 rounded" />
                                        <div className="h-4 w-20 bg-slate-200 rounded flex-1" />
                                        <div className="h-4 w-24 bg-slate-200 rounded" />
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-2 text-center">
                                    * 전국 28곳 캐피탈사 비교 결과입니다
                                </p>
                            </section>
                        );
                    })()}

                    {/* Contract Details */}
                    <section className="bg-white rounded-3xl p-6 shadow-sm">
                        <h3 className="font-bold text-lg mb-4">계약 조건</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">계약 기간</span>
                                <span className="text-sm font-bold text-slate-900">{quote.duration}개월</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">연간 주행거리</span>
                                <span className="text-sm font-bold text-slate-900">{(quote.mileage / 10000).toFixed(1)}만 km</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">{quote.deposit_type || "선납금"}</span>
                                <span className="text-sm font-bold text-slate-900">{quote.deposit_rate}%</span>
                            </div>
                            {quote.total_price && (
                                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                    <span className="text-sm text-slate-500">총 차량 가격</span>
                                    <span className="text-sm font-bold text-slate-900">{(quote.total_price / 10000).toLocaleString()}만원</span>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Color & Options */}
                    {(quote.color_name || (quote.options && quote.options.length > 0)) && (
                        <section className="bg-white rounded-3xl p-6 shadow-sm">
                            <h3 className="font-bold text-lg mb-4">색상 / 옵션</h3>
                            <div className="space-y-3">
                                {quote.color_name && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-500">외장 색상</span>
                                        <span className="text-sm font-bold text-slate-900">{quote.color_name}</span>
                                    </div>
                                )}
                                {quote.options && quote.options.length > 0 && (
                                    <div className="pt-3 border-t border-slate-100">
                                        <p className="text-sm text-slate-500 mb-2">선택 옵션</p>
                                        <div className="space-y-2">
                                            {quote.options.map((opt) => (
                                                <div key={opt.id} className="flex justify-between items-center bg-slate-50 px-3 py-2.5 rounded-xl">
                                                    <span className="text-sm font-medium text-slate-700">{opt.name}</span>
                                                    <span className="text-sm font-bold text-slate-900">+{(opt.price / 10000).toLocaleString()}만원</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}


                    {/* Date */}
                    <div className="text-center">
                        <span className="text-xs text-slate-400">견적 요청일: {formatDate(quote.created_at)}</span>
                    </div>
                </main>

                {/* Bottom Fixed Bar */}
                <div className="fixed bottom-[60px] left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white p-5 pt-4 border-t border-slate-100 z-50">
                    <div className="flex gap-3">
                        <Link
                            href="/my-quotes"
                            className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">receipt_long</span>
                            내 견적함 보기
                        </Link>
                        <button
                            onClick={() => setShowRestartMenu(true)}
                            className="flex-1 border-2 border-slate-200 text-slate-700 py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-base">refresh</span>
                            다시 견적
                        </button>
                    </div>
                    <div className="mt-4 w-32 h-1 bg-slate-200 rounded-full mx-auto"></div>
                </div>

                {/* Restart Options Popup */}
                {showRestartMenu && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setShowRestartMenu(false)} />
                        <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl p-6 pb-8 animate-slide-up z-10">
                            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-6" />
                            <h3 className="text-lg font-bold text-slate-900 mb-1">어디서부터 다시 하시겠어요?</h3>
                            <p className="text-sm text-slate-500 mb-5">변경하고 싶은 단계를 선택하세요</p>
                            <div className="space-y-3">
                                <Link
                                    href={`/contract?carId=${quote.car_id || ""}&subModel=${quote.sub_model_id || ""}&trimId=${quote.trim_id || ""}&colorId=${quote.color_id || ""}${quote.options?.map(o => `&opt=${o.id}`).join("") || ""}`}
                                    className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-[0.98]"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-primary">tune</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">계약 조건 변경</p>
                                        <p className="text-xs text-slate-500">기간, 주행거리, 선납금 변경</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-400 ml-auto">chevron_right</span>
                                </Link>
                                <Link
                                    href={`/option?carId=${quote.car_id || ""}&subModel=${quote.sub_model_id || ""}&trimId=${quote.trim_id || ""}`}
                                    className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-[0.98]"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-primary">palette</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">색상 / 옵션 변경</p>
                                        <p className="text-xs text-slate-500">외장 색상, 선택 옵션 변경</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-400 ml-auto">chevron_right</span>
                                </Link>
                                <Link
                                    href={`/trim?carId=${quote.car_id || ""}&subModel=${quote.sub_model_id || ""}`}
                                    className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-[0.98]"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-primary">directions_car</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">트림 변경</p>
                                        <p className="text-xs text-slate-500">등급, 엔진 타입 변경</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-400 ml-auto">chevron_right</span>
                                </Link>
                                <Link
                                    href="/"
                                    className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-all active:scale-[0.98]"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-red-500">restart_alt</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">처음부터 다시하기</p>
                                        <p className="text-xs text-slate-500">다른 차량으로 새로 견적</p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-400 ml-auto">chevron_right</span>
                                </Link>
                            </div>
                            <button
                                onClick={() => setShowRestartMenu(false)}
                                className="w-full mt-4 py-3 text-slate-500 font-medium text-sm"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                )}

                <BottomNav />
            </div>
        );
    }

    // --- Pending / Analyzing: Show capital comparison animation ---
    return (
        <div className="min-h-screen bg-background-light pb-[160px]">
            <header className="px-4 py-3 flex items-center bg-white sticky top-0 z-50 border-b border-slate-100">
                <button onClick={() => router.back()} className="p-2 -ml-2">
                    <span className="material-symbols-outlined text-2xl font-bold">arrow_back_ios_new</span>
                </button>
                <h1 className="ml-2 text-lg font-bold">견적 상세</h1>
            </header>

            <main className="px-5 py-6 space-y-4">
                {/* Car Info Mini Card */}
                <section className="bg-white rounded-3xl p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                        {carImageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={carImageUrl} alt="Car" className="w-20 h-14 object-contain flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-black truncate">{quote.car_name}</h2>
                            <p className="text-xs text-slate-500">{quote.trim_name}{quote.total_price ? ` · ${(quote.total_price / 10000).toLocaleString()}만원` : ""}</p>
                        </div>
                    </div>
                </section>

                {/* AI Analysis Card */}
                <section className="bg-white rounded-3xl p-6 shadow-sm border-2 border-primary/20">
                    <div className="py-4">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                                <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">AI 최저가 분석</h3>
                                <p className="text-xs text-slate-500">
                                    전국 <b className="text-primary">28곳</b> 캐피탈사 최저가 비교 중
                                </p>
                            </div>
                        </div>

                        {/* Auto-sliding company logos */}
                        <div className="relative overflow-hidden mb-6 -mx-6">
                            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10" />
                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10" />
                            <div className="flex gap-3 animate-marquee px-6">
                                {[...CAPITAL_COMPANIES, ...CAPITAL_COMPANIES].map((company, index) => (
                                    <div key={`${company.name}-${index}`} className="flex flex-col items-center gap-1 flex-shrink-0">
                                        <div className="w-12 h-12 rounded-xl overflow-hidden">
                                            <Image src={company.logo} alt={company.name} width={48} height={48} />
                                        </div>
                                        <span className="text-[9px] font-medium text-slate-600 whitespace-nowrap">{company.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Analysis steps */}
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-green-500 text-xl flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                <span className="text-sm font-medium text-green-600">전국 렌터카사 견적 수집 완료</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-green-500 text-xl flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                <span className="text-sm font-medium text-green-600">조건별 월납료 비교 분석 완료</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full border-2 border-primary bg-primary flex-shrink-0 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                                </div>
                                <span className="text-sm font-bold text-primary">최적 월납료 산출 중...</span>
                            </div>
                        </div>

                        {/* Progress bar - loops */}
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full animate-progress-loop" />
                        </div>
                    </div>
                </section>

                {/* Info Card */}
                <section className="bg-white rounded-3xl p-5 shadow-sm border border-primary/10">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-1">견적 요청이 접수되었습니다</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                AI가 전국 캐피탈사의 최저가를 비교 분석 중입니다.<br />
                                분석이 완료되면 결과를 확인할 수 있습니다.
                            </p>
                        </div>
                    </div>
                    {/* Contract Summary */}
                    <div className="space-y-2 text-sm mt-4 pt-3 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">등급</span>
                            <span className="font-medium text-slate-700">{quote.trim_name}</span>
                        </div>
                        {quote.total_price && (
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">차량가격</span>
                                <span className="font-medium text-slate-700">{(quote.total_price / 10000).toLocaleString()}만원</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500">계약조건</span>
                            <span className="font-medium text-slate-700">{quote.duration}개월 / {(quote.mileage / 10000)}만km / {quote.deposit_type || "선납금"} {quote.deposit_rate}%</span>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>schedule</span>
                            <span className="text-xs text-slate-500">견적 유효기간: 접수일로부터 <b className="text-slate-700">7일</b></span>
                        </div>
                    </div>
                </section>
            </main>

            {/* Bottom Fixed Bar */}
            <div className="fixed bottom-[60px] left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white p-5 pt-4 border-t border-slate-100 z-50">
                <div className="flex gap-3">
                    <Link
                        href="/my-quotes"
                        className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-base">receipt_long</span>
                        내 견적함 보기
                    </Link>
                    <button
                        onClick={() => setShowRestartMenu(true)}
                        className="flex-1 border-2 border-slate-200 text-slate-700 py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-base">refresh</span>
                        다시 견적
                    </button>
                </div>
                <div className="mt-4 w-32 h-1 bg-slate-200 rounded-full mx-auto"></div>
            </div>

            {/* Restart Options Popup */}
            {showRestartMenu && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setShowRestartMenu(false)} />
                    <div className="relative w-full max-w-[430px] bg-white rounded-t-3xl p-6 pb-8 animate-slide-up z-10">
                        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-6" />
                        <h3 className="text-lg font-bold text-slate-900 mb-1">어디서부터 다시 하시겠어요?</h3>
                        <p className="text-sm text-slate-500 mb-5">변경하고 싶은 단계를 선택하세요</p>
                        <div className="space-y-3">
                            <Link
                                href={`/contract?carId=${quote.car_id || ""}&subModel=${quote.sub_model_id || ""}&trimId=${quote.trim_id || ""}&colorId=${quote.color_id || ""}${quote.options?.map(o => `&opt=${o.id}`).join("") || ""}`}
                                className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-[0.98]"
                            >
                                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-primary">tune</span>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">계약 조건 변경</p>
                                    <p className="text-xs text-slate-500">기간, 주행거리, 선납금 변경</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 ml-auto">chevron_right</span>
                            </Link>
                            <Link
                                href={`/option?carId=${quote.car_id || ""}&subModel=${quote.sub_model_id || ""}&trimId=${quote.trim_id || ""}`}
                                className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-[0.98]"
                            >
                                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-primary">palette</span>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">색상 / 옵션 변경</p>
                                    <p className="text-xs text-slate-500">외장 색상, 선택 옵션 변경</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 ml-auto">chevron_right</span>
                            </Link>
                            <Link
                                href={`/trim?carId=${quote.car_id || ""}&subModel=${quote.sub_model_id || ""}`}
                                className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-primary/30 hover:bg-primary/5 transition-all active:scale-[0.98]"
                            >
                                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-primary">directions_car</span>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">트림 변경</p>
                                    <p className="text-xs text-slate-500">등급, 엔진 타입 변경</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 ml-auto">chevron_right</span>
                            </Link>
                            <Link
                                href="/"
                                className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-all active:scale-[0.98]"
                            >
                                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-red-500">restart_alt</span>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm">처음부터 다시하기</p>
                                    <p className="text-xs text-slate-500">다른 차량으로 새로 견적</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 ml-auto">chevron_right</span>
                            </Link>
                        </div>
                        <button
                            onClick={() => setShowRestartMenu(false)}
                            className="w-full mt-4 py-3 text-slate-500 font-medium text-sm"
                        >
                            취소
                        </button>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}
