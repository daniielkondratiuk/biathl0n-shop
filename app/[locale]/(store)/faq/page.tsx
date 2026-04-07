import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("faq");
  return {
    title: t("title"),
    description: t("subtitle"),
    openGraph: {
      title: `${t("title")} | predators`,
      description: t("subtitle"),
    },
  };
}

export default async function FaqPage() {
  const t = await getTranslations("faq");

  const faqs = [
    {
      question: t("shipWhen.question"),
      answer: t("shipWhen.answer"),
    },
    {
      question: t("shipHowLong.question"),
      answer: t("shipHowLong.answer"),
    },
    {
      question: t("changeCancel.question"),
      answer: t("changeCancel.answer"),
    },
    {
      question: t("returnPolicy.question"),
      answer: t("returnPolicy.answer"),
    },
    {
      question: t("international.question"),
      answer: t("international.answer"),
    },
    {
      question: t("sizeGuide.question"),
      answer: t("sizeGuide.answer"),
    },
    {
      question: t("care.question"),
      answer: t("care.answer"),
    },
    {
      question: t("damaged.question"),
      answer: t("damaged.answer"),
    },
  ];

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

      <div className="space-y-6">
        {faqs.map((item) => (
          <section key={item.question} className="border-b border-border pb-6">
            <h2 className="text-lg font-medium text-foreground">{item.question}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
