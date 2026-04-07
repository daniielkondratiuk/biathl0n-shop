// app/admin/categories/[id]/page.tsx
import { CategoryEditPage } from "@/features/admin/categories";

interface AdminEditCategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminEditCategoryPage({ params }: AdminEditCategoryPageProps) {
  const { id } = await params;
  return <CategoryEditPage categoryId={id} />;
}
