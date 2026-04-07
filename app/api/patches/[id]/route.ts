// app/api/patches/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { getPatchById, updatePatchById, deletePatchById } from "@/features/admin/patches/server/patch-by-id";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const patch = await getPatchById(id);
    return NextResponse.json({ patch });
  } catch (error) {
    console.error("Error fetching patch:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch patch";
    const status = errorMessage.includes("not found") ? 404 : 500;
    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const result = await updatePatchById(id, body);

    if ("status" in result) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating patch:", error);
    return NextResponse.json(
      { error: "Failed to update patch" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await deletePatchById(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting patch:", error);
    return NextResponse.json(
      { error: "Failed to delete patch" },
      { status: 500 }
    );
  }
}

