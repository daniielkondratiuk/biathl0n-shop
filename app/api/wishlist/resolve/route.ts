// app/api/wishlist/resolve/route.ts
import { revalidateTag } from "next/cache";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/server/auth/auth";
import { resolveWishlist } from "@/features/wishlist/server/wishlist-resolve";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const json = await request.json();
    const { items } = json as {
      items: Array<{
        productId: string;
        colorVariantId?: string | null;
        sizeVariantId?: string | null;
      }>;
    };

    const result = await resolveWishlist(items);
    if (session?.user?.id) {
      revalidateTag(`wishlist:${session.user.id}`, "max");
    }
    
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
