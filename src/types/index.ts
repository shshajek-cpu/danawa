export interface Option {
    id: string;
    name: string;
    price: number;
    description?: string;
    isBest?: boolean;
    applicableSubModelIds?: string[];
    applicableTrimIds?: string[];
}

export interface Trim {
    id: string;
    name: string;
    price: number;
    isBest?: boolean;
    features: string[];
}

export interface Color {
    id: string;
    name: string;
    hex: string;
    price: number;
}

export interface Brand {
    id: string;
    name: string;
    logoUrl: string;
}

export type FuelType = '가솔린' | '디젤' | '하이브리드' | '전기' | '수소' | 'LPG';

export interface SubModel {
    id: string;
    name: string;
    fuelType: FuelType;
    isDefault: boolean;
    trims?: Trim[];
}

export interface Car {
    id: string;
    brandId: string;
    brandName: string;
    name: string;
    imageUrl: string;
    startPrice: number;
    grades: { name: string; price: number }[];
    gradeCount: number;
    fuelType: FuelType;
}

export interface ColorImage {
    id: string;
    imageUrl: string;
    hex?: string;
    name?: string;
    price?: number;
}

export interface CarDetail {
    brand: string;
    name: string;
    imageUrl: string;
    fuelType: FuelType;
    subModels: SubModel[];
    trims: Trim[];
    selectableOptions: Option[];
    colorImages: ColorImage[];
}

export interface CarSpec {
    // Basic (existing)
    releaseDate?: string;
    category?: string;
    fuelType?: string;
    displacement?: string;
    fuelEfficiency?: string;
    cityEfficiency?: string;
    highwayEfficiency?: string;
    seatingCapacity?: string;
    driveType?: string;
    transmission?: string;
    // Engine
    engineType?: string;
    maxPower?: string;
    maxTorque?: string;
    // Dimensions
    length?: string;
    width?: string;
    height?: string;
    wheelbase?: string;
    curbWeight?: string;
    fuelTank?: string;
    // Chassis
    frontSuspension?: string;
    rearSuspension?: string;
    frontBrake?: string;
    rearBrake?: string;
    frontTire?: string;
    rearTire?: string;
    // Emissions
    co2Emission?: string;
}
