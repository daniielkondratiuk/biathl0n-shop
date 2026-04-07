// src/shared/layout/nav/login-link.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

// User/Login icon as inline SVG
function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function LoginLink() {
  const pathname = usePathname();
  const locale = useLocale();
  const t_nav = useTranslations("nav");
  const loginPath = `/${locale}/login`;
  
  // Don't add callbackUrl if already on login page
  const href = pathname === loginPath
    ? loginPath
    : `${loginPath}?callbackUrl=${encodeURIComponent(pathname)}`;

  return (
    <Link
      href={href}
      className="text-base font-medium text-foreground transition hover:text-muted-foreground"
    >
      {t_nav("login")}
    </Link>
  );
}

export function LoginIconLink() {
  const pathname = usePathname();
  const locale = useLocale();
  const t_nav = useTranslations("nav");
  const loginPath = `/${locale}/login`;
  
  // Don't add callbackUrl if already on login page
  const href = pathname === loginPath
    ? loginPath
    : `${loginPath}?callbackUrl=${encodeURIComponent(pathname)}`;

  return (
    <Link
      href={href}
      className="flex items-center justify-center text-foreground transition hover:text-muted-foreground"
      aria-label={t_nav("login")}
    >
      <UserIcon className="h-6 w-6" />
      <span className="sr-only">{t_nav("login")}</span>
    </Link>
  );
}
