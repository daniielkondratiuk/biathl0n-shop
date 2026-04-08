import { NotFoundPage } from "@/shared/ui/not-found/not-found-page";
import { cookies, headers } from "next/headers";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { isSupportedLocale } from "@/i18n/locales";

export default async function NotFound() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const h = await headers();
  const cookieStore = await cookies();

  const candidateLocale =
    h.get("x-next-intl-locale") ??
    h.get("x-nextjs-locale") ??
    cookieStore.get("NEXT_LOCALE")?.value ??
    cookieStore.get("NEXT_INTL_LOCALE")?.value ??
    null;

  const homeHref =
    typeof candidateLocale === "string" && isSupportedLocale(candidateLocale)
      ? `/${candidateLocale}`
      : "/";

  return <NotFoundPage homeHref={homeHref} showAdminButton={isAdmin} />;
}
