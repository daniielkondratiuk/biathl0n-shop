# 10) Invoice System

## Who this is for
This is for admins and shop users.

## What you will learn
1. What an invoice is.
2. When an invoice is created.
3. What is inside the invoice PDF.
4. How admins open invoice PDFs.
5. How users open invoice PDFs.
6. Where invoice PDFs are generated in code.
7. What is verified about invoice emails.

## 1) What an invoice is in this system
An invoice is a payment document for one order.

It has:
1. An invoice number.
2. Order and customer data.
3. Item prices and totals.

## 2) When an invoice is created
Invoice creation is idempotent. This means repeated calls return the same invoice for the same order.

Verified creation paths:
1. Admin PDF endpoint creates it if missing: `GET /api/orders/{id}/invoice/pdf`.
2. User order details page checks invoice for paid orders and creates it if missing.

What this means in practice:
1. Admin can open invoice from `/admin/orders/{id}` and it is created on demand if needed.
2. User paid orders can get an invoice from dashboard order details.

Automatic global trigger timing for all paid orders is Not verified in Phase 9.

## 3) What is inside the invoice PDF
The PDF includes these verified parts:
1. Invoice number, date, and status.
2. Company information (from company profile snapshot).
3. Customer billing and shipping address data.
4. Order items with quantity, unit price, and line total.
5. Totals section (subtotal, VAT line, total).

Extra note:
1. If shipping snapshot data exists, shipping can appear as a line item in the PDF.

## 4) How admin downloads an invoice
Admin flow:
1. Open `/admin/orders/{id}`.
2. Click `Get Invoice` or `Download Invoice`.
3. The page opens `/api/orders/{id}/invoice/pdf` in a new tab.

What the endpoint does:
1. Requires admin session.
2. Gets existing invoice or creates one.
3. Generates PDF server-side.
4. Returns PDF response to browser.

## 5) How user downloads an invoice
User flow:
1. Open dashboard order details: `/{locale}/dashboard/orders/{id}`.
2. If invoice exists, click `Download Invoice`.
3. Link opens `/api/invoices/{invoiceId}/pdf?locale={locale}`.

Access rules on user endpoint:
1. User must be logged in.
2. Admin can access any invoice.
3. Normal user can access only their own invoice.

## 6) Where invoice PDFs are generated
PDF generation is server-side.

High-level flow:
1. API loads invoice data.
2. API calls `renderInvoicePdfBuffer(...)`.
3. API returns PDF bytes as `application/pdf`.

Verified caching behavior:
1. PDF bytes are also saved on the invoice record (`pdfData`, `pdfGeneratedAt`, `pdfMimeType`).
2. If cache save fails, PDF response can still be returned.

## 7) Email behavior
Verified in invoice module:
1. There is a function to send invoice email: `sendInvoiceEmailForOrder(...)`.
2. It gets or creates invoice first.
3. It sends a message with a link to `/api/invoices/{invoiceId}/pdf`.
4. It marks `emailSentAt` after successful send.

Where this email function is triggered in the full app flow is Not verified in Phase 9.

## 8) Where things live in the code
Core invoice logic:
1. `src/features/invoices/server/create-invoice.ts`
2. `src/features/invoices/server/invoice.ts`
3. `src/features/invoices/server/email-invoice.ts`
4. `src/features/invoices/pdf/invoice-pdf.ts`

Invoice APIs:
1. `app/api/orders/[id]/invoice/pdf/route.ts`
2. `app/api/invoices/[id]/pdf/route.ts`

UI access points:
1. `src/features/admin/orders/ui/order-details-page.tsx`
2. `src/features/orders/ui/user-order-details-page.tsx`

## Common problems
- I get `Unauthorized` when opening invoice API. Check login and role.
- User cannot open another user invoice. This is blocked by access control.
- Invoice button is missing on user order. Order may not have invoice yet.
- Admin opens invoice and it fails. Company profile may be missing.
- Email was not sent. Email service config may be missing.
- PDF opens but language is wrong. Check `locale` in query or locale cookie.

## Related docs
- `docs_new/4-CHECKOUT-AND-PAYMENTS.md`
- `docs_new/8-ADMIN-ORDERS.md`
