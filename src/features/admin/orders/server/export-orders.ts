import { prisma } from "@/server/db/prisma";

export async function exportOrders(ids?: string[]) {
  const where = ids && ids.length > 0 ? { id: { in: ids } } : {};

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: true,
      address: true,
      payment: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Generate CSV
  const headers = [
    "Order Number",
    "Order ID",
    "Date",
    "Customer Name",
    "Customer Email",
    "Status",
    "Payment Status",
    "Total",
    "Currency",
    "Items Count",
    "Shipping Address",
  ];

  const rows = orders.map((order) => {
    const address = order.address
      ? `${order.address.line1}, ${order.address.city}, ${order.address.country}`
      : "";
    return [
      order.orderNumber || order.id.slice(0, 8),
      order.id,
      new Date(order.createdAt).toISOString(),
      order.user?.name || order.address?.fullName || "Guest",
      order.user?.email || "",
      order.status,
      order.payment?.status || "N/A",
      (order.total / 100).toFixed(2),
      order.currency.toUpperCase(),
      order.items.length.toString(),
      address,
    ];
  });

  const csv = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");

  const filename = `orders-${new Date().toISOString().split("T")[0]}.csv`;

  return { csv, filename };
}

