import { Color, Option, Trim, Brand, Car, CarDetail, FuelType, SubModel, CarSpec } from "@/types";
import generatedData from "./generated-cars.json";
import carDetailsData from "./generated-car-details.json";
import subModelsData from "./sub-models.json";
import CAR_SPECS_DATA from "./car-specs.json";

const CAR_SPECS: Record<string, CarSpec> = CAR_SPECS_DATA;

// Merge sub-model data into car details
const mergedDetails: Record<string, CarDetail> = {};
for (const [id, detail] of Object.entries(carDetailsData as Record<string, Omit<CarDetail, 'subModels'>>)) {
    const subEntry = (subModelsData as Record<string, { subModels: SubModel[] }>)[id];
    mergedDetails[id] = {
        ...detail,
        subModels: subEntry?.subModels ?? [{ id: "sub_0", name: detail.fuelType, fuelType: detail.fuelType as FuelType, isDefault: true }],
    };
}

export const CAR_DETAILS: Record<string, CarDetail> = mergedDetails;

export function getCarDetail(carId: string): CarDetail | null {
    return CAR_DETAILS[carId] || null;
}

export function getTrimsForSubModel(carId: string, subModelId: string): Trim[] | null {
    const detail = CAR_DETAILS[carId];
    if (!detail) return null;
    const subModel = detail.subModels.find(s => s.id === subModelId);
    if (subModel?.trims && subModel.trims.length > 0) return subModel.trims;
    return null;
}

export function getCarSpec(carId: string): CarSpec | null {
    return CAR_SPECS[carId] || null;
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

export const FUEL_TYPES: { id: FuelType | 'all'; name: string; icon: string }[] = [
    { id: "all", name: "전체", icon: "apps" },
    { id: "가솔린", name: "가솔린", icon: "local_gas_station" },
    { id: "디젤", name: "디젤", icon: "oil_barrel" },
    { id: "하이브리드", name: "하이브리드", icon: "eco" },
    { id: "전기", name: "전기", icon: "ev_station" },
    { id: "수소", name: "수소", icon: "water_drop" },
];

export const FUEL_TYPE_COLORS: Record<FuelType, string> = {
    "가솔린": "bg-orange-100 text-orange-700",
    "디젤": "bg-slate-200 text-slate-700",
    "하이브리드": "bg-green-100 text-green-700",
    "전기": "bg-blue-100 text-blue-700",
    "수소": "bg-cyan-100 text-cyan-700",
    "LPG": "bg-purple-100 text-purple-700",
};

const DOMESTIC_BRAND_ORDER = ["현대", "기아", "제네시스", "KGM", "쉐보레", "르노코리아"];
const allBrands = generatedData.brands.map(b => ({ id: b.id, name: b.name, logoUrl: b.logoUrl || "" }));
const domesticBrands = DOMESTIC_BRAND_ORDER
    .map(name => allBrands.find(b => b.name === name))
    .filter((b): b is Brand => b !== undefined);
const importBrands = allBrands.filter(b => !DOMESTIC_BRAND_ORDER.includes(b.name));
export const BRANDS: Brand[] = [
    ...domesticBrands,
    ...importBrands,
];

// Sales popularity rank per car (lower = more popular, based on Korean market sales)
export const CAR_SALES_RANK: Record<string, number> = {
    // 현대 (by sales volume)
    "4188": 1,  // 디 올 뉴 그랜저
    "4455": 2,  // 더 뉴 아반떼
    "4592": 3,  // 더 뉴 투싼
    "4466": 4,  // 쏘나타
    "4671": 5,  // 캐스퍼
    "4435": 6,  // 싼타페
    "4699": 7,  // 팰리세이드
    "4624": 8,  // 아이오닉 5
    "4361": 9,  // 코나
    "4765": 10, // 스타리아
    "4746": 11, // 아이오닉 6
    "4088": 12, // 아이오닉 9
    "3654": 13, // 베뉴
    "4510": 14, // 코나 일렉트릭
    "1901": 15, // 포터2
    "4677": 16, // 넥쏘
    "4653": 17, // 캐스퍼 EV
    "4558": 18, // 아이오닉 5 N
    "4564": 19, // 더 뉴 아반떼 N
    "4742": 20, // 아이오닉 6 N
    "4626": 21, // ST1
    "4399": 22, // 포터2 EV
    // 기아 (by sales volume)
    "4586": 1,  // 더 뉴 카니발
    "4563": 2,  // 더 뉴 쏘렌토
    "4684": 3,  // 더 뉴 스포티지
    "4585": 4,  // 더 뉴 K5
    "4391": 5,  // 더 뉴 셀토스
    "4763": 6,  // 디 올 뉴 셀토스
    "4689": 7,  // 더 뉴 레이
    "4554": 8,  // 더 뉴 모닝
    "4641": 9,  // 더 뉴 EV6
    "4665": 10, // 더 뉴 K8
    "4647": 11, // EV3
    "4128": 12, // EV9
    "4130": 13, // 디 올 뉴 니로
    "4066": 14, // 더 뉴 K9
    "4686": 15, // 타스만
    "4499": 16, // EV5
    "4712": 17, // EV4
    "4714": 18, // PV5
    "4396": 19, // 디 올 뉴 니로 EV
    "4691": 20, // 더 레이 EV
    "3772": 21, // 봉고 3
    "4404": 22, // 봉고 3 EV
    // 제네시스 (by sales volume)
    "4465": 1,  // GV80
    "4603": 2,  // G80
    "4609": 3,  // GV70
    "4016": 4,  // G90
    "4701": 5,  // GV60
    "3995": 6,  // 더 뉴 G70
    "4660": 7,  // G80 EV
    "4705": 8,  // Electrified GV70
    "4761": 9,  // GV60 MAGMA
    // KGM (by sales volume)
    "4646": 1,  // 토레스
    "4545": 2,  // 더 뉴 티볼리
    "4518": 3,  // 렉스턴 뉴 아레나
    "4622": 4,  // 액티언
    "4766": 5,  // 무쏘
    "4492": 6,  // 토레스 EVX
    "4666": 7,  // 무쏘 EV
    // 쉐보레 (by sales volume)
    "4474": 1,  // 더 뉴 트레일블레이저
    "4429": 2,  // 트랙스 크로스오버
    "4395": 3,  // 콜로라도
    // 르노코리아 (by sales volume)
    "4659": 1,  // 그랑 콜레오스
    "4560": 2,  // 아르카나
    "4772": 3,  // 필랑트
    "4632": 4,  // 세닉 E-테크 일렉트릭
    // BMW (by sales volume)
    "4517": 1,  // 5시리즈
    "4650": 2,  // 3시리즈
    "4656": 3,  // X3
    "4475": 4,  // X5
    "4371": 5,  // X1
    "4528": 6,  // i5
    "4614": 7,  // 4시리즈
    "4476": 8,  // X6
    "4072": 9,  // X4
    "4196": 10, // 7시리즈
    "4639": 11, // i4
    "4580": 12, // X2
    "4652": 13, // 1시리즈
    "4683": 14, // 2시리즈 그란쿠페
    "4192": 15, // X7
    "4708": 16, // iX
    "4372": 17, // iX1
    "4582": 18, // iX2
    "4114": 19, // 2시리즈 액티브 투어러
    "3803": 20, // 2시리즈
    "4424": 21, // Z4
    "4649": 22, // M3
    "4615": 23, // M4
    "4655": 24, // M2
    "4657": 25, // M5
    "4480": 26, // X6 M
    "4479": 27, // X5 M
    "4073": 28, // X4 M
    "4171": 29, // 8시리즈
    "4181": 30, // i7
    "4422": 31, // XM
    // 벤츠 (by sales volume)
    "4516": 1,  // E-클래스
    "4373": 2,  // GLC-클래스
    "4037": 3,  // C-클래스
    "3992": 4,  // S-클래스
    "4471": 5,  // GLE-클래스
    "4461": 6,  // CLA-클래스
    "4427": 7,  // A-클래스
    "4496": 8,  // GLB-클래스
    "4495": 9,  // GLA-클래스
    "4629": 10, // G-클래스
    "4507": 11, // GLS-클래스
    "4555": 12, // CLE
    "4569": 13, // EQB
    "4568": 14, // EQA
    "4111": 15, // EQE
    "4430": 16, // EQE SUV
    "4381": 17, // EQS SUV
    "4380": 18, // SL-클래스
    "4566": 19, // The New AMG GT
    "3982": 20, // AMG GT
    "4011": 21, // Maybach S-클래스
    "4508": 22, // Maybach GLS
    "4638": 23, // Electric G-클래스
    "4670": 24, // Maybach SL
    "4511": 25, // Maybach EQS SUV
    // 아우디 (by sales volume)
    "3713": 1,  // A6
    "4736": 2,  // Q5
    "4707": 3,  // A3
    "4735": 4,  // A5
    "4698": 5,  // Q7 2차
    "3537": 6,  // A7
    "3668": 7,  // Q3
    "4697": 8,  // Q8
    "4690": 9,  // Q6 e-tron
    "4142": 10, // A6 e-tron
    "4062": 11, // Q4 e-tron
    "4759": 12, // e-트론 GT
    "4431": 13, // A8
    "4436": 14, // Q8 e-tron
    // 볼보 (by sales volume)
    "4747": 1,  // XC60
    "4737": 2,  // XC90
    "4405": 3,  // XC40
    "4740": 4,  // S90
    "4421": 5,  // V60 크로스 컨트리
    "4007": 6,  // V90 크로스 컨트리
    "4446": 7,  // EX30
    "4750": 8,  // EX30 CC
    // 토요타 (by sales volume)
    "4674": 1,  // 캠리
    "4173": 2,  // RAV4
    "4439": 3,  // 프리우스
    "4460": 4,  // 하이랜더
    "4447": 5,  // 크라운
    "4473": 6,  // 알파드
    "4063": 7,  // 시에나
    "4177": 8,  // GR 86
    // 렉서스 (by sales volume)
    "4093": 1,  // New ES
    "4164": 2,  // NX
    "4390": 3,  // RX
    "3688": 4,  // UX
    "4031": 5,  // LS
    "4635": 6,  // LM
    "4700": 7,  // LX
    // 테슬라 (by sales volume)
    "4667": 1,  // 모델 Y 주니퍼
    "4610": 2,  // 모델 3 하이랜드
    "4027": 3,  // 모델 X
    "4043": 4,  // Model S
    "3825": 5,  // Cybertruck
    // 포르쉐 (by sales volume)
    "4506": 1,  // 카이엔
    "4613": 2,  // 마칸 일렉트릭
    "4593": 3,  // 파나메라
    "4619": 4,  // 타이칸
    "4651": 5,  // The New 911
    // 랜드로버 (by sales volume)
    "4119": 1,  // 레인지로버
    "4363": 2,  // 레인지로버 스포츠
    "3775": 3,  // 디펜더
    "4064": 4,  // 디스커버리
    "4472": 5,  // 레인지로버 벨라
    "4551": 6,  // 레인지로버 이보크
    "4548": 7,  // 디스커버리 스포츠
    // 혼다 (by sales volume)
    "4469": 1,  // All New CR-V
    "4547": 2,  // 어코드
    "4715": 3,  // 뉴 오딧세이
    "4189": 4,  // 파일럿
    // 지프 (by sales volume)
    "4065": 1,  // 그랜드 체로키
    "4509": 2,  // 랭글러
    "4732": 3,  // 글래디에이터
    // 캐딜락 (by sales volume)
    "4061": 1,  // 리릭
    "4663": 2,  // 에스컬레이드
    "4565": 3,  // 에스컬레이드 IQ
    // 푸조 (by sales volume)
    "4741": 1,  // 3008
    "4628": 2,  // 5008
    "4377": 3,  // 408
    "4379": 4,  // 308
    // 폴스타 (by sales volume)
    "4468": 1,  // 폴스타 2
    "4513": 2,  // 폴스타 4
    // GMC (by sales volume)
    "4127": 1,  // 시에라
    "4777": 2,  // 아카디아
    "4779": 3,  // 캐니언
    // 링컨
    "4512": 1,  // 노틸러스
};

export const CARS: Car[] = (generatedData.cars as Car[]).sort((a, b) => {
    const rankA = CAR_SALES_RANK[a.id] ?? 999;
    const rankB = CAR_SALES_RANK[b.id] ?? 999;
    return rankA - rankB;
});

// Build fuel types per car from sub-models
const FUEL_DISPLAY_ORDER: Record<string, number> = { "가솔린": 0, "하이브리드": 1, "디젤": 2, "LPG": 3, "전기": 4, "수소": 5 };
export const CAR_FUEL_TYPES: Record<string, FuelType[]> = {};
for (const [id, entry] of Object.entries(subModelsData as Record<string, { subModels: SubModel[] }>)) {
    const fuels = [...new Set(entry.subModels.map(s => s.fuelType))] as FuelType[];
    fuels.sort((a, b) => (FUEL_DISPLAY_ORDER[a] ?? 99) - (FUEL_DISPLAY_ORDER[b] ?? 99));
    CAR_FUEL_TYPES[id] = fuels;
}
