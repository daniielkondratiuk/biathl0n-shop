# Architecture (Technical)

## 1. System topology
The application is a Next.js App Router system with server-rendered pages, API route handlers, and feature-based server modules.
The browser talks to page routes and API routes. API routes delegate business logic to `src/features/*/server`.
Integrations and infrastructure are isolated under `src/server/*`.

Runtime pieces:
- Browser client (store, dashboard, admin UI)
- Next.js App Router (`app/`) for page routes and server components
- API route handlers (`app/api/*`) as thin HTTP adapters
- Feature modules (`src/features/*`) for domain logic
- Infrastructure/services (`src/server/*`) for auth, DB client, jobs, integrations
- Database (`prisma/schema.prisma` + `src/server/db/prisma.ts`)
- External services (Stripe, Colissimo, Resend, Google OAuth)
- File storage (`public/temp`, `public/uploads/products/{productId}`, `storage/colissimo/labels`)

```text
[Browser]
   |  HTTP
   v
[Next.js App Router: app/*]
   |                 \
   | page render      \ API call
   v                  v
[Server Components] [app/api/* routes]
                        |
                        v
             [src/features/*/server]
                 |            |
                 |            +--> [src/server/integrations/*] --> Stripe / Colissimo / Resend
                 v
      [src/server/db/prisma.ts] --> PostgreSQL

Disk writes: public/temp, public/uploads/products/*, storage/colissimo/labels
```

## 2. Source tree and layering rules
Main locations:
- `app/`: route tree (store, auth, admin, API)
- `src/features/`: feature modules (`ui`, `server`, and related helpers)
- `src/server/`: infrastructure (auth config, Prisma client, integrations, jobs)
- `src/shared/` and `components/`: reusable UI and shared utilities
- `prisma/`: schema and migrations

Dependency direction (verified architecture policy):
- UI -> API routes -> Feature server -> Integrations/DB
- `app/api/*` should stay thin (auth/request/response adapter)
- Domain rules and data operations belong to `src/features/*/server`
- External calls belong to integration modules (`src/server/integrations/*`)

## 3. Runtime flows (end-to-end)
### 3.1 Store page request
1. User opens a localized store route such as `/{locale}/catalog`.
2. App Router page in `app/[locale]/(store)/*` renders on the server.
3. Page-level data is loaded through feature modules (catalog/products domains).
4. HTML is returned to browser with client interactivity where needed.

### 3.2 Checkout -> Stripe -> Webhook -> Order/Invoice
1. User submits checkout; frontend calls `POST /api/checkout`.
2. Server creates `PENDING` order and Stripe Checkout session.
3. User is redirected to Stripe-hosted payment page.
4. Stripe sends `checkout.session.completed` to `POST /api/stripe/webhook`.
5. Webhook marks order `PAID`, writes payment, reserves stock, ensures invoice, marks invoice paid.
6. Success page uses `POST /api/checkout/verify-and-clear` as a cart-clear verification path.

### 3.3 Admin generate shipping label (Colissimo)
1. Admin opens order and triggers label generation.
2. Request goes to `POST /api/shipping/colissimo/label/{orderId}`.
3. Server validates order/shipping snapshot and calls Colissimo SLS integration.
4. Label PDF is written to `storage/colissimo/labels`.
5. Order is updated with carrier/tracking/label path and moved to processing flow.

### 3.4 Tracking sync job
1. Internal trigger calls `POST /api/internal/cron/tracking/colissimo`.
2. Route verifies `x-cron-secret` against `CRON_SECRET`.
3. Route runs `syncProcessingColissimoTracking`.
4. Job checks eligible processing orders and queries Colissimo tracking.
5. Orders move forward to `SHIPPED` or `DELIVERED` when applicable.

## 4. Domain modules map
- **Auth**: `app/[locale]/(auth)/*`, `app/api/auth/[...nextauth]`, `src/server/auth/*`. Handles credentials/Google login and session.
- **Catalog**: `app/[locale]/(store)/catalog/*`, `src/features/catalog/*`, `src/features/home/*`. Handles product browsing and listing.
- **Products**: `app/[locale]/(store)/product/*`, `src/features/products/*`, admin product pages in `app/admin/products/*`. CRUD and product content.
- **Cart**: `app/[locale]/(store)/cart/*`, `src/features/cart/*`. Cart resolve/update and checkout handoff.
- **Checkout**: `app/[locale]/(store)/checkout/*`, `src/features/checkout/*`, APIs `POST /api/checkout`, `POST /api/checkout/verify-and-clear`.
- **Orders**: user dashboard routes `app/[locale]/(store)/dashboard/orders/*`, admin routes `app/admin/orders/*`, APIs `app/api/orders/*`.
- **Invoices**: `src/features/invoices/*`, APIs `GET /api/orders/{id}/invoice/pdf`, `GET /api/invoices/{id}/pdf`.
- **Inventory**: `app/admin/inventory/*`, `src/features/admin/inventory/*`, `src/features/inventory/*`, API `POST /api/inventory/adjust`.
- **Upload**: `app/api/upload/*`, `src/features/upload/server/*`. Temporary upload, commit to product folder, cleanup flow.
- **Shipping**: Colissimo APIs in `app/api/shipping/colissimo/*`, tracking cron in `app/api/internal/cron/tracking/colissimo`, integrations in `src/server/integrations/colissimo*`.
- **Admin**: `app/admin/*`, feature modules under `src/features/admin/*`, role gate in admin layout.

## 5. Data model boundaries (high-level)
Core entities include User, Product, Category, Cart, Order, Payment, Address, Invoice, and InventoryMovement.

Boundary notes:
- Order owns order items and payment state transitions.
- Invoice is tied to one order and stores immutable snapshots (company/customer/line items) for PDF generation.
- Inventory movements track reservation/adjustment history linked to products and optional orders.
- Shipping label artifacts are stored on disk (`storage/colissimo/labels`), while label metadata/tracking lives on order records.
- Product images move from temporary disk storage to product-specific upload folders.

## 6. Security model
Verified protections:
- Dashboard routes under `/{locale}/dashboard/*` require authenticated session.
- Admin area `app/admin/*` requires authenticated `ADMIN` role; non-admin users are redirected to access-denied route.
- Stripe webhook validates signature using `STRIPE_WEBHOOK_SECRET` before processing payment events.
- Internal cron route checks `x-cron-secret` against `CRON_SECRET`.
- Upload commit and temp-delete routes require admin session (`/api/upload/commit`, `/api/upload/temp/{filename}`).

## 7. Operational concerns
- Persistent disk is required for uploads and generated labels:
  - `public/temp`
  - `public/uploads/products/{productId}`
  - `storage/colissimo/labels`
- Stripe webhook handling in production requires a publicly reachable HTTPS endpoint.
- Tracking sync cron route requires an external scheduler; provider and schedule mechanism are not specified in detail.

See full documentation in docs_new/
