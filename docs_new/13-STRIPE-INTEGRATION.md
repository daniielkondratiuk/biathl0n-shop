# 13) Stripe Integration

## Who this is for
This is for developers and admins.

## What you will learn
1. What Stripe does in this shop.
2. How checkout session creation works.
3. What happens after payment.
4. How webhook handling works.
5. How verify-and-clear works.
6. Why webhook security is important.
7. Where Stripe code is.

## 1) What Stripe is used for in this project
Stripe is used for online card payments.

It is used to:
1. Create a hosted checkout session.
2. Redirect customer to Stripe payment page.
3. Confirm payment by webhook.
4. Store payment result on the order.

## 2) Checkout session creation
When user clicks Pay, frontend calls:
1. `POST /api/checkout`

What server does:
1. Validates checkout input.
2. Loads cart and checks totals.
3. Creates order in `PENDING` status.
4. Saves order items.
5. Saves address snapshot for the order.
6. Builds Stripe line items (products and shipping when needed).
7. Creates Stripe Checkout session.
8. Saves Stripe session id on order.
9. Returns session URL.

Then user is redirected to Stripe hosted page using returned URL.

## 3) After payment (Stripe side)
After payment on Stripe:
1. Stripe redirects user to the configured success URL.
2. Success URL includes `?session_id={CHECKOUT_SESSION_ID}`.

Verified success path in server code:
1. `/checkout/success`

Locale success path like `/{locale}/checkout/success` is Not verified in Phase 12.

## 4) Webhook handling
Webhook route:
1. `POST /api/stripe/webhook`

Handled event (verified):
1. `checkout.session.completed`

What happens on successful event:
1. Verifies Stripe signature.
2. Gets `orderId` from session metadata.
3. Updates order status to `PAID`.
4. Upserts payment row as `SUCCEEDED`.
5. Reserves inventory stock.
6. Ensures invoice exists (idempotent).
7. Marks invoice as paid (idempotent).
8. Tries to send invoice email.
9. Clears user cart server-side.

If webhook processing fails:
1. Route logs error.
2. Returns failure response (`500` or `400` for invalid signature).

## 5) Verify and clear cart
Verify-and-clear route:
1. `POST /api/checkout/verify-and-clear`

How it works:
1. Expects `session_id` in body.
2. Fetches Stripe checkout session by id.
3. Confirms payment is completed.
4. Checks order ownership for security.
5. Clears cart (idempotent behavior).
6. Returns success even if cart was already cleared.

Why this exists:
1. Success page can confirm payment and clear cart from client flow.
2. Webhook also clears cart as server source of truth.

## 6) Security model (high-level)
Why webhook is needed:
1. Payment truth comes from Stripe server event.
2. Frontend should not mark orders as paid.

Signature verification:
1. Webhook uses `stripe.webhooks.constructEvent(...)`.
2. It validates `stripe-signature` using webhook secret.
3. Invalid signature returns `400`.

Additional verify-and-clear checks:
1. Payment status must be paid/complete.
2. Order ownership is checked before cart clear.

## 7) Where things live in the code
API routes:
1. `app/api/checkout/route.ts`
2. `app/api/checkout/verify-and-clear/route.ts`
3. `app/api/stripe/webhook/route.ts`

Stripe and checkout server logic:
1. `src/server/integrations/stripe.ts`
2. `src/features/checkout/server/create-checkout-session.ts`
3. `src/features/checkout/server/stripe-webhook.ts`

Related invoice logic used by webhook:
1. `src/features/invoices/server/create-invoice.ts`
2. `src/features/invoices/server/mark-paid.ts`

## Common problems
- Pay button flow fails. `POST /api/checkout` may return validation or cart error.
- Redirect does not happen. Stripe session URL may be missing.
- Order stays `PENDING`. Webhook may not be delivered or may fail signature check.
- Verify-and-clear says invalid session. `session_id` may be missing or wrong.
- Cart is not cleared on success page. Verify-and-clear may fail, but webhook may still clear later.
- Invoice email is not sent. Email send can fail without breaking payment completion.

## Related docs
- `docs_new/4-CHECKOUT-AND-PAYMENTS.md`
- `docs_new/10-INVOICE-SYSTEM.md`
- `docs_new/15-ENVIRONMENT-VARIABLES.md`
