// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { registerUser } from "@/features/auth/server/register";

export async function POST(request: Request) {
  try {
    const headerList = await headers();
    const _ip = headerList.get("x-forwarded-for") || headerList.get("x-real-ip") || "unknown";
    
    const json = await request.json();
    const result = await registerUser(json);

    if ("status" in result) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}


