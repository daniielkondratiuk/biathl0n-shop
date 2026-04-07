// src/shared/i18n/locale-switcher.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { isLocale, locales, type Locale } from "@/i18n/routing";
import { getLocaleMeta, type LocaleMeta } from "@/i18n/locales";

type LocaleSwitcherProps = {
  enabledLocales?: ReadonlyArray<LocaleMeta>;
};

function dedupeSupportedLocales(localesToRender: ReadonlyArray<LocaleMeta>): LocaleMeta[] {
  const seen = new Set<Locale>();
  const result: LocaleMeta[] = [];

  for (const locale of localesToRender) {
    if (!isLocale(locale.code) || seen.has(locale.code)) {
      continue;
    }

    seen.add(locale.code);
    result.push(locale);
  }

  return result;
}

export function LocaleSwitcher({ enabledLocales = [] }: LocaleSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  if (!isLocale(locale)) {
    return null;
  }

  const currentLocale: Locale = locale;
  const fallbackLocales = locales.map((supportedLocale) => getLocaleMeta(supportedLocale));
  const availableLocales = dedupeSupportedLocales(
    enabledLocales.length > 0 ? enabledLocales : fallbackLocales,
  );
  const currentLocaleMeta =
    availableLocales.find((candidate) => candidate.code === currentLocale) ??
    getLocaleMeta(currentLocale);
  const otherLocales = availableLocales.filter((candidate) => candidate.code !== currentLocale);

  // Guard flags (evaluated before hooks to keep hooks unconditional)
  const isHiddenRoute = pathname.startsWith("/admin") || pathname.startsWith("/api");
  const firstSegment = pathname.split("/")[1] ?? "";
  const hasLocalePrefix = isLocale(firstSegment);
  const shouldRender = !isHiddenRoute && hasLocalePrefix;

  useEffect(() => {
    if (!shouldRender) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, shouldRender]);

  if (!shouldRender) {
    return null;
  }

  function switchLocale(nextLocale: Locale) {
    if (nextLocale === currentLocale) {
      setIsOpen(false);
      return;
    }

    const segments = pathname.split("/");
    if (isLocale(segments[1] ?? "")) {
      segments[1] = nextLocale;
    } else {
      segments.splice(1, 0, nextLocale);
    }

    const targetPath = segments.join("/") || "/";
    const queryString = searchParams.toString();
    const href = queryString ? `${targetPath}?${queryString}` : targetPath;

    router.push(href);
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full p-0 align-middle transition ${
          isOpen ? "ring-2 ring-primary/60" : ""
        }`}
        aria-label="Change language"
      >
        <Image
          src={currentLocaleMeta.flagPath}
          alt={currentLocaleMeta.name}
          width={24}
          height={24}
          className="h-6 w-6 rounded-full border border-border object-cover"
        />
      </button>

      {isOpen && otherLocales.length > 0 && (
        <div className="absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2">
          <div className="flex flex-col gap-1.5">
            {otherLocales.map((localeMeta) => (
              <button
                key={localeMeta.code}
                type="button"
                onClick={() => switchLocale(localeMeta.code)}
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full p-0 align-middle transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/60"
                aria-label={`Switch to ${localeMeta.name}`}
              >
                <Image
                  src={localeMeta.flagPath}
                  alt={localeMeta.name}
                  width={20}
                  height={20}
                  className="h-5 w-5 rounded-full border border-border object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
