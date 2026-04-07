import type StripeType from "stripe";
import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";
import { stripe } from "@/server/integrations/stripe";
import { reserveStock } from "@/features/inventory";
import { clearCart } from "@/features/cart/server/cart-clear";
import { createInvoiceForOrder, markInvoicePaid } from "@/features/invoices";
import { sendInvoiceEmailForOrder } from "@/features/invoices/server/email-invoice";

export async function handleStripeWebhook(input: {
  body: string;
  signature: string | null;
  webhookSecret: string | undefined;
}): Promise<{ status: number; json: Record<string, unknown> }> {
  const { body, signature, webhookSecret } = input;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return { status: 500, json: { received: false } };
  }

  let event: StripeType.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature || "",
      webhookSecret,
    );
  } catch (err) {
    console.error("Stripe webhook error", err);
    return { status: 400, json: { error: "Invalid signature" } };
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as StripeType.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            items: true,
          },
        });

        if (order) {
          console.log(`[webhook] Processing payment for order ${order.id} with ${order.items.length} items`);
          
          try {
            await prisma.$transaction(async (tx) => {
              await tx.order.update({
                where: { id: order.id },
                data: { status: "PAID" },
              });

              if (session.payment_intent && typeof session.amount_total === "number") {
                await tx.payment.upsert({
                  where: { orderId: order.id },
                  update: {
                    status: "SUCCEEDED",
                    amount: session.amount_total,
                    providerPaymentId: session.payment_intent.toString(),
                  },
                  create: {
                    orderId: order.id,
                    provider: "STRIPE",
                    providerPaymentId: session.payment_intent.toString(),
                    amount: session.amount_total,
                    currency: (session.currency || "usd").toLowerCase(),
                    status: "SUCCEEDED",
                    rawPayload: session as unknown as Prisma.InputJsonValue,
                  },
                });
              }

              // Reserve stock when payment is confirmed
              // This increases stockReserved but does NOT change stockOnHand
              console.log(`[webhook] Calling reserveStock for order ${order.id}`);
              await reserveStock(order.id, tx);
              console.log(`[webhook] Successfully reserved stock for order ${order.id}`);
            });

            // Create and mark invoice as paid (required, idempotent)
            // This must happen immediately after order is marked PAID
            try {
              console.log(`[webhook] Ensuring invoice exists and is marked paid for order ${order.id}`);
              const createResult = await createInvoiceForOrder({ orderId: order.id });
              
              if ("status" in createResult) {
                // Log error but don't fail webhook (idempotent - may already exist from previous run)
                console.error(`[webhook] Error creating invoice for order ${order.id}:`, createResult.error);
              } else {
                const invoice = createResult.invoice;
                console.log(`[webhook] Invoice ${invoice.id} ensured for order ${order.id}`);
                
                // Mark invoice as paid (idempotent - safe to call multiple times)
                const markPaidResult = await markInvoicePaid({
                  invoiceId: invoice.id,
                  paidAt: new Date(),
                });
                
                if ("status" in markPaidResult) {
                  // Log error but don't fail webhook (idempotent - may already be paid)
                  console.error(`[webhook] Error marking invoice ${invoice.id} as paid:`, markPaidResult.error);
                } else {
                  console.log(`[webhook] Invoice ${invoice.id} marked as paid for order ${order.id}`);
                  
                  // Send invoice email after invoice is marked paid
                  try {
                    await sendInvoiceEmailForOrder({ orderId: order.id });
                    console.log(`[webhook] Invoice email sent for order ${order.id}`);
                  } catch (error) {
                    // Log but don't fail webhook if email sending fails
                    console.error(`[webhook] Error sending invoice email for order ${order.id}:`, error);
                  }
                }
              }
            } catch (error) {
              // Log but don't fail webhook (idempotent operations - safe to retry)
              console.error(`[webhook] Error ensuring invoice for order ${order.id}:`, error);
            }

            // Clear cart after successful payment (server-side source of truth)
            // This ensures cart is cleared even if client doesn't visit success page
            if (order.userId) {
              try {
                await clearCart({ userId: order.userId, anonymousToken: null });
                console.log(`[webhook] Cleared cart for user ${order.userId} after order ${order.id}`);
              } catch (error) {
                // Log but don't fail webhook if cart clear fails (non-critical)
                console.error(`[webhook] Error clearing cart for user ${order.userId}:`, error);
              }
            }
          } catch (error) {
            console.error(`[webhook] Error reserving stock for order ${order.id}:`, error);
            // Re-throw to ensure transaction rolls back
            throw error;
          }
        }
      }
    }
  } catch (error) {
    console.error("Error handling Stripe webhook", error);
    return { status: 500, json: { received: false } };
  }

  return { status: 200, json: { received: true } };
}

