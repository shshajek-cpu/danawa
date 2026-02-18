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
    getTrimsForSubModel,
} from "@/constants/data";
import BottomNav from "@/components/BottomNav";

function OptionPageContent() {
    const searchParams = useSearchParams();
    const carId = searchParams.get("carId") || "";
    const carDetail = getCarDetail(carId);
    const subModelId = searchParams.get("subModel") || "";

    const subModelTrims = (carId && subModelId) ? getTrimsForSubModel(carId, subModelId) : null;
    const trims = subModelTrims || (carDetail ? carDetail.trims : TRIMS);
    const trimId = searchParams.get("trimId") || trims[0]?.id || TRIMS[0]?.id || "";
    const trim = trims.find((t) => t.id === trimId) || trims[0];

    // Early return if trim is not found
    if (!trim) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <p className="text-slate-500">트림 정보를 불러올 수 없습니다</p>
                <Link href="/" className="mt-4 text-primary font-medium">홈으로 돌아가기</Link>
            </div>
        );
    }

    const carName = carDetail ? carDetail.name : CAR_INFO.model;
    const carBrand = carDetail ? carDetail.brand : CAR_INFO.brand;

    const rawOptions = carDetail ? carDetail.selectableOptions : OPTIONS;
    // Filter options by selected sub-model and trim
    const allOptions = rawOptions.filter(o => {
        if (o.applicableSubModelIds && o.applicableSubModelIds.length > 0) {
            if (!subModelId || !o.applicableSubModelIds.includes(subModelId)) return false;
        }
        if (o.applicableTrimIds && o.applicableTrimIds.length > 0) {
            if (!trimId || !o.applicableTrimIds.includes(trimId)) return false;
        }
        return true;
    });
    // Separate color options (유상 색상) from regular options
    const colorOptions = allOptions.filter(o => o.name.includes("외장") && o.name.includes("컬러"));
    const options = allOptions.filter(o => !(o.name.includes("외장") && o.name.includes("컬러")));
    const colorImages = carDetail ? carDetail.colorImages : null;

    // Color image selection (for real data)
    const urlColorId = searchParams.get("colorId") || "";
    const [selectedColorId, setSelectedColorId] = useState(
        (urlColorId && colorImages?.some(c => c.id === urlColorId)) ? urlColorId
        : (colorImages && colorImages.length > 0 ? colorImages[0].id : "")
    );

    // Fallback: old hex color selection (for hardcoded data)
    const [selectedExteriorId, setSelectedExteriorId] = useState(
        EXTERIOR_COLORS[0].id
    );
    const [selectedInteriorId, setSelectedInteriorId] = useState(
        INTERIOR_COLORS[0].id
    );
    const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(
        new Set(searchParams.getAll("opt"))
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
            const colorImg = selected ? selected.imageUrl : colorImages[0].imageUrl;
            // Use color-specific image if it's a local path, otherwise fall back to local car image
            if (colorImg && colorImg.startsWith("/")) return colorImg;
        }
        return carId ? `/cars/${carId}.png` : CAR_INFO.imageUrl;
    })();

    const calculateTotal = () => {
        let total = trim.price;
        if (carDetail && colorImages && colorImages.length > 0) {
            // Add selected color price
            const selectedColor = colorImages.find((c) => c.id === selectedColorId);
            total += selectedColor?.price || 0;
        } else if (!carDetail) {
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
        if (subModelId) params.set("subModel", subModelId);
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
        <div className="pb-64 relative">


            <header className="px-4 py-2 flex items-center bg-white sticky top-0 z-40">
                <Link href={carId ? `/trim?carId=${carId}${subModelId ? `&subModel=${subModelId}` : ''}` : "/trim"} className="p-2 -ml-2">
                    <span className="material-symbols-outlined text-2xl">
                        arrow_back_ios_new
                    </span>
                </Link>
                <h1 className="ml-2 text-lg font-bold">옵션 선택</h1>
            </header>

            <main className="px-5 py-4 space-y-8">
                <div className="flex flex-col items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        alt="Selected Car"
                        className="w-full h-auto object-contain max-h-[160px]"
                        src={heroImageUrl}
                    />
                    <div className="text-center mt-3">
                        <span className="text-primary text-[10px] font-bold uppercase tracking-widest">
                            {carBrand}
                        </span>
                        <h2 className="text-xl font-black mt-0.5">{carName}</h2>
                    </div>
                </div>

                {/* Color Selection */}
                {colorImages && colorImages.length > 0 ? (
                    <section>
                        <h3 className="text-lg font-bold mb-4">외장 색상</h3>
                        <div className="flex gap-3 overflow-x-auto hide-scrollbar py-2">
                            {colorImages.map((color) => {
                                const isSelected = selectedColorId === color.id;
                                const colorName = color.name || color.hex?.toUpperCase() || color.id;
                                const colorPrice = color.price || 0;
                                return (
                                    <div
                                        key={color.id}
                                        onClick={() => setSelectedColorId(color.id)}
                                        className={`flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer min-w-[60px] max-w-[72px]`}
                                    >
                                        <div className="relative">
                                            <div
                                                className={`w-11 h-11 rounded-full p-0.5 border-2 transition-all ${isSelected
                                                    ? "border-primary scale-110 shadow-md"
                                                    : "border-transparent hover:border-slate-300"
                                                    }`}
                                            >
                                                <div
                                                    className="w-full h-full rounded-full shadow-inner border border-black/10"
                                                    style={{ backgroundColor: color.hex || "#808080" }}
                                                />
                                            </div>
                                            {colorPrice > 0 && (
                                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1 rounded-full leading-tight">
                                                    +{(colorPrice / 10000)}만
                                                </span>
                                            )}
                                        </div>
                                        <span
                                            className={`text-[10px] text-center leading-tight ${isSelected
                                                ? "font-bold text-primary"
                                                : "font-medium text-slate-500"
                                                }`}
                                        >
                                            {colorName}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* 유상 색상 안내 */}
                        {colorOptions.length > 0 && (
                            <p className="mt-3 text-[11px] text-slate-500">
                                * 일부 색상은 추가 비용이 발생합니다
                            </p>
                        )}
                    </section>
                ) : (
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
                )}

                {/* Interior Color Selection - always shown */}
                <section>
                    <h3 className="text-lg font-bold mb-4">내장 색상</h3>
                    <div className="flex gap-3 overflow-x-auto hide-scrollbar py-2">
                        {INTERIOR_COLORS.map((color) => {
                            const isSelected = selectedInteriorId === color.id;
                            return (
                                <div
                                    key={color.id}
                                    onClick={() => setSelectedInteriorId(color.id)}
                                    className={`flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer min-w-[60px] max-w-[72px]`}
                                >
                                    <div
                                        className={`w-11 h-11 rounded-full p-0.5 border-2 transition-all ${isSelected
                                            ? "border-primary scale-110 shadow-md"
                                            : "border-transparent hover:border-slate-300"
                                            }`}
                                    >
                                        <div
                                            className="w-full h-full rounded-full shadow-inner border border-black/10"
                                            style={{ backgroundColor: color.hex }}
                                        />
                                    </div>
                                    <span
                                        className={`text-[10px] text-center leading-tight ${isSelected
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

                {/* Options Section */}
                <section>
                    <h3 className="text-lg font-bold mb-3">추가 옵션</h3>
                    {options.length > 0 ? (
                        <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                            {options.map((option) => {
                                const isChecked = selectedOptionIds.has(option.id);
                                const isExpanded = expandedOptionId === option.id;
                                return (
                                    <div
                                        key={option.id}
                                        className={`transition-colors ${isChecked ? "bg-blue-50/50" : "bg-white"}`}
                                    >
                                        <div
                                            className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-slate-50 transition-colors"
                                            onClick={() => toggleOption(option.id)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                readOnly
                                                className="w-5 h-5 rounded text-primary focus:ring-primary border-slate-300 pointer-events-none flex-shrink-0"
                                            />
                                            <span className="text-[14px] font-medium text-slate-800 flex-1 min-w-0 line-clamp-2 leading-snug">
                                                {option.name}
                                            </span>
                                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                                <span className="text-[13px] font-bold text-slate-600 whitespace-nowrap">
                                                    +{formatPrice(option.price)}
                                                </span>
                                                {option.description && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExpandedOptionId(isExpanded ? null : option.id);
                                                        }}
                                                        className="p-0.5"
                                                    >
                                                        <span className={`material-symbols-outlined text-base text-slate-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                                                            expand_more
                                                        </span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {option.description && isExpanded && (
                                            <div className="px-4 pb-3 -mt-1">
                                                <p className="text-xs text-slate-500 leading-relaxed pl-8">
                                                    {option.description}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="material-symbols-outlined text-3xl mb-2">info</span>
                            <p className="text-sm">이 차량은 선택옵션이 없습니다</p>
                        </div>
                    )}
                </section>
            </main>

            <div className="fixed bottom-[60px] left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-slate-100 px-5 py-4 pb-4 z-50">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded">
                                STEP 2/3
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                                옵션 선택
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                                {trim.name}
                            </span>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-sm font-bold text-primary">
                                {formatPrice(trim.price)}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-medium">
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

            <BottomNav />
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
