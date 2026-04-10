import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { getAllSupportedLanguages } from "@/server/services/languages";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const languages = await getAllSupportedLanguages();
  return NextResponse.json({ languages }, { status: 200 });
}
