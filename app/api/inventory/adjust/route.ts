// app/api/inventory/adjust/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { adjustInventory } from "@/features/admin/inventory/server/adjust-inventory";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const result = await adjustInventory(json);

    if ("status" in result) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json({ success: true, variant: result.variant }, { status: 200 });
  } catch (error) {
    console.error("Error adjusting stock:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to adjust stock",
      },
      { status: 500 },
    );
  }
}

