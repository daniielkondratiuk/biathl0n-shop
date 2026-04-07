// src/features/invoices/server/types.ts
import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

export const CreateInvoiceInput = z.object({
  orderId: z.string().min(1, "Order ID is required"),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInput>;

export const MarkInvoicePaidInput = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  paidAt: z.date().optional(),
});

export type MarkInvoicePaidInput = z.infer<typeof MarkInvoicePaidInput>;

export interface CreateInvoiceError {
  status: number;
  error: string;
  details?: unknown;
}

export interface MarkInvoicePaidError {
  status: number;
  error: string;
  details?: unknown;
}

/**
 * Type for invoice with all relations needed for PDF rendering and access checks
 */
export type InvoiceForPdf = Prisma.InvoiceGetPayload<{
  include: {
    order: {
      include: {
        items: true;
        address: true;
        payment: true;
        user: {
          select: {
            id: true;
            name: true;
            email: true;
          };
        };
      };
    };
  };
}>;

