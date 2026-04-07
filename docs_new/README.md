# predators Shop Documentation

predators Shop is a Next.js e-commerce platform for custom clothing.
It provides a localized storefront, authenticated user dashboard, and an admin back office in one codebase.

The system integrates payments, shipping, invoice generation, and tracking workflows.
Core logic is organized by feature modules and exposed through App Router pages and API route handlers.

## Core capabilities
- Store browsing, search, cart, and checkout
- User authentication and dashboard order access
- Admin management for products, orders, inventory, and related operations
- Stripe payment flow with webhook-driven order confirmation
- Colissimo pickup points, shipping labels, and tracking synchronization
- Invoice creation and PDF delivery
- Image upload pipeline (temporary upload, commit, cleanup)

## Tech stack
- Next.js App Router, React, TypeScript
- Tailwind CSS
- Prisma ORM + PostgreSQL
- NextAuth (Credentials + Google OAuth)
- Stripe, Colissimo, and Resend integrations

## Required third-party services
- Neon (PostgreSQL)
- Google OAuth
- Stripe
- Colissimo / La Poste
- Resend

## Quick start
Use `16-DEPLOYMENT.md` for setup from Git, local run steps, Neon database setup, and migration commands.

## Documentation index
- [1 - Introduction](./1-INTRODUCTION.md)
- [2 - Architecture Overview](./2-ARCHITECTURE-OVERVIEW.md)
- [3 - Store Guide](./3-STORE-GUIDE.md)
- [4 - Checkout and Payments](./4-CHECKOUT-AND-PAYMENTS.md)
- [5 - User Dashboard](./5-USER-DASHBOARD.md)
- [6 - Admin Overview](./6-ADMIN-OVERVIEW.md)
- [7 - Admin Products](./7-ADMIN-PRODUCTS.md)
- [8 - Admin Orders](./8-ADMIN-ORDERS.md)
- [9 - Admin Inventory](./9-ADMIN-INVENTORY.md)
- [10 - Invoice System](./10-INVOICE-SYSTEM.md)
- [11 - Upload System](./11-UPLOAD-SYSTEM.md)
- [12 - Colissimo Integration](./12-COLISSIMO-INTEGRATION.md)
- [13 - Stripe Integration](./13-STRIPE-INTEGRATION.md)
- [14 - Cron and Jobs](./14-CRON-AND-JOBS.md)
- [15 - Environment Variables](./15-ENVIRONMENT-VARIABLES.md)
- [16 - Deployment](./16-DEPLOYMENT.md)
- [17 - Security and Roles](./17-SECURITY-AND-ROLES.md)
- [18 - Troubleshooting](./18-TROUBLESHOOTING.md)
- [Architecture (Technical)](./ARCHITECTURE.md)
