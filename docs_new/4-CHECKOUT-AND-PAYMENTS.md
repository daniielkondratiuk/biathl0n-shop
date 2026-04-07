# Checkout and Payments

## Who this is for
This is for developers and testers who work on checkout.

## What you will learn
You will learn how checkout works, how shipping is picked, how Stripe payment works, and what happens on the success page.

## What checkout is
Checkout is the last part of the store flow.
The user gives shipping details, picks shipping, and pays.
In this project, checkout is in `app/[locale]/(store)/checkout/page.tsx` and uses `components/checkout/checkout-page-client.tsx`.

## Step-by-step: From cart to success
1. The user opens `/{locale}/checkout`.
2. Step 1 is address.
3. The user can pick a saved address or type a one-time address.
4. Address form data is validated in the UI before next step.
5. Server also validates checkout input with schema rules in `src/features/checkout/server/create-checkout-session.ts`.
6. Step 2 is shipping.
7. The carrier is Colissimo (`carrierId: colissimo`).
8. The user picks delivery mode (`home` or `pickup`) and speed (`standard` or `express`).
9. If pickup is selected, the user must pick a relay point.
10. Step 3 is payment.
11. The client sends checkout data to `POST /api/checkout`.
12. Server creates a Stripe Checkout session and returns a Stripe URL.
13. The browser redirects to Stripe for card payment.
14. After payment, Stripe sends the user to `/{locale}/checkout/success?session_id=...`.
15. Success page calls `POST /api/checkout/verify-and-clear` to verify payment and clear cart as fallback.

## Shipping choices
1. Checkout currently uses Colissimo shipping.
2. Home delivery is available.
3. Pickup point is also available.
4. Pickup option is shown only when country is `FR` in checkout UI.
5. Shipping price is calculated from address, subtotal, speed, and delivery mode.
6. Price is checked again on server before Stripe session is created.

### How pickup selection works
1. UI component: `components/checkout/colissimo-point-relais-selector.tsx`.
2. UI requests points through `fetchColissimoRelayPoints` in `src/features/checkout/shared/checkout-shipping.ts`.
3. That calls `POST /api/shipping/colissimo/points-retrait`.
4. API route uses `src/server/integrations/colissimo.ts` to call Colissimo service.
5. User selects one point in UI.
6. Selected point data is stored in checkout shipping snapshot and sent to checkout API.

## Payments (Stripe)
1. Stripe handles secure card payment.
2. Session creation starts in `POST /api/checkout`.
3. Main server logic is in `src/features/checkout/server/create-checkout-session.ts`.
4. Order is created before redirect to Stripe, with status `PENDING`.
5. Stripe webhook endpoint is `POST /api/stripe/webhook`.
6. Webhook logic is in `src/features/checkout/server/stripe-webhook.ts`.
7. When webhook receives `checkout.session.completed`, order is updated to `PAID`.
8. Payment record is upserted.
9. Stock reserve is called after payment confirmation.

### What happens if payment fails
1. If checkout session creation fails, API returns an error and user stays on checkout.
2. If Stripe payment is not completed, user can end on cancel flow (`/cart`) or verification can fail.
3. Success-page verify endpoint checks Stripe session status and returns an error if not paid.
4. Not verified in Phase 3: Full UI text for every Stripe failure path.

## After payment
1. User lands on `/{locale}/checkout/success`.
2. Success page verifies session and clears cart (idempotent fallback).
3. Webhook is the main server source of truth for payment confirmation.
4. User can open orders at `/{locale}/dashboard/orders`.
5. For dashboard details, see `docs_new/5-USER-DASHBOARD.md`.
6. For admin order handling and shipping operations, see `docs_new/8-ADMIN-ORDERS.md` and `docs_new/12-COLISSIMO-INTEGRATION.md`.

## Where things live in the code
- Checkout page route: `app/[locale]/(store)/checkout/page.tsx`
- Success page route: `app/[locale]/(store)/checkout/success/page.tsx`
- Checkout client UI: `components/checkout/checkout-page-client.tsx`
- Pickup selector UI: `components/checkout/colissimo-point-relais-selector.tsx`
- Checkout API: `app/api/checkout/route.ts`
- Verify and clear API: `app/api/checkout/verify-and-clear/route.ts`
- Stripe webhook API: `app/api/stripe/webhook/route.ts`
- Checkout server logic: `src/features/checkout/server/create-checkout-session.ts`
- Webhook server logic: `src/features/checkout/server/stripe-webhook.ts`
- Colissimo points API: `app/api/shipping/colissimo/points-retrait/route.ts`
- Colissimo integration client: `src/server/integrations/colissimo.ts`
- Stripe integration client: `src/server/integrations/stripe.ts`

## Common problems
- User cannot move to next step because address is incomplete.
- User picks pickup but does not select a relay point.
- Shipping price sent by client does not match server validation.
- Stripe session cannot be created because Stripe config is missing.
- User opens success page without a valid `session_id`.
- Payment is done but cart still shows items for a moment before refresh.

## Related docs
- [Store Guide](./3-STORE-GUIDE.md)
- [User Dashboard](./5-USER-DASHBOARD.md)
- [Admin Orders](./8-ADMIN-ORDERS.md)
- [Colissimo Integration](./12-COLISSIMO-INTEGRATION.md)
- [Stripe Integration](./13-STRIPE-INTEGRATION.md)
