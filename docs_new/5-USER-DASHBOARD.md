# User Dashboard

## Who this is for
This is for logged-in users and developers who support user account pages.

## What you will learn
You will learn what users can do in the dashboard, where pages are, and what is verified in this phase.

## What the dashboard is
The dashboard is the user account area.
It is for account info and order history.
If the user is not logged in, dashboard routes redirect to login.

## How to open it
1. Main dashboard URL is `/{locale}/dashboard`.
2. This URL redirects to `/{locale}/dashboard/orders`.
3. Main user pages are:
   1. `/{locale}/dashboard/orders`
   2. `/{locale}/dashboard/profile`
   3. `/{locale}/dashboard/addresses`
4. A payment settings page also exists at `/{locale}/dashboard/payment-settings`.

## Profile
1. Page: `/{locale}/dashboard/profile`.
2. It shows user name.
3. It shows user email.
4. Editing profile data on this page is Not verified in Phase 4.

## Addresses
1. Page: `/{locale}/dashboard/addresses`.
2. User can add a new address.
3. User can set an address as primary.
4. User can delete an address.
5. Address delete works only for saved addresses, not order-linked addresses.
6. Edit existing address in place is Not verified in Phase 4.

### Address fields and validation
1. Address form has these fields:
   1. Full name
   2. Phone
   3. Country
   4. City
   5. Postal code
   6. Address line 1
   7. Address line 2 (optional)
2. Validation is used before submit.
3. Server validates input again when creating address.

## Orders
1. Orders list page: `/{locale}/dashboard/orders`.
2. User sees their own orders only.
3. List shows order date, order reference, status, total, and items.
4. User can open details page: `/{locale}/dashboard/orders/{id}`.
5. Details page shows:
   1. Order status and progress steps
   2. Items and prices
   3. Payment summary
   4. Shipping cost (if available from shipping snapshot)
   5. Shipping address (if present)
   6. Carrier and tracking number (if present)
6. If tracking link can be built, tracking number is clickable.

## Invoices
1. In order details, an invoice download button can appear.
2. Button points to `/api/invoices/{invoiceId}/pdf?locale={locale}`.
3. Invoice access requires login and ownership (or admin role).
4. In practice for users, this means they can download their own invoice PDF.

## Payment settings
1. Page exists at `/{locale}/dashboard/payment-settings`.
2. Current page text says it is coming soon.
3. Active payment-setting actions are Not verified in Phase 4.

## Where things live in the code
- Dashboard layout and auth gate: `app/[locale]/(store)/dashboard/layout.tsx`
- Dashboard tabs and links: `src/features/account/ui/account-tabs.tsx`
- Profile page UI: `src/features/account/ui/dashboard-profile-page.tsx`
- Addresses page UI: `src/features/account/ui/addresses-page-client.tsx`
- Address APIs: `app/api/addresses/route.ts`, `app/api/addresses/[id]/route.ts`, `app/api/addresses/[id]/primary/route.ts`
- Orders list UI: `src/features/orders/ui/user-orders-page.tsx`
- Order details UI: `src/features/orders/ui/user-order-details-page.tsx`
- User order data queries: `src/features/orders/server/user-orders.ts`
- Invoice PDF route used by user UI: `app/api/invoices/[id]/pdf/route.ts`

## Common problems
- User is not logged in and gets redirected to login.
- User expects profile editing, but page only shows info.
- User wants to edit an existing address, but this is not verified here.
- User cannot delete an address that is linked to an order.
- Tracking link is missing because tracking data is not present yet.
- Invoice button may not appear on every order.

## Related docs
- [Store Guide](./3-STORE-GUIDE.md)
- [Checkout and Payments](./4-CHECKOUT-AND-PAYMENTS.md)
- [Invoice System](./10-INVOICE-SYSTEM.md)
