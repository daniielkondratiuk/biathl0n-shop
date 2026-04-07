import { redirect } from "next/navigation";

interface CategoryPageProps {
  slug: string;
}

export async function CategoryPage({ slug }: CategoryPageProps) {
  const searchParams = new URLSearchParams({
    category: slug,
  });

  redirect(`/catalog?${searchParams.toString()}`);
}


