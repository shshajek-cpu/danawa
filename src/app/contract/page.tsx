"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getCarDetail, TRIMS as FALLBACK_TRIMS } from "@/constants/data";

function ContractPageContent() {
    const searchParams = useSearchParams();
    const [duration, setDuration] = useState(48);
    const [mileage, setMileage] = useState(20000);
    const [deposit, setDeposit] = useState(30);

    // Get carId and trimId from searchParams
    const carId = searchParams.get("carId") || "";
    const trimId = searchParams.get("trimId") || "";

    // Load car detail and find trim
    const carDetail = getCarDetail(carId);
    const trims = carDetail ? carDetail.trims : FALLBACK_TRIMS;
    const selectedTrim = trims.find(t => t.id === trimId) || trims[0];

    // Calculate monthly rent estimate based on actual trim price
    const calculateEstimate = () => {
        // Base monthly = roughly trimPrice / contract months with adjustments
        let base = Math.floor(selectedTrim.price / 60 * 1.1); // rough monthly based on price

        if (duration > 36) base -= Math.floor(base * 0.02 * ((duration - 36) / 12));
        if (duration < 36) base += Math.floor(base * 0.02 * ((36 - duration) / 12));

        if (mileage > 20000) base += Math.floor((mileage - 20000) * 1.5);

        if (deposit < 30) base += Math.floor(base * 0.03 * ((30 - deposit) / 10));
        if (deposit > 0) base -= Math.floor(base * 0.02 * (deposit / 10));

        return Math.floor(base);
    };

    const monthlyPrice = calculateEstimate();

    // Construct query string for next step
    const createQueryString = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("duration", duration.toString());
        params.set("mileage", mileage.toString());
        params.set("deposit", deposit.toString());
        params.set("monthly", monthlyPrice.toString());
        return params.toString();
    };

    return (
        <div className="pb-32 bg-background-light min-h-screen relative">


            <header className="px-4 py-2 flex items-center bg-white sticky top-0 z-40">
                <Link href={`/option?${searchParams.toString()}`} className="p-2 -ml-2">
                    <span className="material-symbols-outlined text-2xl">
                        arrow_back_ios_new
                    </span>
                </Link>
                <h1 className="ml-2 text-lg font-bold">계약 조건 설정</h1>
            </header>

            <main className="px-5">
                <section className="py-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-bold">
                            이용 기간과 상세 조건을
                            <br />
                            선택해주세요
                        </h2>
                        <span className="text-primary bg-blue-50 px-3 py-1 rounded-full text-xs font-bold">
                            Step 2/3
                        </span>
                    </div>
                </section>

                {/* Contract Duration Slider */}
                <section className="mt-4 mb-8">
                    <div className="flex justify-between items-end mb-6">
                        <label className="text-sm font-bold text-slate-400">
                            계약 기간
                        </label>
                        <div className="text-2xl font-black text-slate-900">
                            {duration}
                            <span className="text-base font-bold ml-1">개월</span>
                        </div>
                    </div>
                    <div className="relative px-2">
                        <input
                            type="range"
                            min="12"
                            max="60"
                            step="12"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full relative z-10"
                        />
                        {/* Visual ticks */}
                        <div className="absolute top-1/2 left-2 right-2 -translate-y-1/2 flex justify-between pointer-events-none">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1 h-1 bg-slate-300 rounded-full"
                                ></div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-between mt-4 px-1 text-[11px] font-bold text-slate-400">
                        <span>12개월</span>
                        <span>24개월</span>
                        <span>36개월</span>
                        <span>48개월</span>
                        <span>60개월</span>
                    </div>
                </section>

                {/* Mileage Slider */}
                <section className="mb-8">
                    <div className="flex justify-between items-end mb-6">
                        <label className="text-sm font-bold text-slate-400">
                            연간 주행거리
                        </label>
                        <div className="text-2xl font-black text-slate-900">
                            {mileage.toLocaleString()}
                            <span className="text-base font-bold ml-1">km</span>
                        </div>
                    </div>
                    <div className="relative px-2">
                        <input
                            type="range"
                            min="10000"
                            max="50000"
                            step="10000"
                            value={mileage}
                            onChange={(e) => setMileage(Number(e.target.value))}
                            className="w-full relative z-10"
                        />
                        <div className="absolute top-1/2 left-2 right-2 -translate-y-1/2 flex justify-between pointer-events-none">
                            {[...Array(5)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1 h-1 bg-slate-300 rounded-full"
                                ></div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-between mt-4 px-1 text-[11px] font-bold text-slate-400">
                        <span>1만 km</span>
                        <span>2만 km</span>
                        <span>3만 km</span>
                        <span>4만 km</span>
                        <span>5만 km</span>
                    </div>
                </section>

                {/* Deposit Slider */}
                <section className="mb-10">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex p-1 bg-slate-100 rounded-xl w-48">
                            <button className="flex-1 py-1.5 text-xs font-bold bg-white rounded-lg shadow-sm text-primary">
                                선납금
                            </button>
                            <button className="flex-1 py-1.5 text-xs font-bold text-slate-500">
                                보증금
                            </button>
                        </div>
                        <div className="text-2xl font-black text-slate-900">
                            {deposit}
                            <span className="text-base font-bold ml-1">%</span>
                        </div>
                    </div>
                    <div className="relative px-2">
                        <input
                            type="range"
                            min="0"
                            max="30"
                            step="10"
                            value={deposit}
                            onChange={(e) => setDeposit(Number(e.target.value))}
                            className="w-full relative z-10"
                        />
                        <div className="absolute top-1/2 left-2 right-2 -translate-y-1/2 flex justify-between pointer-events-none">
                            {[...Array(4)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1 h-1 bg-slate-300 rounded-full"
                                ></div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-between mt-4 px-1 text-[11px] font-bold text-slate-400">
                        <span>0% (없음)</span>
                        <span>10%</span>
                        <span>20%</span>
                        <span>30%</span>
                    </div>
                </section>

                {/* Info Box */}
                <section className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary">
                                description
                            </span>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">
                                Current Selection
                            </p>
                            <h3 className="font-bold text-slate-900">
                                선택하신 조건 요약
                            </h3>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">계약 기간</span>
                            <span className="text-sm font-bold">{duration}개월</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">연간 주행거리</span>
                            <span className="text-sm font-bold">
                                {mileage.toLocaleString()}km 미만
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">선납금 / 보증금</span>
                            <span className="text-sm font-bold text-primary">
                                선납금 {deposit}%
                            </span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                            <span className="text-sm text-slate-500">보험 연령</span>
                            <span className="text-sm font-bold">만 26세 이상</span>
                        </div>
                    </div>
                </section>
            </main>

            {/* Bottom Fixed Bar */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-slate-100 px-5 py-4 pb-8 z-50">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded">
                                STEP 3/3
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                                계약 조건
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                                월 렌트료
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-[11px] text-primary font-bold">
                                선수금 {deposit}% 기준
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-medium">
                            VAT 포함
                        </p>
                        <p className="text-lg font-black leading-tight">
                            {monthlyPrice.toLocaleString()}
                            <span className="text-sm font-bold text-slate-500 ml-0.5">원</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Link
                        href={`/quote?${createQueryString()}`}
                        className="flex-1 bg-primary text-white py-4 rounded-xl font-bold text-base active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20 text-center flex items-center justify-center"
                    >
                        선택 완료하기
                    </Link>
                </div>
                <div className="mt-5 w-32 h-1 bg-slate-100 rounded-full mx-auto"></div>
            </div>
        </div>
    );
}

export default function ContractPage() {
    return (
        <Suspense>
            <ContractPageContent />
        </Suspense>
    );
}
