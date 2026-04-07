import {NextIntlClientProvider, hasLocale} from "next-intl";
import {getMessages, setRequestLocale} from "next-intl/server";
import {notFound} from "next/navigation";

import {locales} from "@/i18n/routing";
import {BackgroundParallax} from "@/shared/ui/background-parallax";

export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
};

export default async function LocaleLayout({children, params}: Props) {
  const {locale} = await params;

  if (!hasLocale(locales, locale)) {
    notFound();
  }

  // Enable static rendering for next-intl APIs (when possible)
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <BackgroundParallax />
      {children}
    </NextIntlClientProvider>
  );
}

