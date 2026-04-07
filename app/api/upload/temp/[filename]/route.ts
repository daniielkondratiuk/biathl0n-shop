// app/api/upload/temp/[filename]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { deleteTempFile } from "@/features/upload/server/delete-temp-file";

interface Params {
  params: Promise<{
    filename: string;
  }>;
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename } = await params;
    const result = await deleteTempFile(filename);

    if ("status" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Delete temp error:", error);
    return NextResponse.json(
      { error: "Failed to delete temp file" },
      { status: 500 }
    );
  }
}

