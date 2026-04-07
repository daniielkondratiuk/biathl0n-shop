# 17) Security and Roles

## Who this is for
This is for developers and admins.

## What you will learn
1. Which user roles exist.
2. How login sessions are used.
3. How user and admin routes are protected.
4. How API routes are protected.
5. How Stripe webhook and internal cron are protected.

## 1) User roles in this project
Verified roles:
1. `USER`
2. `ADMIN`

Where roles are defined:
1. `src/types/next-auth.d.ts`

Where role is stored for runtime checks:
1. Role is added to JWT/session in `src/server/auth/auth.ts`.
2. Server code checks `session.user.role` for admin-only access.

## 2) Authentication system
This project uses NextAuth.

High-level behavior:
1. Auth handler route is `app/api/auth/[...nextauth]/route.ts`.
2. Session strategy is JWT (configured in `src/server/auth/auth.ts`).
3. Credentials login is supported (email + password check).
4. Google provider login is also configured.

Sign-in route:
1. NextAuth sign-in page is `/login`.

Register route:
1. Not verified in Phase 16.

## 3) Protected user routes
Dashboard area is protected:
1. `app/[locale]/(store)/dashboard/layout.tsx` checks session.
2. If no session, it redirects to `/{locale}/login` with callback URL.

Example:
1. `/{locale}/dashboard/**` requires login.

## 4) Protected admin routes
Admin area is protected in layout:
1. `app/admin/layout.tsx` checks server session.
2. If no session, redirect to `/login?callbackUrl=/admin`.
3. If role is not `ADMIN`, redirect to `/admin/access-denied`.

Access denied page:
1. Route: `app/admin/access-denied/page.tsx`

## 5) API route protection
Verified admin session checks:
1. `app/api/upload/commit/route.ts` requires `ADMIN`.
2. `app/api/upload/temp/[filename]/route.ts` requires `ADMIN`.

Other admin API protection across all admin routes is Not verified in Phase 16.

Order ownership checks:
1. Not verified in Phase 16.

`verify-and-clear` ownership check:
1. Not verified in Phase 16.

## 6) Webhook security
Stripe webhook route:
1. `app/api/stripe/webhook/route.ts`

Security behavior:
1. Reads `stripe-signature` header.
2. Passes signature + webhook secret to webhook handler.
3. Handler validates signature before processing event.

Why frontend cannot mark order as paid:
1. Payment confirmation is processed in server webhook flow.

## 7) Internal cron security
Internal cron route:
1. `app/api/internal/cron/tracking/colissimo/route.ts`

Security behavior:
1. Requires `x-cron-secret` request header.
2. Header must match server cron secret.
3. Wrong secret returns unauthorized.

## 8) What is NOT protected (verified scope)
Public store pages:
1. Not all store pages require login.
2. Dashboard is protected, but storefront pages are public by design.

Middleware behavior:
1. `middleware.ts` handles locale redirects.
2. It does not enforce auth for all routes.
3. It skips `/api` and `/admin` paths for locale middleware processing.

Search/product public access details:
1. Not verified in Phase 16.

## 9) Where things live in the code
Auth core:
1. `src/server/auth/auth.ts`
2. `app/api/auth/[...nextauth]/route.ts`
3. `src/types/next-auth.d.ts`

Route guards:
1. `app/admin/layout.tsx`
2. `app/admin/access-denied/page.tsx`
3. `app/[locale]/(store)/dashboard/layout.tsx`

Webhook and cron security:
1. `app/api/stripe/webhook/route.ts`
2. `app/api/internal/cron/tracking/colissimo/route.ts`

Upload API protection examples:
1. `app/api/upload/commit/route.ts`
2. `app/api/upload/temp/[filename]/route.ts`
3. `app/api/upload/temp/cleanup/route.ts`

## Common problems
- User cannot open dashboard. Session may be missing or expired.
- User is sent to access denied in admin. Role is not `ADMIN`.
- Webhook returns signature error. Stripe signature or secret may be wrong.
- Internal cron returns unauthorized. `x-cron-secret` may be wrong.
- Upload commit returns unauthorized. Admin session may be missing.
- Login works but role is wrong. Session/JWT role mapping may be outdated.

## Related docs
- `docs_new/13-STRIPE-INTEGRATION.md`
- `docs_new/6-ADMIN-OVERVIEW.md`
- `docs_new/16-DEPLOYMENT.md`
