// app/api/checkout/route.ts
import { cookies, headers } from "next/headers";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/server/auth/auth";
import { createCheckoutSession, validateCheckoutInput } from "@/features/checkout/server/create-checkout-session";

export async function POST(request: Request) {
  try {
    const headerList = await headers();
    const session = await getServerSession(authOptions);
    const identifier = session?.user.id || headerList.get("x-forwarded-for") || headerList.get("x-real-ip") || "unknown";

    const body = await request.json();
    const validated = validateCheckoutInput(body);

    if ("status" in validated && typeof validated.status === "number") {
      return NextResponse.json(validated.body, { status: validated.status });
    }

    const cookieStore = await cookies();
    const anonymousToken = cookieStore.get("predators_cart")?.value ?? null;

    const result = await createCheckoutSession({
      sessionUserId: session?.user.id ?? null,
      anonymousToken,
      identifier,
      input: validated,
      appUrl: process.env.NEXT_PUBLIC_SITE_URL,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(error);
    
    // Handle errors with status codes
    const errStatus = typeof error === "object" && error !== null && "status" in error
      ? (error as { status: unknown }).status
      : undefined;
    if (typeof errStatus === "number") {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to create checkout session" },
        { status: errStatus },
      );
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}


