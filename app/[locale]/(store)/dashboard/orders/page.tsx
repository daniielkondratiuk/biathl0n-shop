// app/dashboard/orders/page.tsx
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { UserOrdersPage } from "@/features/orders";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return null;
  }

  return <UserOrdersPage userId={session.user.id} />;
}
