import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { copyFile, mkdir, unlink, access } from "fs/promises";
import {
  getTempFilePath,
  getProductUploadDir,
  getProductUploadFilePath,
} from "@/server/fs-paths";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { productId, filenames } = body as {
      productId: string;
      filenames: string[];
    };

    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { error: "productId is required and must be a string" },
        { status: 400 }
      );
    }

    if (!Array.isArray(filenames) || filenames.length === 0) {
      return NextResponse.json(
        { error: "filenames must be a non-empty array" },
        { status: 400 }
      );
    }

    const destDir = getProductUploadDir(productId);
    await mkdir(destDir, { recursive: true });

    // Validate every temp file exists before moving anything
    for (const filename of filenames) {
      const src = getTempFilePath(filename);
      try {
        await access(src);
      } catch {
        return NextResponse.json(
          { error: `Temp file not found: ${filename}` },
          { status: 400 }
        );
      }
    }

    // Copy all files to the permanent location
    const urls: string[] = [];
    for (const filename of filenames) {
      const src = getTempFilePath(filename);
      const dest = getProductUploadFilePath(productId, filename);
      await copyFile(src, dest);
      urls.push(`/uploads/products/${productId}/${filename}`);
    }

    // Delete temp originals (non-fatal if cleanup fails)
    for (const filename of filenames) {
      try {
        await unlink(getTempFilePath(filename));
      } catch {
        // Temp cleanup is best-effort
      }
    }

    return NextResponse.json({ urls }, { status: 200 });
  } catch (error) {
    console.error("Commit error:", error);
    return NextResponse.json(
      { error: "Failed to commit images" },
      { status: 500 }
    );
  }
}
