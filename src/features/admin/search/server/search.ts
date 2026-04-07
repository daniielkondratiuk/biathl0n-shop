import { prisma } from "@/server/db/prisma";

export async function searchAdmin(query: string) {
  if (!query || query.trim().length < 2) {
    return {
      orders: [],
      products: [],
      customers: [],
    };
  }

  const searchTerm = query.trim();

  const [orders, products, customers] = await Promise.all([
    // Search orders by ID, order number, customer email/name
    prisma.order.findMany({
      where: {
        OR: [
          { id: { contains: searchTerm, mode: "insensitive" } },
          { orderNumber: { contains: searchTerm, mode: "insensitive" } },
          { user: { email: { contains: searchTerm, mode: "insensitive" } } },
          { user: { name: { contains: searchTerm, mode: "insensitive" } } },
          { address: { fullName: { contains: searchTerm, mode: "insensitive" } } },
        ],
      },
      take: 10,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        address: {
          select: {
            fullName: true,
          },
        },
        payment: {
          select: {
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Search products by name, title, slug
    prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { title: { contains: searchTerm, mode: "insensitive" } },
          { slug: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      take: 10,
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Search customers by email, name
    prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: searchTerm, mode: "insensitive" } },
          { name: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    orders,
    products,
    customers,
  };
}
