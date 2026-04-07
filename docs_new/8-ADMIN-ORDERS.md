# Admin Orders

## Who this is for
This is for admins and developers who manage orders.

## What you will learn
You will learn how to view orders, open details, update statuses, export data, and use label/tracking actions at a high level.

## What an Order is in this system
An order is created when a customer buys items.
It keeps items, totals, address, payment, and shipping info.
Admins manage order progress in `/admin/orders`.

## View all orders
1. Open `/admin/orders`.
2. The page shows metrics, filters, and an orders table.
3. The table has selection checkboxes for bulk actions.
4. You can search by order id, order number, customer, email, or product.
5. You can filter by payment status, fulfillment status, and date range.
6. Pagination is used.
7. Order number format is `UFO-000001` style (when assigned).

## Open order details
1. Open `/admin/orders/{id}`.
2. You can see these sections:
   1. Header with order reference and status badges
   2. Timeline
   3. Items
   4. Customer info (if linked user exists)
   5. Shipping block
   6. Order notes
   7. Order summary (subtotal, shipping, total)
   8. Payment information
   9. Fulfillment actions
3. Shipping section can show pickup point details when delivery mode is pickup.
4. You can open label PDF from details when a label exists.

## Update order status
1. Status options verified in admin update flows are:
   1. `PENDING`
   2. `PAID`
   3. `PROCESSING`
   4. `SHIPPED`
   5. `DELIVERED`
   6. `CANCELED`
2. In details page, admin changes status from a dropdown.
3. UI sends `PATCH /api/orders/{id}`.
4. Bulk status update is available from list page selection.
5. Bulk update uses `PATCH /api/orders/bulk-update`.
6. Bulk cancel action uses `DELETE /api/orders/bulk-update`.

## Generate shipping label (high-level)
1. In order details, a button can generate a Colissimo label for eligible orders.
2. This action calls a label generation endpoint and then refreshes order data.
3. If a label exists, admin can open label PDF from `/api/admin/orders/{orderId}/label`.
4. From list page, bulk label generation is available for selected eligible orders.
5. Bulk label action uses `POST /api/admin/orders/labels`.
6. Colissimo protocol details are Not verified in Phase 7.

## Tracking
1. Tracking number and carrier can be edited in order details.
2. Update uses `PATCH /api/orders/{id}`.
3. List page has a tracking sync action.
4. Manual sync endpoint is `POST /api/admin/orders/tracking/sync`.
5. Auto-sync endpoint exists: `POST /api/admin/orders/tracking/auto-sync`.
6. Last auto-sync timestamp endpoint exists and is shown in UI.
7. Cron setup for auto-sync is Not verified in Phase 7.

## Export orders
1. From list page bulk actions, admin can export selected orders to CSV.
2. Export endpoint is `POST /api/orders/export`.
3. Server returns CSV with order, customer, status, payment, totals, and shipping address fields.

## Invoices (admin side)
1. In order details, admin can click `Get Invoice` or `Download Invoice`.
2. This uses `/api/orders/{id}/invoice/pdf`.
3. If invoice does not exist, server can create it on demand.
4. Admin can also access invoice-by-id PDF route when invoice id is known.

## Where things live in the code
- Admin order routes: `app/admin/orders/page.tsx`, `app/admin/orders/[id]/page.tsx`
- Order APIs: `app/api/orders/route.ts`, `app/api/orders/[id]/route.ts`
- Bulk + export APIs: `app/api/orders/bulk-update/route.ts`, `app/api/orders/export/route.ts`
- Label/tracking admin APIs: `app/api/admin/orders/labels/route.ts`, `app/api/admin/orders/[orderId]/label/route.ts`, `app/api/admin/orders/tracking/**`
- Admin orders UI: `src/features/admin/orders/ui/**`
- Admin orders server logic: `src/features/admin/orders/server/**`
- Order number logic: `src/features/orders/server/order-number.ts`

## Common problems
- Admin tries to ship an order before it is eligible.
- Bulk update has partial failures for some selected orders.
- Label generation skips orders that are not eligible.
- Tracking sync shows unchanged results when carrier data is missing or status does not move.
- Export fails when request is unauthorized.
- Invoice route is opened for a wrong or missing order id.

## Related docs
- [Admin Overview](./6-ADMIN-OVERVIEW.md)
- [Admin Inventory](./9-ADMIN-INVENTORY.md)
- [Invoice System](./10-INVOICE-SYSTEM.md)
- [Colissimo Integration](./12-COLISSIMO-INTEGRATION.md)
