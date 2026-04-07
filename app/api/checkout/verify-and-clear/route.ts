// app/api/checkout/verify-and-clear/route.ts
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authOptions } from "@/server/auth/auth";
import { stripe } from "@/server/integrations/stripe";
import { clearCart } from "@/features/cart/server/cart-clear";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();
    const anonymousToken = cookieStore.get("predators_cart")?.value ?? null;

    // Allow both authenticated users and guests (session is optional)
    const userId = session?.user?.id ?? null;

    const json = await request.json();
    const { session_id } = json as { session_id?: string };

    if (!session_id || typeof session_id !== "string") {
      return NextResponse.json(
        { ok: false, error: "session_id is required" },
        { status: 400 },
      );
    }

    // Verify the Stripe checkout session
    let checkoutSession;
    try {
      checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
    } catch (error) {
      console.error("[verify-and-clear] Error retrieving Stripe session:", error);
      return NextResponse.json(
        { ok: false, error: "Invalid session ID" },
        { status: 400 },
      );
    }

    // Check if payment was successful
    if (checkoutSession.payment_status !== "paid" && checkoutSession.status !== "complete") {
      return NextResponse.json(
        { ok: false, error: "Payment not completed" },
        { status: 400 },
      );
    }

    // Verify the order belongs to the current user (security check)
    // Guest orders (userId: null) are allowed — the valid Stripe session_id proves ownership
    const orderId = checkoutSession.metadata?.orderId;
    if (orderId) {
      const { prisma } = await import("@/server/db/prisma");
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { userId: true },
      });

      if (order && order.userId !== null && userId !== null && order.userId !== userId) {
        console.error("[CHECKOUT_VERIFY_CLEAR_DENIED]", {
          reason: "ownership_mismatch",
          hasSession: !!session,
          role: session?.user?.role ?? null,
          userId,
          orderUserId: order.userId,
          orderId,
        });
        return NextResponse.json(
          { ok: false, error: "Not found" },
          { status: 404 },
        );
      }
    }

    // Clear the cart (idempotent - safe to call multiple times)
    try {
      await clearCart({ userId, anonymousToken });
      return NextResponse.json(
        { ok: true, cleared: true },
        { status: 200 },
      );
    } catch (error) {
      console.error("[verify-and-clear] Error clearing cart:", error);
      // Still return success if cart was already cleared (idempotent)
      return NextResponse.json(
        { ok: true, cleared: false, message: "Cart may already be cleared" },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("[verify-and-clear] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to verify and clear cart" },
      { status: 500 },
    );
  }
}

