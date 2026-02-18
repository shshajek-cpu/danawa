"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TRIMS, CAR_INFO, getCarDetail, FUEL_TYPE_COLORS, getCarSpec } from "@/constants/data";
import type { SubModel } from "@/types";
import BottomNav from "@/components/BottomNav";

function formatPrice(price: number) {
    return (price / 10000).toLocaleString() + "만원";
}

function calculateTotalPrice(trimPrice: number) {
    return Math.floor((trimPrice * 1.07) / 10000).toLocaleString() + "만원";
}

function TrimSelectionContent() {
    const searchParams = useSearchParams();
    const carId = searchParams.get("carId") || "";
    const carDetail = getCarDetail(carId);

    const carName = carDetail ? carDetail.name : CAR_INFO.model;
    const carBrand = carDetail ? carDetail.brand : CAR_INFO.brand;
    const carImageUrl = carId ? `/cars/${carId}.png` : CAR_INFO.imageUrl;

    // Sub-model (fuel type) data - sorted by fuel type priority
    const FUEL_ORDER: Record<string, number> = { "가솔린": 0, "하이브리드": 1, "디젤": 2, "LPG": 3, "전기": 4, "수소": 5 };
    const rawSubModels: SubModel[] = carDetail?.subModels ?? [
        { id: "sub_0", name: "가솔린 1.6T 하이브리드", fuelType: "하이브리드", isDefault: true }
    ];
    const subModels = [...rawSubModels].sort((a, b) => (FUEL_ORDER[a.fuelType] ?? 99) - (FUEL_ORDER[b.fuelType] ?? 99));
    const urlSubModelId = searchParams.get("subModel") || "";
    const defaultSub = subModels.find(s => s.isDefault) || subModels[0];
    const initialSub = (urlSubModelId && subModels.find(s => s.id === urlSubModelId)) || defaultSub;
    const [selectedSubModelId, setSelectedSubModelId] = useState(initialSub.id);
    const selectedSubModel = subModels.find(s => s.id === selectedSubModelId) || defaultSub;

    // Get trims: prefer subModel-specific trims if available
    const subModelTrims = selectedSubModel?.trims;
    const trims = (subModelTrims && subModelTrims.length > 0)
        ? subModelTrims
        : (carDetail ? carDetail.trims : TRIMS);

    // Early return if no trims available
    if (!trims || trims.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4">
                <p className="text-slate-500">트림 정보를 불러올 수 없습니다</p>
                <Link href="/" className="mt-4 text-primary font-medium">홈으로 돌아가기</Link>
            </div>
        );
    }

    const [selectedTrimId, setSelectedTrimId] = useState<string>(trims.length > 1 ? trims[1].id : trims[0].id);
    const selectedTrim = trims.find((t) => t.id === selectedTrimId) || trims[0];

    // Spec modal state
    const [showSpec, setShowSpec] = useState(false);
    const carSpec = getCarSpec(carId);

    return (
        <div className="pb-64">
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
                            {carSpec && (
                                <button
                                    onClick={() => setShowSpec(true)}
                                    className="mt-2 px-3 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center gap-1 mx-auto transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[14px]">info</span>
                                    재원정보
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                {/* Sub-model (Fuel Type) Selection */}
                <section className="px-5 mt-2">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500">
                            유종을 선택해주세요
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${FUEL_TYPE_COLORS[selectedSubModel.fuelType]}`}>
                            {selectedSubModel.fuelType}
                        </span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                        {subModels.map((sub) => {
                            const isSelected = selectedSubModelId === sub.id;
                            return (
                                <button
                                    key={sub.id}
                                    onClick={() => {
                                        setSelectedSubModelId(sub.id);
                                        // Reset trim selection when fuel type changes
                                        const newSubModel = subModels.find(s => s.id === sub.id);
                                        const newTrims = (newSubModel?.trims && newSubModel.trims.length > 0)
                                            ? newSubModel.trims
                                            : (carDetail ? carDetail.trims : TRIMS);
                                        setSelectedTrimId(newTrims.length > 1 ? newTrims[1].id : newTrims[0].id);
                                    }}
                                    className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all border ${
                                        isSelected
                                            ? "bg-slate-900 text-white border-slate-900 shadow-md"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                    }`}
                                >
                                    {sub.name}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Trim List */}
                <section className="px-5 space-y-2.5 mt-6">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-500">
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

            {/* Spec Modal */}
            {showSpec && carSpec && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={() => setShowSpec(false)}
                        className="fixed inset-0 bg-black/50 z-[60] animate-fade-in"
                    />
                    {/* Bottom Sheet */}
                    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl z-[60] px-6 pt-6 pb-8 animate-slide-up">
                        <h3 className="text-lg font-bold text-center mb-6 pb-4 border-b border-slate-200">
                            재원 정보
                        </h3>
                        {/* Scrollable content */}
                        <div className="max-h-[60vh] overflow-y-auto -mx-2 px-2">
                            {/* Basic Info */}
                            {(carSpec.releaseDate || carSpec.category || carSpec.fuelType) && (
                                <div className="mb-5">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">기본 정보</h4>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        {carSpec.releaseDate && (
                                            <>
                                                <span className="text-sm text-slate-500">출시일</span>
                                                <span className="text-sm font-medium text-right">{carSpec.releaseDate}</span>
                                            </>
                                        )}
                                        {carSpec.category && (
                                            <>
                                                <span className="text-sm text-slate-500">차종</span>
                                                <span className="text-sm font-medium text-right">{carSpec.category}</span>
                                            </>
                                        )}
                                        {carSpec.fuelType && (
                                            <>
                                                <span className="text-sm text-slate-500">연료</span>
                                                <span className="text-sm font-medium text-right">{carSpec.fuelType}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Engine */}
                            {(carSpec.engineType || carSpec.displacement || carSpec.maxPower || carSpec.maxTorque) && (
                                <div className="mb-5">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">엔진</h4>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        {carSpec.engineType && (
                                            <>
                                                <span className="text-sm text-slate-500">엔진형식</span>
                                                <span className="text-sm font-medium text-right">{carSpec.engineType}</span>
                                            </>
                                        )}
                                        {carSpec.displacement && (
                                            <>
                                                <span className="text-sm text-slate-500">배기량</span>
                                                <span className="text-sm font-medium text-right">{carSpec.displacement}</span>
                                            </>
                                        )}
                                        {carSpec.maxPower && (
                                            <>
                                                <span className="text-sm text-slate-500">최고출력</span>
                                                <span className="text-sm font-medium text-right">{carSpec.maxPower}</span>
                                            </>
                                        )}
                                        {carSpec.maxTorque && (
                                            <>
                                                <span className="text-sm text-slate-500">최대토크</span>
                                                <span className="text-sm font-medium text-right">{carSpec.maxTorque}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Drivetrain */}
                            {(carSpec.driveType || carSpec.transmission) && (
                                <div className="mb-5">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">구동</h4>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        {carSpec.driveType && (
                                            <>
                                                <span className="text-sm text-slate-500">구동방식</span>
                                                <span className="text-sm font-medium text-right">{carSpec.driveType}</span>
                                            </>
                                        )}
                                        {carSpec.transmission && (
                                            <>
                                                <span className="text-sm text-slate-500">변속기</span>
                                                <span className="text-sm font-medium text-right">{carSpec.transmission}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Dimensions */}
                            {(carSpec.length || carSpec.width || carSpec.height || carSpec.wheelbase || carSpec.curbWeight || carSpec.seatingCapacity || carSpec.fuelTank) && (
                                <div className="mb-5">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">제원</h4>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        {carSpec.length && (
                                            <>
                                                <span className="text-sm text-slate-500">전장</span>
                                                <span className="text-sm font-medium text-right">{carSpec.length}</span>
                                            </>
                                        )}
                                        {carSpec.width && (
                                            <>
                                                <span className="text-sm text-slate-500">전폭</span>
                                                <span className="text-sm font-medium text-right">{carSpec.width}</span>
                                            </>
                                        )}
                                        {carSpec.height && (
                                            <>
                                                <span className="text-sm text-slate-500">전고</span>
                                                <span className="text-sm font-medium text-right">{carSpec.height}</span>
                                            </>
                                        )}
                                        {carSpec.wheelbase && (
                                            <>
                                                <span className="text-sm text-slate-500">축거</span>
                                                <span className="text-sm font-medium text-right">{carSpec.wheelbase}</span>
                                            </>
                                        )}
                                        {carSpec.curbWeight && (
                                            <>
                                                <span className="text-sm text-slate-500">공차중량</span>
                                                <span className="text-sm font-medium text-right">{carSpec.curbWeight}</span>
                                            </>
                                        )}
                                        {carSpec.seatingCapacity && (
                                            <>
                                                <span className="text-sm text-slate-500">승차정원</span>
                                                <span className="text-sm font-medium text-right">{carSpec.seatingCapacity}</span>
                                            </>
                                        )}
                                        {carSpec.fuelTank && (
                                            <>
                                                <span className="text-sm text-slate-500">연료탱크</span>
                                                <span className="text-sm font-medium text-right">{carSpec.fuelTank}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Fuel Efficiency */}
                            {(carSpec.fuelEfficiency || carSpec.cityEfficiency || carSpec.highwayEfficiency || carSpec.co2Emission) && (
                                <div className="mb-5">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">연비</h4>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        {carSpec.fuelEfficiency && (
                                            <>
                                                <span className="text-sm text-slate-500">복합연비</span>
                                                <span className="text-sm font-medium text-right">{carSpec.fuelEfficiency}</span>
                                            </>
                                        )}
                                        {carSpec.cityEfficiency && (
                                            <>
                                                <span className="text-sm text-slate-500">도심연비</span>
                                                <span className="text-sm font-medium text-right">{carSpec.cityEfficiency}</span>
                                            </>
                                        )}
                                        {carSpec.highwayEfficiency && (
                                            <>
                                                <span className="text-sm text-slate-500">고속도로연비</span>
                                                <span className="text-sm font-medium text-right">{carSpec.highwayEfficiency}</span>
                                            </>
                                        )}
                                        {carSpec.co2Emission && (
                                            <>
                                                <span className="text-sm text-slate-500">CO₂ 배출</span>
                                                <span className="text-sm font-medium text-right">{carSpec.co2Emission}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Chassis */}
                            {(carSpec.frontSuspension || carSpec.rearSuspension || carSpec.frontBrake || carSpec.rearBrake || carSpec.frontTire || carSpec.rearTire) && (
                                <div className="mb-5">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">섀시</h4>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        {carSpec.frontSuspension && (
                                            <>
                                                <span className="text-sm text-slate-500">전륜 서스펜션</span>
                                                <span className="text-sm font-medium text-right">{carSpec.frontSuspension}</span>
                                            </>
                                        )}
                                        {carSpec.rearSuspension && (
                                            <>
                                                <span className="text-sm text-slate-500">후륜 서스펜션</span>
                                                <span className="text-sm font-medium text-right">{carSpec.rearSuspension}</span>
                                            </>
                                        )}
                                        {carSpec.frontBrake && (
                                            <>
                                                <span className="text-sm text-slate-500">전륜 브레이크</span>
                                                <span className="text-sm font-medium text-right">{carSpec.frontBrake}</span>
                                            </>
                                        )}
                                        {carSpec.rearBrake && (
                                            <>
                                                <span className="text-sm text-slate-500">후륜 브레이크</span>
                                                <span className="text-sm font-medium text-right">{carSpec.rearBrake}</span>
                                            </>
                                        )}
                                        {carSpec.frontTire && (
                                            <>
                                                <span className="text-sm text-slate-500">전륜 타이어</span>
                                                <span className="text-sm font-medium text-right">{carSpec.frontTire}</span>
                                            </>
                                        )}
                                        {carSpec.rearTire && (
                                            <>
                                                <span className="text-sm text-slate-500">후륜 타이어</span>
                                                <span className="text-sm font-medium text-right">{carSpec.rearTire}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setShowSpec(false)}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors mt-6"
                        >
                            닫기
                        </button>
                    </div>
                </>
            )}

            {/* Bottom Fixed Bar */}
            <div className="fixed bottom-[60px] left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-slate-100 z-50 px-6 pt-4 pb-4 rounded-t-3xl shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded">
                                STEP 1/3
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                                초기 견적
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${FUEL_TYPE_COLORS[selectedSubModel.fuelType]}`}>
                                {selectedSubModel.name}
                            </span>
                            <span className="text-sm font-bold text-slate-900">
                                {selectedTrim.name}
                            </span>
                            <span className="text-xs text-slate-500">·</span>
                            <span className="text-sm font-bold text-primary">
                                {formatPrice(selectedTrim.price)}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-medium">
                            취등록세 포함 예상
                        </p>
                        <p className="text-lg font-black leading-tight">
                            {calculateTotalPrice(selectedTrim.price)}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Link
                        href={`/option?carId=${carId}&trimId=${selectedTrimId}&subModel=${selectedSubModelId}`}
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

export default function TrimSelectionPage() {
    return (
        <Suspense>
            <TrimSelectionContent />
        </Suspense>
    );
}
