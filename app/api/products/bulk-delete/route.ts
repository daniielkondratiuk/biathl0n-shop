// app/api/products/bulk-delete/route.ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { validateBulkDeleteInput } from "@/features/admin/products/server/bulk-update";
import { deleteProductImages } from "@/lib/utils/product-image-cleanup";
import { prisma } from "@/server/db/prisma";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const validated = validateBulkDeleteInput(json);

    if ("body" in validated) {
      return NextResponse.json(validated.body, { status: validated.status });
    }

    const { ids } = validated;

    // Fetch products first to validate existence and determine which IDs will be deleted.
    const products = await prisma.product.findMany({
      where: {
        id: { in: ids },
      },
      select: {
        id: true,
      },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { error: "No products found to delete" },
        { status: 404 }
      );
    }

    const productIds = products.map((p) => p.id);

    // 1) Delete from database first (keep DB consistent; no image deletions if this fails).
    let deletedCount = 0;
    try {
      const dbResult = await prisma.$transaction(async (tx) => {
        return tx.product.deleteMany({
          where: {
            id: { in: productIds },
          },
        });
      });
      deletedCount = dbResult.count;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: `Failed to delete products: ${errorMessage}` },
        { status: 500 }
      );
    }

    // 2) After DB deletion succeeds, delete local image files (best-effort).
    // If image deletion fails, we return a warning but keep DB deletion as-is.
    const imageDeletionErrors: Array<{ productId: string; error: string }> = [];
    const deletionResults: Array<{
      productId: string;
      deletedCount: number;
      failedCount: number;
    }> = [];

    for (const productId of productIds) {
      try {
        // Deletes /public/uploads/products/{productId}
        const result = await deleteProductImages(productId);
        deletionResults.push({
          productId,
          deletedCount: result.deleted.length,
          failedCount: result.failed.length,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[bulk-delete] Failed to delete local images for product ${productId}:`,
          errorMessage
        );
        imageDeletionErrors.push({ productId, error: errorMessage });
        deletionResults.push({
          productId,
          deletedCount: 0,
          failedCount: 0,
        });
      }
    }

    // DEV-only: Log summary of image deletions
    if (process.env.NODE_ENV === "development") {
      for (const result of deletionResults) {
        console.log(
          `[bulk-delete] product ${result.productId}: deletedFiles=${result.deletedCount} failedFiles=${result.failedCount}`
        );
      }
    }

    revalidatePath("/admin/products");
    return NextResponse.json(
      {
        ok: true,
        deletedCount,
        ...(imageDeletionErrors.length > 0
          ? {
              warning:
                "Products deleted from DB, but some local image folders could not be deleted.",
              imageDeletionErrors,
            }
          : {}),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting products:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete products", details: errorMessage },
      { status: 500 }
    );
  }
}
