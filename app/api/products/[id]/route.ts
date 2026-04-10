// app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { getAdminProductById } from "@/features/admin/products/server/get-product";
import { getProductBySlug } from "@/features/products/server/public-products";
import { updateAdminProductById } from "@/features/admin/products/server/update-product";
import { deleteAdminProductById } from "@/features/admin/products/server/delete-product";

// Force Node.js runtime for reliable Prisma transactions
export const runtime = "nodejs";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Detect locale from request (query param > cookie > header > default "en")
 */
function detectLocale(request: NextRequest): string {
  const url = new URL(request.url);
  const queryLocale = url.searchParams.get("locale");
  if (queryLocale === "en" || queryLocale === "fr") {
    return queryLocale;
  }

  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value || request.cookies.get("locale")?.value;
  if (cookieLocale === "en" || cookieLocale === "fr") {
    return cookieLocale;
  }

  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage?.includes("fr")) {
    return "fr";
  }

  return "en";
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const locale = detectLocale(request);
    
    // Try as slug first (storefront), then as ID (admin)
    let product: Record<string, unknown> | null = await getProductBySlug(id, locale);

    if (!product) {
      // Fallback to admin function (by ID)
      product = await getAdminProductById(id);
    }

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const json = await request.json();

    const result = await updateAdminProductById(id, json);

    if ("status" in result) {
      const body: { error: string; details?: unknown; messages?: unknown } = {
        error: result.error,
      };
      if (result.details) {
        body.details = result.details;
      }
      if (result.messages) {
        body.messages = result.messages;
      }
      return NextResponse.json(body, { status: result.status }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error updating product:", error);

    const errorMessage = error instanceof Error ? error.message : "Failed to update product";
    return NextResponse.json(
      { error: "Failed to update product", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    await deleteAdminProductById(id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
