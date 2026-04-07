// app/api/cart/route.ts
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/server/auth/auth";
import { getCart } from "@/features/cart/server/cart";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  // Only authenticated users can access this endpoint
  if (!session?.user.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const result = await getCart(session.user.id);

  return NextResponse.json(result, { status: 200 });
}


