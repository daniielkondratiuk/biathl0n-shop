// src/features/invoices/server/email-invoice.ts
import "server-only";
import { prisma } from "@/server/db/prisma";
import { getInvoiceByOrderId, createInvoiceForOrder } from "@/features/invoices";
import { sendEmail } from "@/server/services/resend";

/**
 * Send invoice email to customer after payment (idempotent)
 */
export async function sendInvoiceEmailForOrder({
  orderId,
}: {
  orderId: string;
}): Promise<void> {
  // Check if NEXT_PUBLIC_SITE_URL is configured
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!appUrl) {
    console.warn(`[email-invoice] NEXT_PUBLIC_SITE_URL not configured, skipping invoice email for order ${orderId}`);
    return;
  }

  // Get or create invoice (idempotent)
  let invoice = await getInvoiceByOrderId(orderId);

  if (!invoice) {
    const createResult = await createInvoiceForOrder({ orderId });
    if ("status" in createResult) {
      throw new Error(`Failed to create invoice for order ${orderId}: ${createResult.error}`);
    }
    // Re-fetch with order relation for email personalization
    invoice = await prisma.invoice.findUnique({
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
    console.error(`[email-invoice] Invoice not found for order ${orderId}`);
    return;
  }

  // Check idempotency: if email was already sent, skip
  if (invoice.emailSentAt) {
    console.log(`[email-invoice] Invoice ${invoice.id} email already sent at ${invoice.emailSentAt}, skipping`);
    return;
  }

  // Determine recipient email: prefer customerSnapshot.email, else order.user.email
  const customerSnapshot = invoice.customerSnapshot as Record<string, unknown> | null;
  const customerEmail = 
    (customerSnapshot?.email as string | undefined) || 
    invoice.order?.user?.email;

  if (!customerEmail) {
    console.warn(`[email-invoice] No customer email found for order ${orderId}, skipping`);
    return;
  }

  // Determine customer name for personalization (priority: customerSnapshot.name > order.user.name > "there")
  const customerName = 
    (customerSnapshot?.name as string | undefined) ||
    invoice.order?.user?.name ||
    null;
  
  // Extract first name if full name is available, otherwise use full name or fallback
  const firstName = customerName 
    ? customerName.split(' ')[0] 
    : null;
  const greeting = customerName 
    ? (firstName ? `Hi ${firstName},` : `Hello ${customerName},`)
    : "Hello there,";

  // Build absolute invoice PDF URL and logo URL
  const invoicePdfUrl = `${appUrl}/api/invoices/${invoice.id}/pdf`;
  const logoUrl = `${appUrl}/assets/brand/predators.png`;
  const shopUrl = appUrl;
  const invoiceStatus = invoice.status || "PAID";
  const invoiceCurrency = invoice.currency || "EUR";

  // Build email content
  const subject = `Your invoice ${invoice.invoiceNumber}`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your invoice ${invoice.invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f3f4f6; line-height: 1.6; color: #333333;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 30px 40px; border-bottom: 1px solid #e5e7eb;">
              <img src="${logoUrl}" alt="predators Shop" style="max-height: 48px; width: auto; display: block; margin: 0 auto 16px auto;" />
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827; text-align: center;">predators Shop</h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: #111827;">Your invoice is ready</h2>
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827; line-height: 1.6; font-weight: 500;">
                ${greeting}
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                Thank you for your purchase at predators Shop!<br>
                We're happy to let you know that your payment was successful and your invoice is now ready.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                You can download your invoice using the button below:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${invoicePdfUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; text-align: center; line-height: 1.5;">
                      Download invoice
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Invoice Details -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0; background-color: #f9fafb; border-radius: 6px; padding: 20px;">
                <tr>
                  <td style="padding: 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Invoice number:</td>
                        <td align="right" style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #111827;">${invoice.invoiceNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Payment status:</td>
                        <td align="right" style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #059669;">${invoiceStatus}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">Currency:</td>
                        <td align="right" style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #111827;">${invoiceCurrency}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Fallback Link -->
              <p style="margin: 24px 0 0 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${invoicePdfUrl}" style="color: #2563eb; text-decoration: underline; word-break: break-all;">${invoicePdfUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #4b5563; text-align: center; line-height: 1.6;">
                Thank you for shopping with <strong>predators Shop</strong>
              </p>
              <p style="margin: 0 0 16px 0; font-size: 14px; text-align: center;">
                <a href="${shopUrl}" style="color: #2563eb; text-decoration: none;">Visit our shop</a>
              </p>
              <p style="margin: 0; font-size: 13px; color: #6b7280; text-align: center; line-height: 1.5;">
                If you have any questions or need help, just reply to this email — we're happy to help.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `
predators Shop - Your invoice ${invoice.invoiceNumber}

${greeting}

Thank you for your purchase at predators Shop!
We're happy to let you know that your payment was successful and your invoice is now ready.

You can download your invoice using the link below:

Invoice Details:
- Invoice number: ${invoice.invoiceNumber}
- Payment status: ${invoiceStatus}
- Currency: ${invoiceCurrency}

Download your invoice: ${invoicePdfUrl}

Visit our shop: ${shopUrl}

If you have any questions or need help, just reply to this email — we're happy to help.

Thank you for shopping with predators Shop!
  `;

  // Send email
  await sendEmail({
    to: customerEmail,
    subject,
    html,
    text,
  });

  // Mark email as sent (idempotency)
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { emailSentAt: new Date() },
  });

  console.log(`[email-invoice] Invoice email sent to ${customerEmail} for order ${orderId}`);
}

