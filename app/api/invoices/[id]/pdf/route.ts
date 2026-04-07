// app/api/invoices/[id]/pdf/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/server/auth/auth";
import { getInvoiceById } from "@/features/invoices";
import { renderInvoicePdfBuffer } from "@/features/invoices/pdf/invoice-pdf";
import { prisma } from "@/server/db/prisma";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    console.log(`[invoice-pdf] Fetching invoice ${id} for user ${session.user.id}`);

    // Load invoice with order and user for access check
    const invoice = await getInvoiceById(id);

    if (!invoice) {
      console.log(`[invoice-pdf] Invoice ${id} not found`);
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Access control: ADMIN can access any, USER can only access their own
    const isAdmin = session.user.role === "ADMIN";
    const isOwner = invoice.order?.user?.id === session.user.id;

    if (!isAdmin && !isOwner) {
      console.log(
        `[invoice-pdf] Access denied: user ${session.user.id} attempted to access invoice ${id}`
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log(`[invoice-pdf] Generating PDF for invoice ${invoice.invoiceNumber}`);

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
      console.log(`[invoice-pdf] Cached PDF for invoice ${invoice.invoiceNumber}`);
    } catch (error) {
      // Log but don't fail the request if caching fails
      console.error(`[invoice-pdf] Failed to cache PDF for invoice ${invoice.invoiceNumber}:`, error);
    }

    // Return PDF with proper headers
    const filename = `${invoice.invoiceNumber}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Surrogate-Control": "no-store",
        Vary: "Cookie",
      },
    });
  } catch (error) {
    console.error("[invoice-pdf] Error generating PDF:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice PDF" },
      { status: 500 }
    );
  }
}

