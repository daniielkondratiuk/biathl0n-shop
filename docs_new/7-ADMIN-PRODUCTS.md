# Admin Products

## Who this is for
This is for admins and developers who manage products.

## What you will learn
You will learn how to list, create, edit, update, and delete products in Admin.

## What a Product is in this system
A product has basic info and variants.
Basic info includes title, slug, price, category, status, and hero flag.
Variants are grouped by color.
Each color variant has images and sizes.
Each size has stock and SKU.

## View all products
1. Open `/admin/products`.
2. This page shows a product table.
3. Table columns include image, title, price, gender, badge, stock, status, and hero.
4. You can search by text.
5. You can filter by category, gender, badge, status, and hero.
6. You can change page size, including `all`.
7. Pagination is shown when needed.
8. Use `Create Product` to open `/admin/products/new`.

## Create a new product
1. Open `/admin/products/new`.
2. The form has 3 steps:
   1. Basic info
   2. Select colors
   3. Configure variants
3. Basic info requires:
   1. English title
   2. Slug
   3. Base price
   4. Category
4. Optional basic fields include description, gender, badge, default patches, active flag, and hero flag.
5. Slug can auto-generate from title.
6. You select one or more colors in Step 2.
7. In Step 3, each selected color variant must have:
   1. One `MAIN` image
   2. At least one size
8. Submit sends data to `POST /api/products`.

## Edit a product
1. Open `/admin/products/{id}`.
2. The edit page uses the same 3-step flow.
3. You can update basic fields (title, slug, description, base price, category, gender, badge, active, hero, default patches).
4. You can update translations (EN and FR inputs are present).
5. You can add/remove colors.
6. You can edit each color variant (images, sizes, price diff, active flag).
7. You can reorder color variants.
8. Submit sends data to `PATCH /api/products/{id}`.

## Product images
1. Variant images are managed in the color variant editor.
2. Upload goes to a temp endpoint: `POST /api/upload/temp-image`.
3. Temp files are committed to product paths before DB save by server logic in `product-image-commit.ts`.
4. Saved image URLs are under `/uploads/products/{productId}/...`.
5. Image roles are `MAIN`, `MAIN_DETAIL`, and `GALLERY`.
6. Helpers enforce role rules:
   1. Exactly one `MAIN`
   2. `MAIN_DETAIL` needs a `MAIN`
   3. Images are ordered by role and order index
7. Deleting an image can call `DELETE /api/products/{id}/images` for saved files.

## Bulk actions
Bulk actions are available from the products list when rows are selected.

1. Bulk status change:
   1. Activate
   2. Deactivate
   3. API: `POST /api/products/bulk-status`
2. Bulk delete:
   1. API: `POST /api/products/bulk-delete`
   2. DB records are deleted.
   3. Image folder cleanup is attempted.
3. Bulk update:
   1. Set/clear badge
   2. Enable/disable hero banner
   3. API: `POST /api/products/bulk-update`

## How product visibility works
1. Main visibility flag is `isActive` (shown as Active or Inactive in Admin table).
2. In create/edit forms, label says Active means visible in storefront.
3. Hero visibility is controlled by `showInHero`.
4. Hero can be changed in form and in bulk actions.
5. `published/draft` wording is Not verified in Phase 6.

## Where things live in the code
- Admin routes: `app/admin/products/page.tsx`, `app/admin/products/new/page.tsx`, `app/admin/products/[id]/page.tsx`
- Product list UI: `src/features/admin/products/ui/product-list-page-client.tsx`
- Product table UI: `src/features/admin/products/ui/products-table.tsx`
- Create/edit UIs: `src/features/admin/products/ui/product-create-page.tsx`, `src/features/admin/products/ui/product-edit-page.tsx`
- Variant UIs: `src/features/admin/products/ui/color-variants/*`
- Product APIs: `app/api/products/route.ts`, `app/api/products/[id]/route.ts`
- Image API: `app/api/products/[id]/images/route.ts`
- Bulk APIs: `app/api/products/bulk-delete/route.ts`, `app/api/products/bulk-status/route.ts`, `app/api/products/bulk-update/route.ts`
- Product server logic: `src/features/admin/products/server/*`
- Upload temp/commit APIs: `app/api/upload/temp-image/route.ts`, `app/api/upload/commit/route.ts`

## Common problems
- Admin forgets a required field (EN title, slug, price, or category).
- A color variant has no `MAIN` image.
- A color variant has no size.
- Bulk action fails because nothing is selected.
- Slug already exists and is changed by server suffix.
- User expects published/draft words, but UI uses active/inactive.

## Related docs
- [Admin Overview](./6-ADMIN-OVERVIEW.md)
- [Admin Orders](./8-ADMIN-ORDERS.md)
- [Admin Inventory](./9-ADMIN-INVENTORY.md)
- [Upload System](./11-UPLOAD-SYSTEM.md)
