// app/api/upload/temp-image/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { uploadTempImage } from "@/features/upload/server/temp-image";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    
    // Get all files (support multiple files)
    const files = formData.getAll("files") as File[];
    const singleFile = formData.get("file") as File | null;
    
    // Support both "file" (single) and "files" (multiple) for backward compatibility
    const allFiles: File[] = files.length > 0 ? files : (singleFile ? [singleFile] : []);

    const result = await uploadTempImage(allFiles);

    if ("status" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // Return array of results (single file returns array with one item for consistency)
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Temp upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

