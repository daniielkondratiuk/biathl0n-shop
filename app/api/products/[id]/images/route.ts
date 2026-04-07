// app/api/products/[id]/images/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { getProductImageDir } from "@/lib/utils/image-utils";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: productId } = await params;
    const body = await request.json();
    const { imageUrl } = body as { imageUrl: string };

    if (!imageUrl) {
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 }
      );
    }

    // Extract filename from URL
    // URL format: /uploads/products/{productId}/{filename}
    const urlParts = imageUrl.split("/");
    const filename = urlParts[urlParts.length - 1];

    if (!filename) {
      return NextResponse.json(
        { error: "Invalid image URL" },
        { status: 400 }
      );
    }

    const productDir = getProductImageDir(productId);
    const filePath = join(productDir, filename);

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: "Image file not found" },
        { status: 404 }
      );
    }

    await unlink(filePath);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete image error:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}

