import { prisma } from "@/server/db/prisma";

export async function getUserOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: {
            select: {
              slug: true,
            },
          },
          sizeVariant: {
            include: {
              colorVariant: {
                include: {
                  images: {
                    where: { role: "MAIN" },
                    take: 1,
                    orderBy: { order: "asc" },
                  },
                  color: {
                    select: {
                      id: true,
                      name: true,
                      nameFr: true,
                      hex: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export async function getUserOrderById(userId: string, orderId: string) {
  return prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              slug: true,
            },
          },
          sizeVariant: {
            include: {
              colorVariant: {
                include: {
                  images: {
                    where: { role: "MAIN" },
                    take: 1,
                    orderBy: { order: "asc" },
                  },
                  color: {
                    select: {
                      id: true,
                      name: true,
                      nameFr: true,
                      hex: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      address: true,
      payment: true,
    },
  });
}

