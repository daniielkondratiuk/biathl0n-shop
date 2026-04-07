// app/api/products/bulk-status/route.ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import {
  bulkUpdateProductStatus,
  validateBulkStatusInput,
} from "@/features/admin/products/server/bulk-update";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const validated = validateBulkStatusInput(json);

    if ("body" in validated) {
      return NextResponse.json(validated.body, { status: validated.status });
    }

    const result = await bulkUpdateProductStatus(validated);
    revalidatePath("/admin/products");
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error updating product status:", error);
    return NextResponse.json(
      { error: "Failed to update product status" },
      { status: 500 }
    );
  }
}
