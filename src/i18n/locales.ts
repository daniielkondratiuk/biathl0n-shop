export const SUPPORTED_LOCALES = ["en", "fr", "de", "es", "it"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export type LocaleMeta = {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  flagPath: `/flags/${SupportedLocale}.png`;
};

export const LOCALE_META: Record<SupportedLocale, LocaleMeta> = {
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    flagPath: "/flags/en.png",
  },
  fr: {
    code: "fr",
    name: "French",
    nativeName: "Français",
    flagPath: "/flags/fr.png",
  },
  de: {
    code: "de",
    name: "German",
    nativeName: "Deutsch",
    flagPath: "/flags/de.png",
  },
  es: {
    code: "es",
    name: "Spanish",
    nativeName: "Español",
    flagPath: "/flags/es.png",
  },
  it: {
    code: "it",
    name: "Italian",
    nativeName: "Italiano",
    flagPath: "/flags/it.png",
  },
};

export const DEEPL_TARGET_LANGUAGE_BY_LOCALE = {
  en: "EN",
  fr: "FR",
  de: "DE",
  es: "ES",
  it: "IT",
} as const satisfies Record<SupportedLocale, string>;

export type DeepLTargetLanguage =
  (typeof DEEPL_TARGET_LANGUAGE_BY_LOCALE)[SupportedLocale];

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function getLocaleMeta(locale: SupportedLocale): LocaleMeta {
  return LOCALE_META[locale];
}

export function getDeepLTargetLanguage(locale: SupportedLocale): DeepLTargetLanguage {
  return DEEPL_TARGET_LANGUAGE_BY_LOCALE[locale];
}
