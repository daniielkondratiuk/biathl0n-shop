// scripts/backfill-product-translations.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting product translations backfill...");

  const products = await prisma.product.findMany({
    select: {
      id: true,
      title: true,
      name: true,
      description: true,
    },
  });

  console.log(`Found ${products.length} products to process.`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    // Use title if available, otherwise fall back to name
    const title = product.title || product.name || "";

    if (!title) {
      console.warn(`Skipping product ${product.id}: no title or name available`);
      skipped++;
      continue;
    }

    // Check if translation already exists
    const existing = await prisma.productTranslation.findUnique({
      where: {
        productId_locale: {
          productId: product.id,
          locale: "en",
        },
      },
    });

    // Upsert ProductTranslation for locale "en"
    await prisma.productTranslation.upsert({
      where: {
        productId_locale: {
          productId: product.id,
          locale: "en",
        },
      },
      update: {
        title,
        description: product.description,
      },
      create: {
        productId: product.id,
        locale: "en",
        title,
        description: product.description,
      },
    });

    if (existing) {
      updated++;
    } else {
      created++;
    }
  }

  console.log("\nBackfill summary:");
  console.log(`  Total products scanned: ${products.length}`);
  console.log(`  Translations created: ${created}`);
  console.log(`  Translations updated: ${updated}`);
  console.log(`  Products skipped: ${skipped}`);
  console.log("\nBackfill completed successfully.");
}

main()
  .catch((error) => {
    console.error("Error during backfill:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
