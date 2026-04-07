// scripts/migrate-image-roles.ts
/**
 * One-time migration script to fix existing image data:
 * - If colorVariant has 0 images → leave as-is
 * - If colorVariant has 1 image → assign role = MAIN
 * - If colorVariant has 2+ images → image[0] = MAIN, image[1] = MAIN_DETAIL, rest = GALLERY
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateImageRoles() {
  console.log("Starting image role migration...");

  try {
    // Get all color variants with images
    const colorVariants = await prisma.productColorVariant.findMany({
      include: {
        images: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }], // Order by existing order, then creation date
        },
      },
    });

    let updated = 0;
    let skipped = 0;

    for (const colorVariant of colorVariants) {
      const images = colorVariant.images;

      // Skip if no images
      if (images.length === 0) {
        skipped++;
        continue;
      }

      // If images already have roles assigned, check if they're valid
      const hasMain = images.some((img) => img.role === "MAIN");

      // If roles are already correctly assigned, skip
      if (hasMain && images.length > 0) {
        // Check if MAIN is unique
        const mainCount = images.filter((img) => img.role === "MAIN").length;
        const mainDetailCount = images.filter((img) => img.role === "MAIN_DETAIL").length;

        if (mainCount === 1 && mainDetailCount <= 1) {
          skipped++;
          continue;
        }
      }

      // Migrate images based on count
      const updates: Array<{ id: string; role: "MAIN" | "MAIN_DETAIL" | "GALLERY"; order: number }> = [];

      if (images.length === 1) {
        // Single image → MAIN
        updates.push({
          id: images[0].id,
          role: "MAIN",
          order: 0,
        });
      } else if (images.length >= 2) {
        // First image → MAIN
        updates.push({
          id: images[0].id,
          role: "MAIN",
          order: 0,
        });
        // Second image → MAIN_DETAIL
        updates.push({
          id: images[1].id,
          role: "MAIN_DETAIL",
          order: 1,
        });
        // Rest → GALLERY
        for (let i = 2; i < images.length; i++) {
          updates.push({
            id: images[i].id,
            role: "GALLERY",
            order: i,
          });
        }
      }

      // Update all images in a transaction
      await prisma.$transaction(
        updates.map((update) =>
          prisma.productImage.update({
            where: { id: update.id },
            data: {
              role: update.role,
              order: update.order,
            },
          })
        )
      );

      updated++;
      console.log(`Updated color variant ${colorVariant.id}: ${images.length} images`);
    }

    console.log(`\nMigration complete!`);
    console.log(`- Updated: ${updated} color variants`);
    console.log(`- Skipped: ${skipped} color variants (already correct or empty)`);
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateImageRoles()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });

