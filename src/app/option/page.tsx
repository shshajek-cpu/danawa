"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    CAR_INFO,
    EXTERIOR_COLORS,
    INTERIOR_COLORS,
    OPTIONS,
    TRIMS,
    getCarDetail,
} from "@/constants/data";

function OptionPageContent() {
    const searchParams = useSearchParams();
    const carId = searchParams.get("carId") || "";
    const carDetail = getCarDetail(carId);

    const trimId = searchParams.get("trimId") || (carDetail ? carDetail.trims[0]?.id : TRIMS[0].id);
    const trims = carDetail ? carDetail.trims : TRIMS;
    const trim = trims.find((t) => t.id === trimId) || trims[0];

    const carName = carDetail ? carDetail.name : CAR_INFO.model;
    const carBrand = carDetail ? carDetail.brand : CAR_INFO.brand;

    const options = carDetail ? carDetail.selectableOptions : OPTIONS;
    const colorImages = carDetail ? carDetail.colorImages : null;

    // Color image selection (for real data)
    const [selectedColorId, setSelectedColorId] = useState(
        colorImages && colorImages.length > 0 ? colorImages[0].id : ""
    );

    // Fallback: old hex color selection (for hardcoded data)
    const [selectedExteriorId, setSelectedExteriorId] = useState(
        EXTERIOR_COLORS[0].id
    );
    const [selectedInteriorId, setSelectedInteriorId] = useState(
        INTERIOR_COLORS[0].id
    );
    const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(
        new Set()
    );
    const [expandedOptionId, setExpandedOptionId] = useState<string | null>(null);

    const toggleOption = (id: string) => {
        const next = new Set(selectedOptionIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedOptionIds(next);
    };

    // Get the current hero image URL based on selected color
    const heroImageUrl = (() => {
        if (colorImages && colorImages.length > 0) {
            const selected = colorImages.find((c) => c.id === selectedColorId);
            return selected ? selected.imageUrl : colorImages[0].imageUrl;
        }
        return carDetail ? carDetail.imageUrl : CAR_INFO.imageUrl;
    })();

    const calculateTotal = () => {
        let total = trim.price;
        if (!carDetail) {
            // Fallback: include old color prices
            const extPrice =
                EXTERIOR_COLORS.find((c) => c.id === selectedExteriorId)?.price || 0;
            const intPrice =
                INTERIOR_COLORS.find((c) => c.id === selectedInteriorId)?.price || 0;
            total += extPrice + intPrice;
        }
        const optPrice = options.filter((o) => selectedOptionIds.has(o.id)).reduce(
            (sum, o) => sum + o.price,
            0
        );
        return total + optPrice;
    };

    const formatPrice = (p: number) => p.toLocaleString() + "원";

    // Construct URL for next step
    const createNextLinkProps = () => {
        const params = new URLSearchParams();
        if (carId) params.set("carId", carId);
        params.set("trimId", trimId);
        if (carDetail) {
            if (selectedColorId) params.set("colorId", selectedColorId);
        } else {
            params.set("exterior", selectedExteriorId);
            params.set("interior", selectedInteriorId);
        }
        selectedOptionIds.forEach(id => params.append("opt", id));
        return `/contract?${params.toString()}`;
    };

    return (
        <div className="pb-32 relative">


            <header className="px-4 py-2 flex items-center bg-white sticky top-0 z-40">
                <Link href={carId ? `/trim?carId=${carId}` : "/trim"} className="p-2 -ml-2">
                    <span className="material-symbols-outlined text-2xl">
                        arrow_back_ios_new
                    </span>
                </Link>
                <h1 className="ml-2 text-lg font-bold">옵션 선택</h1>
            </header>

            <main className="px-5 py-4 space-y-8">
                <div className="flex flex-col items-center py-4 bg-slate-50 rounded-3xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        alt="Selected Car"
                        className="w-48 h-24 object-contain"
                        src={heroImageUrl}
                    />
                    <div className="mt-2 text-center">
                        <p className="text-xs font-semibold text-primary">
                            {carBrand}
                        </p>
                        <p className="text-base font-bold">{carName}</p>
                    </div>
                </div>

                {/* Color Selection */}
                {colorImages && colorImages.length > 0 ? (
                    <section>
                        <h3 className="text-lg font-bold mb-4">외장 색상</h3>
                        <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2">
                            {colorImages.map((color) => {
                                const isSelected = selectedColorId === color.id;
                                return (
                                    <div
                                        key={color.id}
                                        onClick={() => setSelectedColorId(color.id)}
                                        className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
                                    >
                                        <div
                                            className={`w-14 h-14 rounded-full p-1 border-2 ${isSelected
                                                ? "border-primary ring-2 ring-white shadow-sm"
                                                : "border-transparent"
                                                }`}
                                        >
                                            <div className="w-full h-full rounded-full overflow-hidden shadow-inner border border-black/5">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    alt={color.id}
                                                    className="w-[200%] h-[200%] object-cover -translate-x-1/4 -translate-y-1/4"
                                                    src={color.imageUrl}
                                                />
                                            </div>
                                        </div>
                                        <span
                                            className={`text-xs ${isSelected
                                                ? "font-bold text-primary"
                                                : "font-medium text-slate-500"
                                                }`}
                                        >
                                            {color.id.replace("color_", "컬러 ")}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ) : (
                    <>
                        <section>
                            <h3 className="text-lg font-bold mb-4">외장 색상</h3>
                            <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2">
                                {EXTERIOR_COLORS.map((color) => {
                                    const isSelected = selectedExteriorId === color.id;
                                    return (
                                        <div
                                            key={color.id}
                                            onClick={() => setSelectedExteriorId(color.id)}
                                            className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
                                        >
                                            <div
                                                className={`w-14 h-14 rounded-full p-1 border-2 ${isSelected
                                                    ? "border-primary ring-2 ring-white shadow-sm"
                                                    : "border-transparent"
                                                    }`}
                                            >
                                                <div
                                                    className="w-full h-full rounded-full shadow-inner border border-black/5"
                                                    style={{ backgroundColor: color.hex }}
                                                ></div>
                                            </div>
                                            <span
                                                className={`text-xs ${isSelected
                                                    ? "font-bold text-primary"
                                                    : "font-medium text-slate-500"
                                                    }`}
                                            >
                                                {color.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-lg font-bold mb-4">내장 색상</h3>
                            <div className="flex gap-4 overflow-x-auto hide-scrollbar py-2">
                                {INTERIOR_COLORS.map((color) => {
                                    const isSelected = selectedInteriorId === color.id;
                                    return (
                                        <div
                                            key={color.id}
                                            onClick={() => setSelectedInteriorId(color.id)}
                                            className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
                                        >
                                            <div
                                                className={`w-14 h-14 rounded-full p-1 border-2 ${isSelected
                                                    ? "border-primary ring-2 ring-white shadow-sm"
                                                    : "border-transparent"
                                                    }`}
                                            >
                                                <div
                                                    className="w-full h-full rounded-full shadow-inner border border-black/5"
                                                    style={{ backgroundColor: color.hex }}
                                                ></div>
                                            </div>
                                            <span
                                                className={`text-xs ${isSelected
                                                    ? "font-bold text-primary"
                                                    : "font-medium text-slate-500"
                                                    }`}
                                            >
                                                {color.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </>
                )}

                {/* Options Section */}
                <section className="space-y-4">
                    <h3 className="text-lg font-bold mb-4">추가 옵션</h3>
                    {options.length > 0 ? (
                        options.map((option) => {
                            const isChecked = selectedOptionIds.has(option.id);
                            const isExpanded = expandedOptionId === option.id;
                            return (
                                <div
                                    key={option.id}
                                    className={`rounded-2xl border transition-all ${isChecked
                                        ? "bg-slate-50 border-slate-100"
                                        : "bg-white border-slate-200"
                                        }`}
                                >
                                    <div
                                        className="flex items-center justify-between p-5 cursor-pointer active:scale-[0.98] transition-transform"
                                        onClick={() => toggleOption(option.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                readOnly
                                                className="w-6 h-6 rounded-lg text-primary focus:ring-primary border-slate-300 pointer-events-none"
                                            />
                                            <p className="text-[15px] font-bold">{option.name}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-900">
                                                + {formatPrice(option.price)}
                                            </span>
                                            {option.description && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setExpandedOptionId(isExpanded ? null : option.id);
                                                    }}
                                                    className="p-1 -mr-1"
                                                >
                                                    <span className={`material-symbols-outlined text-lg text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                                                        expand_more
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {option.description && isExpanded && (
                                        <div className="px-5 pb-4 -mt-1">
                                            <p className="text-xs text-slate-500 leading-relaxed pl-10">
                                                {option.description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                            <span className="material-symbols-outlined text-3xl mb-2">info</span>
                            <p className="text-sm">이 차량은 선택옵션이 없습니다</p>
                        </div>
                    )}
                </section>
            </main>

            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-slate-100 px-5 py-4 pb-8 z-50">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded">
                                STEP 2/3
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                                옵션 선택
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                                {trim.name}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-sm font-bold text-primary">
                                {formatPrice(trim.price)}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-medium">
                            취등록세 포함 예상
                        </p>
                        <p className="text-lg font-black leading-tight">
                            {formatPrice(calculateTotal())}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Link
                        href={createNextLinkProps()}
                        className="flex-1 bg-primary text-white py-4 rounded-xl font-bold text-base active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20 text-center flex items-center justify-center"
                    >
                        선택 완료하기
                    </Link>
                </div>
                <div className="mt-5 w-32 h-1 bg-slate-100 rounded-full mx-auto"></div>
            </div>
            <div className="fixed bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-200 rounded-full z-[60]"></div>
        </div>
    );
}

export default function OptionPage() {
    return (
        <Suspense>
            <OptionPageContent />
        </Suspense>
    );
}
