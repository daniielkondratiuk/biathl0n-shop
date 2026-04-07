// app/category/[slug]/page.tsx
import { redirect } from "next/navigation";

interface CategoryPageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

export default async function Page({ params }: CategoryPageProps) {
  const { slug, locale } = await params;
  const searchParams = new URLSearchParams({
    category: slug,
  });
  redirect(`/${locale}/catalog?${searchParams.toString()}`);
}


