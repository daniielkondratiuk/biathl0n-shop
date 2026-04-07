// app/admin/search/page.tsx
import { AdminSearchPage } from "@/features/admin/search";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";

  return <AdminSearchPage query={query} />;
}
