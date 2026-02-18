"use client";

import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
    getCarDetail,
    getTrimsForSubModel,
    TRIMS as FALLBACK_TRIMS,
    CAR_INFO,
    EXTERIOR_COLORS,
    OPTIONS,
} from "@/constants/data";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

function QuotePageContent() {
    const searchParams = useSearchParams();
    const [showModal, setShowModal] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showKakaoLogin, setShowKakaoLogin] = useState(false);
    const [kakaoNickname, setKakaoNickname] = useState("");

    // Form state
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [agreed, setAgreed] = useState(false);

    // Kakao user state
    const [kakaoUser, setKakaoUser] = useState<{ id: string; nickname: string; email: string; loginTime: string } | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem("kakao_user");
        if (stored) {
            try {
                setKakaoUser(JSON.parse(stored));
            } catch {
                // ignore
            }
        }
    }, []);

    // Get car ID and load car-specific data
    const carId = searchParams.get("carId") || "";
    const subModelId = searchParams.get("subModel") || "";
    const carDetail = getCarDetail(carId);

    // Use subModel-specific trims if available, then car-specific, then fallback
    const subModelTrims = (carId && subModelId) ? getTrimsForSubModel(carId, subModelId) : null;
    const trims = subModelTrims || (carDetail ? carDetail.trims : FALLBACK_TRIMS);
    const carName = carDetail ? carDetail.name : CAR_INFO.model;
    const carImageUrl = carId ? `/cars/${carId}.png` : CAR_INFO.imageUrl;

    // Parsing IDs & Params
    const trimId = searchParams.get("trimId") || trims[0].id;
    const colorId = searchParams.get("colorId") || null;
    const optionIds = searchParams.getAll("opt");

    const duration = searchParams.get("duration") || "48";
    const mileage = searchParams.get("mileage") || "20000";
    const deposit = searchParams.get("deposit") || "30";
    const monthly = searchParams.get("monthly") || "0";

    const trim = trims.find((t) => t.id === trimId) || trims[0];

    // Get color and options details - use car-specific data when available
    const selectedColor = (() => {
        if (colorId && carDetail?.colorImages) {
            return carDetail.colorImages.find((c) => c.id === colorId) || null;
        }
        return colorId ? EXTERIOR_COLORS.find((c) => c.id === colorId) || null : null;
    })();
    const allOptions = carDetail ? carDetail.selectableOptions : OPTIONS;
    const selectedOptions = allOptions.filter((opt) => optionIds.includes(opt.id));

    const formatPhoneNumber = (value: string) => {
        const numbers = value.replace(/[^\d]/g, "");
        if (numbers.length <= 3) return numbers;
        if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        setPhone(formatted);
    };

    const handleQuoteClick = () => {
        if (kakaoUser) {
            setShowModal(true);
        } else {
            setShowKakaoLogin(true);
        }
    };

    const handleKakaoLoginSubmit = () => {
        const finalNickname = kakaoNickname.trim() || "카카오 사용자";
        const user = {
            id: `kakao_${Date.now()}`,
            nickname: finalNickname,
            email: "user@kakao.com",
            loginTime: new Date().toISOString(),
        };
        localStorage.setItem("kakao_user", JSON.stringify(user));
        setKakaoUser(user);
        setShowKakaoLogin(false);
        setKakaoNickname("");
        setShowModal(true);
    };

    const handleSubmitQuote = async () => {
        if (!phone || !agreed) {
            alert("휴대폰 번호를 입력하고 개인정보 수집에 동의해주세요.");
            return;
        }

        const phoneNumbers = phone.replace(/[^\d]/g, "");
        if (phoneNumbers.length !== 11 || !phoneNumbers.startsWith("010")) {
            alert("올바른 휴대폰 번호를 입력해주세요. (010-XXXX-XXXX)");
            return;
        }

        setIsSubmitting(true);

        try {
            // Calculate total price
            const colorPrice = selectedColor?.price || 0;
            const optionsPrice = selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
            const totalPrice = trim.price + colorPrice + optionsPrice;

            // Build quote object
            const quoteData = {
                id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                kakao_user_id: kakaoUser?.id || null,
                customer_id: `c_${phoneNumbers}`,
                customer_name: name || kakaoUser?.nickname || null,
                customer_phone: phoneNumbers,
                car_id: carId,
                car_name: carName,
                trim_id: trimId,
                trim_name: trim.name,
                trim_price: trim.price,
                color_id: colorId,
                color_name: selectedColor?.name || null,
                options: selectedOptions.map((opt) => ({
                    id: opt.id,
                    name: opt.name,
                    price: opt.price,
                })),
                total_price: totalPrice,
                duration: Number(duration),
                mileage: Number(mileage),
                deposit_rate: Number(deposit),
                estimated_monthly: Number(monthly) || null,
                status: "pending",
                created_at: new Date().toISOString(),
            };

            // Save to localStorage (works without Supabase)
            const existingQuotes = JSON.parse(localStorage.getItem("submitted_quotes") || "[]");
            existingQuotes.unshift(quoteData);
            localStorage.setItem("submitted_quotes", JSON.stringify(existingQuotes));
            localStorage.setItem("customer_phone", phoneNumbers);

            // Try Supabase save (non-blocking)
            try {
                const { data: customerResult } = await supabase
                    .from("customers")
                    .upsert({ phone: phoneNumbers, name: name || null }, { onConflict: "phone" })
                    .select()
                    .single();

                if (customerResult) {
                    await supabase.from("quotes").insert({
                        customer_id: customerResult.id,
                        car_id: carId,
                        car_name: carName,
                        trim_id: trimId,
                        trim_name: trim.name,
                        trim_price: trim.price,
                        color_id: colorId,
                        color_name: selectedColor?.name || null,
                        options: quoteData.options,
                        total_price: totalPrice,
                        duration: Number(duration),
                        mileage: Number(mileage),
                        deposit_rate: Number(deposit),
                        estimated_monthly: Number(monthly) || null,
                        status: "pending",
                    });
                }
            } catch {
                // Supabase not configured - localStorage is the fallback
            }

            setShowModal(false);
            setShowSuccess(true);
        } catch (error) {
            console.error("Error submitting quote:", error);
            alert("견적 제출 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="pb-64 bg-background-light min-h-screen relative animate-in fade-in duration-700">

            <header className="px-4 py-3 flex items-center bg-white sticky top-0 z-50">
                <Link href={`/contract?${searchParams.toString()}`} className="p-2 -ml-2">
                    <span className="material-symbols-outlined text-2xl font-bold">arrow_back_ios_new</span>
                </Link>
                <h1 className="ml-2 text-lg font-bold">최종 견적 확인</h1>
            </header>

            <main className="px-5 py-6 space-y-4">
                {/* Car Summary Card */}
                <section className="bg-white rounded-3xl p-6 shadow-sm">
                    <div className="flex flex-col items-center mb-5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={carImageUrl} alt="Car" className="w-48 h-auto object-contain mb-4" />
                        <h2 className="text-2xl font-black text-center">{carName}</h2>
                    </div>
                    <div className="space-y-3 pt-5 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">등급</span>
                            <span className="text-sm font-bold text-slate-900">{trim.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">차량 가격</span>
                            <span className="text-sm font-bold text-slate-900">
                                {(trim.price / 10000).toLocaleString()}만원
                            </span>
                        </div>
                    </div>
                </section>

                {/* Color & Options Card */}
                <section className="bg-white rounded-3xl p-6 shadow-sm">
                    <h3 className="font-bold text-lg mb-4">색상 / 옵션</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">외장 색상</span>
                            <span className="text-sm font-bold text-slate-900">
                                {selectedColor?.name || "기본 색상"}
                                {selectedColor?.price ? ` (+${(selectedColor.price / 10000).toLocaleString()}만원)` : ""}
                            </span>
                        </div>
                        {selectedOptions.length > 0 ? (
                            <>
                                <div className="pt-3 border-t border-slate-100">
                                    <p className="text-sm text-slate-500 mb-2">선택 옵션</p>
                                    <div className="space-y-2">
                                        {selectedOptions.map((opt) => (
                                            <div key={opt.id} className="flex justify-between items-center bg-slate-50 px-3 py-2.5 rounded-xl">
                                                <span className="text-sm font-medium text-slate-700">{opt.name}</span>
                                                <span className="text-sm font-bold text-slate-900">+{(opt.price / 10000).toLocaleString()}만원</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">선택 옵션</span>
                                <span className="text-sm text-slate-500">없음</span>
                            </div>
                        )}
                    </div>
                </section>

                {/* Contract Terms Card */}
                <section className="bg-white rounded-3xl p-6 shadow-sm">
                    <h3 className="font-bold text-lg mb-4">계약 조건</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">계약 기간</span>
                            <span className="text-sm font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-lg">
                                {duration}개월
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">연간 주행거리</span>
                            <span className="text-sm font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-lg">
                                {(Number(mileage) / 10000).toLocaleString()}만 km
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-500">선납금</span>
                            <span className="text-sm font-bold text-slate-900 bg-slate-50 px-3 py-1 rounded-lg">
                                {deposit}%
                            </span>
                        </div>
                    </div>
                </section>

                {/* Total Price Summary */}
                <section className="bg-primary/5 rounded-3xl p-6 border border-primary/10">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500">차량 가격</span>
                            <span className="text-slate-700">{(trim.price / 10000).toLocaleString()}만원</span>
                        </div>
                        {(selectedColor?.price || 0) > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">색상 추가</span>
                                <span className="text-slate-700">+{((selectedColor?.price || 0) / 10000).toLocaleString()}만원</span>
                            </div>
                        )}
                        {selectedOptions.length > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">옵션 추가</span>
                                <span className="text-slate-700">+{(selectedOptions.reduce((s, o) => s + o.price, 0) / 10000).toLocaleString()}만원</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center pt-3 border-t border-primary/10">
                            <span className="text-base font-bold text-slate-900">총 차량 가격</span>
                            <span className="text-xl font-black text-primary">
                                {((trim.price + (selectedColor?.price || 0) + selectedOptions.reduce((s, o) => s + o.price, 0)) / 10000).toLocaleString()}만원
                            </span>
                        </div>
                    </div>
                </section>
            </main>

            {/* Bottom Fixed Bar */}
            <div className="fixed bottom-[60px] left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white p-5 pt-4 border-t border-slate-100 z-50">
                <button
                    onClick={handleQuoteClick}
                    className="flex items-center justify-center w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                    상담 신청하기
                </button>
                <div className="mt-4 w-32 h-1 bg-slate-200 rounded-full mx-auto"></div>
            </div>

            <BottomNav />

            {/* Kakao Login Modal */}
            {showKakaoLogin && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
                    onClick={() => setShowKakaoLogin(false)}
                >
                    <div
                        className="bg-white rounded-3xl p-8 mx-5 w-full max-w-[360px] flex flex-col items-center gap-5 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowKakaoLogin(false)}
                            className="self-end -mt-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors"
                            aria-label="닫기"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>

                        <div className="w-16 h-16 rounded-full bg-[#FEE500] flex items-center justify-center">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="#191919">
                                <path d="M16 4C9.373 4 4 8.477 4 14c0 3.647 2.16 6.845 5.4 8.73l-.9 3.27 3.87-2.04A14.1 14.1 0 0016 24c6.627 0 12-4.477 12-10S22.627 4 16 4z"/>
                            </svg>
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">닉네임을 입력해주세요</h2>
                        <p className="text-sm text-slate-500 text-center">
                            간편하게 로그인하고 견적을 신청하세요
                        </p>
                        <input
                            type="text"
                            value={kakaoNickname}
                            onChange={(e) => setKakaoNickname(e.target.value)}
                            placeholder="카카오 사용자"
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FEE500]/50 focus:border-[#FEE500] text-center"
                            onKeyDown={(e) => e.key === "Enter" && handleKakaoLoginSubmit()}
                            autoFocus
                        />
                        <button
                            onClick={handleKakaoLoginSubmit}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98]"
                            style={{ backgroundColor: "#FEE500", color: "#191919" }}
                        >
                            <svg width="20" height="20" viewBox="0 0 32 32" fill="#191919">
                                <path d="M16 4C9.373 4 4 8.477 4 14c0 3.647 2.16 6.845 5.4 8.73l-.9 3.27 3.87-2.04A14.1 14.1 0 0016 24c6.627 0 12-4.477 12-10S22.627 4 16 4z"/>
                            </svg>
                            카카오 로그인
                        </button>
                    </div>
                </div>
            )}

            {/* Phone Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-[430px] rounded-t-3xl p-6 pb-8 animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">상담 신청</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    이름 (선택)
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={kakaoUser?.nickname || "홍길동"}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    휴대폰 번호 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={handlePhoneChange}
                                    placeholder="010-0000-0000"
                                    maxLength={13}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>

                            <div className="flex items-start gap-3 pt-2">
                                <input
                                    type="checkbox"
                                    id="privacy-agree"
                                    checked={agreed}
                                    onChange={(e) => setAgreed(e.target.checked)}
                                    className="mt-1 w-5 h-5 accent-primary cursor-pointer"
                                />
                                <label htmlFor="privacy-agree" className="text-sm text-slate-600 cursor-pointer">
                                    개인정보 수집 및 이용에 동의합니다. (필수)
                                </label>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmitQuote}
                            disabled={isSubmitting || !phone || !agreed}
                            className="w-full mt-6 bg-primary text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                        >
                            {isSubmitting ? "제출 중..." : "견적 제출하기"}
                        </button>
                    </div>
                </div>
            )}

            {/* Success Screen */}
            {showSuccess && (
                <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6 animate-in zoom-in duration-500">
                        <span className="material-symbols-outlined text-5xl text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                            check_circle
                        </span>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">견적 제출 완료!</h2>
                    <p className="text-slate-600 text-center mb-8">
                        담당 영업사원이 확인 후<br />
                        직접 연락드릴 예정입니다.
                    </p>
                    <Link
                        href="/my-quotes"
                        className="w-full max-w-xs bg-primary text-white py-4 rounded-2xl font-bold text-center shadow-lg shadow-blue-500/20"
                    >
                        내 견적함 보기
                    </Link>
                    <Link
                        href="/"
                        className="mt-4 text-slate-600 hover:text-slate-900 font-medium"
                    >
                        홈으로 돌아가기
                    </Link>
                </div>
            )}
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
