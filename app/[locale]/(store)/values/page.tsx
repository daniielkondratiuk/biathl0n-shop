import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("values");
  return {
    title: t("title"),
    description: t("subtitle"),
    openGraph: {
      title: `${t("title")} | predators`,
      description: t("subtitle"),
    },
  };
}

export default async function ValuesPage() {
  const t = await getTranslations("values");

  const values = [
    {
      title: t("qualityFirst.title"),
      description: t("qualityFirst.description"),
    },
    {
      title: t("craftsmanship.title"),
      description: t("craftsmanship.description"),
    },
    {
      title: t("originality.title"),
      description: t("originality.description"),
    },
    {
      title: t("smallTeam.title"),
      description: t("smallTeam.description"),
    },
    {
      title: t("ethical.title"),
      description: t("ethical.description"),
    },
    {
      title: t("honest.title"),
      description: t("honest.description"),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      <div className="grid gap-6 text-sm text-muted-foreground md:grid-cols-2">
        {values.map((value) => (
          <section key={value.title} className="rounded-md border border-border/60 bg-background/40 p-4">
            <h2 className="text-base font-medium text-foreground">{value.title}</h2>
            <p className="mt-2">{value.description}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

