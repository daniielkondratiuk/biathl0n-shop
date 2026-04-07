import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("shipping");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: `${t("title")} | predators`,
      description: t("description"),
    },
  };
}

export default async function ShippingAndReturnsPage() {
  const t = await getTranslations("shipping");

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      <div className="space-y-8 text-sm text-muted-foreground">
        <section>
          <h2 className="text-lg font-medium text-foreground">{t("orderProcessing")}</h2>
          <p className="mt-2">
            {t("orderProcessingText")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">{t("shippingMethods")}</h2>
          <p className="mt-2">
            {t("shippingMethodsText")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">{t("tracking")}</h2>
          <p className="mt-2">
            {t("trackingText")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">{t("returnsWindow")}</h2>
          <p className="mt-2">
            {t("returnsWindowText")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">{t("exchanges")}</h2>
          <p className="mt-2">
            {t("exchangesText")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">{t("damagedItems")}</h2>
          <p className="mt-2">
            {t("damagedItemsText")}
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-foreground">{t("howToContact")}</h2>
          <p className="mt-2">
            {t("howToContactText")}
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

