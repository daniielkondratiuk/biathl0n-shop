// app/admin/analytics/page.tsx
import { AdminAnalyticsPage } from "@/features/admin/analytics";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const dateRange = params.range || "30d";
  const tab = params.tab || "sales";

  return <AdminAnalyticsPage dateRange={dateRange} tab={tab} />;
}
