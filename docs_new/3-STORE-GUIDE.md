# Store Guide

## Who this is for
This is for developers and testers who work on the store pages.

## What you will learn
You will learn the store route map, the main feature folders, and how language switching works.

## Store pages map
These pages are under `app/[locale]/(store)`.
`[locale]` is the language part in the URL.

1. Home page: `/{locale}` from `app/[locale]/(store)/page.tsx`
2. Catalog page: `/{locale}/catalog` from `app/[locale]/(store)/catalog/page.tsx`
3. Category helper route: `/{locale}/category/[slug]` from `app/[locale]/(store)/category/[slug]/page.tsx`
4. Product page: `/{locale}/product/[slug]` from `app/[locale]/(store)/product/[slug]/page.tsx`
5. Cart page: `/{locale}/cart` from `app/[locale]/(store)/cart/page.tsx`
6. Search helper route: `/{locale}/search` from `app/[locale]/(store)/search/page.tsx`
7. Wishlist page: `/{locale}/wishlist` from `app/[locale]/(store)/wishlist/page.tsx`
8. Checkout page: `/{locale}/checkout` from `app/[locale]/(store)/checkout/page.tsx`
9. Checkout success page: `/{locale}/checkout/success` from `app/[locale]/(store)/checkout/success/page.tsx`
10. Dashboard home: `/{locale}/dashboard` from `app/[locale]/(store)/dashboard/page.tsx`
11. Dashboard profile: `/{locale}/dashboard/profile` from `app/[locale]/(store)/dashboard/profile/page.tsx`
12. Dashboard addresses: `/{locale}/dashboard/addresses` from `app/[locale]/(store)/dashboard/addresses/page.tsx`
13. Dashboard payment settings: `/{locale}/dashboard/payment-settings` from `app/[locale]/(store)/dashboard/payment-settings/page.tsx`
14. Dashboard orders list: `/{locale}/dashboard/orders` from `app/[locale]/(store)/dashboard/orders/page.tsx`
15. Dashboard order detail: `/{locale}/dashboard/orders/[id]` from `app/[locale]/(store)/dashboard/orders/[id]/page.tsx`
16. About page: `/{locale}/about` from `app/[locale]/(store)/about/page.tsx`
17. Contact page: `/{locale}/contact` from `app/[locale]/(store)/contact/page.tsx`
18. FAQ page: `/{locale}/faq` from `app/[locale]/(store)/faq/page.tsx`
19. Values page: `/{locale}/values` from `app/[locale]/(store)/values/page.tsx`
20. Shipping and returns page: `/{locale}/shipping-returns` from `app/[locale]/(store)/shipping-returns/page.tsx`
21. Size guide page: `/{locale}/size-guide` from `app/[locale]/(store)/size-guide/page.tsx`
22. Privacy policy page: `/{locale}/privacy-policy` from `app/[locale]/(store)/privacy-policy/page.tsx`
23. Terms page: `/{locale}/terms-of-service` from `app/[locale]/(store)/terms-of-service/page.tsx`

## Important route behavior
1. `/{locale}/category/[slug]` does a redirect to `/{locale}/catalog?category=...`.
2. `/{locale}/search` does a redirect to `/{locale}/catalog` with query params.
3. Store pages use a shared layout in `app/[locale]/(store)/layout.tsx`.
4. Not verified in Phase 2: Full user flow for each dashboard page.

## Main store feature folders
These folders provide store UI and logic:

1. Home feature: `src/features/home`
2. Catalog feature: `src/features/catalog`
3. Products feature: `src/features/products`
4. Cart feature: `src/features/cart`
5. Search feature: `src/features/search`
6. Wishlist feature: `src/features/wishlist`

## Changing the language
`[locale]` in the URL means the language code.

Examples:
1. `/en/catalog` means catalog in English.
2. `/fr/catalog` means catalog in French.

How language choice is set:
1. Supported locales are in `src/i18n/routing.ts`.
2. `defaultLocale` is `fr` (French) in that file.
3. The locale switcher component is `src/shared/i18n/locale-switcher.tsx`.
4. It changes the first URL segment (`/en/...` or `/fr/...`).
5. It keeps query params.
6. It sets cookies `NEXT_LOCALE` and `locale`.

Where translations live:
1. `messages/en.json`
2. `messages/fr.json`

How middleware affects language routes:
1. Middleware file: `middleware.ts`.
2. If a URL has no locale prefix, middleware redirects to a localized URL.
3. It skips some paths like `/admin`, `/api`, and static assets.
4. In development, locale is forced to `fr`.
5. In production, it checks `accept-language` and picks `fr` when French is detected, else `en`.

How to add a new language (high-level):
1. Add new locale code in `src/i18n/routing.ts`.
2. Add `messages/<new-locale>.json`.
3. Add label and flag in `src/shared/i18n/locale-switcher.tsx`.
4. Update middleware logic in `middleware.ts` if needed.
5. Review store routes with the new locale prefix.
6. Not verified in Phase 2: Full rollout checklist for a third locale.

## Common problems
- I forget to include `/en` or `/fr` in links.
- I expect `/search` to render a page, but it redirects.
- I expect `/category/[slug]` to render a page, but it redirects.
- I change locale config but forget to update locale switcher flags.
- I add a new message file but forget routing updates.
- I test only one language and miss issues in the other one.

## Related docs
- [Introduction](./1-INTRODUCTION.md)
- [Architecture Overview](./2-ARCHITECTURE-OVERVIEW.md)
- [Checkout and Payments](./4-CHECKOUT-AND-PAYMENTS.md)
- [User Dashboard](./5-USER-DASHBOARD.md)
