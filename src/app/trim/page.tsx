"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TRIMS, CAR_INFO, getCarDetail } from "@/constants/data";

function formatPrice(price: number) {
    return (price / 10000).toLocaleString() + "만원";
}

// Simple estimated total logic (e.g. +7% tax) - logic from previous step, keeping consistent with UI
function calculateTotalPrice(trimPrice: number) {
    return Math.floor((trimPrice * 1.07) / 10000).toLocaleString() + "만원";
}

function TrimSelectionContent() {
    const searchParams = useSearchParams();
    const carId = searchParams.get("carId") || "";
    const carDetail = getCarDetail(carId);

    const trims = carDetail ? carDetail.trims : TRIMS;
    const carName = carDetail ? carDetail.name : CAR_INFO.model;
    const carBrand = carDetail ? carDetail.brand : CAR_INFO.brand;
    const carImageUrl = carDetail ? carDetail.imageUrl : CAR_INFO.imageUrl;

    const [selectedTrimId, setSelectedTrimId] = useState<string>(trims.length > 1 ? trims[1].id : trims[0].id);

    const selectedTrim = trims.find((t) => t.id === selectedTrimId) || trims[0];

    return (
        <div className="pb-[180px]">


            {/* Header */}
            <header className="px-4 py-2 flex items-center bg-white sticky top-0 z-40">
                <Link href="/" className="p-2 -ml-2">
                    <span className="material-symbols-outlined text-2xl">
                        arrow_back_ios_new
                    </span>
                </Link>
                <h1 className="ml-2 text-lg font-bold">트림 선택</h1>
            </header>

            <main>
                {/* Hero Section */}
                <section className="px-5 py-4">
                    <div className="flex flex-col items-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            alt="Selected Car"
                            className="w-full h-auto object-contain max-h-[160px]"
                            src={carImageUrl}
                        />
                        <div className="text-center mt-3">
                            <span className="text-primary text-[10px] font-bold uppercase tracking-widest">
                                {carBrand}
                            </span>
                            <h2 className="text-xl font-black mt-0.5">{carName}</h2>
                        </div>
                    </div>
                </section>

                {/* Trim List */}
                <section className="px-5 space-y-2.5 mt-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-400">
                            트림을 선택해주세요
                        </span>
                    </div>

                    {trims.map((trim) => {
                        const isSelected = selectedTrimId === trim.id;
                        return (
                            <div
                                key={trim.id}
                                onClick={() => setSelectedTrimId(trim.id)}
                                className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between gap-4 relative transition-all ${isSelected
                                    ? "border-2 border-primary bg-blue-50/50"
                                    : "border-slate-200 bg-white"
                                    }`}
                            >
                                {trim.isBest && (
                                    <div className="absolute -top-2.5 right-10 bg-primary text-[9px] text-white px-2 py-0.5 rounded-full font-bold">
                                        BEST
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-base font-bold truncate">
                                            {trim.name}
                                        </h3>
                                        <span className="text-[13px] text-primary font-bold">
                                            {formatPrice(trim.price)}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex gap-2">
                                        {/* Displaying first 2 features as per design */}
                                        {trim.features.slice(0, 2).map((feat, i) => (
                                            <span
                                                key={i}
                                                className={`text-[11px] font-medium ${isSelected ? "text-slate-600" : "text-slate-500"
                                                    }`}
                                            >
                                                • {feat}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div
                                    className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center ${isSelected
                                        ? "bg-primary"
                                        : "border border-slate-300"
                                        }`}
                                >
                                    {isSelected && (
                                        <span className="material-symbols-outlined text-white text-[14px] font-bold">
                                            check
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </section>
            </main>

            {/* Bottom Fixed Bar */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-slate-100 z-50 px-6 pt-4 pb-6 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded">
                                STEP 1/3
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                                초기 견적
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                                {selectedTrim.name}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-sm font-bold text-primary">
                                {formatPrice(selectedTrim.price)}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-medium">
                            취등록세 포함 예상
                        </p>
                        <p className="text-lg font-black leading-tight">
                            {calculateTotalPrice(selectedTrim.price)}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Link
                        href={`/option?carId=${carId}&trimId=${selectedTrimId}`}
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

export default function TrimSelectionPage() {
    return (
        <Suspense>
            <TrimSelectionContent />
        </Suspense>
    );
}
