## Adding a New Language End-to-End

This document explains how to add a new language to this storefront and admin app end-to-end: **database → Prisma → admin UI → storefront queries → routing/next-intl → enums/static lists → PDF invoices → JSON messages**.

## 0. TL;DR / Decision Tree

Use this when deciding what to touch for a new language (for example, adding `es`).

- **Is this user-visible UI copy (labels, buttons, headings, tooltips)?**
  - **Yes** → Only touch **messages JSON**:
    - Add/translate keys in `messages/en.json` and `messages/{new-locale}.json`.
    - Do not touch DB or enums.
  - **No** → Continue.

- **Is this product name/description or other product marketing content?**
  - **Yes** → Use **Product translations**:
    - Use/extend `ProductTranslation` via admin product forms and Prisma writes.
    - Do not store translated strings on the main `Product` row.

- **Is this a category or color label used in filters or navigation?**
  - **Yes** → Short term:
    - Add per-locale columns (Strategy A) if you are at 2–3 languages total.
  - Long term or 3+ languages:
    - Introduce translation tables (Strategy B) like `CategoryTranslation` / `ColorTranslation`.

- **Is this a status, type, or choice represented as an enum (gender, badge, order status, etc.)?**
  - **Yes** → Do **not** localize in DB:
    - Keep enum values stable (e.g. `PAID`, `NEW`).
    - Localize only via mapping functions that return translation keys.

- **Is this invoice/PDF content (headings, labels inside a PDF)?**
  - **Yes** → Use **code maps**, not DB:
    - Add entries to the PDF `I18N` map per locale.
    - Resolve locale at request time (URL/cookie) and pass it into PDF generation.

- **Does the user journey involve multi-step flows (like checkout)?**
  - **Yes** → Ensure:
    - Step state is encoded in the URL (query or path).
    - Locale switches preserve query parameters and do not reset progress.

Throughout the examples, we’ll assume you’re adding **Spanish (`es`)**. Adapt the same steps for any other locale.

---

## 1. Overview & Philosophy

The project uses a **hybrid i18n approach**:

- **URL locales**: All storefront pages are prefixed by a locale segment: `/{locale}/...` (e.g. `/en/catalog`, `/fr/catalog`).  
- **Locale middleware**: `middleware.ts` integrates `next-intl` and ensures the root `/` redirects to the default locale. It also avoids applying locale routing to `/api`, `/_next`, and `/admin`.
- **next-intl**:
  - **Server**: `app/[locale]/layout.tsx` uses `NextIntlClientProvider`, `setRequestLocale`, and `getMessages()` to load `messages/{locale}.json`.
  - **Client**: Components (e.g. `FilterPanel`) use `useTranslations()` and `useLocale()` for localized labels and behavior.
- **Locale switcher**:
  - `src/shared/i18n/locale-switcher.tsx` reads the current locale with `useLocale()` and rewrites the current path to the target locale while **preserving path and query**.
  - It writes **two cookies** before navigating: `NEXT_LOCALE` and `locale`, both with a 1-year lifetime.
- **What is localized where**:
  - **JSON messages** (`messages/{locale}.json`): All UI copy, labels, headings, filters, cart/checkout strings, etc.
  - **Database fields**:
    - `Category.name` (EN) + `Category.nameFr` (FR) – simple extra column approach.
    - `ProductTranslation` – scalable translation table per product and locale.
    - `Color.name` + `Color.nameFr` – localized color labels.
  - **Code maps**:
    - Enums like `Gender`, `ProductBadge`, `OrderStatus` are **not** localized in the DB. Instead, code maps enum values to **translation keys** (e.g. `status.paid`) and `next-intl` resolves the human-readable label.
    - PDF invoices use an internal `I18N` map keyed by locale.

The design goal is:

- **Fast to add a language** (a few clearly-scoped steps).
- **Safe fallbacks** (to English and legacy fields).
- **Minimal long-term maintenance**, by keeping:
  - **Products** on a translation table.
  - **Categories/colors** small enough to tolerate extra per-locale columns for now (with a migration path to translation tables).

### 1.1 Source of Truth

- **UI text**:
  - `messages/en.json` is the **canonical source** for UI copy and keys.
  - Other locale files (e.g. `messages/fr.json`, `messages/es.json`) must mirror its keys.
- **Database**:
  - The DB stores **data**, not localized UI strings (except for a small number of content fields like product titles/descriptions or short labels where explicitly modeled).
  - The DB must never store full translated UI phrases like button labels or error messages.
- **Enums**:
  - Enum values in Prisma (e.g. `OrderStatus.PAID`) are **never localized** in the DB.
  - Localization is done only by mapping enum values to translation keys and resolving those keys via `messages/{locale}.json`.

Bad example (do not do this):

```ts
// BAD: mixing UI strings into DB and changing enum to look localized
enum OrderStatus {
  PAYE,   // French spelling baked into enum
  ANNULE, // Another localized value
}

// In DB: storing full localized button labels
orderStatusLabel: "Commande payée";
```

Good example:

```ts
// GOOD: stable enum values + mapping to translation keys
enum OrderStatus {
  PENDING,
  PAID,
  CANCELED,
}

function getOrderStatusLabelKey(status: OrderStatus): string {
  switch (status) {
    case "PAID":
      return "status.paid";
    case "CANCELED":
      return "status.cancelled";
    default:
      return "status.pending";
  }
}

const t = useTranslations("orders");
const label = t(getOrderStatusLabelKey(order.status));
```

### 1.2 Fallback Strategy Table

High-level fallback behavior when a localized value is missing:

| Item           | Primary source                                | Fallback 1                            | Fallback 2                     |
| -------------- | --------------------------------------------- | -------------------------------------- | ------------------------------ |
| **Product**    | `ProductTranslation` for current locale       | `ProductTranslation` for `"en"`       | Legacy `Product.title/name`   |
| **Category**   | Per-locale column (e.g. `nameFr`, `nameEs`)   | Base column `name`                    | N/A                            |
| **Color**      | Per-locale column (e.g. `nameFr`, `nameEs`)   | Base column `name`                    | N/A                            |
| **Enum label** | Translation key in `messages/{locale}.json`   | EN translation file if others empty   | Raw enum value as last resort |
| **Invoice/PDF**| `I18N[locale]` entry in PDF module            | `I18N["en"]`                           | N/A                            |

---

## 2. Step 0 – Choose Locale & Naming Conventions

1. **Pick the locale code**
   - For Spanish, use **`es`**.
   - This code will appear in:
     - URLs: `/es/...`
     - JSON: `messages/es.json`
     - DB: `ProductTranslation.locale = "es"`
     - Internal code maps (PDF, etc.).

2. **URL & directory conventions**
   - Storefront routes live under `app/[locale]/...`, so `es` automatically becomes `/es/...` once added to `src/i18n/routing.ts`.
   - Middleware enforces locale prefixes and redirects `/` to the `defaultLocale`:

```ts
// middleware.ts
import createMiddleware from "next-intl/middleware";
import { defaultLocale, locales } from "./src/i18n/routing";

const intlMiddleware = createMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always",
});
```

3. **Cookies**
   - The locale switcher sets:

```ts
// src/shared/i18n/locale-switcher.tsx
document.cookie = `NEXT_LOCALE=${newLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
document.cookie = `locale=${newLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
```

   - When you add `es` to the allowed locales, both cookies may carry `es` and should be accepted wherever locale is read.

4. **File & asset naming**
   - Messages: `messages/es.json`.
   - Flag: `public/flags/es.png` (see locale switcher below).

---

## 3. Step 1 – Database Changes (Start Here)

### 3.1 Current schema for localized entities

- **Categories** use **per-locale columns**:

```prisma
model Category {
  id          String  @id @default(cuid())
  name        String
  nameFr      String?
  slug        String  @unique
  description String?
}
```

- **Products** use a **translation table**:

```prisma
model Product {
  id           String                @id @default(cuid())
  // ...
  translations ProductTranslation[]
}

model ProductTranslation {
  id          String   @id @default(cuid())
  productId   String
  locale      String
  title       String
  description String?

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([productId, locale])
  @@index([locale])
}
```

This means:

- **Products are already scalable** for new languages: you just insert new `ProductTranslation` rows with `locale = "es"`.
- **Categories** currently have an EN base (`name`) and optional FR column (`nameFr`). To add a third language, you can:

1. **Strategy A (simple & fast)**: Add `nameEs` (and similar fields) directly to `Category` (and `Color`) – good for 2–3 languages.
2. **Strategy B (scalable)**: Introduce `CategoryTranslation` (and optionally `ColorTranslation`) to mirror the `ProductTranslation` pattern – better if you expect many locales.

You can adopt **Strategy A now** and later migrate to **Strategy B** if needed; this doc explains both.

#### 3.1.1 Project decision guidance

- **Products**: Already use a **translation table (`ProductTranslation`)**.  
  - **Decision**: Keep using translation tables for any new languages.
- **Categories**: Currently use **columns** (`name`, `nameFr`).  
  - **Decision**: Columns are acceptable for **up to ~2–3 languages**. If you add a **third or more** locale, plan a migration to `CategoryTranslation`.
- **Colors**: Same pattern as Categories (`name`, `nameFr`).  
  - **Decision**: Same rule as Categories – columns for 2–3 languages, then migrate to a `ColorTranslation` table if language count grows.

##### A → B migration plan (high level)

- **1. Introduce translation models** (e.g. `CategoryTranslation`, `ColorTranslation`) alongside existing columns and deploy migrations.
- **2. Backfill translations** by reading existing per-locale columns (`name`, `nameFr`, `nameEs`, …) and inserting rows into the new translation tables.
- **3. Switch reads** (queries + UI helpers) to use translation tables (with fallbacks) instead of direct per-locale columns.
- **4. Decommission old columns** in a later migration once you’re confident everything reads from translations and data is complete.

---

### 3.2 Strategy A – Simple extra columns (`nameEs`, etc.)

#### 3.2.1 Prisma schema changes

In `prisma/schema.prisma`, you add new per-locale columns. For example:

- **Before**:

```prisma
model Category {
  id          String  @id @default(cuid())
  name        String
  nameFr      String?
  slug        String  @unique
  description String?
  // ...
}

model Color {
  id     String  @id @default(cuid())
  name   String
  nameFr String?
  slug   String  @unique
  // ...
}
```

- **After** (adding Spanish, `es`):

```prisma
model Category {
  id          String  @id @default(cuid())
  name        String
  nameFr      String?
  nameEs      String?   // NEW
  slug        String  @unique
  description String?
  // ...
}

model Color {
  id     String  @id @default(cuid())
  name   String
  nameFr String?
  nameEs String?   // NEW
  slug   String  @unique
  // ...
}
```

#### 3.2.2 Migration commands

From the repo root:

```bash
# During development
npx prisma migrate dev --name add-category-es-and-color-es

# In CI / production (after migration is generated & committed)
npx prisma migrate deploy
```

Then regenerate the client:

```bash
npx prisma generate
```

**Why generate?** `npx prisma generate` regenerates the TypeScript client so newly added fields (like `nameEs`) appear in query typings and IntelliSense.

Example Strategy A migration steps (no SQL):

1. Add new nullable per-locale columns (e.g. `nameEs String?`) to your Prisma models.
2. Run `npx prisma migrate dev --name add-<model>-<locale>` locally and commit the generated migration.
3. Update all relevant Prisma `select` / `include` clauses and UI helpers to read the new columns (with fallbacks).
4. Apply migrations in non-dev environments using `npx prisma migrate deploy`, then deploy updated code.

#### 3.2.3 When to use Strategy A

Use **Strategy A** if:

- You only need **a handful of locales** (e.g. `en`, `fr`, `es`) and Category/Color counts are small.
- You want the **fastest path** to shipping a new locale.

If you later need more languages, you can:

- Freeze `nameFr`/`nameEs`, introduce `CategoryTranslation`, and migrate their data into rows.

---

### 3.3 Strategy B – Translation tables for Category (and Color)

#### 3.3.1 Prisma schema example

Add a translation model mirroring `ProductTranslation`:

```prisma
model Category {
  id          String                @id @default(cuid())
  name        String                // Legacy base (EN)
  nameFr      String?               // Legacy FR column (optional)
  slug        String                @unique
  description String?
  translations CategoryTranslation[]  // NEW
  // ...
}

model CategoryTranslation {
  id          String   @id @default(cuid())
  categoryId  String
  locale      String
  name        String

  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([categoryId, locale])
  @@index([locale])
}
```

You can similarly define `ColorTranslation` if you need localized color names per locale.

Example Strategy B query pattern (pseudo-code):

```ts
// Fetch categories with translations for current locale + EN fallback
const categories = await prisma.category.findMany({
  orderBy: { name: "asc" }, // legacy base
  include: {
    translations: {
      where: { locale: { in: [currentLocale, "en"] } },
    },
  },
});

// Resolve localized name with fallback to EN, then base name
function getCategoryName(category, locale: string): string {
  const translations = category.translations ?? [];
  const match =
    translations.find((t) => t.locale === locale) ??
    translations.find((t) => t.locale === "en");

  if (match) return match.name;
  return category.name;
}
```

#### 3.3.2 Migration commands

```bash
npx prisma migrate dev --name add-category-translation
npx prisma generate
```

For production:

```bash
npx prisma migrate deploy
```

You can optionally add a **data migration script** (in `scripts/`) to:

- Insert `CategoryTranslation` rows for existing EN/FR values.
- Populate `locale = "en"` from `Category.name` and `locale = "fr"` from `Category.nameFr`.

#### 3.3.3 When to use Strategy B

Choose **Strategy B** if:

- You anticipate **many locales** or frequent localization changes.
- You want a uniform pattern across Products and Categories.

Checklist for deciding when to migrate from Strategy A → Strategy B:

- You plan to support **3 or more locales** in production.
- Category/color labels are business-critical and frequently updated.
- You want to reuse the same translation workflows across products, categories, and colors.
- You are willing to:
  - Introduce new translation models and backfill data.
  - Update all read paths to go through translation tables with fallbacks.

---

### 3.4 Product localized fields and admin tabs

Products already support **per-locale title/description** via `ProductTranslation` and translated admin inputs:

- `ProductCreatePage` / `ProductEditPage` manage a translation state:

```ts
// src/features/admin/products/ui/product-create-page.tsx
const [activeLocale, setActiveLocale] = useState<"en" | "fr">("en");
const [translations, setTranslations] = useState<{
  en: { title: string; description: string };
  fr: { title: string; description: string };
}>({
  en: { title: "", description: "" },
  fr: { title: "", description: "" },
});
```

Payload is sent as:

```ts
// POST /api/products payload shape (simplified)
{
  title: translations.en.title,
  slug,
  description: translations.en.description || null,
  // ...
  translations: {
    en: { title: ..., description: ... },
    fr: { title: ..., description: ... },
  },
}
```

Server-side handlers (not covered here) are expected to **upsert into `ProductTranslation`** per locale.

#### 3.4.1 DB requirements for new language

You **do not** need to change `Product` or `ProductTranslation` schema to add `es`; it is already keyed by `locale: String`.

You simply:

- Ensure admin UI can **capture `es` values**.
- Ensure server code **accepts `translations.es`** and persists a row with `locale = "es"`.
- Ensure storefront queries include the appropriate locales when fetching.

---

### 3.5 Migration usage summary

- **Local dev**:
  - `npx prisma migrate dev --name <descriptive-name>`
  - `npx prisma generate`
- **Staging/production**:
  - `npx prisma migrate deploy`
  - `npx prisma generate` (once in the build pipeline, if needed).

Use **`migrate dev`** when developing new migrations; use **`migrate deploy`** only to apply already-committed migrations in non-dev environments.

---

## 4. Step 2 – Admin UI: Adding a Language Tab for Product Description

### 4.1 Where product forms live

- Create page: `src/features/admin/products/ui/product-create-page.tsx`
- Edit page: `src/features/admin/products/ui/product-edit-page.tsx`
- Shared stepper: `src/features/admin/products/ui/form/product-form-steps.tsx`

Both create and edit pages already implement **English & French tabs** for product title/description and build a `translations` object for the server.

### 4.2 Adding a new language tab (e.g. ES)

1. **Extend the `activeLocale` union and state shape**
   - Change `activeLocale` to include `"es"`.
   - Extend the `translations` state shape to add an `es` entry (same structure).
2. **Add an “Español” tab next to English/Français**
   - Mirror the existing “Français” tab logic:
     - On click: sync the current locale’s values to `translations[activeLocale]`.
     - Then set `activeLocale = "es"` and load `translations.es` into the input fields.
3. **Ensure payload includes the ES translation**
   - When building `latestTranslations` and the final request payload, include `translations.es` under `translations.es`.

**Server validation and normalization (Zod):**

- Server handlers typically:
  - Validate payloads with Zod.
  - Normalize empty strings to `null` for optional fields.
  - For `ProductTranslation`, you should:
    - Allow `title` to be required only for EN or treat others as optional if desired.
    - Treat blank ES descriptions as `null` to avoid storing empty strings.

**Prisma create/update changes:**

- In create/update handlers for `/api/products`:
  - Accept `translations.es` in the body.
  - For `ProductTranslation`, use `upsert` / `createMany` / `deleteMany` as appropriate:
    - Ensure that there is at most one row per `(productId, locale)` due to `@@unique([productId, locale])`.
    - Create or update rows for `en`, `fr`, and `es` based on the payload.

> Note: This repo already follows this pattern for EN/FR; extending to ES is a matter of **adding one more locale entry** while keeping the schema the same.

### 4.3 Validation completeness across create & edit flows

When you add a new localized field or locale for products, you must always update **both**:

- **Create flow**:
  - UI form (e.g. `ProductCreatePage`).
  - Server handler for `POST /api/products`.
  - Any Zod schemas that validate create payloads.
- **Edit flow**:
  - UI form (e.g. `ProductEditPage`).
  - Server handler for `PATCH /api/products/:id`.
  - Any Zod schemas that validate update payloads.

**Warning – common pitfall**: Only updating the edit page or only updating the Zod schema. Always verify that **create + edit + server validation** all understand the new locale fields and payload shape.

### 4.4 End-to-end example: add Spanish (`es`) product title/description

Example workflow to add ES support for product title/description:

1. **UI fields (admin product form)**:
   - Add an ES tab labeled something like `Español`:
     - Show fields `Title (ES)` and `Description (ES)` bound to `translations.es.title` and `translations.es.description`.
   - Ensure switching tabs:
     - Saves the current locale’s values into `translations[activeLocale]`.
     - Loads `translations.es` when activating the ES tab.

2. **Zod schema (server)**:
   - Extend the existing schema to accept an ES block:

```ts
// Pseudo-code, actual schema may differ
const productTranslationsSchema = z.object({
  en: z.object({
    title: z.string().min(1),
    description: z.string().nullable().optional(),
  }),
  fr: z.object({
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  }),
  es: z.object({
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  }).optional(),
});
```

3. **Prisma write logic (pseudo-code)**:

```ts
// Inside POST /api/products handler
const { translations, ...data } = parsedBody;

const created = await prisma.product.create({
  data: {
    // legacy fields (title, description) use EN
    title: translations.en.title,
    description: translations.en.description ?? null,
    // other non-translated fields
    ...data,
    translations: {
      create: [
        {
          locale: "en",
          title: translations.en.title,
          description: translations.en.description ?? null,
        },
        translations.fr?.title || translations.fr?.description
          ? {
              locale: "fr",
              title: translations.fr.title ?? translations.en.title,
              description: translations.fr.description ?? null,
            }
          : null,
        translations.es?.title || translations.es?.description
          ? {
              locale: "es",
              title: translations.es.title ?? translations.en.title,
              description: translations.es.description ?? null,
            }
          : null,
      ].filter(Boolean),
    },
  },
});
```

**Warning – keep layers in sync**: When adding ES support, you must update **all** of:

- Admin UI (ES tab and fields).
- Zod schema (input shape and validation).
- API handlers (payload parsing and normalization).
- Prisma write logic (create/update `ProductTranslation` rows).

---

## 5. Step 3 – Admin UI: Category Localized Name Fields

### 5.1 Where category create/edit live

- Create: `src/features/admin/categories/ui/category-create-page.tsx`
- Edit: `src/features/admin/categories/ui/category-edit-page.tsx`
- Server update helper: `src/features/admin/categories/server/category-by-id.ts`

The create form already has an extra French field:

```tsx
// src/features/admin/categories/ui/category-create-page.tsx
const [name, setName] = useState("");
const [nameFr, setNameFr] = useState("");
// ...
body: JSON.stringify({
  name,
  slug,
  nameFr: nameFr.trim() || undefined,
  description: description || undefined,
}),
```

The edit form mirrors that shape:

```tsx
// src/features/admin/categories/ui/category-edit-page.tsx
const [name, setName] = useState("");
const [nameFr, setNameFr] = useState("");
// ...
body: JSON.stringify({
  name,
  nameFr: nameFr.trim() || undefined,
  slug,
  description: description || undefined,
}),
```

And the server-side update function normalizes `nameFr`:

```ts
// src/features/admin/categories/server/category-by-id.ts
const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  nameFr: z.string().trim().optional().nullable(),
});
```

### 5.2 Adding another localized field (e.g. `Nom (ES)`)

Assuming **Strategy A** (extra column) is used:

1. **Add state + input in create/edit pages**
   - Add a new `nameEs` state, input field, and request body property:
     - State: `const [nameEs, setNameEs] = useState("");`
     - Label: `Nombre (ES)`, with a placeholder such as `Ex: Sudaderas con capucha`.
     - Request: `nameEs: nameEs.trim() || undefined`.
2. **Extend Zod schema and types**
   - In `updateCategorySchema`, add:
     - `nameEs: z.string().trim().optional().nullable()`.
   - Include `nameEs?: string | null` in `UpdateCategoryInput`.
3. **Normalize ES name in server**
   - Mirror the `nameFr` logic:
     - Check if `nameEs` is present.
     - If it’s non-empty after trimming, store the trimmed value.
     - Otherwise, store `null`.
4. **Ensure selects fetch the new field where needed**
   - For category lists used in filters, the code already selects `nameFr` and uses locale-aware logic:

```ts
// src/features/products/server/public-products.ts
export async function getAllCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      nameFr: true,
    },
  });
}
```

   - If you add `nameEs`, update the `select` as needed and update UI code to pick the best name by current locale (see Step 6 & Step 4 for pattern).

### 5.3 Validation completeness for categories (create + edit)

For any new localized category field (e.g. `nameEs`), update **all three layers**:

- **UI create form** (`CategoryCreatePage`): state + input + request payload.
- **UI edit form** (`CategoryEditPage`): state + input + request payload.
- **Server logic**:
  - Zod schema (`updateCategorySchema`) to accept and normalize the new field.
  - Any create/update helpers to normalize empty strings to `null`.

**Warning – common pitfall**: Updating the edit page and server update logic but forgetting to update the create page, leading to categories that cannot be created with new locale data.

---

## 6. Step 4 – Storefront Data Queries & Fallback Logic

### 6.1 Product translations

`src/features/products/server/public-products.ts` handles localized product fields via `ProductTranslation` and `resolveTranslatedFields`:

```ts
function resolveTranslatedFields(product: any, locale: string) {
  const translations = product.translations || [];

  let translation = translations.find((t: any) => t.locale === locale);
  if (!translation) {
    translation = translations.find((t: any) => t.locale === "en");
  }

  if (translation) {
    return { title: translation.title, description: translation.description };
  }

  return {
    title: product.title || product.name || "",
    description: product.description,
  };
}
```

Queries always include translations for both **current locale and EN**:

```ts
translations: {
  where: {
    locale: { in: [locale, "en"] },
  },
},
```

This means:

- If you pass `locale = "es"` into `getFeaturedProducts`, `getLimitedProducts`, `getHeroProducts`, `getProductBySlug`, or `getCatalogProducts`, they will:
  - Fetch `ProductTranslation` rows for `["es", "en"]`.
  - Prefer `es` if present.
  - Fall back to `en`, then to legacy `Product.title` / `Product.name`.

**Action items for a new locale:**

- Ensure all callers of these functions pass the new locale string (`"es"`).
- Ensure that when you seed or create products, you **write `ProductTranslation` rows** with `locale = "es"` for the translated content.

### 6.1.1 Required `select` / `include` updates

Adding new fields to the Prisma schema is **not sufficient**; you must also ensure that those fields are **actually loaded**:

- For every server function that surfaces localized data (products, categories, colors, etc.), review:
  - `select` clauses on `findMany` / `findUnique`.
  - `include` clauses that pull related models.
- Concretely for **categories**:
  - If you add `Category.nameEs`, update all `select` blocks (e.g. `getAllCategories`) to include `nameEs` where needed.
  - Then ensure UI helpers (like `getCategoryLabel`) know how to use the new field and fall back appropriately.

**Warning – common pitfall**: Adding a field in Prisma and migrations, but forgetting to expose it via `select` / `include`, so the field is always `undefined` in the UI.

### 6.2 Category labels in filters

`FilterPanel` relies on both `name` and `nameFr` for category chip labels:

```ts
// src/features/catalog/ui/filters/filter-panel.tsx
type CategoryForFilter = {
  id: string;
  slug: string;
  name: string;
  nameFr?: string | null;
};

const getCategoryLabel = (c: CategoryForFilter) => {
  if (locale === "fr") {
    const nameFr = (c.nameFr ?? "").trim();
    return nameFr || c.name;
  }
  return c.name;
};
```

If you add `nameEs`, extend both:

- The `CategoryForFilter` type.
- `getCategoryLabel` to:
  - Use `nameEs` when `locale === "es"` and fall back to `name` if blank.

The **fallback should live in the server mapping or the UI helper**:

- For products, fallback is in `resolveTranslatedFields`.
- For categories, fallback is currently in the **UI** (`getCategoryLabel`).

### 6.3 Colors, badges, and other localized UI

- Colors are fetched with both `name` and `nameFr`:

```ts
// src/features/products/server/public-products.ts (in color include)
select: {
  id: true,
  name: true,
  nameFr: true,
  hex: true,
}
```

If you localize colors (Strategy A or B), ensure:

- The query selects the new fields.
- UI helpers pick the right field based on `useLocale()`, with a fallback to `name`.

### 6.4 Cart, wishlist, and orders

- Cart/wishlist/order detail pages rely on:
  - Product fields resolved via `resolveTranslatedFields` (see above).
  - Enum → translation key mapping (see Step 7).

As long as **server logic passes the correct locale** into the product fetchers, and translation keys for the new locale exist in `messages/es.json`, these pages will follow the same pattern automatically.

---

## 7. Step 5 – Enums & “Static Lists” Localization (No DB)

### 7.1 Where the enums live (Prisma schema)

In `prisma/schema.prisma`:

```prisma
enum Gender {
  MEN
  WOMEN
  KIDS
  UNISEX
}

enum ProductBadge {
  NEW
  BESTSELLER
  SALE
  LIMITED
  BACKINSTOCK
  TRENDING
}

enum OrderStatus {
  PENDING
  PAID
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELED
}
```

These enums are **not localized in the DB**. Instead, code maps them to **translation keys**.

### 7.2 Order status localization

`src/features/orders/lib/order-status-label.ts`:

```ts
export function getOrderStatusLabelKey(status: string): string {
  const s = (status ?? "").toString().trim().toUpperCase();

  switch (s) {
    case "PENDING":
      return "status.pending";
    case "PAID":
      return "status.paid";
    case "PROCESSING":
      return "status.processing";
    case "SHIPPED":
      return "status.shipped";
    case "DELIVERED":
      return "status.delivered";
    case "CANCELLED":
    case "CANCELED":
      return "status.cancelled";
    case "REFUNDED":
      return "status.refunded";
    default:
      return "status.unknown";
  }
}
```

Usage pattern:

1. Map an enum value (e.g. `Order.status`) to a **key** like `"status.paid"`.
2. Use `useTranslations("orders")` or similar in React.
3. Call `t(getOrderStatusLabelKey(status))`.

To support a new language:

- **Do not change the keys**; instead, add translations for these keys in `messages/{locale}.json`.

### 7.2.1 Enum localization rules

- **Backend enum values must never change**:
  - Do **not** rename values in Prisma enums (e.g. changing `PAID` to `PAID_ES`) to “localize” them.
  - Enum values are part of the **data contract** between DB, backend, and frontend.
- **Localization always happens via mapping → translation keys**:
  - Map enum values to stable string keys (e.g. `"status.paid"`, `"badge.new"`).
  - Let `next-intl` resolve the human-readable string from `messages/{locale}.json`.

**When adding a new enum value** (e.g. new `OrderStatus` or `ProductBadge`):

- Add the new enum constant to the Prisma schema and run migrations.
- Update the mapping function (e.g. `getOrderStatusLabelKey`, `getBadgeLabel`, or similar) so the new enum value returns a **stable translation key**.
- Manually add translation entries for that key to **all supported language files** under `messages/*` (EN, FR, ES, etc.).

### 7.3 Genders & badges in filters

`FilterPanel` maps gender and badge values to translation keys:

```ts
// Gender → translation keys
const getGenderLabel = (gender: string) => {
  switch (gender.toLowerCase()) {
    case "men":
      return tProduct("mensClothing");
    case "women":
      return tProduct("womensClothing");
    case "kids":
      return tProduct("kidsClothing");
    case "unisex":
      return tProduct("unisexClothing");
    default:
      return gender;
  }
};

// Badge → translation keys
const getBadgeLabel = (badge: string) => {
  switch (badge) {
    case "NEW":
      return tCart("badgeNew");
    case "BESTSELLER":
      return tCart("badgeBestSeller");
    case "SALE":
      return tCart("badgeSale");
    case "LIMITED":
      return tCart("badgeLimited");
    case "BACKINSTOCK":
      return tCart("badgeBackInStock");
    case "TRENDING":
      return tCart("badgeTrending");
    default:
      return badge;
  }
};
```

The important part:

- The **keys** (e.g. `product.mensClothing`, `cart.badgeNew`) must be present in every `messages/{locale}.json`.
- When you add a new locale, you just **translate existing keys**, not change how they’re looked up.

> Per this task’s constraints: **do not edit any `messages/*.json` now**. Just be aware that for a new locale you must add translations for the relevant keys.

---

## 8. Step 6 – Routing & Locale Switcher

### 8.1 Where locales are defined

`src/i18n/routing.ts`:

```ts
export const locales = ["en", "fr"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
```

To add Spanish:

1. Add `"es"` to the `locales` array.
2. Optionally set `defaultLocale` to `"es"` if you want Spanish to be the default redirection target.

### 8.2 App layout and static params

`app/[locale]/layout.tsx`:

```ts
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { locales, type Locale } from "@/i18n/routing";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale as Locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
```

By adding `"es"` to `locales`, both:

- Static params (`generateStaticParams`) will include `{ locale: "es" }`.
- `hasLocale` will accept `"es"` and load `messages/es.json`.

### 8.3 Middleware & prefix routing

`middleware.ts` uses `next-intl`’s middleware:

```ts
const intlMiddleware = createMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always",
});

export const config = {
  matcher: [
    "/((?!api|_next|admin|.*\\..*).*)",
  ],
};
```

This ensures:

- All non-admin, non-API, non-static paths are expected to have a locale prefix.
- Admin and API paths **do not** use the locale segment.

### 8.4 Locale switcher behavior & flags

`src/shared/i18n/locale-switcher.tsx`:

```ts
const LOCALES: Record<Locale, { flag: string; aria: string }> = {
  en: { flag: "/flags/en.png", aria: "Switch to English" },
  fr: { flag: "/flags/fr.png", aria: "Passer en français" },
};
```

And we compute the new URL:

```ts
// 1) Remove current locale prefix if present
if (pathname.startsWith(`/${currentLocale}/`)) {
  newPathname = pathname.slice(`/${currentLocale}/`.length);
} else if (pathname === `/${currentLocale}`) {
  newPathname = "";
} else if (pathname.startsWith("/")) {
  newPathname = pathname.slice(1);
}

// 2) Add new locale prefix
const newPath = newPathname ? `/${newLocale}/${newPathname}` : `/${newLocale}`;
const queryString = searchParams.toString();
const nextUrl = queryString ? `${newPath}?${queryString}` : newPath;
```

**To add ES:**

1. Add `"es"` to `locales` in `src/i18n/routing.ts`.
2. Add an entry in `LOCALES`:

```ts
es: { flag: "/flags/es.png", aria: "Cambiar a español" },
```

3. Add the image asset `public/flags/es.png`.

**Guards:**

- Locale switcher bails out on admin/API routes:

```ts
if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
  return null;
}
```

- It also returns `null` if the path doesn’t have a locale prefix:
  - Only renders on `/en`, `/en/...`, `/fr`, `/fr/...` (and should be extended to handle `/es` after you add the locale).

### 8.5 Dynamic locale guards (do not hardcode)

The locale switcher and any route guards must **not** hardcode specific locales like `/en` or `/fr`:

- **Correct pattern**:
  - Always rely on the `locales` array from `src/i18n/routing.ts`.
  - Use helpers like:
    - `locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))`
    - Or equivalent logic that checks **membership in `locales`**, never explicit string comparisons.
- **Incorrect pattern** (avoid):
  - `pathname.startsWith("/en/") || pathname.startsWith("/fr/")`
  - Checking only `/en` and `/fr` in any guards or conditional rendering.

This applies to:

- Locale switcher guards.
- Any code that decides whether a route is “under a locale prefix”.
- Any middleware that tries to special-case certain prefixes.

**Warning – common pitfall**: Adding a new language to `locales` but forgetting to update hardcoded checks like `/en` and `/fr`, causing the new locale to be treated as “no-locale” and breaking the switcher or layout logic.

### 8.6 Multi-step pages & URL-based state (checkout, wizards)

For multi-step flows (like checkout or wizard-style forms), language switching must **not** reset the user’s progress:

- **Best practice**:
  - Store step state in the **URL**, not only in local React state:
    - Query string: `?step=2`.
    - Or path-based: `/checkout/step-2`.
  - On mount, derive the active step from the URL, not from a local default.
- The locale switcher already:
  - Preserves the **path** and **query string** when switching locales.
  - This means any `step` query parameter will survive a locale switch as long as you read it from the URL.

For checkout or other wizards:

- Read the step from `useSearchParams()` (for query-based) or from `params` (for path-based).
- Initialize step state from that value, not from `1` or a hardcoded default.

**Warning – common pitfall**: Implementing a wizard where the step is only in component state; when the user switches language, the step silently resets to `1` because the new page ignores `?step=` and uses a default.

### 8.7 Routing and locale handling anti-patterns

Avoid the following patterns when working with locales:

```ts
// Anti-pattern: hardcoded locale prefixes
if (pathname.startsWith("/en/") || pathname.startsWith("/fr/")) {
  // ...
}

// Anti-pattern: ignoring locale when caching
const cacheKey = `/product/${slug}`; // no locale, will mix languages
```

Prefer locale-driven, data-based checks:

```ts
// Preferred: derive from locales array
import { locales } from "@/i18n/routing";

const hasLocalePrefix = locales.some(
  (locale) =>
    pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
);

// Preferred: include locale in cache key and in server utilities
const cacheKey = `/${locale}/product/${slug}`;

// Server utility
const product = await getProductBySlug(slug, locale);
```

Locale must be:

- Part of the **URL and cache key** for any cached responses.
- Explicitly passed into **server utilities** (product fetchers, PDF generators, etc.) that depend on language.

### 8.8 Flags and assets checklist

When adding a new locale, keep flag assets consistent:

- **Add the flag image**:
  - Place the asset in `public/flags/{locale}.png` (for example, `public/flags/es.png`).
  - Match existing flags in size, aspect ratio, and style.
- **Register the flag in the locale switcher**:
  - Add an entry to the `LOCALES` map with:
    - `flag`: path to the image (e.g. `"/flags/es.png"`).
    - `aria`: localized, human-readable label for screen readers.
- **Check visual consistency**:
  - Ensure flags render at the same dimensions as existing ones.
  - Confirm `object-fit` and border radius match the existing flag images.

---

## 9. Step 7 – Invoice PDF Localization

### 9.1 Current approach

In `src/features/invoices/pdf/invoice-pdf.ts`:

- There’s an **inline `I18N` map** keyed by locale:

```ts
const I18N = {
  en: {
    invoice: "INVOICE",
    date: "Date:",
    // ...
    shippingLinePrefix: "Shipping —",
    home: "Home",
    pickupPoint: "Pickup point",
    standard: "Standard",
    express: "Express",
  },
  fr: {
    invoice: "FACTURE",
    date: "Date :",
    // ...
    shippingLinePrefix: "Livraison —",
    home: "Domicile",
    pickupPoint: "Point relais",
    standard: "Standard",
    express: "Express",
  },
} as const;
```

- `renderInvoicePdfBuffer` takes a `locale` parameter:

```ts
export async function renderInvoicePdfBuffer(
  invoice: InvoiceForPdf,
  locale: "en" | "fr" = "en"
): Promise<Buffer> {
  const L = I18N[locale] ?? I18N.en;
  // ...
  drawTextRight(formatMoneyFromCents(computedTotalCents, invoice.currency, locale), /* ... */);
}
```

This function:

- Chooses labels from `I18N[locale]` (or falls back to EN).
- Uses `Intl.NumberFormat(locale, { style: "currency", ... })` for currency formatting.

### 9.2 Steps to add a new locale block (e.g. `es`)

1. **Extend the `I18N` map**:

   - Add an `es` entry mirroring the structure of `en`/`fr`, but with Spanish translations.
   - Keep keys **exactly the same**.

2. **Allow the `locale` parameter to accept `"es"`**

   - Change the type union from `"en" | "fr"` to `"en" | "fr" | "es"` (or a generic `Locale` if you prefer).
   - Ensure that callers of `renderInvoicePdfBuffer` pass the current UI locale (or a parameter like `?locale=es`).

3. **Locale source for invoices**

   - API endpoints that generate or serve invoices should:
     - Read an explicit `?locale=` query parameter **or** derive locale from cookies/URL.
     - Pass that locale to `renderInvoicePdfBuffer`.

4. **Currency formatting**

   - `formatMoneyFromCents` already takes a `locale` string:

```ts
function formatMoneyFromCents(
  cents: number,
  currency: string = "EUR",
  locale: "en" | "fr" = "en"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: safeCurrency,
    // ...
  }).format(amount);
}
```

   - Extend its `locale` type to include `"es"` as well, or make it accept a generic string with runtime guarding.

5. **Cache/headers**

   - If you use dynamic routing or caching around PDFs:
     - Make sure the locale (and `?locale=`) is part of the cache key, or that routes are `force-dynamic` where appropriate.

### 9.3 Invoices & PDFs – request-time locale and caching

Invoices and other PDFs are **generated artifacts** and must always respect the **locale of the request**:

- Resolve the invoice language **at request time**, not at build time:
  - Use `?locale=` in the URL, cookies, or request headers to determine which locale to use.
  - Pass that locale into `renderInvoicePdfBuffer`.
- Ensure the **locale is part of the cache key**:
  - If an endpoint is cached by the browser, CDN, or framework, a PDF generated for `locale=en` must not be reused for `locale=es`.
  - Either:
    - Include `?locale=` in the URL and let caches vary by query string, or
    - Mark routes as dynamic / non-cacheable (e.g. no-store headers, `force-dynamic`) depending on your framework conventions.

**Warning – common pitfall**: Serving the same cached PDF for different locales, causing users to download invoices in the wrong language because the locale was not part of the URL or cache key.

### 9.4 Mini example: I18N map and locale resolution

Minimal I18N map for invoices:

```ts
const I18N = {
  en: {
    invoice: "INVOICE",
    date: "Date:",
  },
  fr: {
    invoice: "FACTURE",
    date: "Date :",
  },
} as const;
```

Example locale resolution strategy (query → cookie → default):

```ts
function resolveInvoiceLocale(req: NextRequest): "en" | "fr" {
  const urlLocale = req.nextUrl.searchParams.get("locale");
  if (urlLocale === "en" || urlLocale === "fr") return urlLocale;

  const cookieLocale = req.cookies.get("locale")?.value;
  if (cookieLocale === "en" || cookieLocale === "fr") return cookieLocale;

  return "en"; // default
}

export async function GET(req: NextRequest) {
  const locale = resolveInvoiceLocale(req);
  const invoice = await loadInvoice(/* ... */);
  const pdfBuffer = await renderInvoicePdfBuffer(invoice, locale);
  // Return PDF response with cache headers that respect locale
}
```

Key points:

- The PDF is **generated on demand** for each request.
- The **language depends on the request**, not on when the order was created.
  - An old order can still have a PDF generated in a newly supported language as long as translations exist.

---

## 10. Step 8 – Add Translation JSON File (End Here)

> This step is **documentation-only**; do **not** modify any JSON files as part of this task.

1. **Create the new messages file**

   - Copy the existing English file:
     - `cp messages/en.json messages/es.json`
   - Keep the **same key structure**.

2. **Translate progressively**

   - You can ship with **partial translations**:
     - Keys without ES translations will default to EN if you implement a fallback, but the recommended approach is that each locale file is complete.
   - Avoid:
     - Renaming keys.
     - Deleting keys.
   - When adding new UI features:
     - Always add keys to **all locale files**, even if some values are temporarily duplicated.

3. **Minimum keys to translate first**

Focus translation on:

- **Home**:
  - Hero titles, CTAs.
- **Catalog & search**:
  - Category labels (`filters.category`, `filters.gender`, `filters.badge`, etc.).
  - Sort options and filter labels (`filters.priceLowToHigh`, `filters.priceHighToLow`, `filters.relevance`, etc.).
- **Product detail**:
  - Size/fit information.
  - Add-to-cart button.
  - Badges displayed on PDP.
- **Cart & wishlist**:
  - Buttons (`cart.addToCart`, `cart.checkout`, etc.).
  - Empty-state messages.
- **Checkout & orders**:
  - Shipping methods.
  - Payment status and error messages.
- **Account**:
  - Orders list, status labels (using `status.*` keys).
  - Address forms.

Use `messages/en.json` as the **authoritative source** of which keys must be present in `messages/es.json`.

### 10.1 Translations policy

- By default, adding a new language **does not automatically change** any `messages/*` files.
- Creating and maintaining translation keys is a **manual step**:
  - You must copy the base file (usually `messages/en.json`) and translate keys into `messages/{locale}.json`.
  - When you add new UI features, you manually add the corresponding keys to **all** message files.
- Tooling and automation can help, but the source of truth remains:
  - Stable keys in code.
  - Manually curated translations in `messages/*`.

---

## 11. Pre-flight Checklist Before Adding a New Language

Before you start implementing a new locale, answer these questions:

- **Do you need database changes?**
  - Products already support translations via `ProductTranslation` (usually no schema changes needed).
  - Categories/colors may require either new per-locale columns (Strategy A) or translation tables (Strategy B).
- **Have you planned admin UI updates?**
  - Product forms: locale tabs, new fields, payload shape.
  - Category/color forms: extra fields for each new per-locale column or translation block.
- **Have you updated server-side validation and APIs?**
  - Zod schemas accept the new locale fields.
  - API handlers normalize and persist them via Prisma.
- **Have you reviewed storefront queries?**
  - All relevant `select` / `include` statements fetch new localized fields.
  - Product fetchers receive the new locale and use it in translation queries.
- **Are enums and “static lists” covered?**
  - Mapping functions include all enum values and return translation keys.
  - Translation keys exist (or will be added) in all message files.
- **Are invoices/PDFs covered?**
  - PDF `I18N` map has an entry for the new locale.
  - PDF routes resolve locale from URL/cookies and include it in the cache key.
- **Have you prepared translation JSON files?**
  - Base file (`messages/en.json`) remains the canonical key set.
  - New locale file (`messages/{new-locale}.json`) is created as a copy to be translated.

---

## 12. Verification Checklist

Once you’ve wired the new locale and translations, manually verify:

1. **Routing & basic pages**
   - `/es` loads and shows the home page in ES.
   - `/es/catalog`:
     - Category, gender, badge, size, and color filters show correctly localized labels.
     - URL query parameters behave as expected when changing filters.
   - `/es/product/<slug>`:
     - Uses product translations for ES (title/description).
     - Falls back to EN where ES translations are missing.
   - `/es/cart`, `/es/checkout`:
     - All key CTAs and labels are in ES.
2. **Account & orders**
   - `/es/dashboard/orders`:
     - Order rows display status labels in ES via `status.*` translations.
3. **Admin – Categories**
   - `/admin/categories`:
     - Create a category with ES name (`Nombre (ES)`).
     - Edit the category and confirm ES value persists.
   - On the storefront:
     - In `/es/catalog`, ensure that category labels use ES name where available, with fallback to EN.
4. **Admin – Products**
   - `/admin/products`:
     - Create a product with:
       - EN and ES titles/descriptions.
       - At least one color variant with a MAIN image and sizes.
     - Edit the product and modify only ES fields; confirm they update without affecting EN.
   - On the storefront:
     - `/es/product/<slug>` shows ES title/description.
     - `/en/product/<slug>` still shows EN.
5. **Filters & enums**
   - In `/es/catalog`:
     - Gender labels (Men/Women/Kids/Unisex) are localized.
     - Badge labels (New, Bestseller, Sale, etc.) are localized via `cart.badge*` keys.
6. **Invoice PDF**
   - Trigger an order and generate an invoice:
     - Download via UI where locale is ES.
     - Confirm:
       - static labels (Invoice, Date, Status, FROM/BILL TO, etc.) are in ES.
       - shipping description uses ES I18N strings.
       - currency formatting uses ES locale (e.g. `1.234,56 €`).

---

## 12. Appendix

### 12.1 Migration “cheat sheet”

- **Add or change schema**:

```bash
# Edit prisma/schema.prisma
npx prisma migrate dev --name <short-description>
npx prisma generate
```

- **Apply in CI/prod**:

```bash
npx prisma migrate deploy
```

- **Common patterns**:
  - For nullable localized fields, prefer `String?` with application-level normalization (empty string → `null`).
  - For translation tables, always define `@@unique([<parentId>, locale])`.

### 12.2 Common pitfalls

- **Prisma types not updated**
  - Symptom: TS errors or fields not visible in `.product` / `.category` types.
  - Fix: Run `npx prisma generate` after every schema change.

- **Missing selects**
  - Symptom: Newly added fields (e.g. `nameEs`) always `undefined` in UI.
  - Fix: Update **all relevant `select` / `include` clauses** in server queries to fetch new fields.

- **Incomplete locale wiring**
  - Symptom: `/es/...` routes 404 or render in the wrong locale.
  - Fix:
    - Ensure `"es"` is added to `locales` in `src/i18n/routing.ts`.
    - Check `middleware.ts` and confirm it uses `locales` and `defaultLocale` from that file.
    - Verify that `app/[locale]/layout.tsx` is used as the root layout.

- **Enum ↔ translation key mismatch**
  - Symptom: Order status or badges show raw enum values instead of localized labels.
  - Fix:
    - Confirm mapping functions (like `getOrderStatusLabelKey` and `getBadgeLabel`) cover all enums.
    - Ensure `messages/{locale}.json` includes the corresponding translation keys.

- **PDF locale not propagated**
  - Symptom: Invoices always show EN or FR regardless of current locale.
  - Fix:
    - Make sure routes calling `renderInvoicePdfBuffer` pass the intended locale (e.g. from query/cookies).
    - Extend the `locale` type and `I18N` map to include the new locale.

- **Shell globbing issues with `[locale]` paths**
  - In `zsh`, unquoted brackets are treated as glob patterns. For example:

```bash
# BAD: globbing may fail or include unintended files
git add app/[locale]/layout.tsx

# GOOD: escape or quote the brackets
git add app/\[locale\]/layout.tsx
# or
git add "app/[locale]/layout.tsx"
```

- **Forgetting admin/API guard behavior**
  - The locale switcher intentionally **does not** render on `/admin` or `/api`:
    - Don’t expect language switching inside the admin; currently it’s effectively EN+FR aware via content, not via route prefixes.

By following the steps in this document—from DB strategy to admin UIs, queries, routing, invoices, and translation files—you can add a new language like `es` in a predictable, repeatable way without re-auditing the entire codebase each time.

## 13. Step-by-Step Example: Add Spanish (`es`)

This section is the concrete “do this in order” checklist for adding a new language such as Spanish.

1. **Decide what needs localization**
   - Use the TL;DR decision tree:
     - UI copy → `messages/*`.
     - Product content → `ProductTranslation`.
     - Categories/colors → per-locale columns (Strategy A) or translation tables (Strategy B).
     - Enums → mapping functions and translation keys only.
     - PDFs → invoice `I18N` map.

2. **Database changes (if required)**
   - Products:
     - Usually no schema change; `ProductTranslation` already supports new locales via `locale: String`.
   - Categories/colors:
     - For short term (few locales): add new columns (e.g. `nameEs String?`).
     - For long term (3+ locales): introduce `CategoryTranslation` / `ColorTranslation`, backfill data, and update read paths.
   - Run `npx prisma migrate dev --name ...` and `npx prisma generate`, then `npx prisma migrate deploy` in non-dev environments.

3. **Admin panel updates**
   - Products:
     - Add an ES locale tab and fields in create and edit pages.
     - Update payload shape (`translations.es`) and ensure active locale edits are preserved.
     - Make sure Zod schemas and Prisma writes create/update the appropriate `ProductTranslation` rows.
   - Categories/colors:
     - Add ES fields to create and edit pages.
     - Update Zod schemas and server helpers to normalize new fields (empty string → `null`).

4. **Storefront queries and fallbacks**
   - Products:
     - Ensure all product fetchers receive the new locale and pass it to translation-aware helpers (e.g. `resolveTranslatedFields`).
   - Categories/colors:
     - Update `select` statements to include new per-locale fields or translation relations.
     - Ensure helper functions pick the best localized value for the current locale with fallbacks, as per the fallback table.

5. **Routing, locale handling, and multi-step flows**
   - Add `"es"` to the `locales` array in routing.
   - Ensure middleware and layouts operate on the updated `locales`.
   - Update locale switcher:
     - Add the flag entry and aria-label for `es`.
     - Confirm it uses `locales` instead of hardcoded `/en` and `/fr`.
   - For multi-step flows (like checkout), ensure step state is derived from the URL (query or path) so locale switching does not reset progress.

6. **Enums and static lists**
   - If you add or rely on enum values:
     - Update mapping functions to return translation keys for every enum value.
     - Plan to add translation entries for all locales in `messages/*`.
   - Do not localize enum values in the database.

7. **Invoices and PDFs**
   - Add an entry for `es` to the PDF `I18N` map.
   - Make sure the PDF route:
     - Resolves locale from query/cookies.
     - Passes locale into `renderInvoicePdfBuffer`.
     - Includes locale in cache keys or disables cross-locale caching as appropriate.

8. **Messages and translations**
   - Copy `messages/en.json` to `messages/es.json`.
   - Translate the minimum critical paths first (home, catalog, product, cart, checkout, orders, account, filters).
   - Keep keys stable; do not rename or delete keys without updating all locales.

9. **Pre-flight and verification**
   - Run through the pre-flight checklist to ensure all layers are covered.
   - Use the verification checklist to manually test:
     - Routing, catalog, product pages, cart/checkout, account.
     - Admin creation/editing of categories and products.
     - Enum-rendered labels and badges.
     - Invoice generation for `es`.

