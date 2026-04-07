# 15) Environment Variables

## Who this is for
This is for developers and admins.

## What you will learn
1. Which environment variables are verified in code.
2. Where each variable is used.
3. What each variable does at a high level.

## .env.example
- `.env.example` contains variable names only.
- It must not contain real secrets.
- Copy `.env.example` to `.env` and fill real values.
- Never commit real keys, passwords, or tokens.

## 1) Database
### `PRISMA_LOG_QUERIES`
- Where used: `src/server/db/prisma.ts`
- What it does: Turns Prisma query logging on or off.

### `DATABASE_URL`
- Where used: `prisma/schema.prisma`
- What it does: PostgreSQL connection string for Prisma datasource.

## 2) Authentication
### `GOOGLE_CLIENT_ID`
- Where used: `src/server/auth/auth.ts`
- What it does: Google OAuth app client id for Google login.

### `GOOGLE_CLIENT_SECRET`
- Where used: `src/server/auth/auth.ts`
- What it does: Google OAuth app secret for Google login.

### `NEXTAUTH_SECRET`
- Where used: Not verified in Phase 14.
- What it does: Not verified in Phase 14.

### `NEXTAUTH_URL`
- Where used: Not verified in Phase 14.
- What it does: Not verified in Phase 14.

## 3) Stripe
### `STRIPE_SECRET_KEY`
- Where used: `src/server/integrations/stripe.ts`
- What it does: Server key used to call Stripe API.

### `STRIPE_WEBHOOK_SECRET`
- Where used: `app/api/stripe/webhook/route.ts`
- What it does: Secret used to verify Stripe webhook signatures.

## 4) Colissimo
### `COLISSIMO_WS_BASE_URL`
- Where used: `src/server/integrations/colissimo.ts`, `src/server/integrations/colissimo-sls.ts`, `src/server/integrations/colissimo-tracking.ts`
- What it does: Base URL for Colissimo web service calls.

### `COLISSIMO_WS_API_KEY`
- Where used: `src/server/integrations/colissimo.ts`, `src/server/integrations/colissimo-sls.ts`, `src/server/integrations/colissimo-tracking.ts`
- What it does: API key used for Colissimo requests.

### `COLISSIMO_WS_LOGIN`
- Where used: Not verified in Phase 14.
- What it does: Not verified in Phase 14.

### `COLISSIMO_WS_PASSWORD`
- Where used: Not verified in Phase 14.
- What it does: Not verified in Phase 14.

## 5) Email
### `RESEND_API_KEY`
- Where used: `src/server/services/resend.ts`
- What it does: API key used to send emails with Resend.

### `EMAIL_FROM`
- Where used: `src/server/services/resend.ts`
- What it does: Sender email address used by outgoing emails.

## 6) Internal cron protection
### `CRON_SECRET`
- Where used: `app/api/internal/cron/tracking/colissimo/route.ts`
- What it does: Protects internal cron endpoint with `x-cron-secret` header.

## 7) Public variables (`NEXT_PUBLIC_*`)
### Verified in allowed files
- No `NEXT_PUBLIC_*` variable usage was verified in Phase 14.

Public variable note:
- Variables starting with `NEXT_PUBLIC_` are visible in frontend code.

## Other verified runtime variable
### `NODE_ENV`
- Where used: `middleware.ts`
- What it does: Changes locale behavior between development and non-development.

## Common problems
- Stripe calls fail. Check `STRIPE_SECRET_KEY` is set.
- Stripe webhook fails signature check. Check `STRIPE_WEBHOOK_SECRET`.
- Colissimo calls fail. Check `COLISSIMO_WS_API_KEY` and base URL.
- Internal cron route returns unauthorized. Check `CRON_SECRET` and request header.
- Emails are skipped. Check `RESEND_API_KEY` and `EMAIL_FROM`.
- Prisma query logs are missing or too noisy. Check `PRISMA_LOG_QUERIES`.

## Related docs
- `docs_new/13-STRIPE-INTEGRATION.md`
- `docs_new/12-COLISSIMO-INTEGRATION.md`
- `docs_new/16-DEPLOYMENT.md`
