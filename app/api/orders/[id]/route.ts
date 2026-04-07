// app/api/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { getAdminOrderById } from "@/features/admin/orders/server/order-details";
import { updateAdminOrder, validateUpdateOrderInput } from "@/features/admin/orders/server/order-update";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const order = await getAdminOrderById(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    const { id: orderId } = await params;

  try {
    const json = await request.json();
    const validated = validateUpdateOrderInput(json);

    if ("status" in validated && typeof validated.status === "number") {
      return NextResponse.json(validated.body, { status: validated.status });
    }

    const updated = await updateAdminOrder(orderId, validated);

    return NextResponse.json({ order: updated }, { status: 200 });
  } catch (error) {
    console.error(`[order-update] Error updating order ${orderId}:`, error);
    
    // Return user-friendly error messages
    const errorMessage = error instanceof Error ? error.message : "Failed to update order";
    const errorDetails = typeof error === "object" && error !== null && "details" in error ? (error as Record<string, unknown>).details : undefined;
    
    // Handle 404 for order not found
    if (errorMessage.includes("Order not found")) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    
    // Handle special case for shipping validation with details
    if (errorMessage.includes("must be PAID") && errorDetails) {
      return NextResponse.json(
        {
          error: errorMessage,
          details: errorDetails,
        },
        { status: 400 },
      );
    }
    
    // Check if it's a business rule violation (400) vs server error (500)
    if (
      errorMessage.includes("must be PAID") ||
      errorMessage.includes("Insufficient")
    ) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 },
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}


