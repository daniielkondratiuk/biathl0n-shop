import { type NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { extname } from "path";
import { getProductUploadFilePath } from "@/server/fs-paths";

const MIME: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

const ALLOWED_EXTENSIONS = new Set(Object.keys(MIME));

function isSafeSegment(value: string): boolean {
  return !!value && !value.includes("/") && !value.includes("\\") && !value.includes("..");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string; filename: string }> }
) {
  const { productId, filename } = await params;

  if (!isSafeSegment(productId) || !isSafeSegment(filename)) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  const ext = extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return new NextResponse("File type not allowed", { status: 400 });
  }

  const filePath = getProductUploadFilePath(productId, filename);

  try {
    const data = await readFile(filePath);
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": MIME[ext],
        "Content-Length": String(data.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
