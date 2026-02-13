"use client";

import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
    getCarDetail,
    TRIMS as FALLBACK_TRIMS,
    CAR_INFO,
    // EXTERIOR_COLORS,
    // INTERIOR_COLORS,
    // OPTIONS,
} from "@/constants/data";

function QuotePageContent() {
    const searchParams = useSearchParams();
    const [isSearching, setIsSearching] = useState(true);
    const [progress, setProgress] = useState(0);

    // Get car ID and load car-specific data
    const carId = searchParams.get("carId") || "";
    const carDetail = getCarDetail(carId);

    // Use car-specific data or fallback
    const trims = carDetail ? carDetail.trims : FALLBACK_TRIMS;
    const carName = carDetail ? carDetail.name : CAR_INFO.model;
    const carImageUrl = carDetail ? carDetail.imageUrl : CAR_INFO.imageUrl;

    // Parsing IDs & Params
    const trimId = searchParams.get("trimId") || trims[0].id;
    // const extId = searchParams.get("exterior") || EXTERIOR_COLORS[0].id;
    // const intId = searchParams.get("interior") || INTERIOR_COLORS[0].id;
    // const optionIds = new Set(searchParams.getAll("opt"));

    const duration = searchParams.get("duration") || "48";
    const mileage = searchParams.get("mileage") || "20000";
    const deposit = searchParams.get("deposit") || "30";
    const monthly = searchParams.get("monthly") || "0";

    const trim = trims.find((t) => t.id === trimId) || trims[0];

    useEffect(() => {
        // Simulate AI Search Progress
        const duration = 3000; // 3 seconds total
        const interval = 50;
        const steps = duration / interval;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const newProgress = Math.min((currentStep / steps) * 100, 100);
            setProgress(newProgress);

            if (currentStep >= steps) {
                clearInterval(timer);
                setTimeout(() => setIsSearching(false), 500); // Small delay after 100%
            }
        }, interval);

        return () => clearInterval(timer);
    }, []);

    if (isSearching) {
        return (
            <div className="bg-background-light min-h-screen relative overflow-hidden flex flex-col">


                <main className="flex-1 px-6 flex flex-col items-center">
                    <div className="relative w-full aspect-[4/3] flex items-center justify-center mt-4 mb-8 shrink-0">
                        <div className="absolute inset-0 bg-blue-50/50 rounded-[40px] border border-blue-100"></div>
                        <div className="relative w-72 h-40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                alt="Car Silhouette"
                                className="w-full h-full object-contain opacity-30 grayscale"
                                src={carImageUrl}
                            />
                            <div className="absolute inset-0 overflow-hidden rounded-xl">
                                <div className="scan-line"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-6xl text-primary/20 animate-pulse">
                                        data_exploration
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-10 left-10 w-2 h-2 rounded-full bg-primary/40 animate-ping"></div>
                        <div className="absolute bottom-20 right-12 w-3 h-3 rounded-full bg-primary/30 animate-pulse"></div>
                        <div className="absolute top-24 right-8 w-2 h-2 rounded-full bg-primary/50"></div>
                    </div>

                    <div className="text-center space-y-3 mb-8 w-full shrink-0">
                        <h2 className="text-2xl font-bold tracking-tight">AI 최저가 견적 검색 중</h2>
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-2 text-primary">
                                <span className="text-lg font-black">{Math.floor((progress / 100) * 24)} / 24</span>
                                <span className="text-sm font-medium opacity-80">개 금융사 비교 완료</span>
                            </div>
                            <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-75"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full space-y-3 flex-1 overflow-y-auto hide-scrollbar pb-8">
                        {progress > 20 && (
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                        <span className="material-symbols-outlined text-primary text-xl font-bold">check</span>
                                    </div>
                                    <span className="text-base font-semibold text-slate-700">신한카드</span>
                                </div>
                                <span className="text-xs font-bold text-primary">분석완료</span>
                            </div>
                        )}
                        {progress > 50 && (
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                        <span className="material-symbols-outlined text-primary text-xl font-bold">check</span>
                                    </div>
                                    <span className="text-base font-semibold text-slate-700">현대캐피탈</span>
                                </div>
                                <span className="text-xs font-bold text-primary">분석완료</span>
                            </div>
                        )}

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-pulse ring-1 ring-primary/20">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                </div>
                                <span className="text-base font-semibold text-slate-900">하나캐피탈</span>
                            </div>
                            <span className="text-xs font-bold text-primary animate-pulse">검색중</span>
                        </div>
                    </div>
                </main>

                {/* Simulated Nav Bar for consistency with design (Static) */}
                <nav className="h-20 w-full bg-white/80 backdrop-blur-xl border-t border-slate-100 px-8 flex justify-between items-center shrink-0">
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                        <span className="material-symbols-outlined text-2xl">home</span>
                        <span className="text-[10px] font-medium">홈</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-primary">
                        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>search</span>
                        <span className="text-[10px] font-bold">견적검색</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                        <span className="material-symbols-outlined text-2xl">favorite</span>
                        <span className="text-[10px] font-medium">찜</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                        <span className="material-symbols-outlined text-2xl">person</span>
                        <span className="text-[10px] font-medium">내정보</span>
                    </div>
                </nav>
            </div>
        );
    }

    return (
        <div className="pb-32 bg-background-light min-h-screen relative animate-in fade-in duration-700">


            <header className="px-4 py-3 flex items-center bg-white sticky top-0 z-50">
                <Link href={`/contract?${searchParams.toString()}`} className="p-2 -ml-2">
                    <span className="material-symbols-outlined text-2xl font-bold">arrow_back_ios_new</span>
                </Link>
                <h1 className="ml-2 text-lg font-bold">최종 견적 확인</h1>
            </header>

            <main className="px-5 py-6">
                {/* Car Summary Card */}
                <section className="bg-white rounded-3xl p-6 shadow-sm mb-6">
                    <div className="flex flex-col items-center mb-6">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={carImageUrl} alt="Car" className="w-48 h-auto object-contain mb-4" />
                        <h2 className="text-2xl font-black text-center">{carName}</h2>
                        <p className="text-sm font-bold text-slate-500">{trim.name}</p>
                    </div>

                    <div className="space-y-3 pt-6 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">차량 가격</span>
                            <span className="text-base font-bold text-slate-900">
                                {(trim.price / 10000).toLocaleString()}만원
                            </span>
                        </div>
                    </div>
                </section>

                {/* Contract Summary Card */}
                <section className="bg-white rounded-3xl p-6 shadow-sm mb-6">
                    <h3 className="font-bold text-lg mb-4">계약 조건</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500 font-medium h-6 flex items-center">계약 기간</span>
                            <span className="text-base font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-lg">
                                {duration}개월
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500 font-medium h-6 flex items-center">연간 주행거리</span>
                            <span className="text-base font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-lg">
                                {(Number(mileage) / 10000).toLocaleString()}만 km
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500 font-medium h-6 flex items-center">초기 비용 (선납금)</span>
                            <span className="text-base font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-lg">
                                {deposit}%
                            </span>
                        </div>
                    </div>
                </section>

                {/* Final Price Highlight */}
                <section className="text-center py-6">
                    <p className="text-sm font-bold text-slate-400 mb-2">예상 월 렌트료</p>
                    <h1 className="text-4xl font-black text-primary">
                        {Number(monthly).toLocaleString()}
                        <span className="text-xl font-bold text-slate-900 ml-1">원</span>
                    </h1>
                </section>
            </main>

            {/* Bottom Fixed Bar */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white p-5 pt-4 border-t border-slate-100 z-50">
                <button
                    onClick={() => alert('상담 신청이 완료되었습니다.')}
                    className="flex items-center justify-center w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                    상담 신청하기
                </button>
                <div className="mt-4 w-32 h-1 bg-slate-200 rounded-full mx-auto"></div>
            </div>
        </div>
    );
}

export default function QuotePage() {
    return (
        <Suspense>
            <QuotePageContent />
        </Suspense>
    );
}
