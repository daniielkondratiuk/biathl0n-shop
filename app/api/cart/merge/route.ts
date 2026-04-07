// app/api/cart/merge/route.ts
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/server/auth/auth";
import { mergeCart, type GuestCartItem } from "@/features/cart/server/cart-merge";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const json = await request.json();
    const { guestItems } = json as { guestItems: GuestCartItem[] };

    if (!Array.isArray(guestItems)) {
      return NextResponse.json(
        { error: "guestItems must be an array" },
        { status: 400 },
      );
    }

    const result = await mergeCart(session.user.id, guestItems);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to merge cart" },
      { status: 500 },
    );
  }
}

