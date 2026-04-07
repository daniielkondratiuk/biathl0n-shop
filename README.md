# Predators Shop

A production-ready e-commerce platform for custom clothing, built with Next.js, TypeScript, Tailwind CSS, Prisma, PostgreSQL, and Stripe.

## Features

- **Storefront**: Browse products, add to cart, checkout with Stripe
- **User Dashboard**: Order history and tracking
- **Admin CMS**: Product management, category management, order management, analytics dashboard
- **Authentication**: Email/password with NextAuth, role-based access (USER/ADMIN)
- **Dark/Light Mode**: System-aware theme switching with persistence
- **SEO**: Dynamic sitemap, robots.txt, OpenGraph metadata
- **Image Management**: Local file storage with automatic compression and WebP conversion

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth
- **Database**: PostgreSQL (self-hosted on OVH VPS)
- **ORM**: Prisma
- **Payments**: Stripe Checkout
- **Storage**: Local filesystem

The production database runs directly on the OVH VPS server hosting the application.

## Prerequisites

- Node.js >= 18 (20 recommended)
- npm, yarn, or pnpm
- Git
- Accounts for:
  - [Stripe](https://stripe.com) (payments)
## External Services Setup

### 1. Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)

2. Get your API keys from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys):

   - `STRIPE_SECRET_KEY` (test: `sk_test_...`, production: `sk_live_...`)

3. Set up a webhook endpoint:

   In Stripe Dashboard → **Developers → Webhooks**

   Add endpoint:

   https://predators.com/api/stripe/webhook

4. Subscribe to the following event:

   - `checkout.session.completed`

5. Copy the webhook signing secret (starts with `whsec_`) and set it as:

   `STRIPE_WEBHOOK_SECRET`

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd predators-shop
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Then fill in all required values in `.env` (see `.env.example` for reference).

4. **Set up the database**:
   ```bash
   # Create and apply migrations
   npm run db:migrate

   # (Optional) Seed initial data
   npm run db:seed
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```

6. **Open your browser**:
   Navigate to [http://localhost:3000/fr](http://localhost:3000/fr)

## Development Setup

1. **Clone repository**
   ```bash
   git clone <repo-url>
   cd predators-shop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

4. **Run migrations**
   ```bash
   npm run db:migrate
   ```

5. **Seed database (optional)**
   ```bash
   npm run db:seed
   ```

6. **Start dev server**
   ```bash
   npm run dev
   ```

**Important**

Whenever the Prisma schema changes, run:

```bash
npx prisma generate
```

before starting the project.

## Localization

The Predators storefront supports two locales:

French (default):  
http://localhost:3000/fr

English:  
http://localhost:3000/en

Locale is automatically detected from the user's browser language.

## Environment Variables

See `.env.example` for all required variables. Minimum required:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Random secret for NextAuth (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your app URL (e.g., `http://localhost:3000` for dev, production domain in prod)
- `NEXT_PUBLIC_SITE_URL` - Public site URL (used for metadata, emails, links, OpenGraph, etc.)
- `STRIPE_SECRET_KEY` - Stripe test/production secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `COLISSIMO_WS_API_KEY` - Colissimo Point Retrait WS v2 API key
- `COLISSIMO_WS_BASE_URL` - (Optional) Colissimo WS base URL, defaults to `https://ws.colissimo.fr`
- `COLISSIMO_SLS_CONTRACT_NUMBER` - Colissimo SLS contract number for label generation
- `COLISSIMO_SLS_PASSWORD` - Colissimo SLS password for label generation

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production (uses Webpack via `--webpack` to avoid Turbopack file-pattern warnings; sets `BROWSERSLIST_IGNORE_OLD_DATA=1` to suppress baseline-browser-mapping outdated-data spam)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:migrate` - Run Prisma migrations (dev)
- `npm run db:deploy` - Deploy Prisma migrations (production)
- `npm run db:seed` - Seed database with sample data

## Project Structure

```
/app
  /admin          # Admin CMS pages
  /api            # API routes
  /(auth)         # Authentication pages
  /catalog        # Product catalog
  /product        # Product detail pages
  /cart           # Shopping cart
  /checkout       # Checkout flow
  /dashboard      # User dashboard
/components       # React components
/lib
  /services       # Business logic
  /auth           # Auth configuration
  /stripe         # Stripe utilities
/prisma           # Database schema and migrations
```

## Documentation

Additional documentation can be found in:

- `docs/`
- `docs_new/`

These include detailed explanations of:

- product system
- shipping integration
- admin CMS
- inventory system
- architecture decisions

- [Architecture](ARCHITECTURE.md) - System architecture and dependency rules
- [Product System](docs/PRODUCT_SYSTEM.md) - Product domain, color variants, size variants, patches
- [Image System](docs/IMAGE_SYSTEM.md) - Image upload flow, roles, and management
- [Orders System](docs/ORDERS_SYSTEM.md) - Admin orders features and inventory lifecycle
- [Migrations](docs/MIGRATIONS.md) - Safe migration practices and verification
- [Account Addresses](docs/ACCOUNT_ADDRESSES.md) - Address book and checkout integration

## Database Schema

The Prisma schema includes:

- `User` - User accounts with roles (USER/ADMIN)
- `Product` - Products with images, variants, stock
- `Category` - Product categories
- `Order` - Orders with status tracking
- `OrderItem` - Order line items
- `Cart` / `CartItem` - Shopping cart
- `Payment` - Payment records
- `Address` - Shipping addresses
- `AuditLog` - Admin action logs
- `InventoryMovement` - Stock tracking

## Admin Panel Access

Admin users are created through the Prisma seed script.

In `prisma/seed.ts`, an admin user should be created or updated using `upsert`.

Conceptual example (illustrative only; adapt to your actual seed implementation):

```ts
await prisma.user.upsert({
  where: { email: "admin@predators.com" },
  update: {},
  create: {
    email: "admin@predators.com",
    password: hashedPassword,
    role: "ADMIN"
  }
})
```

Steps to create an admin user:

1. Configure admin credentials inside `prisma/seed.ts`.
2. Run:
   ```bash
   npm run db:seed
   ```
3. Login via:
   http://localhost:3000/fr/login
4. Access admin panel:
   http://localhost:3000/fr/admin

The same admin interface is also available in English:
http://localhost:3000/en/admin

Admin features include:

- product management
- category management
- order management
- analytics dashboard

## Deployment (OVH VPS)

Production is deployed on a self-hosted OVH VPS running:

- Node.js
- PostgreSQL
- Nginx (reverse proxy)

Deployment steps:

1. SSH into the server.
2. Navigate to the project directory:
   ```bash
   cd /var/www/predators-shop
   ```
3. Pull the latest production code:
   ```bash
   git pull origin main
   ```
4. Install dependencies:
   ```bash
   npm ci
   ```
5. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
6. Run production database migrations:
   ```bash
   npm run db:deploy
   ```
7. Build the application:
   ```bash
   npm run build
   ```
8. Restart the production process.

Example (PM2):
   ```bash
   pm2 restart predators
   ```

The Next.js application runs behind **Nginx**, which exposes the public domain:

https://predators.com

## Smoke Test Checklist

Before considering the MVP complete, verify:

- [ ] **Registration**: Create a new account at `http://localhost:3000/fr/register`
- [ ] **Login**: Sign in at `http://localhost:3000/fr/login`
- [ ] **Browse Products**: View catalog at `http://localhost:3000/fr/catalog`
- [ ] **Product Page**: View product details at `http://localhost:3000/fr/product/[slug]`
- [ ] **Add to Cart**: Add product to cart from product page
- [ ] **Cart Page**: View cart at `http://localhost:3000/fr/cart`, update quantities
- [ ] **Checkout**: Complete checkout form at `http://localhost:3000/fr/checkout`, then redirect to Stripe
- [ ] **Stripe Payment**: Complete test payment (use card `4242 4242 4242 4242`)
- [ ] **Order Creation**: Verify order appears in `http://localhost:3000/fr/dashboard/orders` after payment
- [ ] **Admin Access**: Login as admin, access `http://localhost:3000/fr/admin`
- [ ] **Admin Dashboard**: View metrics (revenue, orders, products)
- [ ] **Product Management**: Create/edit/delete products in `http://localhost:3000/fr/admin/products`
- [ ] **Category Management**: Create/edit/delete categories in `http://localhost:3000/fr/admin/categories`
- [ ] **Order Management**: View and update order statuses in `http://localhost:3000/fr/admin/orders`
- [ ] **Theme Toggle**: Toggle dark/light mode, verify persistence on reload
- [ ] **SEO**: Verify `http://localhost:3000/robots.txt` and `http://localhost:3000/sitemap.xml` are accessible

## Development Notes

- **Server Components**: Most pages use Server Components for data fetching
- **Client Components**: Marked with `"use client"` for interactivity
- **API Routes**: Located in `/app/api` using Next.js Route Handlers
- **Styling**: Tailwind CSS with `dark:` variants for theme support
- **Type Safety**: Full TypeScript coverage with Prisma-generated types

## Troubleshooting

**Database connection issues**:
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running on the OVH VPS
- Verify database user/network permissions and port access

**Stripe webhook not working**:
- Verify webhook URL is correct in Stripe Dashboard
- Check `STRIPE_WEBHOOK_SECRET` matches Stripe
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

**Images not uploading**:
- Verify upload directory permissions (`public/temp/` and `public/uploads/products/`)
- Check that temp files exist before commit

## Temp File Cleanup

To cleanup stale temp files (older than 24 hours):

```bash
# Set token in environment
export TEMP_CLEANUP_TOKEN="your-secret-token"

# Run cleanup
curl -X POST http://localhost:3000/api/upload/temp/cleanup \
  -H "X-Temp-Cleanup-Token: your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"olderThanHours":24}'
```

The endpoint requires `TEMP_CLEANUP_TOKEN` environment variable to be set. If not set, the endpoint returns 404.

## License

Private project - All rights reserved.

## Support

For issues or questions, please refer to the project documentation or contact the development team.