// src/features/account/ui/account-tabs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

export function AccountTabs() {
  const pathname = usePathname();
  const locale = useLocale();
  const prefix = `/${locale}`;
  const t = useTranslations("account");

  const tabs = [
    { href: `${prefix}/dashboard/orders`, label: t("tabOrders") },
    { href: `${prefix}/dashboard/profile`, label: t("tabProfile") },
    { href: `${prefix}/dashboard/addresses`, label: t("tabAddresses") },
  ];

  return (
    <div className="border-b border-border">
      <nav className="flex gap-8" aria-label="Account navigation">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`border-b-2 px-1 pb-4 text-sm font-medium transition-colors ${
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

