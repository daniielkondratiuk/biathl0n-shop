# 16) Deployment

## Who this is for
This is for developers and operators.

## What you will learn
1. How to get the project from Git and run it locally.
2. How to create a new Neon database and connect it.
3. How to run Prisma migrations.
4. What storage and webhook/cron points need attention.

## Third-party accounts you need

To run this project, you must have accounts and API keys for these services:

- **Neon (PostgreSQL)**  
  Used for the database. Set `DATABASE_URL` to your Neon Postgres connection string.

- **Google Cloud (OAuth)**  
  Used for "Sign in with Google". Create OAuth credentials and set:
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.  
  You must also configure the Google redirect URL:
  `/api/auth/callback/google` (both localhost and production domain).

- **Stripe**  
  Used for payments. Set:
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.  
  Webhooks require a public HTTPS URL in production.

- **Colissimo / La Poste**  
  Used for pickup points, labels, and tracking. Set:
  `COLISSIMO_WS_BASE_URL`, `COLISSIMO_WS_API_KEY` (and any other `COLISSIMO_*` variables present in `.env.example`).

- **Resend**  
  Used for sending emails (for example invoice emails). Set:
  `RESEND_API_KEY` and a valid sender in `EMAIL_FROM`.

Notes:
- `CRON_SECRET` is not a third-party service. Generate it yourself. It protects internal cron routes.
- Do not commit real secrets. Use `.env.example` as a template only.

## Quick start (from Git)
1. Clone the repository.
2. Open the project folder.
3. Install dependencies with:
   - `npm install`
4. Copy environment template:
   - `cp .env.example .env`
5. Set `DATABASE_URL` in `.env` to your PostgreSQL connection string.
   - Example format: `postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require`
6. Run database migrations for your local setup:
   - `npm run db:migrate`
7. Start the dev server:
   - `npm run dev`

## Create a NEW Neon database (work account)
1. Log in to Neon with your work account.
2. Click to create a new project.
3. Choose a region close to your users or team.
4. Open the Neon project and click **Connect**.
5. Create or select a database and role if Neon asks.
6. Copy the connection string.
7. Paste it into `DATABASE_URL` in your `.env` file.
8. Keep the database password safe.

Optional note:
- Neon can show pooled and direct connection strings.
- Use the one your setup needs.
- Exact pooled/direct choice is Not verified in this doc.

## Run migrations on the new database
1. Confirm `DATABASE_URL` points to your new Neon database.
2. Run migrations:
   - `npm run db:migrate`
3. If you need deploy-style migrations, this script also exists:
   - `npm run db:deploy`
4. Seed script is available:
   - `npm run db:seed`
5. Confirm it worked:
   - Check migration output shows success.
   - Open the app and confirm pages can load data.

## Build and start in production mode
1. Build command (verified):
   - `npm run build`
2. Start command (verified):
   - `npm run start`

## Persistent storage note
This app uses file paths that should be on persistent disk.

Important paths:
1. `public/temp`
2. `public/uploads/products/{productId}`
3. `storage/colissimo/labels`

If disk is not persistent, uploaded files and labels can be lost.

## Webhook and cron public URL note
1. Stripe webhook endpoint is `/api/stripe/webhook`.
2. Internal cron endpoint is `POST /api/internal/cron/tracking/colissimo`.
3. External services must reach your app URL to call these endpoints.
4. For cron, send `x-cron-secret` header with `CRON_SECRET`.

## 1) What you need before deployment
You need these things first:
1. A Node.js runtime. Exact Node version is Not verified in Phase 15.
2. A PostgreSQL database (verified in `prisma/schema.prisma`).
3. Environment variables (see `docs_new/15-ENVIRONMENT-VARIABLES.md`).
4. Stripe and Colissimo access at a high level, because code calls both services.

## 2) Install dependencies
Use npm:
1. `npm install`

This project uses dependencies from `package.json`.

## 3) Database setup
Prisma is used for database access.

Verified scripts in `package.json`:
1. `npm run db:deploy` (runs `prisma migrate deploy`)
2. `npm run db:migrate` (runs `prisma migrate dev`)
3. `npm run db:seed` (runs `ts-node prisma/seed.ts`)

Migration files are in:
1. `prisma/migrations/**`

About `prisma generate`:
1. A dedicated generate script is Not verified in Phase 15.

## 4) Build the project
Build command (verified):
1. `npm run build`

What it does:
1. Runs `next build --webpack` for production build.

## 5) Start the server
Start command (verified):
1. `npm run start`

What it runs:
1. `next start`

## 6) File storage notes
This app uses file paths that should be on persistent disk.

Important paths:
1. `public/temp`
2. `public/uploads/products/{productId}`
3. `storage/colissimo/labels`

Notes:
1. `storage/colissimo/labels` exists in repo structure.
2. Upload/temp folders are used by app behavior and can be created at runtime.
3. If disk is not persistent, uploaded files and labels can be lost.

## 7) Cron setup
There is an internal cron route:
1. `POST /api/internal/cron/tracking/colissimo`

What it does:
1. Triggers Colissimo tracking sync job.
2. Requires cron secret header for protection.

Scheduler note:
1. An external scheduler must call this route.
2. Real scheduler provider and real schedule are Not verified in Phase 15.

## 8) Production notes
1. Stripe webhook endpoint exists at `/api/stripe/webhook`.
2. Public site metadata points to `https://predators.com` in `app/layout.tsx`.
3. Middleware behavior changes by `NODE_ENV` for locale choice.
4. Correct `NEXTAUTH_URL` is important in real deployments, but direct usage is Not verified in Phase 15.
5. HTTPS requirement details for Stripe are Not verified in Phase 15.

## 9) What is NOT included
1. Docker setup is Not verified in Phase 15.
2. CI/CD pipeline config is Not verified in Phase 15.
3. PM2/systemd hosting setup is Not verified in Phase 15.

## Common problems
- App fails on start. Check environment variables from doc 15.
- Database migration fails. Check DB connection and run `npm run db:migrate`.
- Images or labels disappear after restart. Persistent disk may be missing.
- Cron sync does not run. External scheduler may not be calling route.
- Internal cron returns unauthorized. Secret header may be wrong.
- Stripe payment events not processed. Webhook route may not be reachable.

## Related docs
- `docs_new/15-ENVIRONMENT-VARIABLES.md`
- `docs_new/13-STRIPE-INTEGRATION.md`
- `docs_new/12-COLISSIMO-INTEGRATION.md`
- `docs_new/11-UPLOAD-SYSTEM.md`
