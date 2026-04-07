// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { getCatalogProducts } from "@/features/products/server/public-products";
import { createAdminProduct } from "@/features/admin/products/server/create-product";

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

export async function GET(request: NextRequest) {
  const locale = detectLocale(request);
  const catalog = await getCatalogProducts({
    page: 1,
    pageSize: 1000, // Large page size to get all products
    locale,
  });
  return NextResponse.json({ products: catalog.items }, { status: 200 });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();

    const result = await createAdminProduct(json);

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

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);

    const errorMessage = error instanceof Error ? error.message : "Failed to create product";
    return NextResponse.json(
      { error: "Failed to create product", details: errorMessage },
      { status: 500 }
    );
  }
}
