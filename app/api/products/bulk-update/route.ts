// app/api/products/bulk-update/route.ts
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import {
  bulkUpdateProducts,
  validateBulkUpdateInput,
} from "@/features/admin/products/server/bulk-update";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const validated = validateBulkUpdateInput(json);

    if ("body" in validated) {
      return NextResponse.json(validated.body, { status: validated.status });
    }

    const result = await bulkUpdateProducts(validated);
    revalidatePath("/admin/products");
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error bulk updating products:", error);
    return NextResponse.json(
      { error: "Failed to bulk update products" },
      { status: 500 }
    );
  }
}
