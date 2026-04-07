import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: SearchPageProps) {
  const locale = await getLocale();
  const params = await searchParams;
  const q = typeof params?.q === "string" ? params.q : undefined;

  if (q) {
    redirect(`/${locale}/catalog?q=${encodeURIComponent(q)}`);
  } else {
    redirect(`/${locale}/catalog`);
  }
}
