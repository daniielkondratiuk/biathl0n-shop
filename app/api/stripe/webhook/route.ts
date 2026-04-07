// app/api/stripe/webhook/route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { handleStripeWebhook } from "@/features/checkout/server/stripe-webhook";

export async function POST(request: Request) {
  const body = await request.text();
  const headerList = await headers();
  const sig = headerList.get("stripe-signature");

  const result = await handleStripeWebhook({
    body,
    signature: sig,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  });

  return NextResponse.json(result.json, { status: result.status });
}


