// app/admin/inventory/page.tsx
import { AdminInventoryPage } from "@/features/admin/inventory";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string; pageSize?: string }>;
}) {
  return <AdminInventoryPage searchParams={searchParams} />;
}
