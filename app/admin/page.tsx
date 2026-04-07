// app/admin/page.tsx
import { AdminDashboardPage } from "@/features/admin/dashboard";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const dateRange = params.range || "30d";

  return <AdminDashboardPage dateRange={dateRange} />;
}
