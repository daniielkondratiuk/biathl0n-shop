import { prisma } from "@/server/db/prisma";

export async function listPublicVisibleProducts() {
  const products = await prisma.product.findMany({
    where: { visible: true },
    orderBy: { createdAt: "desc" },
    include: {
      colorVariants: {
        include: {
          color: true,
          images: {
            orderBy: [{ role: "asc" }, { order: "asc" }],
          },
          sizes: {
            orderBy: { size: "asc" },
          },
        },
      },
      category: true,
    },
  });

  return products;
}

