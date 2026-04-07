import {getRequestConfig} from "next-intl/server";
import {defaultLocale, isLocale, type Locale} from "./routing";

export const dynamic = "force-dynamic";

type RequestLocaleCarrier = {
  requestLocale: Promise<string | undefined>;
};

function hasRequestLocale(value: unknown): value is RequestLocaleCarrier {
  return (
    typeof value === "object" &&
    value !== null &&
    "requestLocale" in value
  );
}

export default getRequestConfig(async (params) => {
  const incomingLocale =
    typeof params.locale === "string"
      ? params.locale
      : hasRequestLocale(params)
        ? await params.requestLocale
        : undefined;

  // Locale is URL-driven only (/fr or /en). No auto-detection.
  const activeLocale: Locale =
    typeof incomingLocale === "string" && isLocale(incomingLocale)
      ? incomingLocale
      : defaultLocale;

  async function loadMessages(locale: Locale) {
    try {
      return (await import(`../../messages/${locale}.json`)).default;
    } catch {
      return (await import(`../../messages/${defaultLocale}.json`)).default;
    }
  }

  return {
    locale: activeLocale,
    messages: await loadMessages(activeLocale)
  };
});

