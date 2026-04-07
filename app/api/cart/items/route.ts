// app/api/cart/items/route.ts
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/server/auth/auth";
import { addCartItem } from "@/features/cart/server/cart-items";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only authenticated users can access this endpoint
    if (!session?.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const json = await request.json();
    const { productId, colorVariantId, sizeVariantId, selectedPatchIds, quantity } = json as {
      productId: string;
      colorVariantId?: string | null;
      sizeVariantId?: string | null;
      selectedPatchIds?: string[];
      quantity?: number;
    };

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 },
      );
    }

    if (!sizeVariantId) {
      return NextResponse.json(
        { error: "sizeVariantId is required" },
        { status: 400 },
      );
    }

    const result = await addCartItem(session.user.id, {
      productId,
      colorVariantId,
      sizeVariantId,
      selectedPatchIds,
      quantity,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add item to cart" },
      { status: 500 },
    );
  }
}


