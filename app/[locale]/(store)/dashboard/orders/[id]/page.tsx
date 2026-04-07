// app/dashboard/orders/[id]/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { UserOrderDetailsPage } from "@/features/orders";

interface OrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return null;
  }

  const { id } = await params;
  return <UserOrderDetailsPage userId={session.user.id} orderId={id} />;
}
