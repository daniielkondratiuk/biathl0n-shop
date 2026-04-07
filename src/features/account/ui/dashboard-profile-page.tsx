import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/server/auth/auth";
import { getLocale, getTranslations } from "next-intl/server";

export async function DashboardProfilePage() {
  const session = await getServerSession(authOptions);
  const t = await getTranslations("account");

  if (!session) {
    const locale = await getLocale();
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent("/dashboard/profile")}`);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-foreground">{t("profileTitle")}</h1>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">{t("name")}</p>
          <p className="text-foreground">{session.user.name || t("na")}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t("email")}</p>
          <p className="text-foreground">{session.user.email}</p>
        </div>
      </div>
    </div>
  );
}


