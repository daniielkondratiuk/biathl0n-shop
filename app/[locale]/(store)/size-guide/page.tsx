import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sizeGuide");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      title: `${t("title")} | predators`,
      description: t("description"),
    },
  };
}

export default async function SizeGuidePage() {
  const t = await getTranslations("sizeGuide");

  const sizes = [
    { size: "XS", chest: "82–86", waist: "68–72", length: "66" },
    { size: "S", chest: "88–94", waist: "74–80", length: "68" },
    { size: "M", chest: "96–102", waist: "82–88", length: "70" },
    { size: "L", chest: "104–110", waist: "90–96", length: "72" },
    { size: "XL", chest: "112–118", waist: "98–104", length: "74" },
    { size: "XXL", chest: "120–126", waist: "106–112", length: "76" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      <section className="mb-8">
        <h2 className="text-lg font-medium text-foreground">{t("apparelMeasurements")}</h2>
        <div className="mt-4 overflow-x-auto rounded-md border border-border bg-background/40">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 font-medium text-foreground">{t("size")}</th>
                <th className="px-4 py-3 font-medium text-foreground">{t("chest")}</th>
                <th className="px-4 py-3 font-medium text-foreground">{t("waist")}</th>
                <th className="px-4 py-3 font-medium text-foreground">{t("length")}</th>
              </tr>
            </thead>
            <tbody>
              {sizes.map((row) => (
                <tr key={row.size} className="border-t border-border/60">
                  <td className="px-4 py-3 text-foreground">{row.size}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.chest}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.waist}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3 text-sm text-muted-foreground">
        <h2 className="text-lg font-medium text-foreground">{t("howToMeasure")}</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-medium text-foreground">{t("chest")}:&nbsp;</span>
            {t("chestMeasure")}
          </li>
          <li>
            <span className="font-medium text-foreground">{t("waist")}:&nbsp;</span>
            {t("waistMeasure")}
          </li>
          <li>
            <span className="font-medium text-foreground">{t("length")}:&nbsp;</span>
            {t("lengthMeasure")}
          </li>
        </ul>
        <p className="text-xs">
          {t("disclaimer")}
        </p>
      </section>
    </div>
  );
}

