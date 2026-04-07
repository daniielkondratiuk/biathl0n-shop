// app/api/cart/items/[id]/route.ts
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/server/auth/auth";
import { updateCartItemQuantity, removeCartItem } from "@/features/cart/server/cart-items";
import { getCart } from "@/features/cart/server/cart";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;
    
    // Validate cart item ID
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Cart item ID is required" },
        { status: 400 },
      );
    }

    const json = await request.json();
    const { quantity } = json as { quantity?: number };

    if (quantity === undefined) {
      return NextResponse.json(
        { error: "Quantity is required" },
        { status: 400 },
      );
    }

    await updateCartItemQuantity({ cartItemId: id, quantity });
    
    // Return updated cart
    const cartData = await getCart(session.user.id);
    return NextResponse.json(cartData, { status: 200 });
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update cart item";
    const status = errorMessage.includes("not found") ? 404 : 500;
    return NextResponse.json(
      { error: errorMessage },
      { status },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await params;

    // Dev-only logging
    if (process.env.NODE_ENV === "development") {
      console.log(`[cart-delete-api] Received DELETE request for cart item ID: ${id}`);
    }

    // Validate cart item ID
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Cart item ID is required" },
        { status: 400 },
      );
    }

    await removeCartItem({ cartItemId: id });
    
    // Return updated cart
    const cartData = await getCart(session.user.id);
    return NextResponse.json(cartData, { status: 200 });
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "Failed to remove cart item";
    const status = errorMessage.includes("not found") ? 404 : 500;
    return NextResponse.json(
      { error: errorMessage },
      { status },
    );
  }
}


