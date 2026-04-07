// src/features/invoices/server/invoice.ts
import "server-only";
import { prisma } from "@/server/db/prisma";
import type { InvoiceForPdf } from "./types";

/**
 * Get invoice by ID
 */
export async function getInvoiceById(invoiceId: string): Promise<InvoiceForPdf | null> {
  return await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      order: {
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
      },
    },
  });
}

/**
 * Get invoice by order ID
 */
export async function getInvoiceByOrderId(orderId: string): Promise<InvoiceForPdf | null> {
  return await prisma.invoice.findUnique({
    where: { orderId },
    include: {
      order: {
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
      },
    },
  });
}

/**
 * Preview what the next invoice number would be (read-only, no increment)
 */
export async function nextInvoiceNumberPreview() {
  const companyProfile = await prisma.companyProfile.findUnique({
    where: { id: "default" },
  });

  if (!companyProfile) {
    return null;
  }

  const prefix = companyProfile.invoicePrefix || "INV";
  const nextNumber = companyProfile.invoiceNextNumber || 1;
  const invoiceNumber = `${prefix}${nextNumber.toString().padStart(6, "0")}`;

  return {
    prefix,
    sequenceNumber: nextNumber,
    invoiceNumber,
  };
}

