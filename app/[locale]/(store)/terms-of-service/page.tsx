import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("terms");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: `${t("title")} | predators`,
      description: t("descriptionOg"),
    },
  };
}

export default async function TermsOfServicePage() {
  const t = await getTranslations("terms");

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      <div className="space-y-6 text-sm text-muted-foreground">
        <section>
          <h2 className="text-lg font-medium text-foreground">{t("section1Title")}</h2>
          <p className="mt-2">
            {t("section1Content")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">{t("section2Title")}</h2>
          <p className="mt-2">
            {t("section2Content")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">{t("section3Title")}</h2>
          <p className="mt-2">
            {t("section3Content")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">{t("section4Title")}</h2>
          <p className="mt-2">
            {t("section4Content")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">{t("section5Title")}</h2>
          <p className="mt-2">
            {t("section5Content")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">{t("section6Title")}</h2>
          <p className="mt-2">
            {t("section6Content")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">{t("section7Title")}</h2>
          <p className="mt-2">
            {t("section7Content")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">{t("section8Title")}</h2>
          <p className="mt-2">
            {t("section8Content")}
          </p>
        </section>

        <section>
          <p className="mt-2 text-xs">
            {t("disclaimer")}
          </p>
        </section>
      </div>
    </div>
  );
}

