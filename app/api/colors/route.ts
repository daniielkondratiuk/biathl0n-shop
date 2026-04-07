// app/api/colors/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { getAdminColors, createAdminColor } from "@/features/admin/colors/server/colors";

// Disable caching to ensure fresh color data (canonical order from DB)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const { colors } = await getAdminColors();
  return NextResponse.json({ colors }, { status: 200 });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const result = await createAdminColor(json);
  return NextResponse.json(result.body, { status: result.status });
}

