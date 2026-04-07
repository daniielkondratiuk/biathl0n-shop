import { use } from "react";
import { OrdersListPage } from "@/features/admin/orders";

interface AdminOrdersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const params = use(searchParams);
  const pageParam = params?.page;
  const page = typeof pageParam === "string" && Number(pageParam) > 0 ? Number(pageParam) : 1;
  const pageSize = 20;

  return (
    <OrdersListPage
      page={page}
      pageSize={pageSize}
      searchParams={params}
    />
  );
}


