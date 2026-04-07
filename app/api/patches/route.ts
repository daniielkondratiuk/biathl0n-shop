// app/api/patches/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { listPatches, createPatch } from "@/features/admin/patches/server/patches";

export async function GET() {
  try {
    const result = await listPatches();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching patches:", error);
    return NextResponse.json(
      { error: "Failed to fetch patches" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = await createPatch(body);

    if ("status" in result) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating patch:", error);
    return NextResponse.json(
      { error: "Failed to create patch" },
      { status: 500 }
    );
  }
}

