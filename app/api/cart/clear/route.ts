// app/api/cart/clear/route.ts
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/server/auth/auth";
import { clearCart } from "@/features/cart/server/cart-clear";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const result = await clearCart({ userId: session.user.id, anonymousToken: null });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to clear cart" },
      { status: 500 },
    );
  }
}

