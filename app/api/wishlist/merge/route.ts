// app/api/wishlist/merge/route.ts
import { getServerSession } from "next-auth/next";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { authOptions } from "@/server/auth/auth";
import { mergeWishlist } from "@/features/wishlist/server/wishlist-merge";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const json = await request.json();
    const { items } = json as {
      items: Array<{
        productId: string;
        colorVariantId?: string | null;
        sizeVariantId?: string | null;
      }>;
    };

    const result = await mergeWishlist(session.user.id, items);
    revalidateTag(`wishlist:${session.user.id}`, "max");
    
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
