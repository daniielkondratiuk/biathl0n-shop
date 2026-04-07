// app/api/upload/temp/cleanup/route.ts
import { NextResponse } from "next/server";
import { cleanupOldTempFiles } from "@/features/upload/server/cleanup-temp-files";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  // Security: Require token from environment
  const expectedToken = process.env.TEMP_CLEANUP_TOKEN;

  if (!expectedToken) {
    // If token not configured, return 404 (endpoint not available)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check token from header
  const providedToken = request.headers.get("X-Temp-Cleanup-Token");

  if (providedToken !== expectedToken) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Parse optional body for olderThanHours
    let olderThanHours: number | undefined;
    try {
      const body = await request.json().catch(() => ({}));
      if (typeof body.olderThanHours === "number") {
        olderThanHours = body.olderThanHours;
      }
    } catch {
      // Body parsing failed or missing, use default
    }

    const result = await cleanupOldTempFiles({ olderThanHours });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Temp cleanup error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to cleanup temp files", details: errorMessage },
      { status: 500 }
    );
  }
}
