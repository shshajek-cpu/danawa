export interface Option {
    id: string;
    name: string;
    price: number;
    description?: string;
    isBest?: boolean;
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

export interface Car {
    id: string;
    brandId: string;
    brandName: string;
    name: string;
    imageUrl: string;
    startPrice: number;
    grades: { name: string; price: number }[];
    gradeCount: number;
}

export interface ColorImage {
    id: string;
    imageUrl: string;
}

export interface CarDetail {
    brand: string;
    name: string;
    imageUrl: string;
    trims: Trim[];
    selectableOptions: Option[];
    colorImages: ColorImage[];
}
