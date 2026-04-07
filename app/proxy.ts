import type { NextRequest } from "next/server";

const BYPASS_PREFIXES = ["/temp/", "/uploads/", "/_next/", "/api/"];
const BYPASS_EXACT = ["/favicon.ico", "/robots.txt", "/sitemap.xml"];

/**
 * Returns true when the request targets a static asset or API route
 * and must NOT be processed by locale / proxy middleware.
 */
export function isStaticAssetRequest(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  return (
    BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    BYPASS_EXACT.includes(pathname)
  );
}
