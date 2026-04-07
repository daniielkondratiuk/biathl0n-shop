# 12) Colissimo Integration

## Who this is for
This is for admins and developers.

## What you will learn
1. What Colissimo is used for in this shop.
2. How pickup points are loaded in checkout.
3. How admin label generation works.
4. How tracking sync works.
5. How cron sync works.
6. What error handling is in place.
7. Where code files are.

## 1) What Colissimo is used for in this project
Colissimo is used as a shipping carrier.

In this project, it is used for:
1. Pickup point search in checkout.
2. Shipping label generation for paid orders.
3. Tracking status checks and sync.
4. Public tracking link creation for users/admin.

## 2) Pickup point flow (Checkout)
Checkout uses this route:
1. `POST /api/shipping/colissimo/points-retrait`

What this route does:
1. Validates input (address, zip code, city, weight, shipping date).
2. Calls internal Colissimo integration (`findRelayPoints`).
3. Normalizes response data.
4. Returns a simple points list for the frontend.

What user selects:
1. User selects one pickup point from returned options.

How pickup data is saved in order:
1. Shipping snapshot data is read later from order notes with marker `[SHIPPING_SNAPSHOT]`.
2. This snapshot includes delivery mode and pickup point data.
3. Full write timing in checkout flow is Not verified in Phase 11.

## 3) Label generation (Admin side)
Label generation route:
1. `POST /api/shipping/colissimo/label/{orderId}`

High-level behavior:
1. Loads order and validates it.
2. Requires order status `PAID`.
3. Prevents duplicate generation when a label already exists.
4. Reads shipping snapshot from order notes.
5. Calls Colissimo SLS integration to create label and tracking number.
6. Saves label PDF file on disk.
7. Updates order to `PROCESSING`, stores carrier/tracking/label path/time.
8. Writes an audit log entry.

Where PDF is stored:
1. `storage/colissimo/labels/{orderNumber-or-id}.pdf`

How admin opens/downloads label:
1. Admin uses `GET /api/admin/orders/{orderId}/label`.
2. This route reads `labelPath` from order and returns PDF.

Where admin clicks `Generate label` in UI is Not verified in Phase 11.

## 4) Tracking
Tracking proxy route:
1. `GET` or `POST /api/shipping/colissimo/tracking`

What it does:
1. Sends tracking request to Colissimo timeline service.
2. Returns tracking response data.

Tracking sync logic:
1. Main job: `syncProcessingColissimoTracking(...)`.
2. It checks eligible orders with:
   - status `PROCESSING`
   - carrier `colissimo`
   - non-empty tracking number
3. For each order, it calls `getColissimoTrackingStatus(...)`.
4. It updates order status only forward (`SHIPPED` or `DELIVERED`).
5. It does not downgrade status.

Manual sync endpoint:
1. `POST /api/admin/orders/tracking/sync`

Auto-sync endpoints:
1. `POST /api/admin/orders/tracking/auto-sync`
2. `GET /api/admin/orders/tracking/auto-sync/last-run`

Tracking link generation:
1. Shared helper builds URL for carrier.
2. For Colissimo, link is `laposte.fr` tracking page with the tracking code.

## 5) Cron / background sync
Internal cron route:
1. `POST /api/internal/cron/tracking/colissimo`

What it does:
1. Validates cron secret header.
2. Runs the tracking sync job.
3. Returns sync summary.

Schedule note:
1. This file says it is designed for every 12 hours.
2. Real deployed scheduler configuration is Not verified in Phase 11.

## 6) Error handling (high-level)
Pickup points:
1. Invalid input returns `400`.
2. Colissimo upstream/network errors return `502`.

Label generation:
1. Non-paid order returns error.
2. Existing label returns conflict.
3. Missing shipping snapshot or wrong carrier returns error.
4. If DB update fails after file write, code tries to remove created file.

Tracking sync:
1. Per-order failures are tracked as `FAILED` items.
2. Unauthorized tracking API result is counted separately and not treated as hard failure.
3. Sync continues across multiple orders.

Retry behavior:
1. Label creation integration can try fallback product codes internally.
2. Global retry policy/scheduler retries are Not verified in Phase 11.

## 7) Where things live in the code
Routes:
1. `app/api/shipping/colissimo/points-retrait/route.ts`
2. `app/api/shipping/colissimo/tracking/route.ts`
3. `app/api/shipping/colissimo/label/[orderId]/route.ts`
4. `app/api/admin/orders/[orderId]/label/route.ts`
5. `app/api/admin/orders/tracking/sync/route.ts`
6. `app/api/admin/orders/tracking/auto-sync/route.ts`
7. `app/api/internal/cron/tracking/colissimo/route.ts`

Integrations and jobs:
1. `src/server/integrations/colissimo.ts`
2. `src/server/integrations/colissimo-sls.ts`
3. `src/server/integrations/colissimo-tracking.ts`
4. `src/server/jobs/sync-colissimo-tracking.ts`
5. `src/shared/shipping/tracking-links.ts`

Storage:
1. `storage/colissimo/labels/`

## Common problems
- Pickup point request fails. Check checkout address and shipping date fields.
- No pickup points returned. Upstream Colissimo service may be unavailable.
- Label generation fails on admin order. Order may not be `PAID` yet.
- Label already exists error. This order already has a generated label.
- Label open route returns file not found. Label path may exist in DB but file is missing.
- Tracking sync updates nothing. Orders may not be eligible (`PROCESSING` + `colissimo` + tracking number).
- Cron route returns unauthorized. Cron secret header may be wrong.

## Related docs
- `docs_new/4-CHECKOUT-AND-PAYMENTS.md`
- `docs_new/8-ADMIN-ORDERS.md`
- `docs_new/14-CRON-AND-JOBS.md`
