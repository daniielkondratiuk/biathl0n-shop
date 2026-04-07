// scripts/seed-products.ts
import { PrismaClient, Gender, ProductBadge, Size } from "@prisma/client";

const prisma = new PrismaClient();

// Utility functions (inlined to avoid import issues)
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

function generateVariantSKU(productSlug: string, size: Size): string {
  const sizeCode = size.toUpperCase();
  const slugUpper = productSlug.toUpperCase().replace(/-/g, "");
  return `${slugUpper}-${sizeCode}`;
}

const PRODUCTS = [
  {
    title: "Classic Hoodie",
    description: "A timeless classic hoodie crafted from premium cotton blend. Perfect for everyday wear with a relaxed fit and comfortable feel. Features a spacious front pocket and adjustable drawstring hood.",
    gender: Gender.MEN,
    badge: ProductBadge.NEW,
    basePrice: 6500, // €65.00
  },
  {
    title: "Streetwear Oversize Tee",
    description: "Oversized streetwear t-shirt with a modern, relaxed silhouette. Made from soft, breathable cotton for maximum comfort. Perfect for layering or wearing solo.",
    gender: Gender.UNISEX,
    badge: ProductBadge.BESTSELLER,
    basePrice: 3500, // €35.00
  },
  {
    title: "Minimalist Crewneck Sweatshirt",
    description: "Clean and minimal crewneck sweatshirt with a refined fit. Crafted from premium French terry fabric for exceptional comfort and durability. Perfect for casual elegance.",
    gender: Gender.UNISEX,
    badge: null,
    basePrice: 5500, // €55.00
  },
  {
    title: "Essential Kids Hoodie",
    description: "Comfortable and durable hoodie designed specifically for kids. Made from soft, hypoallergenic materials with reinforced seams for active play. Features fun colors and playful designs.",
    gender: Gender.KIDS,
    badge: ProductBadge.NEW,
    basePrice: 4500, // €45.00
  },
  {
    title: "Women's Cropped Bomber Jacket",
    description: "Stylish cropped bomber jacket with a modern twist. Features a sleek silhouette, premium zipper closure, and comfortable ribbed cuffs. Perfect for transitional weather.",
    gender: Gender.WOMEN,
    badge: ProductBadge.LIMITED,
    basePrice: 8500, // €85.00
  },
  {
    title: "Urban Tech Pants",
    description: "Modern tech pants designed for urban lifestyle. Features water-resistant fabric, multiple pockets, and a tapered fit. Perfect for city adventures and everyday wear.",
    gender: Gender.MEN,
    badge: ProductBadge.BESTSELLER,
    basePrice: 7500, // €75.00
  },
  {
    title: "Premium Cotton Shirt",
    description: "Classic button-down shirt made from premium long-staple cotton. Features a tailored fit, reinforced collar, and mother-of-pearl buttons. Versatile for both casual and smart-casual occasions.",
    gender: Gender.MEN,
    badge: null,
    basePrice: 5500, // €55.00
  },
  {
    title: "Oversized Denim Jacket",
    description: "Contemporary oversized denim jacket with a relaxed fit. Made from premium denim with a soft, broken-in feel. Features classic details with a modern twist.",
    gender: Gender.UNISEX,
    badge: ProductBadge.SALE,
    basePrice: 7000, // €70.00
  },
  {
    title: "Athletic Performance Tee",
    description: "High-performance athletic t-shirt with moisture-wicking technology. Designed for active lifestyles with breathable fabric and ergonomic fit. Perfect for workouts and sports.",
    gender: Gender.UNISEX,
    badge: ProductBadge.NEW,
    basePrice: 4000, // €40.00
  },
  {
    title: "Cozy Fleece Pullover",
    description: "Ultra-soft fleece pullover for maximum comfort. Features a relaxed fit, ribbed cuffs, and a comfortable hood. Perfect for lounging or casual outings.",
    gender: Gender.WOMEN,
    badge: null,
    basePrice: 6000, // €60.00
  },
  {
    title: "Classic Varsity Jacket",
    description: "Retro-inspired varsity jacket with a modern fit. Features premium materials, contrasting sleeves, and ribbed trim. A timeless piece for any wardrobe.",
    gender: Gender.UNISEX,
    badge: ProductBadge.LIMITED,
    basePrice: 9000, // €90.00
  },
  {
    title: "Kids Playful Sweatshirt",
    description: "Fun and colorful sweatshirt designed for active kids. Made from durable, easy-care fabric with playful graphics. Features a comfortable fit for all-day wear.",
    gender: Gender.KIDS,
    badge: ProductBadge.NEW,
    basePrice: 3800, // €38.00
  },
  {
    title: "Minimalist Long Sleeve Tee",
    description: "Essential long sleeve t-shirt with a clean, minimalist design. Made from premium cotton with a relaxed fit. Perfect for layering or wearing alone.",
    gender: Gender.UNISEX,
    badge: null,
    basePrice: 4200, // €42.00
  },
  {
    title: "Women's Tailored Blazer",
    description: "Sophisticated tailored blazer with a modern silhouette. Crafted from premium fabric with structured shoulders and a flattering fit. Versatile for office or casual wear.",
    gender: Gender.WOMEN,
    badge: ProductBadge.BESTSELLER,
    basePrice: 8800, // €88.00
  },
  {
    title: "Street Style Cargo Pants",
    description: "Urban cargo pants with a contemporary street style. Features multiple utility pockets, adjustable waist, and a tapered leg. Made from durable cotton blend.",
    gender: Gender.MEN,
    badge: ProductBadge.NEW,
    basePrice: 7200, // €72.00
  },
  {
    title: "Comfort Fit Joggers",
    description: "Ultra-comfortable joggers with an elastic waistband and adjustable drawstring. Made from soft, stretchy fabric perfect for active wear or lounging.",
    gender: Gender.UNISEX,
    badge: null,
    basePrice: 5800, // €58.00
  },
  {
    title: "Kids Denim Jacket",
    description: "Classic denim jacket sized for kids. Features a comfortable fit, durable construction, and fun details. Perfect for playdates and everyday adventures.",
    gender: Gender.KIDS,
    badge: ProductBadge.SALE,
    basePrice: 4800, // €48.00
  },
  {
    title: "Premium Wool Sweater",
    description: "Luxurious wool sweater with a refined fit. Made from high-quality merino wool for warmth and comfort. Features classic ribbed details and a timeless design.",
    gender: Gender.MEN,
    badge: ProductBadge.LIMITED,
    basePrice: 8200, // €82.00
  },
  {
    title: "Oversized Cardigan",
    description: "Cozy oversized cardigan perfect for layering. Made from soft, chunky knit fabric with a relaxed silhouette. Features button closure and comfortable fit.",
    gender: Gender.WOMEN,
    badge: null,
    basePrice: 6800, // €68.00
  },
  {
    title: "Athletic Shorts",
    description: "Performance athletic shorts designed for movement. Features moisture-wicking fabric, elastic waistband, and side pockets. Perfect for workouts and sports.",
    gender: Gender.UNISEX,
    badge: ProductBadge.NEW,
    basePrice: 3500, // €35.00
  },
  {
    title: "Classic Chino Pants",
    description: "Versatile chino pants with a modern fit. Made from premium cotton twill with a comfortable stretch. Perfect for both casual and smart-casual occasions.",
    gender: Gender.MEN,
    badge: null,
    basePrice: 6500, // €65.00
  },
  {
    title: "Kids Active Shorts",
    description: "Durable active shorts designed for kids' play. Made from easy-care fabric with an elastic waistband. Features fun colors and comfortable fit.",
    gender: Gender.KIDS,
    badge: null,
    basePrice: 2800, // €28.00
  },
  {
    title: "Womens Tailored Trousers",
    description: "Elegant tailored trousers with a flattering fit. Made from premium fabric with a straight leg silhouette. Perfect for professional or smart-casual wear.",
    gender: Gender.WOMEN,
    badge: ProductBadge.BESTSELLER,
    basePrice: 7500, // €75.00
  },
  {
    title: "Streetwear Track Jacket",
    description: "Modern track jacket with streetwear aesthetics. Features zip closure, ribbed trim, and a relaxed fit. Made from lightweight, breathable fabric.",
    gender: Gender.UNISEX,
    badge: ProductBadge.SALE,
    basePrice: 6200, // €62.00
  },
  {
    title: "Premium Hooded Sweatshirt",
    description: "Premium hooded sweatshirt with exceptional quality. Made from heavyweight French terry with a comfortable fit. Features a spacious hood and front pocket.",
    gender: Gender.MEN,
    badge: null,
    basePrice: 7000, // €70.00
  },
  {
    title: "Kids Comfortable Leggings",
    description: "Soft and stretchy leggings perfect for active kids. Made from breathable fabric with an elastic waistband. Features fun patterns and comfortable fit.",
    gender: Gender.KIDS,
    badge: ProductBadge.NEW,
    basePrice: 3200, // €32.00
  },
  {
    title: "Womens Relaxed Fit Tee",
    description: "Comfortable relaxed fit t-shirt with a flattering silhouette. Made from premium cotton with a soft hand feel. Perfect for everyday casual wear.",
    gender: Gender.WOMEN,
    badge: null,
    basePrice: 3800, // €38.00
  },
  {
    title: "Classic Baseball Cap",
    description: "Timeless baseball cap with adjustable strap. Made from premium materials with structured crown. Features embroidered logo and comfortable fit.",
    gender: Gender.UNISEX,
    badge: ProductBadge.BESTSELLER,
    basePrice: 2500, // €25.00
  },
  {
    title: "Urban Windbreaker",
    description: "Lightweight windbreaker perfect for urban adventures. Features water-resistant fabric, zip closure, and adjustable hood. Compact and packable design.",
    gender: Gender.UNISEX,
    badge: ProductBadge.NEW,
    basePrice: 5500, // €55.00
  },
  {
    title: "Premium Leather Jacket",
    description: "Classic leather jacket with a modern fit. Made from genuine leather with quality hardware. Features a timeless design that ages beautifully.",
    gender: Gender.MEN,
    badge: ProductBadge.LIMITED,
    basePrice: 8800, // €88.00
  },
];

const SIZES: Size[] = [Size.XS, Size.S, Size.M, Size.L, Size.XL, Size.XXL];

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

async function main() {
  console.log("🌱 Seeding products...");

  try {
    // Get all categories
    const categories = await prisma.category.findMany();
    if (categories.length === 0) {
      throw new Error("No categories found. Please seed categories first.");
    }

    // Get all active patches
    const patches = await prisma.patch.findMany({
      where: { isActive: true },
    });

    let createdCount = 0;

    for (const productData of PRODUCTS) {
      const slug = generateSlug(productData.title);
      
      // Check if product already exists
      const existing = await prisma.product.findUnique({
        where: { slug },
      });

      if (existing) {
        console.log(`⏭️  Skipping ${productData.title} (already exists)`);
        continue;
      }

      // Random category
      const category = getRandomElement(categories);

      // Random 0-3 patches
      const numPatches = getRandomInt(0, Math.min(3, patches.length));
      const selectedPatches = patches
        .sort(() => Math.random() - 0.5)
        .slice(0, numPatches)
        .map((p) => p.id);

      // Generate variants for all sizes
      const variants = SIZES.map((size) => {
        const stock = getRandomInt(0, 50);
        const priceDiff = getRandomInt(-2000, 4000); // -€20 to +€40
        return {
          size,
          stock,
          priceDiff,
          sku: generateVariantSKU(slug, size),
        };
      });

      // Calculate total stock
      const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);

      // Create product
      const product = await prisma.product.create({
        data: {
          name: productData.title, // Backward compatibility
          title: productData.title,
          slug,
          description: productData.description,
          basePrice: productData.basePrice,
          price: productData.basePrice, // Backward compatibility
          stock: totalStock, // Legacy field
          visible: true,
          isActive: true,
          categoryId: category.id,
          gender: productData.gender,
          badge: productData.badge,
          defaultPatchIds: selectedPatches,
          // Note: Color variants need to be created separately after colors are seeded
          // This seed script needs to be updated to support the new color variant architecture
        },
        include: {
          category: true,
        },
      });

      // Create ProductPatch relations if patches selected
      if (selectedPatches.length > 0) {
        await prisma.productPatch.createMany({
          data: selectedPatches.map((patchId) => ({
            productId: product.id,
            patchId,
          })),
        });
      }

      createdCount++;
      console.log(`✅ Created: ${productData.title} (${variants.length} variants, ${selectedPatches.length} patches)`);
    }

    console.log(`\n✅ Successfully seeded ${createdCount} products!`);
  } catch (error) {
    console.error("❌ Error seeding products:", error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

