import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth/auth";
import { getLocale, getTranslations } from "next-intl/server";

export async function PaymentSettingsPage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("account");

  if (!session) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-foreground">
        {t("paymentSettingsTitle")}
      </h1>
      <p className="text-muted-foreground">{t("paymentSettingsComingSoon")}</p>
    </div>
  );
}


