// prisma/seed.ts
import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Minimal stub seeding; real product/category seeding will be implemented
  // in a later phase when we add concrete catalog data.

  const adminEmail = "admin@biathl0n.com";
  const adminPassword = "admin123"; // Default admin password

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  const passwordHash = await hash(adminPassword, 10);

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Admin",
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    console.log(`✅ Created admin user: ${adminEmail} / ${adminPassword}`);
  } else {
    // Update existing admin with properly hashed password
    await prisma.user.update({
      where: { email: adminEmail },
      data: { passwordHash },
    });
    console.log(`✅ Updated admin user password: ${adminEmail} / ${adminPassword}`);
  }

  // Placeholder categories to verify relations; will be replaced with real seed data.
  const tshirts = await prisma.category.upsert({
    where: { slug: "t-shirts" },
    update: {},
    create: {
      name: "T-shirts",
      slug: "t-shirts",
      description: "Custom premium T-shirts.",
    },
  });

  await prisma.category.upsert({
    where: { slug: "hoodies" },
    update: {},
    create: {
      name: "Hoodies",
      slug: "hoodies",
      description: "Cozy custom hoodies.",
    },
  });

  // Simple sample product to exercise the schema; full catalog comes later.
  await prisma.product.upsert({
    where: { slug: "sample-tee-black" },
    update: {},
    create: {
      name: "Sample Tee — Black",
      slug: "sample-tee-black",
      description:
        "A placeholder black tee used for testing the predators-shop schema.",
      price: 2900,
      stock: 50,
      visible: true,
      categoryId: tshirts.id,
    },
  });
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


