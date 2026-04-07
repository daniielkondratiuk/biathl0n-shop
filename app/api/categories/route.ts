// app/api/categories/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { listCategories, createCategory } from "@/features/admin/categories/server/list-categories";

export async function GET() {
  const categories = await listCategories();
  return NextResponse.json({ categories }, { status: 200 });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const result = await createCategory(json);

    if ("status" in result) {
      const body: { error: string; details?: unknown } = {
        error: result.error,
      };
      if (result.details) {
        body.details = result.details;
      }
      return NextResponse.json(body, { status: result.status });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}


