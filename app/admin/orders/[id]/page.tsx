import { OrderDetailsPage } from "@/features/admin/orders";

export const revalidate = 120;

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailsPage orderId={id} />;
}
