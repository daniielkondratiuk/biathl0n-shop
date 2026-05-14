const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const TARGET_CATEGORY_SLUGS = ["cap", "caps", "beanies", "beanie"];

function uniqueSku(productSlug, colorSlug) {
  return `${productSlug}-${colorSlug}-unique`;
}

(async () => {
  await prisma.$executeRawUnsafe('ALTER TYPE "Size" ADD VALUE IF NOT EXISTS \'UNIQUE\' BEFORE \'XS\'');

  const products = await prisma.product.findMany({
    where: { category: { slug: { in: TARGET_CATEGORY_SLUGS } } },
    include: {
      category: true,
      colorVariants: {
        include: {
          color: true,
          sizes: {
            include: {
              _count: { select: { orderItems: true, cartItems: true, inventory: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
    orderBy: { slug: "asc" },
  });

  let updatedVariants = 0;
  let deletedSizeRows = 0;
  let reassignedRefs = 0;

  for (const product of products) {
    for (const variant of product.colorVariants) {
      const sizes = variant.sizes;
      if (!sizes.length) continue;

      const referenced = sizes.filter((size) =>
        size._count.orderItems || size._count.cartItems || size._count.inventory
      );
      const keep =
        sizes.find((size) => size.size === "UNIQUE") ||
        referenced[0] ||
        sizes.find((size) => size.size === "M") ||
        sizes[0];

      const stock = sizes.reduce((sum, size) => sum + size.stock, 0);
      const stockReserved = sizes.reduce((sum, size) => sum + size.stockReserved, 0);
      const priceDiff = Math.min(...sizes.map((size) => size.priceDiff));
      const sku = uniqueSku(product.slug, variant.color.slug);
      const removeIds = sizes.filter((size) => size.id !== keep.id).map((size) => size.id);

      for (const oldId of removeIds) {
        const [orders, carts, inventory] = await Promise.all([
          prisma.orderItem.updateMany({ where: { sizeVariantId: oldId }, data: { sizeVariantId: keep.id } }),
          prisma.cartItem.updateMany({ where: { sizeVariantId: oldId }, data: { sizeVariantId: keep.id } }),
          prisma.inventoryMovement.updateMany({ where: { sizeVariantId: oldId }, data: { sizeVariantId: keep.id } }),
        ]);
        reassignedRefs += orders.count + carts.count + inventory.count;
      }

      if (removeIds.length) {
        const result = await prisma.productSizeVariant.deleteMany({
          where: { id: { in: removeIds } },
        });
        deletedSizeRows += result.count;
      }

      await prisma.productSizeVariant.update({
        where: { id: keep.id },
        data: {
          size: "UNIQUE",
          stock,
          stockReserved,
          priceDiff,
          sku,
        },
      });
      updatedVariants++;
    }
  }
  const summary = await prisma.product.findMany({
    where: { category: { slug: { in: TARGET_CATEGORY_SLUGS } } },
    select: {
      slug: true,
      category: { select: { slug: true } },
      colorVariants: { select: { sizes: { select: { size: true } } } },
    },
    orderBy: { slug: "asc" },
  });

  console.log(JSON.stringify({
    ok: true,
    products: products.length,
    updatedVariants,
    deletedSizeRows,
    remainingSizes: summary.map((product) => ({
      slug: product.slug,
      category: product.category.slug,
      sizes: [...new Set(product.colorVariants.flatMap((variant) => variant.sizes.map((size) => size.size)))],
    })),
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => prisma.$disconnect());
