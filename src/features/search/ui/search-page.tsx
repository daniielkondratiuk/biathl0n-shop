import { useTranslations } from "next-intl";

export function SearchPage() {
  const t = useTranslations("search");
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="mb-4 text-2xl font-semibold text-foreground">{t("title")}</h1>
      <p className="text-muted-foreground">
        {t("comingSoon")}
      </p>
    </div>
  );
}
