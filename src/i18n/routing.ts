import {
  SUPPORTED_LOCALES,
  isSupportedLocale,
  type SupportedLocale,
} from "@/i18n/locales";

export const locales = SUPPORTED_LOCALES;

export type Locale = SupportedLocale;

export const defaultLocale: Locale = "fr";

export function isLocale(value: string): value is Locale {
  return isSupportedLocale(value);
}

