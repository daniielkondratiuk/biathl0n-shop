// src/shared/layout/footer.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { useMounted } from "@/shared/theme/use-mounted";
import { useStoreThemeTokens } from "@/shared/store-theme";

export function Footer() {
  const t = useStoreThemeTokens();
  const locale = useLocale();
  const prefix = `/${locale}`;
  const t_footer = useTranslations("footer");

  return (
    <footer className="text-foreground" style={{ backgroundColor: t.footerBgSolid }}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          {/* Left: logo */}
          <div className="flex flex-col">
            <Link href={prefix} className="inline-block shrink-0" aria-label="Home">
              <Image
                src={t.logoSrc}
                alt=""
                width={180}
                height={80}
                className="h-6 w-auto object-contain object-left"
              />
            </Link>
          </div>

          {/* Right: footer links */}
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-6 sm:grid-cols-4">
          <div>
            <h3 className="mb-3 text-sm font-medium">{t_footer("help")}</h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <Link href={`${prefix}/faq`} className="hover:text-foreground">
                  {t_footer("faq")}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/shipping-returns`} className="hover:text-foreground">
                  {t_footer("shippingReturns")}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/size-guide`} className="hover:text-foreground">
                  {t_footer("sizeGuide")}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/contact`} className="hover:text-foreground">
                  {t_footer("contactUs")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-medium">{t_footer("company")}</h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <Link href={`${prefix}/about`} className="hover:text-foreground">
                  {t_footer("aboutUs")}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/values`} className="hover:text-foreground">
                  {t_footer("ourValues")}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/privacy-policy`} className="hover:text-foreground">
                  {t_footer("privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/terms-of-service`} className="hover:text-foreground">
                  {t_footer("termsOfService")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-medium">{t_footer("collections")}</h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <Link href={`${prefix}/catalog?badge=NEW&page=1`} className="hover:text-foreground">
                  {t_footer("newCollection")}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/catalog?badge=BESTSELLER&page=1`} className="hover:text-foreground">
                  {t_footer("bestSellers")}
                </Link>
              </li>
              <li>
                <Link href={`${prefix}/catalog?page=1`} className="hover:text-foreground">
                  {t_footer("allProducts")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-medium">{t_footer("followUs")}</h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <a
                  href="https://www.instagram.com/predators_boutique/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  {t_footer("instagram")}
                </a>
              </li>
              <li>
                <a
                  href="https://www.tiktok.com/@predators_boutique"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  {t_footer("tiktok")}
                </a>
              </li>
              <li>
                <a
                  href="https://www.threads.com/@predators_boutique?xmt=AQF0_oIeoYscwjhmn4z8xBfUosn07ZJ03bxYbXcb2rlJa8Q"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  {t_footer("twitter")}
                </a>
              </li>
            </ul>
          </div>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <p className="text-xs text-muted-foreground">
            {t_footer("rights")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t_footer("designedIn")}
          </p>
        </div>
      </div>
    </footer>
  );
}
