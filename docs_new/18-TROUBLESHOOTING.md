# Troubleshooting

## Who this is for
This is for developers and admins who need to fix common problems in this project.

## What you will learn
You will learn how to find common errors, why they happen, where to check, and how to fix them safely.

### Problem: User cannot access protected pages after login

**What you see**
- The user is sent back to login.
- The session does not stay active.

**Why it happens**
- Login with credentials returns `null` when email/password is invalid.
- Role and user info are loaded into JWT/session from auth callbacks.
- If sign-in fails, no valid session is created.

**Where to check**
- `src/server/auth/auth.ts`
- `app/api/auth/[...nextauth]/route.ts`

**How to fix**
- Check the user email and password in the database.
- Confirm auth callbacks run without errors.
- Confirm the auth route is reachable and returns success for valid login.

### Problem: Admin sees "Access Denied"

**What you see**
- Opening `/admin` sends the user to `/admin/access-denied`.
- Or user is redirected to `/login?callbackUrl=/admin`.

**Why it happens**
- Admin layout checks session first.
- If no session, it redirects to login.
- If role is not `ADMIN`, it redirects to access denied.

**Where to check**
- `app/admin/layout.tsx`
- `src/features/admin/access-control/ui/access-denied-page.tsx`

**How to fix**
- Verify the user has role `ADMIN`.
- Verify session contains `user.role`.
- Sign out and sign in again after role updates.

### Problem: Checkout call fails before Stripe page opens

**What you see**
- `POST /api/checkout` returns an error.
- User cannot be redirected to Stripe.

**Why it happens**
- Invalid request body is rejected by checkout input validation.
- Checkout session creation can throw and return a status error.

**Where to check**
- `app/api/checkout/route.ts`

**How to fix**
- Check checkout request payload format.
- Check server logs for the thrown error message.
- Retry with valid checkout data.

### Problem: Stripe webhook returns 400

**What you see**
- `POST /api/stripe/webhook` returns `400`.
- Response says invalid signature.

**Why it happens**
- Webhook signature verification fails in `constructEvent`.
- Missing or wrong `stripe-signature` header causes failure.

**Where to check**
- `app/api/stripe/webhook/route.ts`
- `src/features/checkout/server/stripe-webhook.ts`

**How to fix**
- Verify `stripe-signature` is sent by Stripe.
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe webhook config.
- Send the raw webhook body without changing it.

### Problem: Stripe payment succeeded but order is not marked paid

**What you see**
- Payment is successful in Stripe.
- Order status stays not paid.

**Why it happens**
- Order update to `PAID` happens only in webhook logic.
- If webhook processing fails, status update may not complete.
- Missing `STRIPE_WEBHOOK_SECRET` returns server error and stops webhook handling.

**Where to check**
- `src/features/checkout/server/stripe-webhook.ts`
- `src/server/integrations/stripe.ts`

**How to fix**
- Confirm webhook endpoint receives `checkout.session.completed` events.
- Confirm `STRIPE_WEBHOOK_SECRET` is set correctly.
- Check webhook error logs and replay failed webhook events.

### Problem: Checkout success page does not clear cart

**What you see**
- Payment is complete, but cart still has items.
- Verify endpoint returns `400` or `404`.

**Why it happens**
- `session_id` is required and must be valid.
- Verify route rejects unpaid/incomplete Stripe sessions.
- Verify route blocks ownership mismatch for authenticated users.
- Cart clear can fail and return `cleared: false` even when request is OK.

**Where to check**
- `app/api/checkout/verify-and-clear/route.ts`

**How to fix**
- Confirm success page sends a real `session_id`.
- Confirm Stripe session status is paid/complete.
- Confirm authenticated user matches order owner.
- Check logs for `[verify-and-clear]` errors.

### Problem: Colissimo pickup points request fails

**What you see**
- `POST /api/shipping/colissimo/points-retrait` returns `400`, `500`, or `502`.
- No pickup points are returned.

**Why it happens**
- Required fields (`address`, `zipCode`, `city`, `weightGrams`, `shippingDate`) may be invalid.
- Missing `COLISSIMO_WS_API_KEY` returns config error.
- Upstream Colissimo HTTP/network errors are mapped to `502`.

**Where to check**
- `app/api/shipping/colissimo/points-retrait/route.ts`
- `src/server/integrations/colissimo.ts`

**How to fix**
- Validate request body and shipping date format `DD/MM/YYYY`.
- Set `COLISSIMO_WS_API_KEY` correctly.
- Retry after upstream errors and check server logs.

### Problem: Colissimo label generation fails

**What you see**
- `POST /api/shipping/colissimo/label/{orderId}` returns `400`, `404`, `409`, `500`, or `502`.
- Label is not generated.

**Why it happens**
- Order is missing, not `PAID`, or already has `labelPath`.
- Shipping snapshot is missing or invalid for Colissimo/pickup.
- Company profile sender fields can be missing.
- Colissimo label response can miss tracking number or PDF.

**Where to check**
- `app/api/shipping/colissimo/label/[orderId]/route.ts`

**How to fix**
- Confirm order exists and status is `PAID`.
- Confirm label was not already generated.
- Confirm `SHIPPING_SNAPSHOT` exists in order notes.
- Complete required company profile sender fields.
- Check Colissimo SLS logs when route returns `502`.

### Problem: Tracking does not update to SHIPPED/DELIVERED

**What you see**
- Orders stay in `PROCESSING`.
- Sync reports unchanged or failed results.

**Why it happens**
- Sync only targets orders in `PROCESSING` with non-empty tracking.
- Carrier must be exactly `colissimo` (case-insensitive after trim).
- Missing API key or tracking API errors keep outcome unchanged/failed.
- Status updates only move forward; no downgrade is allowed.

**Where to check**
- `src/server/jobs/sync-colissimo-tracking.ts`
- `src/server/integrations/colissimo-tracking.ts`
- `app/api/shipping/colissimo/tracking/route.ts`

**How to fix**
- Confirm order status, carrier, and tracking number are valid.
- Confirm `COLISSIMO_WS_API_KEY` is set.
- Run tracking sync again and inspect summary counters.
- Use logs to identify API status codes and failures.

### Problem: Internal cron endpoint returns 401

**What you see**
- `POST /api/internal/cron/tracking/colissimo` returns `401 Unauthorized`.

**Why it happens**
- Header `x-cron-secret` does not match `CRON_SECRET`.

**Where to check**
- `app/api/internal/cron/tracking/colissimo/route.ts`

**How to fix**
- Set `CRON_SECRET` in environment.
- Send the same value in `x-cron-secret` header.
- Retry request after updating secret.

### Problem: Upload API returns Unauthorized or bad request

**What you see**
- Upload routes return `401`.
- Upload returns `400` for missing file or invalid file.

**Why it happens**
- Upload endpoints require `ADMIN` session.
- Upload validates file presence, type, and size.
- Invalid file type or file > 10MB is rejected.

**Where to check**
- `app/api/upload/route.ts`
- `app/api/upload/temp-image/route.ts`
- `src/features/upload/server/upload-file.ts`
- `src/features/upload/server/temp-image.ts`

**How to fix**
- Sign in with an admin account.
- Send files in expected fields (`file` or `files`).
- Use JPG/PNG/WebP and keep each file under 10MB.

### Problem: Images are uploaded but not saved to product

**What you see**
- Temp upload works, but final product images are missing.
- Commit route returns error like missing temp file.

**Why it happens**
- Commit needs `productId` and non-empty `filenames`.
- Commit checks that every temp file exists before copying.
- Missing temp file causes commit to fail with `400`.

**Where to check**
- `app/api/upload/commit/route.ts`
- `src/features/upload/server/commit-upload.ts`

**How to fix**
- Send correct `productId` and exact temp filenames.
- Commit files before temp cleanup removes them.
- Retry upload+commit if temp files are gone.

### Problem: Temp uploads are not cleaned

**What you see**
- Old files remain in `public/temp`.
- Cleanup endpoint returns `403` or `404`.

**Why it happens**
- Cleanup route is disabled when `TEMP_CLEANUP_TOKEN` is not set (`404`).
- Wrong token in `X-Temp-Cleanup-Token` returns `403`.
- Cleanup only deletes files older than configured threshold.

**Where to check**
- `app/api/upload/temp/cleanup/route.ts`
- `src/features/upload/server/cleanup-temp-files.ts`

**How to fix**
- Set `TEMP_CLEANUP_TOKEN` in environment.
- Send matching `X-Temp-Cleanup-Token` header.
- Adjust `olderThanHours` if needed.

### Problem: Database connection error

**What you see**
- Server endpoints fail with database errors.
- Auth, checkout, admin, or jobs can break at runtime.

**Why it happens**
- Prisma uses PostgreSQL datasource from `DATABASE_URL`.
- If DB is unreachable or `DATABASE_URL` is wrong, Prisma calls fail.

**Where to check**
- `src/server/db/prisma.ts`
- `prisma/schema.prisma`

**How to fix**
- Verify `DATABASE_URL` points to a working PostgreSQL instance.
- Verify database user/password/network access.
- Restart app after environment updates.

### Problem: Required environment variable is missing

**What you see**
- Endpoints return 500/503, or integrations fail.
- Warnings and config errors appear in logs.

**Why it happens**
- Some integrations require env vars at runtime:
  - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - Colissimo: `COLISSIMO_WS_API_KEY`
  - Cron: `CRON_SECRET`
  - Temp cleanup: `TEMP_CLEANUP_TOKEN`

**Where to check**
- `src/server/integrations/stripe.ts`
- `src/features/checkout/server/stripe-webhook.ts`
- `src/server/integrations/colissimo.ts`
- `src/server/integrations/colissimo-tracking.ts`
- `app/api/internal/cron/tracking/colissimo/route.ts`
- `app/api/upload/temp/cleanup/route.ts`

**How to fix**
- Add missing variables in your environment.
- Restart the server so new env values are loaded.
- Re-test failing endpoint after restart.

## How to debug safely
1. Use route-level logs first (`console.error` output in server logs).
2. Reproduce one error at a time with the same request payload.
3. Do not print secrets in logs.
4. Check status codes and response body before changing code.
5. Keep fixes small and verify after each change.

## Related docs
- `docs_new/13-STRIPE-INTEGRATION.md`
- `docs_new/12-COLISSIMO-INTEGRATION.md`
- `docs_new/16-DEPLOYMENT.md`
- `docs_new/15-ENVIRONMENT-VARIABLES.md`
