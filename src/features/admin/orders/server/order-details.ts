import { prisma } from "@/server/db/prisma";
import { unstable_cache } from "next/cache";

export async function getAdminOrderById(orderId: string) {
  const getAdminOrderByIdCached = unstable_cache(
    async () =>
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          address: true,
          payment: true,
          invoice: {
            select: {
              id: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ["admin-order", orderId],
    {
      revalidate: 120,
      tags: [`admin-order:${orderId}`],
    }
  );

  const order = await getAdminOrderByIdCached();
  return order;
}

