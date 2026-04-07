// scripts/seed-colors.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Canonical color palette - order must be preserved exactly
const colors = [
  { name: "Black", nameFr: "Noir", slug: "black", hex: "#000000" },
  { name: "Gray", nameFr: "Gris", slug: "gray", hex: "#787875" },
  { name: "Light Gray", nameFr: "Gris clair", slug: "light-gray", hex: "#C3C3BD" },
  { name: "White", nameFr: "Blanc", slug: "white", hex: "#FFFFFF" },
  { name: "Green", nameFr: "Vert", slug: "green", hex: "#477A55" },
  { name: "Red", nameFr: "Rouge", slug: "red", hex: "#9B3530" },
  { name: "Dark Red", nameFr: "Rouge foncé", slug: "dark-red", hex: "#601B25" },
  { name: "Brown", nameFr: "Marron", slug: "brown", hex: "#674C36" },
  { name: "Light Brown", nameFr: "Marron clair", slug: "light-brown", hex: "#B69177" },
  { name: "Blue", nameFr: "Bleu", slug: "blue", hex: "#4B6E98" },
  { name: "Light Blue", nameFr: "Bleu clair", slug: "light-blue", hex: "#93C4EC" },
  { name: "Orange", nameFr: "Orange", slug: "orange", hex: "#FFA000" },
];

async function main() {
  console.log("Seeding colors...\n");

  // Upsert canonical colors in order
  const canonicalSlugs = new Set(colors.map(c => c.slug));
  const upsertedColors = [];

  for (const color of colors) {
    const result = await prisma.color.upsert({
      where: { slug: color.slug },
      update: {
        name: color.name,
        nameFr: color.nameFr,
        hex: color.hex.toUpperCase(), // Ensure uppercase with leading #
      },
      create: {
        name: color.name,
        nameFr: color.nameFr,
        slug: color.slug,
        hex: color.hex.toUpperCase(),
      },
    });

    upsertedColors.push(result);
    console.log(`✓ ${result.name} (${result.slug}) - ${result.hex}`);
  }

  // Safe cleanup: delete obsolete colors that are not referenced
  console.log("\nChecking for obsolete colors...");
  const allColors = await prisma.color.findMany();
  const obsoleteColors = allColors.filter(c => !canonicalSlugs.has(c.slug));
  
  if (obsoleteColors.length > 0) {
    const cannotDelete: string[] = [];
    
    for (const obsoleteColor of obsoleteColors) {
      // Check if color is referenced by any ProductColorVariant
      const referenced = await prisma.productColorVariant.findFirst({
        where: { colorId: obsoleteColor.id },
      });
      
      if (referenced) {
        cannotDelete.push(obsoleteColor.slug);
        console.log(`⚠ Skipping deletion of "${obsoleteColor.name}" (${obsoleteColor.slug}) - still referenced by products`);
      } else {
        try {
          await prisma.color.delete({
            where: { id: obsoleteColor.id },
          });
          console.log(`🗑 Deleted obsolete color: ${obsoleteColor.name} (${obsoleteColor.slug})`);
        } catch (error) {
          // Handle foreign key constraint errors gracefully
          console.error(`❌ Failed to delete "${obsoleteColor.name}" (${obsoleteColor.slug}):`, error instanceof Error ? error.message : String(error));
          cannotDelete.push(obsoleteColor.slug);
        }
      }
    }
    
    if (cannotDelete.length > 0) {
      console.log(`\n⚠ Warning: Could not delete ${cannotDelete.length} color(s) due to existing references: ${cannotDelete.join(", ")}`);
      console.log("   These colors may need manual migration or product updates.");
    }
  } else {
    console.log("✓ No obsolete colors found.");
  }

  console.log("\n✅ Colors seeded successfully!");
  console.log(`   Total canonical colors: ${upsertedColors.length}`);
}

main()
  .catch((e) => {
    console.error("Error seeding colors:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

