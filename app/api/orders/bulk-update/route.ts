// app/api/orders/bulk-update/route.ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { bulkUpdateOrderStatuses, bulkCancelOrders, validateBulkUpdateInput, validateBulkCancelInput } from "@/features/admin/orders/server/bulk-update";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    
    // Dev-only logging to verify payload
    if (process.env.NODE_ENV === "development") {
      const ids = json?.ids || [];
      console.log(`[bulk-update-api] Received ${ids.length} order IDs:`, ids.slice(0, 3).join(", "), ids.length > 3 ? "..." : "");
    }
    
    const validated = validateBulkUpdateInput(json);

    // Check if validation error: BulkUpdateValidationError has status as number and body field
    // BulkUpdateOrderStatusesInput has status as string and no body field
    if ("body" in validated && typeof validated.status === "number") {
      return NextResponse.json(validated.body, { status: validated.status });
    }

    // TypeScript now knows this is BulkUpdateOrderStatusesInput
    const result = await bulkUpdateOrderStatuses(validated);
    // Revalidate the orders list page to ensure fresh data
    revalidatePath("/admin/orders");
    // Return 200 even if some failed, but include the result structure
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update orders" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const ids = validateBulkCancelInput(json);

    try {
      const result = await bulkCancelOrders({ ids });
      // Revalidate the orders list page to ensure fresh data
      revalidatePath("/admin/orders");
      return NextResponse.json(result, { status: 200 });
    } catch (error) {
      const details = (typeof error === "object" && error !== null && "details" in error ? (error as Record<string, unknown>).details : null) || [error instanceof Error ? error.message : "Failed to cancel orders"];
      return NextResponse.json(
        { error: "Failed to cancel orders", details },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete orders" },
      { status: 500 },
    );
  }
}

