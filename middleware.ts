import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { defaultLocale, isLocale, locales } from "./src/i18n/routing";

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: false,
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Early exits for routes that must remain untouched.
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Skip static files (anything containing a dot extension)
  if (pathname.includes(".")) {
    return NextResponse.next();
  }

  const firstSegment = pathname.split("/")[1] ?? "";
  const isLocalizedPath = isLocale(firstSegment);

  if (isLocalizedPath) {
    return intlMiddleware(request);
  }

  const cookieLocale =
    request.cookies.get("NEXT_LOCALE")?.value ??
    request.cookies.get("NEXT_INTL_LOCALE")?.value ??
    null;
  const activeLocale =
    typeof cookieLocale === "string" && isLocale(cookieLocale)
      ? cookieLocale
      : defaultLocale;

  const url = request.nextUrl.clone();
  if (pathname === "/") {
    url.pathname = `/${activeLocale}`;
  } else {
    url.pathname = `/${activeLocale}${pathname}`;
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
