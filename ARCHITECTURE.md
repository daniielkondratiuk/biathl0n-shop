# predators Shop — Architecture Documentation

## Status: Architecture Variant B — COMPLETED

The project uses a feature-oriented architecture where business logic is separated from routing and UI. All API routes are thin HTTP adapters that delegate to feature server modules.

## High-Level Overview

- **`app/api/**`** — Thin HTTP route handlers (auth checks, request parsing, response formatting)
- **`src/features/**/server`** — Business logic, Prisma queries, transactions, Zod validation
- **`src/features/**/ui`** — React components for each feature
- **`src/shared/**`** — Shared UI components, layout, utilities, types
- **`src/server/**`** — Infrastructure: Prisma client, auth config, integrations (Stripe), rate limiting

## Folder Structure

### `app/api/**` — HTTP Routes (Thin Adapters)
- **Purpose**: HTTP request/response handling only
- **Contains**: Auth checks, JSON parsing, calling feature server functions, returning `NextResponse`
- **MUST NOT contain**: Prisma queries, `$transaction`, Zod schemas, business logic, complex conditionals
- **MUST NOT import**: `src/server/services/**` directly (use feature server modules instead)
- **Allowed imports**: `authOptions` from `@/server/auth/auth`, feature server functions from `@/features/**/server`
- **Pattern**: Parse request → Call feature server function → Return response

### `src/features/**` — Feature Modules
Each feature is self-contained with clear boundaries:

- **`*/server/*.ts`** — Business logic, database access, validation
  - Prisma queries and transactions
  - Zod schemas for validation
  - Business rules and domain logic
  - Stripe/file system operations
  - Error handling and status codes

- **`*/ui/*.tsx`** — React components
  - Feature-specific UI components
  - Client-side interactivity
  - Never imports Prisma or server-only code

- **`*/model/*.ts`** — State management (optional)
  - Zustand stores
  - Domain models
  - Client-side state

- **`*/api/*.ts`** — Client-side fetch helpers (optional)
  - Type-safe API client functions
  - Used by UI components to call routes

- **`*/index.ts`** — Public exports
  - Re-exports for cross-feature imports

### `src/shared/**` — Shared Code
- **`shared/ui/**`** — Reusable UI components (buttons, cards, badges, etc.)
- **`shared/layout/**`** — Layout components (navbar, sidebar, etc.)
- **`shared/types/**`** — Shared TypeScript types
- **`shared/lib/**`** — Shared utilities

### `src/server/**` — Infrastructure
- **`server/db/prisma.ts`** — Prisma client instance
- **`server/auth/**`** — NextAuth configuration
- **`server/integrations/**`** — External service clients (Stripe, etc.)
### `components/**` — Shared UI Components (Currently Active)
- **Status**: Actively used, not deprecated
- **Contains**: Shared UI components, icons, layout components, admin components, catalog components
- **Usage**: Used by app pages and feature UI components
- **Future**: May be gradually migrated to `src/shared/**` (optional cleanup)

### `lib/utils/**` — Pure Utilities
- Pure helper functions (no Prisma, no server dependencies)
- Image utilities, SKU generation, slug helpers, etc.

## Architecture Rules

### Theme System (Frontstore)

**Single Source of Truth: `src/shared/store-theme/`**

The frontstore uses a centralized theme token system to ensure consistent theme handling across all components.

**Policy:**
- ❌ **MUST NOT** import `useTheme()` from `next-themes` directly in frontstore components
- ✅ **MUST** use `useStoreThemeTokens()` from `@/shared/store-theme` instead

**What `useStoreThemeTokens()` provides:**
- `mounted`: boolean for hydration-safe rendering
- `resolvedTheme`: "light" | "dark" (system preference resolved)
- `isDark`: convenience boolean
- `logoSrc`: theme-appropriate logo path
- `headerBgSolid`, `headerBgGlass`, `headerGlassBlurPx`: header styling
- `footerBgSolid`: footer styling
- `patternBaseBg`, `patternOpacity`, `patternSizePx`: background pattern styling

**Why:**
- Prevents scattered `useTheme()` calls that can cause inconsistent behavior
- Avoids unreliable Tailwind `dark:` classes for critical backgrounds
- Single place to update theme colors/values
- Easy to extend for Admin theme later

**ESLint rule suggestion (optional):**
```json
{
  "no-restricted-imports": ["error", {
    "paths": [{
      "name": "next-themes",
      "importNames": ["useTheme"],
      "message": "Use useStoreThemeTokens() from @/shared/store-theme instead."
    }]
  }]
}
```

### Strict Separation of Concerns

1. **API Routes (`app/api/**`)**
   - ✅ Auth checks (`getServerSession` with `authOptions`)
   - ✅ Request parsing (`request.json()`)
   - ✅ Calling feature server functions from `src/features/**/server`
   - ✅ Returning `NextResponse` with status codes
   - ❌ **MUST NOT**: Use `prisma.*`, `prisma.$transaction`, `tx.*`
   - ❌ **MUST NOT**: Define Zod schemas
   - ❌ **MUST NOT**: Contain business logic, loops, complex conditionals
   - ❌ **MUST NOT**: Access file system, Stripe, or other integrations directly
   - ❌ **MUST NOT**: Import from `src/server/services/**` directly (must route through feature server modules)

2. **Feature Server Modules (`src/features/**/server`)**
   - ✅ Own all Prisma queries and transactions
   - ✅ Own all Zod validation schemas
   - ✅ Own business rules and domain logic
   - ✅ Handle errors and return structured error responses
   - ✅ May use Stripe, file system, and other integrations

3. **UI Components (`src/features/**/ui`)**
   - ✅ React components and client-side logic
   - ✅ May import from `src/shared/**`
   - ✅ May use feature `*/api/*` helpers to call routes
   - ❌ **MUST NOT**: Import Prisma or server-only code
   - ❌ **MUST NOT**: Direct database access

4. **Shared Code (`src/shared/**`)**
   - ✅ Reusable across features
   - ✅ No feature-specific business logic
   - ❌ **MUST NOT**: Import from `src/features/**` (creates circular dependencies)

5. **Server Infrastructure (`src/server/**`)**
   - ✅ Prisma client, auth config, integrations
   - ✅ May be imported by feature server modules
   - ❌ **MUST NOT**: Import from `src/features/**` (violates dependency direction)

### Dependency Direction Rules

**Strict dependency flow (enforced):**
- `app/api/**` → Can import: `authOptions` from `@/server/auth/auth`, feature server functions from `@/features/**/server`
- `app/api/**` → Must NOT import: Prisma, Zod schemas, business logic
- `src/features/**/server` → Can import: `src/shared/**`, `src/server/**`
- `src/shared/**` → Must NOT import: `src/features/**` (creates circular dependencies)
- `src/server/**` → Must NOT import: `src/features/**` (violates dependency direction)

**Cross-feature imports:**
- Features should use each feature's public `index.ts` for cross-feature imports (avoid deep imports)
- UI components never import Prisma or server-only code

### Path Aliases

- `@/*` → `src/*` (configured in `tsconfig.json`)
- Use `@/features/**` for feature imports
- Use `@/shared/**` for shared code
- Use `@/server/**` for infrastructure

## Legacy Paths

- **`stores/`** — Empty, state management moved to `src/features/**/model`
- **`lib/services/**`** — Deprecated, use `src/features/**/server` instead

## Migration Status

### Completed Migrations
- ✅ Admin products (create, update, delete, list)
- ✅ Admin orders (list, details, update, bulk update, export)
- ✅ Admin categories (CRUD)
- ✅ Admin colors (list, create)
- ✅ Admin patches (CRUD)
- ✅ Admin inventory (adjust)
- ✅ Cart (items, resolve)
- ✅ Wishlist (CRUD, resolve)
- ✅ Checkout (session creation, Stripe webhook)
- ✅ Upload (temp files, commit)
- ✅ Products (public listing, details)
- ✅ Account (addresses)

### Remaining Work
- Feature development and enhancements
- Architecture cleanup is complete

## Current State & Next Cleanup Steps

### Current State
- **`app/api/**`**: Thin adapters calling feature server modules
- **`components/**`**: Actively used as shared UI/icons/layout; not deprecated yet
- **`src/server/services/**`**: Removed; all functionality migrated to feature server modules

### Next Cleanup Steps (Optional)
1. Gradually migrate `components/**` into `src/shared/**` (optional, low priority)
2. Consolidate markdown documentation into `docs/` directory (optional)

## Example: Adding a New Feature

1. Create feature structure:
   ```
   src/features/my-feature/
     server/
       my-feature.ts        # Business logic, Prisma, Zod
     ui/
       my-feature-page.tsx  # React component
     index.ts               # Public exports
   ```

2. Create thin API route:
   ```typescript
   // app/api/my-feature/route.ts
   export async function POST(request: Request) {
     const session = await getServerSession(authOptions);
     if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
     
     const json = await request.json();
     const result = await createMyFeature(json);
     return NextResponse.json(result.body, { status: result.status });
   }
   ```

3. Implement server module:
   ```typescript
   // src/features/my-feature/server/my-feature.ts
   import { prisma } from "@/server/db/prisma";
   import { z } from "zod";
   
   const schema = z.object({ ... });
   
   export async function createMyFeature(data: unknown) {
     const parsed = schema.parse(data);
     // Prisma queries, business logic, etc.
   }
   ```
