import { prisma } from "@/server/db/prisma";
import { deleteProductImages } from "@/lib/utils/product-image-cleanup";

export async function deleteAdminProductById(productId: string) {
  // Delete product images
  await deleteProductImages(productId);

  // Delete product from database (cascade will handle color variants, sizes, images)
  await prisma.product.delete({
    where: { id: productId },
  });
}

