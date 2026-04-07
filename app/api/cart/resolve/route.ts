// app/api/cart/resolve/route.ts
import { NextResponse } from "next/server";
import { resolveCartHandler } from "@/features/cart/server/resolve-cart";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items } = body as {
      items: Array<{
        id: string;
        productId: string;
        colorVariantId: string;
        sizeVariantId: string;
        quantity: number;
        unitPrice?: number;
        finalPrice?: number;
        selectedPatchIds?: string[];
      }>;
    };

    const result = await resolveCartHandler({
      userId: null,
      anonymousToken: null,
      items,
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Error resolving cart items:", error);
    return NextResponse.json(
      { error: "Failed to resolve cart items" },
      { status: 500 },
    );
  }
}

