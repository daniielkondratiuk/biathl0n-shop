// scripts/generate-order-numbers.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function generateOrderNumber(sequence: number): Promise<string> {
  return `UFO-${String(sequence).padStart(6, "0")}`;
}

async function main() {
  console.log("Generating order numbers for existing orders...");

  // Get all orders without order numbers, ordered by creation date
  const orders = await prisma.order.findMany({
    where: {
      orderNumber: null,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(`Found ${orders.length} orders without order numbers`);

  // Get the highest existing order number to determine starting sequence
  const lastOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        not: null,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  let sequence = 1;
  if (lastOrder?.orderNumber) {
    const match = lastOrder.orderNumber.match(/\d+$/);
    if (match) {
      sequence = parseInt(match[0], 10) + 1;
    }
  }

  // Generate order numbers for all orders
  for (const order of orders) {
    const orderNumber = await generateOrderNumber(sequence);
    await prisma.order.update({
      where: { id: order.id },
      data: { orderNumber },
    });
    console.log(`Generated ${orderNumber} for order ${order.id.slice(0, 8)}`);
    sequence++;
  }

  console.log(`✅ Generated ${orders.length} order numbers`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

