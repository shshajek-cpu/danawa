"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { BRANDS, CARS, FUEL_TYPE_COLORS, CAR_FUEL_TYPES } from "@/constants/data";
import BottomNav from "@/components/BottomNav";

export default function HomePage() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedOrigin, setSelectedOrigin] = useState<"domestic" | "import">("domestic");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFuel, setSelectedFuel] = useState("");
  const router = useRouter();

  const DOMESTIC_BRANDS = ["현대", "기아", "제네시스", "KGM", "쉐보레", "르노코리아"];
  const isDomesticBrand = (brandId: string) => {
    const brand = BRANDS.find(b => b.id === brandId);
    return brand ? DOMESTIC_BRANDS.includes(brand.name) : false;
  };

  // Drag-to-scroll for brand list on PC
  const brandScrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const hasDragged = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const el = brandScrollRef.current;
    if (!el) return;
    isDragging.current = true;
    hasDragged.current = false;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeft.current = el.scrollLeft;
    el.style.cursor = "grabbing";
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const el = brandScrollRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = x - startX.current;
    if (Math.abs(walk) > 3) hasDragged.current = true;
    el.scrollLeft = scrollLeft.current - walk;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    const el = brandScrollRef.current;
    if (el) el.style.cursor = "grab";
  }, []);

  const filteredCars = CARS.filter(car => {
    const brandMatch = selectedBrandId === "" || car.brandId === selectedBrandId;
    const originMatch = (selectedOrigin === "domestic" && isDomesticBrand(car.brandId))
      || (selectedOrigin === "import" && !isDomesticBrand(car.brandId));
    const searchMatch = searchQuery === "" || car.name.toLowerCase().includes(searchQuery.toLowerCase())
      || BRANDS.find(b => b.id === car.brandId)?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const fuelMatch = selectedFuel === "" || (CAR_FUEL_TYPES[car.id] || []).includes(selectedFuel as any);
    return brandMatch && originMatch && searchMatch && fuelMatch;
  });

  return (
    <div className="bg-background-light min-h-screen relative pb-[100px]">
      <div className="max-w-[430px] mx-auto bg-white min-h-screen relative shadow-2xl">


        {/* Header */}
        <header className="px-5 py-3 flex justify-between items-center sticky top-0 z-50 bg-white">
          <div className="flex items-center">
            <span className="text-2xl font-black text-primary tracking-tight font-sans">Rent Zero</span>
          </div>
          <button className="p-1">
            <span className="material-symbols-outlined text-3xl text-slate-700">menu</span>
          </button>
        </header>

        <main className="px-5 space-y-5 mt-2">
          {/* Trust Banner */}
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between group cursor-pointer border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1.5 rounded-lg shadow-sm">
                <span className="material-symbols-outlined text-primary">verified_user</span>
              </div>
              <p className="text-[15px] font-medium text-slate-700 font-sans tracking-tight">
                렌트제로니까, 안심하고 구매하세요!
              </p>
            </div>
            <span className="material-symbols-outlined text-slate-500 text-lg group-hover:translate-x-1 transition-transform">chevron_right</span>
          </div>

          {/* Hero Banner with Modal Trigger */}
          <section className="relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-7 overflow-hidden min-h-[220px]">
            <div className="relative z-10 w-2/3">
              <h1 className="text-2xl font-bold text-white leading-tight font-sans">
                신차 구매<br />예정이신가요?
              </h1>
              <p className="text-blue-50 mt-2 text-sm opacity-90 font-sans">최저가 견적을 무료로 받아보세요</p>
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="mt-8 bg-white text-slate-900 px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-blue-900/20 active:scale-95 transition-transform font-sans"
              >
                비교견적 신청하기
              </button>
            </div>
            <div className="absolute right-[-20px] bottom-0 w-1/2 h-full flex items-end">
              {/* 3D Character Image from Stitch */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="3D Professional Character"
                className="w-full h-[110%] object-cover object-top scale-125"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBXkr9IDuzeQiAIVA7X2ZzOROEHjXgmjdB7Sz-lCArZb2qP31knwBMqB2oanp-yR8R4WycCoNJtO5pNLVIR24WVZ6HPkNcXks2-3p3TG3FlWAI9dvX7VqEvj-WfcBqteJLdQrTSf7rlOxryyPiqSfQ8cpPRDKSvFfk4sBOnwywKEVv80rKLzB_3vsakJIJ_jF35uBwbTHZe7QdAvj-De-4XQ6gGSXzcHeQRjpwQ68FLZuC7gZAWWRBEU_CFa8PLH7BetxJJRiKk0vpz"
                style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' }}
              />
            </div>
          </section>

          {/* Search Bar */}
          <section>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="차량명 또는 브랜드 검색"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <span className="material-symbols-outlined text-slate-500 text-lg">close</span>
                </button>
              )}
            </div>
          </section>

          {/* Origin Filter */}
          <section>
            <div className="flex gap-2">
              {([
                { id: "domestic", label: "국산차" },
                { id: "import", label: "수입차" },
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { setSelectedOrigin(opt.id); setSelectedBrandId(""); }}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    selectedOrigin === opt.id
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Fuel Type Filter */}
          <section>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedFuel("")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedFuel === ""
                    ? "bg-slate-900 text-white shadow-md"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                전체
              </button>
              {(["가솔린", "하이브리드", "디젤", "LPG", "전기", "수소"] as const).map((fuel) => (
                <button
                  key={fuel}
                  onClick={() => setSelectedFuel(selectedFuel === fuel ? "" : fuel)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedFuel === fuel
                      ? FUEL_TYPE_COLORS[fuel]?.replace("bg-", "bg-").replace("text-", "text-") + " ring-1 ring-current shadow-sm"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {fuel}
                </button>
              ))}
            </div>
          </section>

          {/* Brand Selection Section */}
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-3 font-sans">브랜드별 보기</h3>
            <div
              ref={brandScrollRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="flex gap-3 overflow-x-auto hide-scrollbar -mx-1 px-1 py-1 cursor-grab select-none"
            >
              {BRANDS.filter(b =>
                (selectedOrigin === "domestic" && DOMESTIC_BRANDS.includes(b.name))
                || (selectedOrigin === "import" && !DOMESTIC_BRANDS.includes(b.name))
              ).map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => { if (!hasDragged.current) setSelectedBrandId(brand.id); }}
                  className={`flex flex-col items-center gap-2 min-w-[60px] cursor-pointer transition-all ${selectedBrandId === brand.id ? "opacity-100 scale-105" : "opacity-60 hover:opacity-100"
                    }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${selectedBrandId === brand.id
                    ? "bg-slate-900 border-slate-900 shadow-md"
                    : "bg-white border-slate-200"
                    }`}>
                    {brand.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={brand.logoUrl} alt={brand.name} className="w-8 h-8 object-contain" />
                    ) : (
                      <span className={`text-xs font-bold ${selectedBrandId === brand.id ? "text-white" : "text-slate-500"}`}>
                        {brand.name}
                      </span>
                    )}
                  </div>
                  <span className={`text-[11px] font-medium ${selectedBrandId === brand.id ? "text-slate-900 font-bold" : "text-slate-500"}`}>
                    {brand.name}
                  </span>
                </button>
              ))}
            </div>
          </section>


          {/* Immediate Delivery Section (Filtered by Brand) */}
          <section className="pt-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-1 font-sans">
                {selectedBrandId === '' ? '대기없는 즉시 출고' : `${BRANDS.find(b => b.id === selectedBrandId)?.name} 즉시 출고`}
                <span className="material-symbols-outlined text-xl text-slate-500">chevron_right</span>
              </h3>
            </div>
            {filteredCars.length > 0 ? (
              <div className="flex flex-col gap-3 pb-4">
                {filteredCars.map((car) => (
                  <div key={car.id} onClick={() => router.push(`/trim?carId=${car.id}`)} className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all">
                    <div className="w-[90px] h-[60px] flex-shrink-0 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt={car.name}
                        className="w-full h-full object-contain"
                        src={car.imageUrl}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <p className="text-[11px] font-semibold text-primary font-sans">{BRANDS.find(b => b.id === car.brandId)?.name}</p>
                        {(CAR_FUEL_TYPES[car.id] || [car.fuelType]).map((fuel) => (
                          <span key={fuel} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${FUEL_TYPE_COLORS[fuel] || "bg-slate-100 text-slate-500"}`}>
                            {fuel}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm font-bold text-slate-800 font-sans truncate">{car.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[13px] text-slate-500">star</span>
                        <span className="text-[11px] text-slate-500 font-sans">{car.gradeCount}개 등급</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-slate-500 font-sans">신차가</p>
                      <p className="text-base font-extrabold text-slate-900 font-sans">{(car.startPrice / 10000).toLocaleString()}<span className="text-xs font-medium text-slate-500">만원~</span></p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500 bg-slate-50 rounded-3xl border border-slate-100">
                <span className="material-symbols-outlined text-4xl mb-2">no_crash</span>
                <p className="text-sm">해당 브랜드의 차량이 없습니다.</p>
              </div>
            )}
          </section>
        </main>

        <BottomNav />

        {/* Quote Selection Modal (Preserving logic from previous iteration) */}
        {isSearchModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
              onClick={() => setIsSearchModalOpen(false)}
            />

            <div className="bg-white w-full max-w-[430px] mx-auto rounded-t-[32px] p-6 pb-10 z-10 animate-[slideUp_0.3s_ease-out] relative">
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />

              <h3 className="text-xl font-bold text-slate-900 mb-2">
                어떤 방식으로 견적을 낼까요?
              </h3>
              <p className="text-slate-500 text-sm mb-8">
                AI와 대화하며 추천받거나, 직접 옵션을 선택할 수 있어요.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/chat')}
                  className="w-full flex items-center p-5 rounded-2xl bg-blue-50 border border-blue-100 active:scale-[0.98] transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white mr-4 shadow-blue-200 shadow-lg">
                    <span className="material-symbols-outlined text-2xl">smart_toy</span>
                  </div>
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base font-bold text-slate-900">AI 채팅 견적</span>
                      <span className="bg-blue-100 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded">RECOMMENDED</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      복잡한 고민 없이 AI가 최적의 조건을 찾아드려요
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                </button>

                <button
                  onClick={() => router.push('/trim')}
                  className="w-full flex items-center p-5 rounded-2xl bg-white border border-slate-100 active:bg-slate-50 active:scale-[0.98] transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mr-4">
                    <span className="material-symbols-outlined text-2xl">touch_app</span>
                  </div>
                  <div className="text-left flex-1">
                    <span className="text-base font-bold text-slate-900 block mb-0.5">직접 견적 내기</span>
                    <p className="text-xs text-slate-500">
                      원하는 조건을 직접 선택해서 비교해보세요
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-slate-300">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
