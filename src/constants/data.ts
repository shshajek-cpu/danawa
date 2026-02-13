import { Color, Option, Trim, Brand, Car, CarDetail } from "@/types";
import generatedData from "./generated-cars.json";
import carDetailsData from "./generated-car-details.json";

export const CAR_DETAILS: Record<string, CarDetail> = carDetailsData as Record<string, CarDetail>;

export function getCarDetail(carId: string): CarDetail | null {
    return CAR_DETAILS[carId] || null;
}

export const CAR_INFO = {
    brand: "Hyundai",
    model: "그랜저 하이브리드",
    subModel: "가솔린 1.6 터보 하이브리드",
    imageUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCG7QFVCfDGDCr-1IgS5EZg6XVLK-IWDzoeMlYb1jYnx2eD1O5Giokmb9skka0RJ8CL0w8FEDELQdoxPeudjHn3OCqKVypfpyOZ3l2j0PaL_5jtg0Y9_x0nvfiXG1wUHEIVcr_KHULNtze4euEcMoZf8zX_7E94dLSyrTXIOfRa3P60G6sIEA_NvKvcoLfQ02BAw_KrFqEF9HIkV5033kxyOdWm99LU4WZVcvzvks-XV0bfLTjEshbc-KKa36n-yXlUOuKaPtdedRYE",
};

export const TRIMS: Trim[] = [
    {
        id: "premium",
        name: "Premium",
        price: 42660000,
        features: ["12.3인치 내비게이션", "LED 헤드램프", "스마트 크루즈"],
    },
    {
        id: "exclusive",
        name: "Exclusive",
        price: 47560000,
        isBest: true,
        features: ["서라운드 뷰 모니터", "후측방 모니터", "메모리 시트"],
    },
    {
        id: "calligraphy",
        name: "Calligraphy",
        price: 52440000,
        features: ["나파 가죽 시트", "Bose 사운드", "20인치 휠"],
    },
];

export const EXTERIOR_COLORS: Color[] = [
    { id: "wc9", name: "세레니티 화이트", hex: "#f8f9fa", price: 100000 },
    { id: "abp", name: "어비스 블랙", hex: "#1f2937", price: 0 },
    { id: "r2t", name: "큐레이티드 실버", hex: "#9ca3af", price: 0 },
    { id: "t2g", name: "녹턴 그레이", hex: "#1e3a8a", price: 0 },
];

export const INTERIOR_COLORS: Color[] = [
    { id: "br", name: "브라운/베이지", hex: "#3d2b1f", price: 0 },
    { id: "bk", name: "블랙 모노톤", hex: "#111827", price: 0 },
    { id: "gy", name: "라이트 그레이", hex: "#e5e7eb", price: 0 },
];

export const OPTIONS: Option[] = [
    {
        id: "parking",
        name: "파킹 어시스트",
        price: 1450000,
        description: "서라운드 뷰, 원격 스마트 주차 보조",
    },
    {
        id: "hud",
        name: "헤드업 디스플레이 (HUD)",
        price: 1000000,
        description: "전면 유리 주행 정보 표시",
    },
    {
        id: "smart_sense",
        name: "현대 스마트센스 II",
        price: 1100000,
        description: "후측방 충돌방지 보조, 안전 하차 보조",
    },
    {
        id: "choice",
        name: "프리미엄 초이스",
        price: 1300000,
        description: "디지털 키 2, 터치타입 아웃사이드 핸들",
    },
];

export const BRANDS: Brand[] = [
    { id: "all", name: "전체", logoUrl: "" },
    ...generatedData.brands.map(b => ({ id: b.id, name: b.name, logoUrl: "" }))
];

export const CARS: Car[] = generatedData.cars;
