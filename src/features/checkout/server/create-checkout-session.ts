import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { getCartForIdentifiers } from "@/features/cart";
import { stripe } from "@/server/integrations/stripe";
import { ensureOrderNumber } from "@/features/orders";
import type {
  PickupPoint,
  ShippingSnapshot,
} from "@/features/checkout/shared/checkout-shipping";

// Checkout input: supports both saved address (addressId) and one-time address (manual entry)
// We create an Address snapshot linked to the order (orderId) for billing/admin/invoice; address book is managed in /dashboard/addresses
const addressObjectSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(3),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().min(1),
});

const pickupPointSchema = z.object({
  id: z.string(),
  name: z.string(),
  addressLine1: z.string(),
  postalCode: z.string(),
  city: z.string(),
  country: z.string(),
  distance: z.string().optional(),
});

const shippingSchema = z.object({
  carrierId: z.enum(["colissimo"]),
  deliveryMode: z.enum(["home", "pickup"]),
  speed: z.enum(["standard", "express"]),
  pickupPoint: pickupPointSchema.optional(),
  shippingCents: z.number().int().min(0),
});

const pickupPointMetaSchema = z.object({
  geo: z
    .object({
      lat: z.number().nullable(),
      lng: z.number().nullable(),
    })
    .nullable()
    .optional(),
  // Keep openingHours as unknown JSON; consumer will narrow as needed
  openingHours: z.unknown().nullable().optional(),
  network: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  distanceMeters: z.number().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  accessibilityPmr: z.boolean().nullable().optional(),
  maxWeightGrams: z.number().nullable().optional(),
});

const shippingSnapshotSchema = z.object({
  carrierId: z.enum(["colissimo"]),
  deliveryMode: z.enum(["home", "pickup"]),
  speed: z.enum(["standard", "express"]),
  shippingCents: z.number().int().min(0),
  pickupPoint: pickupPointSchema.nullable(),
  pickupPointMeta: pickupPointMetaSchema.nullable().optional(),
});

const checkoutSchema = z.discriminatedUnion("addressMode", [
  z.object({
    addressMode: z.literal("saved"),
    addressId: z.string().min(1),
    notes: z.string().optional(),
    shipping: shippingSchema,
    shippingSnapshot: shippingSnapshotSchema.optional(),
  }),
  z.object({
    addressMode: z.literal("oneTime"),
    address: addressObjectSchema,
    notes: z.string().optional(),
    shipping: shippingSchema,
    shippingSnapshot: shippingSnapshotSchema.optional(),
  }),
]);

export type CheckoutInput =
  | {
      addressMode: "saved";
      addressId: string;
      notes?: string;
      shipping: {
        carrierId: "colissimo";
        deliveryMode: "home" | "pickup";
        speed: "standard" | "express";
        pickupPoint?: PickupPoint;
        shippingCents: number;
      };
      shippingSnapshot?: ShippingSnapshot;
    }
  | {
      addressMode: "oneTime";
      address: {
        fullName: string;
        phone: string;
        line1: string;
        line2?: string;
        city: string;
        state?: string;
        postalCode: string;
        country: string;
      };
      notes?: string;
      shipping: {
        carrierId: "colissimo";
        deliveryMode: "home" | "pickup";
        speed: "standard" | "express";
        pickupPoint?: PickupPoint;
        shippingCents: number;
      };
      shippingSnapshot?: ShippingSnapshot;
    };

type StatusError = Error & { status: number; originalError?: unknown };

export interface CheckoutValidationError {
  status: number;
  body: {
    error: string;
    details: unknown;
  };
}

export function validateCheckoutInput(
  input: unknown
): CheckoutInput | CheckoutValidationError {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        error: "Invalid input",
        details: parsed.error.flatten(),
      },
    };
  }
  return parsed.data;
}

export async function createCheckoutSession(params: {
  sessionUserId: string | null;
  anonymousToken: string | null;
  identifier: string;
  input: CheckoutInput | CheckoutValidationError;
  appUrl?: string | undefined;
}): Promise<{ url: string }> {
  try {
    const { sessionUserId, anonymousToken, input: rawInput, appUrl } = params;
    
    if ("status" in rawInput && typeof rawInput.status === "number") {
      throw rawInput;
    }
    
    const input = rawInput as CheckoutInput;

    // Stripe configuration check
    if (!process.env.STRIPE_SECRET_KEY) {
      const error = new Error("Stripe is not configured") as StatusError;
      error.status = 500;
      throw error;
    }

    // Load cart
    const cart = await getCartForIdentifiers({
      userId: sessionUserId ?? undefined,
      anonymousToken,
    });

    if (!cart || cart.items.length === 0) {
      const error = new Error("Cart is empty") as StatusError;
      error.status = 400;
      throw error;
    }

    // Compute subtotal
    const subtotal = cart.items.reduce(
      (sum: number, item: (typeof cart.items)[0]) => sum + item.unitPrice * item.quantity,
      0,
    );

    if (subtotal <= 0) {
      const error = new Error("Cart total must be greater than zero") as StatusError;
      error.status = 400;
      throw error;
    }

    // Checkout must be address-book read-only; never write to Address or user.addresses
    // When connecting an Address to an Order, Prisma sets address.orderId, which makes it disappear
    // from address book queries (they filter orderId: null). Therefore, we must NOT connect the
    // saved address to the order. Instead, we store address data in metadata only.
    let shippingAddressForStripe: {
      fullName: string;
      phone: string;
      line1: string;
      line2?: string | null;
      city: string;
      state?: string | null;
      postalCode: string;
      country: string;
    };
    let savedAddressId: string | null = null;

    if (input.addressMode === "saved") {
      // Mode A: Use saved address - verify ownership (READ-ONLY)
      if (!sessionUserId) {
        const error = new Error("Must be logged in to use saved address") as StatusError;
        error.status = 401;
        throw error;
      }

      const savedAddress = await prisma.address.findFirst({
        where: {
          id: input.addressId,
          userId: sessionUserId,
          orderId: null, // Only allow saved addresses (not already linked to orders)
        },
        select: { id: true, fullName: true, phone: true, line1: true, line2: true, city: true, state: true, postalCode: true, country: true },
      });

      if (!savedAddress) {
        const error = new Error("Address not found or already used in an order") as StatusError;
        error.status = 404;
        throw error;
      }

      // Store address ID for reference, but do NOT connect to order (prevents orderId from being set)
      savedAddressId = savedAddress.id;
      shippingAddressForStripe = {
        fullName: savedAddress.fullName,
        phone: savedAddress.phone,
        line1: savedAddress.line1,
        line2: savedAddress.line2,
        city: savedAddress.city,
        state: savedAddress.state,
        postalCode: savedAddress.postalCode,
        country: savedAddress.country,
      };
    } else {
      // Mode B: One-time address - use for Stripe only, do NOT create Address record
      shippingAddressForStripe = {
        fullName: input.address.fullName,
        phone: input.address.phone,
        line1: input.address.line1,
        line2: input.address.line2 ?? null,
        city: input.address.city,
        state: input.address.state ?? null,
        postalCode: input.address.postalCode,
        country: input.address.country,
      };
    }

    // Validate shipping selection
    const shipping = input.shipping;

    // Server-side hybrid pricing validation (must match client computeColissimoShipping)
    const FREE_SHIPPING_THRESHOLD_CENTS = 10000;
    const FR_STANDARD_HOME = 790;
    const FR_STANDARD_PICKUP = 690;
    const FR_EXPRESS_HOME = 1190;
    const FR_EXPRESS_PICKUP = 1090;
    const FR_EXPRESS_UPGRADE_HOME = 400;
    const FR_EXPRESS_UPGRADE_PICKUP = 300;
    const TVA_RATE = 0.20;
    const FALLBACK_WEIGHT_GRAMS = 250;
    const DOM_CODES = ["GP", "MQ", "GF", "RE", "YT"];
    const EXPRESS_SURCHARGE_PCT = 0.25;
    const EXPRESS_SURCHARGE_MIN_CENTS = 400;
    const EXPRESS_SURCHARGE_MAX_CENTS = 1000;
    const NON_FR_PICKUP_DISCOUNT = 100;
    const NON_FR_PICKUP_FLOOR = 400;
    const HOME_FR = [
      { max: 250, price: 684 }, { max: 500, price: 771 }, { max: 750, price: 860 },
      { max: 1000, price: 934 }, { max: 2000, price: 1048 }, { max: 3000, price: 1149 },
      { max: 5000, price: 1328 }, { max: 7000, price: 1499 }, { max: 10000, price: 1718 },
      { max: 15000, price: 2033 }, { max: 20000, price: 2350 }, { max: 30000, price: 3705 },
    ];
    const PICKUP_FR = [
      { max: 250, price: 520 }, { max: 500, price: 606 }, { max: 750, price: 697 },
      { max: 1000, price: 771 }, { max: 2000, price: 884 }, { max: 3000, price: 985 },
      { max: 5000, price: 1183 }, { max: 7000, price: 1344 }, { max: 10000, price: 1559 },
      { max: 15000, price: 1876 }, { max: 20000, price: 2192 }, { max: 29000, price: 3447 },
    ];

    const cc = (shippingAddressForStripe.country || "FR").toUpperCase();
    let expectedShippingCents: number;

    if (cc === "FR") {
      if (subtotal >= FREE_SHIPPING_THRESHOLD_CENTS) {
        if (shipping.speed === "standard") {
          expectedShippingCents = 0;
        } else {
          expectedShippingCents = shipping.deliveryMode === "pickup" ? FR_EXPRESS_UPGRADE_PICKUP : FR_EXPRESS_UPGRADE_HOME;
        }
      } else if (shipping.speed === "express") {
        expectedShippingCents = shipping.deliveryMode === "pickup" ? FR_EXPRESS_PICKUP : FR_EXPRESS_HOME;
      } else {
        expectedShippingCents = shipping.deliveryMode === "pickup" ? FR_STANDARD_PICKUP : FR_STANDARD_HOME;
      }
    } else {
      const cartWeightGrams = cart.items.reduce(
        (sum: number, item: (typeof cart.items)[0]) => sum + item.quantity * FALLBACK_WEIGHT_GRAMS, 0,
      );
      const tiers = shipping.deliveryMode === "pickup" ? PICKUP_FR : HOME_FR;
      const baseHT = tiers.find((t) => cartWeightGrams <= t.max)?.price ?? tiers[tiers.length - 1].price;
      let adjusted = baseHT;
      if (DOM_CODES.includes(cc)) adjusted = Math.round(baseHT * 1.6);
      else adjusted = Math.round(baseHT * 2.2);
      let standardTtc = Math.round(adjusted * (1 + TVA_RATE));

      if (shipping.deliveryMode === "pickup") {
        standardTtc = Math.max(NON_FR_PICKUP_FLOOR, standardTtc - NON_FR_PICKUP_DISCOUNT);
      }

      if (shipping.speed === "express") {
        const pct = Math.floor(standardTtc * EXPRESS_SURCHARGE_PCT);
        const surcharge = Math.min(EXPRESS_SURCHARGE_MAX_CENTS, Math.max(EXPRESS_SURCHARGE_MIN_CENTS, pct));
        expectedShippingCents = Math.round((Math.round(((standardTtc + surcharge) / 100) * 4) / 4) * 100);
      } else {
        expectedShippingCents = Math.round((Math.round((standardTtc / 100) * 4) / 4) * 100);
      }
    }

    if (shipping.shippingCents !== expectedShippingCents) {
      console.error("[SHIPPING_MISMATCH_FINAL]", { expected: expectedShippingCents, received: shipping.shippingCents, country: cc, speed: shipping.speed, subtotal, deliveryMode: shipping.deliveryMode });
      const error = new Error(`Invalid shipping price: expected ${expectedShippingCents} but got ${shipping.shippingCents}`) as StatusError;
      error.status = 400;
      throw error;
    }

    const verifiedShippingCents = expectedShippingCents;

    // Calculate total including shipping
    const orderTotal = subtotal + verifiedShippingCents;

    // Optionally store shipping snapshot as JSON in notes when provided by client
    // Format: [SHIPPING_SNAPSHOT]{...JSON...}
    const applyShippingSnapshotToNotes = (
      notes: string | null | undefined,
      snapshot: ShippingSnapshot
    ): string => {
      const payload = JSON.stringify(snapshot);
      const token = `[SHIPPING_SNAPSHOT]${payload}`;

      if (!notes || !notes.length) {
        return token;
      }

      const pattern = /\[SHIPPING_SNAPSHOT\][^\n]*/;
      if (pattern.test(notes)) {
        return notes.replace(pattern, token);
      }

      return notes.endsWith("\n") ? `${notes}${token}` : `${notes}\n${token}`;
    };

    const finalNotes =
      input.shippingSnapshot != null
        ? applyShippingSnapshotToNotes(input.notes ?? "", input.shippingSnapshot)
        : input.notes ?? null;

    // Create order WITHOUT connecting to Address (prevents address.orderId from being set)
    // Address data is stored in Stripe metadata for reference
    // Shop only supports EUR currency
    const order = await prisma.order.create({
      data: {
        userId: sessionUserId ?? null,
        total: orderTotal,
        currency: "EUR",
        status: "PENDING",
        notes: finalNotes,
        // Do NOT connect address - this would set address.orderId and hide it from address book
        items: {
          create: cart.items.map((item: (typeof cart.items)[0]) => ({
            productId: item.productId,
            sizeVariantId: item.sizeVariantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
            productName: item.product.name,
            productSlug: item.product.slug,
            productImage: null,
            variantLabel: item.sizeVariant
              ? `${item.sizeVariant.colorVariant?.color?.name || "Color"} / ${item.sizeVariant.size}`
              : null,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    // Assign orderNumber immediately after creation
    await ensureOrderNumber(order.id);

    // Persist billing address as Address linked to order (orderId) for admin/invoice display.
    // This is a snapshot only; we do not connect saved addresses to orders.
    await prisma.address.create({
      data: {
        orderId: order.id,
        userId: sessionUserId ?? null,
        fullName: shippingAddressForStripe.fullName,
        phone: shippingAddressForStripe.phone,
        line1: shippingAddressForStripe.line1,
        line2: shippingAddressForStripe.line2 ?? null,
        city: shippingAddressForStripe.city,
        state: shippingAddressForStripe.state ?? null,
        postalCode: shippingAddressForStripe.postalCode,
        country: shippingAddressForStripe.country,
        isPrimary: false,
      },
    });

    // Build Stripe line items
    // Ensure currency is EUR (shop only supports EUR)
    const stripeCurrency = "eur"; // Stripe uses lowercase
    if (order.currency.toUpperCase() !== "EUR") {
      const error = new Error(`Invalid order currency: ${order.currency}. Shop only supports EUR.`) as StatusError;
      error.status = 400;
      throw error;
    }
    
    const lineItems = order.items.map((item: (typeof order.items)[0]) => ({
      price_data: {
        currency: stripeCurrency,
        unit_amount: item.unitPrice,
        product_data: {
          name: item.productName,
        },
      },
      quantity: item.quantity,
    }));

    // Add shipping as a line item (only if shipping cost > 0)
    if (verifiedShippingCents > 0) {
      const carrierLabel = "Colissimo";
      const speedLabel = shipping.speed === "express" ? " (Express)" : "";
      const modeLabel = shipping.deliveryMode === "pickup" ? " (Pickup)" : "";
      lineItems.push({
        price_data: {
          currency: stripeCurrency,
          unit_amount: verifiedShippingCents,
          product_data: {
            name: `Shipping – ${carrierLabel}${modeLabel}${speedLabel}`,
          },
        },
        quantity: 1,
      });
    }

    // Build URLs
    const successUrl =
      appUrl?.concat("/checkout/success") ?? "http://localhost:3000/checkout/success";
    const cancelUrl = appUrl?.concat("/cart") ?? "http://localhost:3000/cart";

    // Create Stripe checkout session
    // Address is collected on our /checkout page only; do NOT make Stripe collect it again
    // Store address in Stripe metadata for reference (both saved and one-time addresses)
    let checkoutSession;
    try {
      checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        currency: stripeCurrency, // Explicitly set EUR currency
        line_items: lineItems,
        success_url: successUrl + "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: cancelUrl,
        metadata: {
          orderId: order.id,
          // Store shipping address in metadata for both modes (for reference in Stripe dashboard/receipts)
          shippingFullName: shippingAddressForStripe.fullName,
          shippingPhone: shippingAddressForStripe.phone,
          shippingLine1: shippingAddressForStripe.line1,
          shippingLine2: shippingAddressForStripe.line2 || "",
          shippingCity: shippingAddressForStripe.city,
          shippingState: shippingAddressForStripe.state || "",
          shippingPostalCode: shippingAddressForStripe.postalCode,
          shippingCountry: shippingAddressForStripe.country,
          addressMode: input.addressMode,
          shippingCarrier: shipping.carrierId,
          shippingDeliveryMode: shipping.deliveryMode,
          shippingSpeed: shipping.speed,
          shippingCents: String(verifiedShippingCents),
          cartSubtotalCents: String(subtotal),
          orderTotalCents: String(orderTotal),
          ...(shipping.pickupPoint ? {
            shippingPickupPointId: shipping.pickupPoint.id,
            shippingPickupPointName: shipping.pickupPoint.name,
            shippingPickupPointAddress: `${shipping.pickupPoint.addressLine1}, ${shipping.pickupPoint.postalCode} ${shipping.pickupPoint.city}`,
          } : {}),
          ...(input.addressMode === "saved" && savedAddressId ? { savedAddressId: String(savedAddressId) } : {}),
        },
      });
    } catch (stripeError: unknown) {
      // Log original Stripe error with full details
      const errObj = typeof stripeError === "object" && stripeError !== null
        ? (stripeError as Record<string, unknown>)
        : {};
      console.error("[Stripe Session Creation Error]", {
        message: errObj.message,
        stack: errObj.stack,
        type: errObj.type,
        code: errObj.code,
        statusCode: errObj.statusCode,
        raw: errObj.raw,
        orderId: order.id,
        lineItemsCount: lineItems.length,
        verifiedShippingCents,
      });
      // Re-throw original error with status code
      const errMsg = stripeError instanceof Error ? stripeError.message : "Unknown error";
      const errStatusCode = typeof errObj.statusCode === "number" ? errObj.statusCode : 500;
      const error = new Error(`Stripe session creation failed: ${errMsg}`) as StatusError;
      error.status = errStatusCode;
      error.originalError = stripeError;
      throw error;
    }

    // Update order with Stripe session ID
    await prisma.order.update({
      where: { id: order.id },
      data: {
        stripeCheckoutSessionId: checkoutSession.id,
      },
    });

    if (!checkoutSession.url) {
      const error = new Error("Stripe session created but URL is missing") as StatusError;
      error.status = 500;
      throw error;
    }

    return { url: checkoutSession.url };
  } catch (error) {
    // Re-throw errors that already have status codes
    if (typeof error === "object" && error !== null && "status" in error) {
      throw error;
    }
    // Log and wrap unexpected errors with original error details
    console.error("[Checkout Session Error]", {
      message: (error as Error)?.message,
      stack: (error as Error)?.stack,
      error,
    });
    const wrappedError = new Error(`Failed to create checkout session: ${(error as Error)?.message || "Unknown error"}`) as StatusError;
    wrappedError.status = 500;
    wrappedError.originalError = error;
    throw wrappedError;
  }
}

