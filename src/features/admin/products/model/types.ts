export type Gender = "MEN" | "WOMEN" | "KIDS" | "UNISEX";
export type Badge = "NEW" | "BESTSELLER" | "SALE" | "LIMITED" | "BACKINSTOCK" | "TRENDING";

export interface Category {
  id: string;
  name: string;
}

export interface Patch {
  id: string;
  name: string;
  image: string;
  price: number;
  isActive?: boolean;
}

export interface Color {
  id: string;
  name: string;
  hex: string;
}

export interface AdminProductTranslationValue {
  title: string;
  description: string;
}

export interface AdminProductTranslationInputValue {
  title?: string | null;
  description?: string | null;
}

export type AdminProductTranslationsByLocale = Record<string, AdminProductTranslationValue>;
export type AdminProductTranslationsInput = Record<string, AdminProductTranslationInputValue>;

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  basePrice: number;
  categoryId: string;
  gender: Gender | null;
  badge: Badge | null;
  defaultPatchIds: string[];
  isActive: boolean;
  translations?: Array<{
    locale: string;
    title: string;
    description: string | null;
  }>;
  translationsByLocale?: AdminProductTranslationsByLocale;
  colorVariants?: Array<{
    id: string;
    colorId: string;
    priceDiff: number;
    isActive: boolean;
    images: Array<{
      url: string;
      role: "MAIN" | "MAIN_DETAIL" | "GALLERY";
      order: number;
    }>;
    sizes: Array<{
      id: string;
      size: string;
      stock: number;
      priceDiff: number;
    }>;
  }>;
}

