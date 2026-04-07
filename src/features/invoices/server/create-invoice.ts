// src/features/invoices/server/create-invoice.ts
import "server-only";
import { prisma } from "@/server/db/prisma";
import { getCompanyProfile } from "@/features/admin/company";
import { CreateInvoiceInput } from "./types";
import type { CreateInvoiceError } from "./types";
import type { Invoice, Prisma } from "@prisma/client";

/**
 * Create invoice for an order (idempotent).
 * If invoice already exists for this order, returns it.
 * Otherwise, creates a new invoice with atomic number allocation.
 */
export async function createInvoiceForOrder(
  input: unknown
): Promise<{ invoice: Invoice } | CreateInvoiceError> {
  const parsed = CreateInvoiceInput.safeParse(input);
  
  if (!parsed.success) {
    return {
      status: 400,
      error: "Invalid input",
      details: parsed.error.flatten(),
    };
  }

  const { orderId } = parsed.data;

  try {
    // Check if invoice already exists (idempotency)
    const existingInvoice = await prisma.invoice.findUnique({
      where: { orderId },
    });

    if (existingInvoice) {
      return { invoice: existingInvoice };
    }

    // Load order with all necessary data (including notes for shipping snapshot)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        address: true,
        payment: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return {
        status: 404,
        error: "Order not found",
      };
    }

    // Enforce EUR currency: shop only supports EUR
    const orderCurrency = order.currency?.toUpperCase() || "";
    if (orderCurrency !== "EUR") {
      return {
        status: 400,
        error: "Invalid order currency",
        details: `Order currency must be EUR, but found: ${order.currency}. The shop only supports EUR currency.`,
      };
    }

    // Load company profile (must exist)
    const companyProfile = await getCompanyProfile();
    if (!companyProfile) {
      return {
        status: 400,
        error: "Company profile not configured",
        details: "Please configure company profile in admin settings before creating invoices",
      };
    }

    // Build snapshots
    const companySnapshot = {
      legalName: companyProfile.legalName,
      brandName: companyProfile.brandName,
      email: companyProfile.email,
      phone: companyProfile.phone,
      addressLine1: companyProfile.addressLine1,
      addressLine2: companyProfile.addressLine2,
      postalCode: companyProfile.postalCode,
      city: companyProfile.city,
      country: companyProfile.country,
      siren: companyProfile.siren,
      siret: companyProfile.siret,
      vatId: companyProfile.vatId,
      vatNote: companyProfile.vatNote,
      currency: "EUR", // Shop only supports EUR
      paymentTerms: companyProfile.paymentTerms,
      legalFooter: companyProfile.legalFooter,
      logoUrl: companyProfile.logoUrl,
    };

    const customerSnapshot = {
      userId: order.userId,
      email: order.user?.email || null,
      name: order.user?.name || null,
      shippingAddress: order.address
        ? {
            fullName: order.address.fullName,
            phone: order.address.phone,
            line1: order.address.line1,
            line2: order.address.line2,
            city: order.address.city,
            state: order.address.state,
            postalCode: order.address.postalCode,
            country: order.address.country,
          }
        : null,
    };

    const lineItemsSnapshot = order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      productImage: item.productImage,
      variantLabel: item.variantLabel,
      sizeVariantId: item.sizeVariantId,
      selectedPatchIds: item.selectedPatchIds,
      quantity: item.quantity,
      unitPriceCents: item.unitPrice,
      totalCents: item.totalPrice,
    }));

    // Compute totals from order items
    const subtotalCents = order.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );
    const taxCents = 0; // v1: no tax calculation
    const totalCents = subtotalCents + taxCents;

    // Atomic transaction: allocate invoice number and create invoice
    const invoice = await prisma.$transaction(async (tx) => {
      // Lock and read company profile
      const profile = await tx.companyProfile.findUnique({
        where: { id: "default" },
      });

      if (!profile) {
        throw new Error("Company profile not found during transaction");
      }

      const prefix = profile.invoicePrefix || "INV";
      const sequenceNumber = profile.invoiceNextNumber || 1;
      const invoiceNumber = `${prefix}${sequenceNumber.toString().padStart(6, "0")}`;

      // Update company profile next number atomically using Prisma increment
      await tx.companyProfile.update({
        where: { id: "default" },
        data: {
          invoiceNextNumber: { increment: 1 },
        },
      });

      // Create invoice
      // Always use EUR currency (shop only supports EUR)
      const newInvoice = await tx.invoice.create({
        data: {
          orderId,
          invoiceNumber,
          prefix,
          sequenceNumber,
          status: "ISSUED",
          currency: "EUR",
          subtotalCents,
          taxCents,
          totalCents,
          companySnapshot: companySnapshot as unknown as Prisma.InputJsonValue,
          customerSnapshot: customerSnapshot as unknown as Prisma.InputJsonValue,
          lineItemsSnapshot: lineItemsSnapshot as unknown as Prisma.InputJsonValue,
          stripePaymentIntentId: order.payment?.providerPaymentId || null,
          stripeSessionId: order.stripeCheckoutSessionId || null,
        },
      });

      return newInvoice;
    });

    return { invoice };
  } catch (error) {
    console.error("Error creating invoice:", error);
    return {
      status: 500,
      error: "Failed to create invoice",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

