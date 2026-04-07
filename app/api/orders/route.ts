// app/api/orders/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { getOrdersWithPagination } from "@/features/admin/orders/server/orders-list";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
  const search = searchParams.get("q") || undefined;
  const paymentStatus = searchParams.get("payment") || undefined;
  const fulfillmentStatus = searchParams.get("fulfillment") || undefined;
  const dateRange = searchParams.get("range") || undefined;

  const result = await getOrdersWithPagination({
    page,
    pageSize,
    search,
    paymentStatus,
    fulfillmentStatus,
    dateRange,
  });

  // Return backward-compatible shape: include orders array (previous API returned { orders })
  // but also include pagination metadata for better API usability
  return NextResponse.json(result, { status: 200 });
}


