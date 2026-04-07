// app/api/orders/[id]/invoice/pdf/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { getInvoiceByOrderId, createInvoiceForOrder } from "@/features/invoices";
import { renderInvoicePdfBuffer } from "@/features/invoices/pdf/invoice-pdf";
import { prisma } from "@/server/db/prisma";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: orderId } = await params;
    console.log(`[order-invoice-pdf] Fetching invoice for order ${orderId}`);

    // Try to get existing invoice
    let invoice = await getInvoiceByOrderId(orderId);

    // If no invoice exists, create it (idempotent)
    if (!invoice) {
      console.log(`[order-invoice-pdf] Invoice not found, creating for order ${orderId}`);
      const createResult = await createInvoiceForOrder({ orderId });

      if ("status" in createResult) {
        const body: { error: string; details?: unknown } = {
          error: createResult.error,
        };
        if (createResult.details) {
          body.details = createResult.details;
        }
        return NextResponse.json(body, { status: createResult.status });
      }

      invoice = await prisma.invoice.findUniqueOrThrow({
        where: { id: createResult.invoice.id },
        include: {
          order: {
            include: {
              user: true,
              address: true,
              items: true,
              payment: true,
            },
          },
        },
      });
    }

    if (!invoice) {
      return NextResponse.json({ error: "Failed to get or create invoice" }, { status: 500 });
    }

    console.log(`[order-invoice-pdf] Generating PDF for invoice ${invoice.invoiceNumber}`);
    const url = new URL(request.url);
    const qpLocale = url.searchParams.get("locale");
    const raw =
      (qpLocale === "en" || qpLocale === "fr" ? qpLocale : null) ??
      request.cookies.get("NEXT_LOCALE")?.value ??
      request.cookies.get("locale")?.value ??
      "en";
    const locale: "en" | "fr" = raw === "fr" ? "fr" : "en";

    // Generate PDF with locale-aware labels and formatting
    const pdfBuffer = await renderInvoicePdfBuffer(invoice, locale);

    // Persist PDF to database
    try {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          pdfData: Buffer.from(pdfBuffer),
          pdfGeneratedAt: new Date(),
          pdfMimeType: "application/pdf",
        },
      });
      console.log(`[order-invoice-pdf] Cached PDF for invoice ${invoice.invoiceNumber}`);
    } catch (error) {
      // Log but don't fail the request if caching fails
      console.error(`[order-invoice-pdf] Failed to cache PDF for invoice ${invoice.invoiceNumber}:`, error);
    }

    // Return PDF with proper headers
    const filename = `${invoice.invoiceNumber}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=\"${filename}\"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Surrogate-Control": "no-store",
        Vary: "Cookie",
      },
    });
  } catch (error) {
    console.error("[order-invoice-pdf] Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice PDF" },
      { status: 500 }
    );
  }
}

