// app/api/admin/company/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { getCompanyProfile, upsertCompanyProfile } from "@/features/admin/company";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await getCompanyProfile();
    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error("Error fetching company profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch company profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const result = await upsertCompanyProfile(json);

    if ("status" in result) {
      const body: { error: string; details?: unknown } = {
        error: result.error,
      };

      if (result.details !== undefined) {
        body.details = result.details;
      }

      return NextResponse.json(body, { status: result.status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error updating company profile:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update company profile";
    return NextResponse.json(
      { error: "Failed to update company profile", details: errorMessage },
      { status: 500 }
    );
  }
}

