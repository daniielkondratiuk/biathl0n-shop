import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: `${t("title")} | predators`,
      description: t("description"),
    },
  };
}

export default async function AboutPage() {
  const t = await getTranslations("about");

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-base text-foreground">
          {t("subtitle")}
        </p>
      </header>

      <div className="space-y-6 text-sm text-foreground">
        <section>
          <h2 className="text-lg font-medium text-foreground">{t("storyTitle")}</h2>
          <p className="mt-2">
            {t("storyContent")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">{t("faithTitle")}</h2>
          <p className="mt-2">
            {t("faithContent")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">{t("designTitle")}</h2>
          <p className="mt-2">
            {t("designContent")}
          </p>
        </section>
      </div>
    </div>
  );
}

