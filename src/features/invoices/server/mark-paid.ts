// src/features/invoices/server/mark-paid.ts
import "server-only";
import { prisma } from "@/server/db/prisma";
import { MarkInvoicePaidInput } from "./types";
import type { MarkInvoicePaidError } from "./types";
import type { Invoice } from "@prisma/client";

/**
 * Mark invoice as paid
 */
export async function markInvoicePaid(
  input: unknown
): Promise<{ invoice: Invoice } | MarkInvoicePaidError> {
  const parsed = MarkInvoicePaidInput.safeParse(input);
  
  if (!parsed.success) {
    return {
      status: 400,
      error: "Invalid input",
      details: parsed.error.flatten(),
    };
  }

  const { invoiceId, paidAt } = parsed.data;

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return {
        status: 404,
        error: "Invoice not found",
      };
    }

    if (invoice.status === "PAID") {
      return { invoice }; // Already paid, return existing
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "PAID",
        paidAt: paidAt || new Date(),
      },
    });

    return { invoice: updated };
  } catch (error) {
    console.error("Error marking invoice as paid:", error);
    return {
      status: 500,
      error: "Failed to mark invoice as paid",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

