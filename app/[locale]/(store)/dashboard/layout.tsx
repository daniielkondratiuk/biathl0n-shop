// app/[locale]/(store)/dashboard/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/server/auth/auth";
import { AccountTabs } from "@/features/account";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account.dashboardLayout" });
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/dashboard/orders`)}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
      <header className="mb-8 px-6 pt-6">
        <h1 className="mb-2 text-2xl font-semibold text-foreground">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>
      <div className="px-6">
        <AccountTabs />
      </div>
      <main className="mt-8 flex-1 px-6 pb-6">{children}</main>
    </div>
  );
}
