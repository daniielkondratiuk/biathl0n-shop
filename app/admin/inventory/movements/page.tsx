// app/admin/inventory/movements/page.tsx
import { AdminInventoryMovementsPage } from "@/features/admin/inventory";

export default async function InventoryMovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; range?: string; page?: string }>;
}) {
  return <AdminInventoryMovementsPage searchParams={searchParams} />;
}
